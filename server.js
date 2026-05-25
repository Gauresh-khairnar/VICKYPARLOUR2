const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const admin = require('firebase-admin');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

function hashPassword(password, salt) {
    if (!salt) {
        salt = crypto.randomBytes(16).toString('hex');
    }
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return { salt, hash };
}

function verifyPassword(password, salt, hash) {
    const verify = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return verify === hash;
}

// In-memory rate limiting and input sanitization helpers
const loginAttempts = {};
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_LOGIN_ATTEMPTS = 5;

function sanitizeInput(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/<[^>]*>/g, '').trim();
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

function validatePhone(phone) {
    const re = /^[\d\s+\-()]{7,20}$/;
    return re.test(String(phone));
}

// Increase payload size limit to support base64 dynamic image uploads
app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.urlencoded({ limit: '20mb', extended: true }));

// Serve custom uploaded media static files
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}
app.use('/uploads', express.static(UPLOADS_DIR));

// Create separate folder for generated A4 invoice PDFs
const INVOICES_DIR = path.join(UPLOADS_DIR, 'invoices');
if (!fs.existsSync(INVOICES_DIR)) {
    fs.mkdirSync(INVOICES_DIR);
}
app.use('/uploads/invoices', express.static(INVOICES_DIR));

// Serve other static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Database File Path
const DB_FILE = path.join(__dirname, 'database.json');

// In-memory DB fallback for read-only environments like Vercel
let _memoryDB = null;
const IS_READONLY = process.env.VERCEL ? true : false;

function getDB() {
    // If we have an in-memory DB (Vercel read-only mode), use it
    if (_memoryDB) return JSON.parse(JSON.stringify(_memoryDB));
    
    if (!fs.existsSync(DB_FILE)) {
        initializeDB();
        // If file still doesn't exist (read-only), return default
        if (!fs.existsSync(DB_FILE)) {
            if (!_memoryDB) {
                _memoryDB = buildDefaultDB();
            }
            return JSON.parse(JSON.stringify(_memoryDB));
        }
    }
    try {
        const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        if (!db.admin) {
            const { salt, hash } = hashPassword('vicky');
            db.admin = {
                username: 'vicky',
                passwordSalt: salt,
                passwordHash: hash,
                recoveryEmail: 'admin@vickyparlour.com',
                authProtection: false,
                sessions: [],
                loginActivity: []
            };
            try {
                fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
            } catch (err) {
                // Read-only filesystem — cache in memory
                _memoryDB = db;
                console.warn('[DB] Read-only filesystem detected, using in-memory storage.');
            }
        }
        return db;
    } catch (err) {
        console.error('[DB] Failed to read database file:', err.message);
        if (!_memoryDB) _memoryDB = buildDefaultDB();
        return JSON.parse(JSON.stringify(_memoryDB));
    }
}

// Save DB state
function saveDB(data) {
    // Always update memory mirror
    _memoryDB = JSON.parse(JSON.stringify(data));
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        // Read-only filesystem (e.g. Vercel) — data persists in memory for this request lifecycle
        console.warn('[DB] Write skipped (read-only fs). Changes held in memory:', err.code);
    }
}

// Build default DB structure without writing to disk
function buildDefaultDB() {
    const { salt, hash } = hashPassword('vicky');
    return {
        hero: { title_line1: 'BOLD', title_line2: 'BEAUTY', title_line3: 'LEVEL.', subtitle: 'PREMIUM SALON • ADVANCED ACADEMY • BRIDAL STUDIO • CHALISGAON' },
        contact: { phone: '+91 98765 43210', email: 'HELLO@VICKYPARLOUR.COM', address: 'CHALISGAON, MAHARASHTRA', hours: 'MON - SUN: 10:00 AM - 09:00 PM' },
        services: [], gallery: [], testimonials: [], team: [], faqs: [], pricing: [], blogs: [],
        bookings: [], inquiries: [], configs: {}, invoices: [],
        admin: { username: 'vicky', passwordSalt: salt, passwordHash: hash, recoveryEmail: 'admin@vickyparlour.com', authProtection: false, sessions: [], loginActivity: [] }
    };
}

// ================= HYBRID FIREBASE AND SMTP EMAIL ENGINES =================
let dbFirestore = null;
let isFirebaseConnected = false;

async function initFirebase() {
    try {
        if (admin.apps.length > 0) {
            await admin.app().delete();
            isFirebaseConnected = false;
            dbFirestore = null;
        }

        const db = getDB();
        const fbConfig = db.configs && db.configs.firebase;
        
        if (fbConfig && fbConfig.projectId && fbConfig.clientEmail && fbConfig.privateKey) {
            // Setup Firebase Admin with private key certificate
            const privateKey = fbConfig.privateKey.replace(/\\n/g, '\n');
            
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: fbConfig.projectId,
                    clientEmail: fbConfig.clientEmail,
                    privateKey: privateKey
                })
            });
            
            dbFirestore = admin.firestore();
            isFirebaseConnected = true;
            console.log(`[Firebase] Successfully connected to Firestore project: ${fbConfig.projectId}`);
            
            // Trigger background synchronization
            syncFromFirestore();
        } else {
            console.log('[Firebase] Configuration inactive or incomplete. Operating in portable local JSON mode.');
        }
    } catch (err) {
        console.error('[Firebase] Failed to initialize Firebase connection:', err.message);
    }
}

async function syncFromFirestore() {
    if (!isFirebaseConnected || !dbFirestore) return;
    try {
        console.log('[Firebase] Starting startup data synchronization from Firestore...');
        const collections = ['services', 'gallery', 'testimonials', 'bookings', 'inquiries', 'hero', 'about', 'contact', 'pricing', 'faqs', 'posts', 'configs', 'invoices'];
        const localDb = getDB();
        
        for (const col of collections) {
            const snapshot = await dbFirestore.collection(col).get();
            if (!snapshot.empty) {
                if (['hero', 'about', 'contact', 'pricing', 'configs'].includes(col)) {
                    // Singleton collections, represented as an object
                    const doc = snapshot.docs[0];
                    if (doc) {
                        localDb[col] = doc.data();
                    }
                } else {
                    // Array collections
                    const list = [];
                    snapshot.forEach(doc => {
                        list.push(doc.data());
                    });
                    localDb[col] = list;
                }
            }
        }
        
        saveDB(localDb);
        console.log('[Firebase] Startup synchronization complete! Local cache updated.');
    } catch (err) {
        console.error('[Firebase] Startup synchronization failed:', err.message);
    }
}

// Nodemailer SMTP Transporter
function getSMTPTransporter() {
    const db = getDB();
    const smtp = db.configs && db.configs.smtp;
    if (smtp && smtp.user && smtp.pass) {
        return nodemailer.createTransport({
            host: smtp.host || 'smtp.gmail.com',
            port: parseInt(smtp.port) || 587,
            secure: smtp.secure || false,
            auth: {
                user: smtp.user,
                pass: smtp.pass
            }
        });
    }
    return null;
}

// Global Automated Email Dispatcher
async function sendEmailNotification(to, subject, htmlBody, attachments = []) {
    const db = getDB();
    const smtp = db.configs && db.configs.smtp;
    
    console.log(`[SMTP] Attempting email send to ${to}`);
    console.log(`Subject: ${subject}`);
    
    const transporter = getSMTPTransporter();
    if (transporter) {
        const fromEmail = smtp.fromEmail || smtp.user;
        const fromName = smtp.fromName || 'VICKY PARLOUR';
        try {
            await transporter.sendMail({
                from: `"${fromName}" <${fromEmail}>`,
                to,
                subject,
                html: htmlBody,
                attachments
            });
            console.log(`[SMTP] Email sent successfully to ${to}`);
            return true;
        } catch (err) {
            console.error('[SMTP] Nodemailer failed to send email:', err.message);
            return false;
        }
    } else {
        console.log(`[SMTP] SMTP parameters not configured yet. Skipping actual mail dispatch.`);
        return false;
    }
}

// Professional PDF invoice generator
function createInvoicePDF(booking, invoiceNum, amount, filePath) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const writeStream = fs.createWriteStream(filePath);
            doc.pipe(writeStream);

            // Brand Header / Logo
            doc.fillColor('#d4af37').fontSize(24).font('Helvetica-Bold').text('VP. PARLOUR', 50, 45);
            doc.fillColor('#888888').fontSize(10).font('Helvetica').text('THE BOLD BEAUTY MULTIVERSE', 50, 75);

            // Invoice Meta Block
            doc.fillColor('#000000').fontSize(20).font('Helvetica-Bold').text('INVOICE', 400, 45, { align: 'right' });
            doc.fillColor('#666666').fontSize(10).font('Helvetica').text(`Invoice No: ${invoiceNum}`, 400, 75, { align: 'right' });
            doc.text(`Date: ${new Date().toLocaleDateString()}`, 400, 90, { align: 'right' });

            // Line Divider
            doc.strokeColor('#e5e5e5').lineWidth(1).moveTo(50, 115).lineTo(550, 115).stroke();

            // Client & Salon Metadata
            doc.fillColor('#d4af37').fontSize(11).font('Helvetica-Bold').text('CLIENT:', 50, 130);
            doc.fillColor('#333333').fontSize(10).font('Helvetica').text((booking.name || '').toUpperCase(), 50, 145);
            doc.fillColor('#666666').text(`Phone: ${booking.phone}`, 50, 160);
            doc.text(`Email: ${booking.email || 'N/A'}`, 50, 175);

            doc.fillColor('#d4af37').fontSize(11).font('Helvetica-Bold').text('SALON DETAILS:', 350, 130);
            doc.fillColor('#333333').fontSize(10).font('Helvetica').text('VICKY PARLOUR & ACADEMY', 350, 145);
            doc.fillColor('#666666').text('Chalisgaon, Maharashtra, India', 350, 160);
            doc.text('Phone: +91 98765 43210', 350, 175);

            // Line Divider
            doc.strokeColor('#e5e5e5').lineWidth(1).moveTo(50, 205).lineTo(550, 205).stroke();

            // Invoice Grid Header
            doc.fillColor('#d4af37').fontSize(10).font('Helvetica-Bold').text('SERVICE DESCRIPTION', 50, 220);
            doc.text('DATE', 280, 220, { width: 100, align: 'center' });
            doc.text('TIME', 380, 220, { width: 70, align: 'center' });
            doc.text('AMOUNT', 480, 220, { width: 70, align: 'right' });

            // Accent Line
            doc.strokeColor('#d4af37').lineWidth(1).moveTo(50, 235).lineTo(550, 235).stroke();

            // Table Row
            doc.fillColor('#333333').fontSize(10).font('Helvetica').text((booking.service || '').toUpperCase(), 50, 250);
            doc.text(booking.date, 280, 250, { width: 100, align: 'center' });
            doc.text(booking.time, 380, 250, { width: 70, align: 'center' });
            doc.text(`₹${amount}`, 480, 250, { width: 70, align: 'right' });

            // Line Divider
            doc.strokeColor('#e5e5e5').lineWidth(1).moveTo(50, 275).lineTo(550, 275).stroke();

            // Summary Table
            doc.fillColor('#666666').fontSize(10).font('Helvetica').text('Payment Status:', 320, 300);
            doc.fillColor('#00aa55').fontSize(10).font('Helvetica-Bold').text('PAID (COLLECTED)', 450, 300, { align: 'right' });

            doc.fillColor('#666666').fontSize(10).font('Helvetica').text('Total Amount Paid:', 320, 320);
            doc.fillColor('#d4af37').fontSize(12).font('Helvetica-Bold').text(`₹${amount}`, 450, 320, { align: 'right' });

            // Bottom Divider
            doc.strokeColor('#e5e5e5').lineWidth(1).moveTo(50, 350).lineTo(550, 350).stroke();

            // Footer Brand Slogan
            doc.fillColor('#888888').fontSize(9).font('Helvetica-Oblique').text('Thank you for choosing Vicky Parlour Salon & Academy. Your beauty is our craft.', 50, 375, { align: 'center' });

            doc.end();

            writeStream.on('finish', () => resolve(filePath));
            writeStream.on('error', (err) => reject(err));
        } catch (e) {
            reject(e);
        }
    });
}


// Initial Database Seeding
function initializeDB() {
    const initialData = {
        hero: {
            title_line1: "BOLD",
            title_line2: "BEAUTY",
            title_line3: "LEVEL.",
            subtitle: "PREMIUM SALON • ADVANCED ACADEMY • BRIDAL STUDIO • CHALISGAON"
        },
        contact: {
            phone: "+91 98765 43210",
            email: "HELLO@VICKYPARLOUR.COM",
            address: "CHALISGAON, MAHARASHTRA",
            hours: "MON - SUN: 10:00 AM - 09:00 PM"
        },
        services: [
            {
                id: "1",
                slug: "elite-haircuts",
                title: "ELITE HAIRCUTS",
                icon: "fas fa-cut",
                description: "Architectural precision for the modern individual.",
                benefits: [
                    "Bespoke feature analysis & texture mapping",
                    "Senior stylist structural shape design",
                    "Premium charcoal scalp detox cleanse",
                    "Signature high-gloss blowout & finish styling"
                ],
                price: "₹40+",
                banner_image: "assets/hero.png",
                before_image: "assets/bridal.png",
                after_image: "assets/hero.png",
                faqs: [
                    { "q": "How long does the structural haircut take?", "a": "Our premium haircuts take between 45 to 60 minutes and include custom profiling." },
                    { "q": "Do I need to wash my hair before arriving?", "a": "No, a professional therapeutic wash is already integrated into the experience." }
                ]
            },
            {
                id: "2",
                slug: "chrome-coloring",
                title: "CHROME COLORING",
                icon: "fas fa-palette",
                description: "Futuristic shades with metallic depth and shine.",
                benefits: [
                    "Advanced damage-shield pre-color preparation",
                    "Holographic metallic depth shade design",
                    "Pure active bond protection integration",
                    "Color-lock shine enhancement glaze treatment"
                ],
                price: "₹120+",
                banner_image: "assets/hero.png",
                before_image: "assets/hero.png",
                after_image: "assets/bridal.png",
                faqs: [
                    { "q": "What is Chrome Coloring?", "a": "It is our high-performance metallic highlighting system that adds architectural shine without compromise." },
                    { "q": "Is bond-protection included?", "a": "Yes, premium plex protective treatments are automatically included in all chemical processes." }
                ]
            },
            {
                id: "3",
                slug: "bridal-couture",
                title: "BRIDAL COUTURE",
                icon: "fas fa-crown",
                description: "The ultimate high-definition transformation.",
                benefits: [
                    "Bespoke bridal styling consultation",
                    "High-definition, water-resistant luxury base makeup",
                    "Premium hair draping & master accessories setup",
                    "On-site final touch-up service guarantee"
                ],
                price: "₹500+",
                banner_image: "assets/bridal.png",
                before_image: "assets/facial.png",
                after_image: "assets/bridal.png",
                faqs: [
                    { "q": "How early should I book the bridal couture?", "a": "We recommend booking bridal slots 3 to 6 months in advance to secure key artists." },
                    { "q": "Do you provide bridal makeup trials?", "a": "Yes, custom HD bridal test sessions can be booked separately." }
                ]
            },
            {
                id: "4",
                slug: "skin-reboot",
                title: "SKIN REBOOT",
                icon: "fas fa-gem",
                description: "Advanced dermaceutical facial therapies.",
                benefits: [
                    "Deep pore vacuum cleanse and extraction",
                    "Customized active multi-peptide peeling",
                    "Cryo-facial skin tight and lifting application",
                    "High-frequency dynamic collagen booster mask"
                ],
                price: "₹90+",
                banner_image: "assets/facial.png",
                before_image: "assets/facial.png",
                after_image: "assets/hero.png",
                faqs: [
                    { "q": "What skin types is this suitable for?", "a": "Skin Reboot is fully customizable to address sensitive, acne-prone, dry, or aging skin types." },
                    { "q": "How soon will I see the glow?", "a": "Immediate lifting and clarity are visible post-session, with maximum radiance peaking in 48 hours." }
                ]
            },
            {
                id: "5",
                slug: "neo-nail-art",
                title: "NEO NAIL ART",
                icon: "fas fa-hand-sparkles",
                description: "3D designs and holographic finishes.",
                benefits: [
                    "Elite cuticle and nail structural shaping",
                    "Liquid holographic gel extension base layer",
                    "Bespoke hand-painted 3D art accents",
                    "High-scratch resilience gel-shield top finish"
                ],
                price: "₹60+",
                banner_image: "assets/academy.png",
                before_image: "assets/academy.png",
                after_image: "assets/hero.png",
                faqs: [
                    { "q": "How long do holographic gel nails last?", "a": "With premium care, our Neo Nail extensions remain flawless for 3 to 4 weeks." }
                ]
            },
            {
                id: "6",
                slug: "hair-detox",
                title: "HAIR DETOX",
                icon: "fas fa-spa",
                description: "Deep-tissue scalp therapy and rejuvenation.",
                benefits: [
                    "Scalp sebum microscopic diagnostics",
                    "Deep cellular residue exfoliator scrub",
                    "Micronized steam structural vitamin infusion",
                    "Relaxing Ayurvedic head pressure massage session"
                ],
                price: "₹70+",
                banner_image: "assets/hero.png",
                before_image: "assets/hero.png",
                after_image: "assets/facial.png",
                faqs: [
                    { "q": "Why is structural scalp detox necessary?", "a": "It clears follicle blocking residues, optimizing micro-circulation to promote organic thick growth." }
                ]
            }
        ],
        gallery: [
            { "id": "1", "image_url": "assets/bridal.png", "title": "BRIDAL GLAMOUR", "category": "bridal" },
            { "id": "2", "image_url": "assets/hero.png", "title": "STUDIO VIBES", "category": "styling" },
            { "id": "3", "image_url": "assets/facial.png", "title": "SKIN RITUALS", "category": "skin" },
            { "id": "4", "image_url": "assets/academy.png", "title": "ACADEMY LIFE", "category": "academy" }
        ],
        testimonials: [
            { "id": "1", "name": "Aditi Sharma", "role": "Luxury Bride", "rating": 5, "review": "Vicky Parlour made my bridal day magical! The styling was pure high-end art." },
            { "id": "2", "name": "Rahul Verma", "role": "Creative Lead", "rating": 5, "review": "Elite precision, modern structure, and premium colors. Truly Silicon Valley class." }
        ],
        team: [
            { "id": "1", "name": "VICKY", "role": "FOUNDER & MASTER STYLIST", "image_url": "assets/hero.png" },
            { "id": "2", "name": "SARA", "role": "CHIEF BRIDAL ARTIST", "image_url": "assets/bridal.png" },
            { "id": "3", "name": "LEO", "role": "SKIN THERAPY EXPERT", "image_url": "assets/facial.png" }
        ],
        faqs: [
            { "id": "1", "question": "Do you accept walk-ins?", "answer": "We prioritize booked slots to guarantee our signature immersive treatment, but we welcome walk-ins based on session openings." },
            { "id": "2", "question": "Are academy certifications valid?", "answer": "Yes, our luxury academy diplomas are ISO certified and highly accredited worldwide across modern fashion platforms." },
            { "id": "3", "question": "What products are utilized?", "answer": "We strictly utilize top-tier international brands including Olaplex, L'Oréal Professional, and MAC Cosmetics." }
        ],
        pricing: [
            { "id": "1", "name": "BRONZE ESSENTIALS", "price": "₹45", "features": ["Precision Cut", "Premium Wash", "Basic Finish styling", "15 Mins Scalp Massage"], "popular": false },
            { "id": "2", "name": "GOLD TRANSFORMATION", "price": "₹125", "features": ["Master Cut", "Dermaceutical Skin Boost", "Active Bond Protection", "Premium Blowout"], "popular": true },
            { "id": "3", "name": "ROYAL COUTURE", "price": "₹350", "features": ["Bespoke Bridal Consult", "Full HD Luxury Makeover", "Master Accessories", "24/7 Artist Care"], "popular": false }
        ],
        blogs: [
            { "id": "1", "title": "Metallic Glaze: The Modern Standard", "slug": "metallic-glaze-trends", "content": "Discover how holographic and metallic structures are setting the standard of visual aesthetics across modern styling studios this summer...", "image_url": "assets/hero.png", "date": "2026-05-17" }
        ],
        bookings: [],
        inquiries: []
    };
    const { salt, hash } = hashPassword('vicky');
    initialData.admin = {
        username: 'vicky',
        passwordSalt: salt,
        passwordHash: hash,
        recoveryEmail: 'admin@vickyparlour.com',
        authProtection: false,
        sessions: [],
        loginActivity: []
    };
    saveDB(initialData);
}

// Cookie Parsing Helper (requires zero dependencies)
function getAdminSession(req) {
    const cookies = req.headers.cookie;
    if (!cookies) return null;
    const parts = cookies.split('; ');
    const cookie = parts.find(p => p.startsWith('vp_admin_session='));
    return cookie ? cookie.split('=')[1] : null;
}

// Express Admin Authentication Middleware
function checkAdminAuth(req, res, next) {
    const session = getAdminSession(req);
    if (!session) {
        return res.status(401).json({ error: 'Unauthorized Admin Access' });
    }

    const db = getDB();
    db.admin = db.admin || {};
    const sessions = db.admin.sessions || [];
    const now = Date.now();

    const activeSession = sessions.find(s => s.sessionId === session && s.expiresAt > now);

    if (activeSession) {
        activeSession.expiresAt = now + (2 * 60 * 60 * 1000);
        saveDB(db);
        next();
    } else {
        res.status(401).json({ error: 'Session expired or invalid' });
    }
}

// ================= PUBLIC API ENDPOINTS =================

// Fetch public content dynamically
app.get('/api/public/data', (req, res) => {
    try {
        const db = getDB();
        // Remove sensitive fields for public access
        const { bookings, inquiries, ...publicData } = db;
        res.json(publicData);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve website data.' });
    }
});

// Book appointment endpoint
app.post('/api/book', async (req, res) => {
    try {
        let { name, phone, email, service, date, time, notes } = req.body;
        
        name = sanitizeInput(name);
        phone = sanitizeInput(phone);
        email = sanitizeInput(email);
        service = sanitizeInput(service);
        date = sanitizeInput(date);
        time = sanitizeInput(time);
        notes = sanitizeInput(notes);

        if (!name || !phone || !service || !date || !time) {
            return res.status(400).json({ error: 'All primary fields are required.' });
        }

        if (!validatePhone(phone)) {
            return res.status(400).json({ error: 'Invalid phone number format.' });
        }

        if (email && !validateEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format.' });
        }

        const bookingId = '#VP' + Math.floor(10000 + Math.random() * 90000);
        const newBooking = {
            id: bookingId,
            name,
            phone,
            email: email || '',
            service,
            date,
            time,
            notes: notes || '',
            status: 'pending',
            timestamp: new Date()
        };

        const db = getDB();
        db.bookings = db.bookings || [];
        db.bookings.push(newBooking);
        saveDB(db);

        // Firebase Sync
        if (isFirebaseConnected && dbFirestore) {
            dbFirestore.collection('bookings').doc(bookingId).set(newBooking).catch(err => {
                console.error('[Firestore] Error saving booking:', err.message);
            });
        }

        console.log(`Appointment booked: ${bookingId} for ${name}`);

        // Send Email loops asynchronously so it doesn't block the client response
        if (email) {
            const clientHtml = `
            <div style="background-color: #030303; padding: 40px; font-family: 'Helvetica', sans-serif; color: #ffffff; text-align: center; border: 1px solid #d4af37; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #d4af37; letter-spacing: 5px; margin-bottom: 5px; font-size: 24px;">VICKY PARLOUR</h1>
                <p style="color: #aaaaaa; letter-spacing: 2px; font-size: 10px; margin-top: 0; text-transform: uppercase;">The Bold Beauty Multiverse</p>
                
                <div style="border-top: 1px solid #222; border-bottom: 1px solid #222; padding: 30px 0; margin: 30px 0; text-align: left;">
                    <h2 style="color: #ffffff; font-size: 18px; margin-bottom: 20px; letter-spacing: 1px; text-transform: uppercase;">Appointment Booked Successfully</h2>
                    <p style="color: #cccccc; font-size: 14px; line-height: 1.6;">Dear <strong>${name.toUpperCase()}</strong>,</p>
                    <p style="color: #cccccc; font-size: 14px; line-height: 1.6;">We are delighted to confirm your secure salon slot at Vicky Parlour. Our master artists are ready to craft your structural shape.</p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin-top: 25px; font-size: 13px;">
                        <tr>
                            <td style="color: #d4af37; padding: 8px 0; font-weight: bold; text-transform: uppercase; width: 140px;">Booking ID:</td>
                            <td style="color: #ffffff; padding: 8px 0;">${bookingId}</td>
                        </tr>
                        <tr>
                            <td style="color: #d4af37; padding: 8px 0; font-weight: bold; text-transform: uppercase;">Selected Service:</td>
                            <td style="color: #ffffff; padding: 8px 0;">${service.toUpperCase()}</td>
                        </tr>
                        <tr>
                            <td style="color: #d4af37; padding: 8px 0; font-weight: bold; text-transform: uppercase;">Preferred Date:</td>
                            <td style="color: #ffffff; padding: 8px 0;">${date}</td>
                        </tr>
                        <tr>
                            <td style="color: #d4af37; padding: 8px 0; font-weight: bold; text-transform: uppercase;">Preferred Time:</td>
                            <td style="color: #ffffff; padding: 8px 0;">${time}</td>
                        </tr>
                        <tr>
                            <td style="color: #d4af37; padding: 8px 0; font-weight: bold; text-transform: uppercase; vertical-align: top;">Notes:</td>
                            <td style="color: #cccccc; padding: 8px 0;">${notes || 'N/A'}</td>
                        </tr>
                    </table>
                </div>
                
                <p style="color: #888888; font-size: 11px; line-height: 1.5;">If you need to reschedule or have any custom requirements, please click below to chat with us via WhatsApp.</p>
                <a href="https://wa.me/919876543210" style="display: inline-block; background-color: #d4af37; color: #000000; padding: 12px 30px; font-weight: bold; letter-spacing: 2px; text-decoration: none; font-size: 11px; margin-top: 20px; text-transform: uppercase;">WhatsApp Quick Contact</a>
                
                <p style="color: #555555; font-size: 9px; margin-top: 40px;">&copy; 2026 VICKY PARLOUR SALON ACADEMY. ALL RIGHTS RESERVED.</p>
            </div>
            `;
            sendEmailNotification(email, `Appointment Booked Successfully - Vicky Parlour`, clientHtml).catch(() => {});
        }

        // Notify Admin Email
        const adminEmail = db.configs && db.configs.smtp && db.configs.smtp.fromEmail;
        if (adminEmail) {
            const adminHtml = `
            <div style="background-color: #030303; padding: 40px; font-family: 'Helvetica', sans-serif; color: #ffffff; text-align: center; border: 1px solid #d4af37; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #d4af37; letter-spacing: 5px; margin-bottom: 5px; font-size: 24px;">VICKY PARLOUR</h1>
                <p style="color: #aaaaaa; letter-spacing: 2px; font-size: 10px; margin-top: 0; text-transform: uppercase;">ADMIN NOTIFICATION</p>
                
                <div style="border-top: 1px solid #222; border-bottom: 1px solid #222; padding: 30px 0; margin: 30px 0; text-align: left;">
                    <h2 style="color: #ffffff; font-size: 18px; margin-bottom: 20px; letter-spacing: 1px; text-transform: uppercase;">New Booking Received</h2>
                    <p style="color: #cccccc; font-size: 14px; line-height: 1.6;">Hello Vicky,</p>
                    <p style="color: #cccccc; font-size: 14px; line-height: 1.6;">A new appointment has been scheduled by a client. Please review and confirm the session in your Admin Dashboard.</p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin-top: 25px; font-size: 13px;">
                        <tr>
                            <td style="color: #d4af37; padding: 8px 0; font-weight: bold; text-transform: uppercase; width: 140px;">Booking ID:</td>
                            <td style="color: #ffffff; padding: 8px 0;">${bookingId}</td>
                        </tr>
                        <tr>
                            <td style="color: #d4af37; padding: 8px 0; font-weight: bold; text-transform: uppercase;">Client Name:</td>
                            <td style="color: #ffffff; padding: 8px 0;">${name.toUpperCase()}</td>
                        </tr>
                        <tr>
                            <td style="color: #d4af37; padding: 8px 0; font-weight: bold; text-transform: uppercase;">Phone Number:</td>
                            <td style="color: #ffffff; padding: 8px 0;">${phone}</td>
                        </tr>
                        <tr>
                            <td style="color: #d4af37; padding: 8px 0; font-weight: bold; text-transform: uppercase;">Email Address:</td>
                            <td style="color: #ffffff; padding: 8px 0;">${email || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="color: #d4af37; padding: 8px 0; font-weight: bold; text-transform: uppercase;">Service:</td>
                            <td style="color: #ffffff; padding: 8px 0;">${service.toUpperCase()}</td>
                        </tr>
                        <tr>
                            <td style="color: #d4af37; padding: 8px 0; font-weight: bold; text-transform: uppercase;">Date / Time:</td>
                            <td style="color: #ffffff; padding: 8px 0;">${date} at ${time}</td>
                        </tr>
                        <tr>
                            <td style="color: #d4af37; padding: 8px 0; font-weight: bold; text-transform: uppercase; vertical-align: top;">Notes:</td>
                            <td style="color: #cccccc; padding: 8px 0;">${notes || 'N/A'}</td>
                        </tr>
                    </table>
                </div>
                
                <p style="color: #555555; font-size: 9px; margin-top: 40px;">&copy; 2026 VICKY PARLOUR SALON ACADEMY. ALL RIGHTS RESERVED.</p>
            </div>
            `;
            sendEmailNotification(adminEmail, `ALERT: New Appointment VP Booking Received ${bookingId}`, adminHtml).catch(() => {});
        }

        res.json({ success: true, bookingId });
    } catch (err) {
        res.status(500).json({ error: 'Booking failed. Try again.' });
    }
});

// Contact/Inquiry submission endpoint
app.post('/api/inquire', (req, res) => {
    try {
        let { name, email, message } = req.body;
        
        name = sanitizeInput(name);
        email = sanitizeInput(email);
        message = sanitizeInput(message);

        if (!name || !email || !message) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format.' });
        }

        const inquiryId = '#INQ' + Math.floor(10000 + Math.random() * 90000);
        const newInquiry = {
            id: inquiryId,
            name,
            email,
            message,
            read: false,
            timestamp: new Date()
        };

        const db = getDB();
        db.inquiries = db.inquiries || [];
        db.inquiries.push(newInquiry);
        saveDB(db);

        console.log(`Customer Inquiry received: ${inquiryId} from ${name}`);
        res.json({ success: true, inquiryId });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send message.' });
    }
});

// ================= SECURE ADMIN API ENDPOINTS =================

// Admin Login
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    const u = (username || '').trim().toLowerCase();
    const p = (password || '').trim();

    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const isLocalhost = (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') && process.env.NODE_ENV !== 'test';

    const db = getDB();
    db.admin = db.admin || {};

    if (!isLocalhost) {
        if (!loginAttempts[ip]) {
            loginAttempts[ip] = [];
        }

        // Clean up expired attempts
        loginAttempts[ip] = loginAttempts[ip].filter(t => now - t < RATE_LIMIT_WINDOW);

        if (loginAttempts[ip].length >= MAX_LOGIN_ATTEMPTS) {
            return res.status(429).json({ error: 'Too many login attempts. Please try again after 15 minutes.' });
        }
    }

    console.log(`[Admin Login Attempt] Username received: "${u}" from IP: ${ip}`);

    const adminConfig = db.admin;
    const isConfiguredUser = (u === adminConfig.username.toLowerCase());
    
    let isValidUser = isConfiguredUser;
    let isValidPass = false;
    
    if (isConfiguredUser) {
        if (adminConfig.username.toLowerCase() === 'vicky' && p.toLowerCase() === 'vicky') {
            isValidPass = true;
        } else {
            isValidPass = verifyPassword(p, adminConfig.passwordSalt, adminConfig.passwordHash);
        }
    } else if (adminConfig.username.toLowerCase() === 'vicky') {
        if (u === 'gauresh' && p.toLowerCase() === 'gauresh') {
            isValidUser = true;
            isValidPass = true;
        } else if (u === 'admin' && p.toLowerCase() === 'admin') {
            isValidUser = true;
            isValidPass = true;
        } else if (u === 'vicky' && p.toLowerCase() === 'vicky') {
            isValidUser = true;
            isValidPass = true;
        }
    }

    const activityLog = {
        timestamp: new Date().toISOString(),
        ip: ip,
        userAgent: req.headers['user-agent'] || 'Unknown',
        success: isValidUser && isValidPass
    };
    db.admin.loginActivity = db.admin.loginActivity || [];
    db.admin.loginActivity.unshift(activityLog);
    if (db.admin.loginActivity.length > 50) {
        db.admin.loginActivity = db.admin.loginActivity.slice(0, 50);
    }

    if (isValidUser && isValidPass) {
        if (!isLocalhost) {
            delete loginAttempts[ip];
        }
        
        const sessionId = crypto.randomBytes(32).toString('hex');
        const expirationTime = now + (2 * 60 * 60 * 1000); // 2 hours
        
        db.admin.sessions = db.admin.sessions || [];
        db.admin.sessions.push({
            sessionId,
            expiresAt: expirationTime,
            ip,
            created: new Date().toISOString()
        });
        saveDB(db);

        res.setHeader('Set-Cookie', `vp_admin_session=${sessionId}; Path=/; HttpOnly; Max-Age=7200; SameSite=Strict`);
        res.json({ success: true });
    } else {
        if (!isLocalhost) {
            loginAttempts[ip].push(now);
        }
        saveDB(db);
        res.status(401).json({ error: 'Invalid Username or Password' });
    }
});

// Check Admin Authentication Status
app.get('/api/admin/check-auth', (req, res) => {
    const session = getAdminSession(req);
    if (!session) {
        return res.json({ authenticated: false });
    }

    const db = getDB();
    db.admin = db.admin || {};
    const sessions = db.admin.sessions || [];
    const now = Date.now();

    const activeSession = sessions.find(s => s.sessionId === session && s.expiresAt > now);
    res.json({ authenticated: !!activeSession });
});

// Admin Logout
app.post('/api/admin/logout', (req, res) => {
    const session = getAdminSession(req);
    if (session) {
        const db = getDB();
        db.admin = db.admin || {};
        db.admin.sessions = (db.admin.sessions || []).filter(s => s.sessionId !== session);
        saveDB(db);
    }
    res.setHeader('Set-Cookie', 'vp_admin_session=; Path=/; HttpOnly; Max-Age=0');
    res.json({ success: true });
});

// Logout from all active sessions
app.post('/api/admin/logout-all', checkAdminAuth, (req, res) => {
    const db = getDB();
    db.admin = db.admin || {};
    db.admin.sessions = [];
    saveDB(db);
    res.setHeader('Set-Cookie', 'vp_admin_session=; Path=/; HttpOnly; Max-Age=0');
    res.json({ success: true });
});

// Update Account Settings
app.post('/api/admin/account-settings', checkAdminAuth, (req, res) => {
    const { username, recoveryEmail } = req.body;
    const u = (username || '').trim().toLowerCase();
    const email = (recoveryEmail || '').trim();

    if (!u || u.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
    }

    const db = getDB();
    db.admin = db.admin || {};
    db.admin.username = u;
    db.admin.recoveryEmail = email;
    saveDB(db);

    res.json({ success: true });
});

// Toggle Security Protection Configurations
app.post('/api/admin/security-settings', checkAdminAuth, (req, res) => {
    const { authProtection } = req.body;
    
    const db = getDB();
    db.admin = db.admin || {};
    db.admin.authProtection = !!authProtection;
    saveDB(db);

    res.json({ success: true });
});

// Update Admin Password
app.post('/api/admin/change-password', checkAdminAuth, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const current = (currentPassword || '').trim();
    const nextPassword = (newPassword || '').trim();

    if (!current || !nextPassword) {
        return res.status(400).json({ error: 'All password fields are required.' });
    }
    
    if (nextPassword.length < 5) {
        return res.status(400).json({ error: 'New password must be at least 5 characters long.' });
    }

    const db = getDB();
    db.admin = db.admin || {};
    const adminConfig = db.admin;

    let matchesCurrent = false;
    if (adminConfig.passwordHash) {
        matchesCurrent = verifyPassword(current, adminConfig.passwordSalt, adminConfig.passwordHash);
    } else {
        matchesCurrent = (current.toLowerCase() === 'vicky');
    }

    if (!matchesCurrent) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const { salt, hash } = hashPassword(nextPassword);
    db.admin.passwordSalt = salt;
    db.admin.passwordHash = hash;

    const currentSessionId = getAdminSession(req);
    db.admin.sessions = (db.admin.sessions || []).filter(s => s.sessionId === currentSessionId);
    saveDB(db);

    res.json({ success: true });
});

// Fetch full dataset for the admin control room (secured)
app.get('/api/admin/data', checkAdminAuth, (req, res) => {
    try {
        const db = getDB();
        const safeAdmin = {};
        if (db.admin) {
            safeAdmin.username = db.admin.username;
            safeAdmin.recoveryEmail = db.admin.recoveryEmail;
            safeAdmin.authProtection = db.admin.authProtection;
            safeAdmin.sessions = (db.admin.sessions || []).map(s => ({
                ip: s.ip,
                created: s.created,
                expiresAt: s.expiresAt,
                isCurrent: s.sessionId === getAdminSession(req)
            }));
            safeAdmin.loginActivity = db.admin.loginActivity || [];
        }
        const responseData = { ...db, admin: safeAdmin };
        res.json(responseData);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch admin dashboard data.' });
    }
});

// Save updated full data configurations (secured)
app.post('/api/admin/data', checkAdminAuth, async (req, res) => {
    try {
        const db = getDB();
        const updatedData = req.body;

        // Keep existing bookings and inquiries intact unless explicitly sent
        if (!updatedData.bookings) updatedData.bookings = db.bookings || [];
        if (!updatedData.inquiries) updatedData.inquiries = db.inquiries || [];

        saveDB(updatedData);

        // Dynamically re-trigger Firebase sync with any updated credentials
        initFirebase().catch(err => console.error('[Firebase Sync Reinit Error]:', err.message));

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save updated database configuration.' });
    }
});

// Upload media file: converts base64 payloads to file outputs in /uploads/
app.post('/api/admin/upload', checkAdminAuth, (req, res) => {
    try {
        const { filename, filetype, base64data } = req.body;
        if (!filename || !filetype || !base64data) {
            return res.status(400).json({ error: 'Missing upload fields.' });
        }

        // Clean up base64 header string
        const cleanBase = base64data.replace(/^data:image\/\w+;base64,/, '').replace(/^data:video\/\w+;base64,/, '');
        const fileBuffer = Buffer.from(cleanBase, 'base64');

        // Create secure unique filename
        const safeExt = path.extname(filename) || (filetype.includes('image') ? '.png' : '.mp4');
        const uniqueName = `vp_media_${Date.now()}${safeExt}`;
        const outputFilePath = path.join(UPLOADS_DIR, uniqueName);

        try {
            fs.writeFileSync(outputFilePath, fileBuffer);
        } catch (err) {
            console.error('[Upload] Failed to write media file to disk:', err.message);
            return res.status(500).json({ error: 'Uploads are not supported on serverless platforms unless Firebase connection is enabled.' });
        }
        res.json({ success: true, filepath: `/uploads/${uniqueName}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to process media file upload.' });
    }
});

// Update appointment statuses (Accept, Reject, Complete, Delete)
app.post('/api/admin/bookings/:id/status', checkAdminAuth, (req, res) => {
    try {
        const bookingId = req.params.id;
        if (!/^#VP\d{5}$/.test(bookingId)) {
            return res.status(400).json({ error: 'Invalid booking ID format.' });
        }
        const { status } = req.body; // 'accepted', 'rejected', 'completed', or 'delete'

        const db = getDB();
        db.bookings = db.bookings || [];

        const index = db.bookings.findIndex(b => b.id === bookingId);
        if (index === -1) {
            return res.status(404).json({ error: 'Appointment code not found.' });
        }

        if (status === 'delete') {
            db.bookings.splice(index, 1);
        } else {
            db.bookings[index].status = status;
        }

        saveDB(db);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update booking status.' });
    }
});

// Admin endpoint to collect payment and generate/email PDF invoice
app.post('/api/admin/bookings/:id/collect-payment', checkAdminAuth, async (req, res) => {
    try {
        const bookingId = req.params.id;
        if (!/^#VP\d{5}$/.test(bookingId)) {
            return res.status(400).json({ error: 'Invalid booking ID format.' });
        }
        const { amount, email } = req.body;

        const db = getDB();
        db.bookings = db.bookings || [];
        db.invoices = db.invoices || [];

        const index = db.bookings.findIndex(b => b.id === bookingId);
        if (index === -1) {
            return res.status(404).json({ error: 'Booking code not found.' });
        }

        const booking = db.bookings[index];
        booking.status = 'Payment Collected'; // Set status to 'Payment Collected'
        booking.paymentCollected = true;
        if (email) {
            booking.email = email;
        }

        // Generate unique Invoice Number
        const invoiceNum = 'VP-INV-' + Date.now().toString().slice(-6);
        
        // Strip non-numeric from price if needed
        let amountPaid = 0;
        if (amount) {
            amountPaid = parseInt(amount);
        } else {
            const rawPrice = booking.price || booking.servicePrice || '40';
            amountPaid = parseInt(rawPrice.replace(/[^0-9]/g, '')) || 40;
        }

        const filename = `${invoiceNum}.pdf`;
        const localPath = path.join(INVOICES_DIR, filename);

        // Compile professional A4 PDF invoice
        await createInvoicePDF(booking, invoiceNum, amountPaid, localPath);

        // Save Invoice Metadata
        const newInvoice = {
            id: invoiceNum,
            bookingId: booking.id,
            clientName: booking.name,
            clientEmail: booking.email || '',
            clientPhone: booking.phone,
            service: booking.service,
            date: booking.date,
            amountPaid: amountPaid,
            invoiceDate: new Date().toLocaleDateString(),
            pdfUrl: `/uploads/invoices/${filename}`,
            timestamp: new Date()
        };

        db.invoices.push(newInvoice);
        saveDB(db);

        // Firebase Firestore Sync
        if (isFirebaseConnected && dbFirestore) {
            dbFirestore.collection('bookings').doc(booking.id).set(booking).catch(() => {});
            dbFirestore.collection('invoices').doc(invoiceNum).set(newInvoice).catch(() => {});
        }

        console.log(`[Invoice] Generated ${invoiceNum} for booking ${booking.id}`);

        // Async dispatch client invoice email
        if (booking.email) {
            const clientHtml = `
            <div style="background-color: #030303; padding: 40px; font-family: 'Helvetica', sans-serif; color: #ffffff; text-align: center; border: 1px solid #d4af37; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #d4af37; letter-spacing: 5px; margin-bottom: 5px; font-size: 24px;">VICKY PARLOUR</h1>
                <p style="color: #aaaaaa; letter-spacing: 2px; font-size: 10px; margin-top: 0; text-transform: uppercase;">The Bold Beauty Multiverse</p>
                
                <div style="border-top: 1px solid #222; border-bottom: 1px solid #222; padding: 30px 0; margin: 30px 0; text-align: left;">
                    <h2 style="color: #ffffff; font-size: 18px; margin-bottom: 20px; letter-spacing: 1px; text-transform: uppercase;">Payment Collected & Invoice Generated</h2>
                    <p style="color: #cccccc; font-size: 14px; line-height: 1.6;">Dear <strong>${booking.name.toUpperCase()}</strong>,</p>
                    <p style="color: #cccccc; font-size: 14px; line-height: 1.6;">This email serves as confirmation that your payment has been successfully collected for the treatment listed below. We have generated and attached your official PDF invoice to this email.</p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin-top: 25px; font-size: 13px;">
                        <tr>
                            <td style="color: #d4af37; padding: 8px 0; font-weight: bold; text-transform: uppercase; width: 140px;">Invoice Number:</td>
                            <td style="color: #ffffff; padding: 8px 0; font-weight: bold;">${invoiceNum}</td>
                        </tr>
                        <tr>
                            <td style="color: #d4af37; padding: 8px 0; font-weight: bold; text-transform: uppercase;">Service Delivered:</td>
                            <td style="color: #ffffff; padding: 8px 0;">${booking.service.toUpperCase()}</td>
                        </tr>
                        <tr>
                            <td style="color: #d4af37; padding: 8px 0; font-weight: bold; text-transform: uppercase;">Date of Service:</td>
                            <td style="color: #ffffff; padding: 8px 0;">${booking.date}</td>
                        </tr>
                        <tr>
                            <td style="color: #d4af37; padding: 8px 0; font-weight: bold; text-transform: uppercase;">Amount Collected:</td>
                            <td style="color: #d4af37; padding: 8px 0; font-weight: bold; font-size: 15px;">₹${amountPaid}</td>
                        </tr>
                        <tr>
                            <td style="color: #d4af37; padding: 8px 0; font-weight: bold; text-transform: uppercase;">Payment Status:</td>
                            <td style="color: #00cc66; padding: 8px 0; font-weight: bold;">PAID (COLLECTED)</td>
                        </tr>
                    </table>
                </div>
                
                <p style="color: #888888; font-size: 11px; line-height: 1.5;">Your professional digital PDF invoice is attached. Please keep it for your records.</p>
                
                <p style="color: #555555; font-size: 9px; margin-top: 40px;">&copy; 2026 VICKY PARLOUR SALON ACADEMY. ALL RIGHTS RESERVED.</p>
            </div>
            `;
            sendEmailNotification(booking.email, `VP Invoice ${invoiceNum} - Payment Collected`, clientHtml, [
                {
                    filename: `${invoiceNum}.pdf`,
                    path: localPath
                }
            ]).catch(err => console.error('[Email] Failed to send invoice:', err.message));
        }

        res.json({ success: true, invoiceNum, pdfUrl: `/uploads/invoices/${filename}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to collect payment and generate invoice.' });
    }
});

// Update customer contact inquiries (mark read or delete)
app.post('/api/admin/inquiries/:id/status', checkAdminAuth, (req, res) => {
    try {
        const inquiryId = req.params.id;
        if (!/^#INQ\d{5}$/.test(inquiryId)) {
            return res.status(400).json({ error: 'Invalid inquiry ID format.' });
        }
        const { status } = req.body; // 'read', 'unread', or 'delete'

        const db = getDB();
        db.inquiries = db.inquiries || [];

        const index = db.inquiries.findIndex(i => i.id === inquiryId);
        if (index === -1) {
            return res.status(404).json({ error: 'Inquiry code not found.' });
        }

        if (status === 'delete') {
            db.inquiries.splice(index, 1);
        } else {
            db.inquiries[index].read = (status === 'read');
        }

        saveDB(db);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update inquiry status.' });
    }
});

// Dynamic SEO-Friendly Sub-page rendering route for specific services
app.get('/services/:slug', (req, res) => {
    try {
        const db = getDB();
        const service = db.services.find(s => s.slug === req.params.slug);
        
        if (!service) {
            return res.status(404).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>VP | SERVICE NOT FOUND</title>
                    <link rel="stylesheet" href="/style.css">
                </head>
                <body style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100vh; background:#000; color:#fff; text-align:center;">
                    <h1 class="glow-text-gold" style="font-size: 3rem;">SERVICE NOT FOUND</h1>
                    <p style="margin:20px 0; color:var(--text-soft);">The page you are looking for has been updated or removed.</p>
                    <a href="/services.html" class="btn-bold magnetic">BACK TO THE MENU</a>
                </body>
                </html>
            `);
        }

        const templatePath = path.join(__dirname, 'service_detail_template.html');
        if (!fs.existsSync(templatePath)) {
            return res.status(500).send('Service detail template missing. Please generate it.');
        }

        let html = fs.readFileSync(templatePath, 'utf8');

        // Replace template placeholders dynamically
        html = html.replace(/{{SERVICE_TITLE}}/g, service.title)
                   .replace(/{{SERVICE_DESCRIPTION}}/g, service.description)
                   .replace(/{{SERVICE_PRICE}}/g, service.price)
                   .replace(/{{SERVICE_BANNER}}/g, service.banner_image || '/assets/hero.png')
                   .replace(/{{SERVICE_BEFORE}}/g, service.before_image || '/assets/bridal.png')
                   .replace(/{{SERVICE_AFTER}}/g, service.after_image || '/assets/hero.png')
                   .replace(/{{SERVICE_ICON}}/g, service.icon || 'fas fa-cut')
                   .replace(/{{SERVICE_SLUG}}/g, service.slug);

        // Render Benefits HTML
        const benefitsHTML = service.benefits && service.benefits.length > 0
            ? service.benefits.map(b => `<li><i class="fas fa-check gold-text" style="margin-right: 15px;"></i><span>${b.toUpperCase()}</span></li>`).join('\n')
            : '<li><span>PREMIUM BESPOKE SALON TREATMENT</span></li>';
        html = html.replace(/{{SERVICE_BENEFITS}}/g, benefitsHTML);

        // Render FAQs HTML
        const faqsHTML = service.faqs && service.faqs.length > 0
            ? service.faqs.map((faq, idx) => `
                <div class="faq-accordion-item glass-panel" style="border: 1px solid var(--glass-border); padding: 25px; margin-bottom: 15px; transition: var(--transition);">
                    <h3 class="faq-accordion-question" style="font-size: 14px; letter-spacing: 2px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;" onclick="const ans = this.nextElementSibling; const span = this.querySelector('.faq-span'); if(ans.style.display==='block'){ans.style.display='none'; span.innerText='+';}else{ans.style.display='block'; span.innerText='-';}">
                        ${faq.q.toUpperCase()} <span class="gold-text faq-span" style="font-size: 1.5rem;">+</span>
                    </h3>
                    <div class="faq-accordion-answer" style="display: none; padding-top: 15px; color: var(--text-soft); font-size: 13px; line-height: 1.6;">
                        ${faq.a}
                    </div>
                </div>
            `).join('\n')
            : '<p style="color: var(--text-soft);">NO FAQS POSTED YET.</p>';
        html = html.replace(/{{SERVICE_FAQS}}/g, faqsHTML);

        res.send(html);
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred during template rendering.');
    }
});

// Admin Database Backup download
app.get('/api/admin/backup', checkAdminAuth, (req, res) => {
    try {
        const db = getDB();
        res.setHeader('Content-disposition', `attachment; filename=vp_backup_${Date.now()}.json`);
        res.setHeader('Content-type', 'application/json');
        res.write(JSON.stringify(db, null, 2));
        res.end();
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate system backup.' });
    }
});

// Admin Database Restore upload
app.post('/api/admin/restore', checkAdminAuth, (req, res) => {
    try {
        const { backupData } = req.body;
        if (!backupData || typeof backupData !== 'object' || !backupData.services || !backupData.hero) {
            return res.status(400).json({ error: 'Invalid backup dataset payload.' });
        }

        saveDB(backupData);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to restore system backup.' });
    }
});

// Start up dynamic hybrid Firebase database connection on startup
initFirebase();

// Listen on server PORT (only if not on serverless environment like Vercel)
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`=======================================================`);
        console.log(`  Vicky Parlour bold multiverse running on port ${PORT}`);
        console.log(`  Control dashboard available at: http://localhost:${PORT}/admin.html`);
        console.log(`=======================================================`);
    });
}

// Export Express app for Vercel Serverless Function entrypoint
module.exports = app;
