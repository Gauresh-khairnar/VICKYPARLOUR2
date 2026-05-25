function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', () => {

    // 1. LIQUID PRELOADER
    const preloader = document.getElementById('preloader');
    const loaderBar = document.querySelector('.loader-bar');
    
    if (preloader) {
        let width = 0;
        const interval = setInterval(() => {
            width += Math.random() * 30;
            if (width >= 100) {
                width = 100;
                clearInterval(interval);
                setTimeout(() => {
                    gsap.to(preloader, {
                        yPercent: -100,
                        duration: 1.5,
                        ease: 'expo.inOut',
                        onComplete: () => {
                            preloader.style.display = 'none';
                            initMultiverseAnimations();
                        }
                    });
                }, 500);
            }
            loaderBar.style.width = width + '%';
        }, 200);
    } else {
        initMultiverseAnimations();
    }

    // 2. LENIS SMOOTH SCROLL + SKEW EFFECT
    const lenis = new Lenis({
        duration: 1.5,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        smoothWheel: true,
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // 3. MULTIVERSE CURSOR
    const cursor = document.getElementById('custom-cursor');
    const follower = document.getElementById('cursor-follower');

    document.addEventListener('mousemove', (e) => {
        gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: 0.05 });
        gsap.to(follower, { x: e.clientX - 15, y: e.clientY - 15, duration: 0.3, ease: 'power2.out' });
    });

    // 4. MAGNETIC ELEMENTS MULTIVERSE
    const magneticElements = document.querySelectorAll('.magnetic');
    magneticElements.forEach(el => {
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            gsap.to(el, {
                x: x * 0.4,
                y: y * 0.4,
                duration: 0.5,
                ease: 'power2.out'
            });
            cursor.style.transform = 'scale(4)';
            follower.style.borderColor = '#fff';
        });
        
        el.addEventListener('mouseleave', () => {
            gsap.to(el, {
                x: 0,
                y: 0,
                duration: 0.8,
                ease: 'elastic.out(1, 0.3)'
            });
            cursor.style.transform = 'scale(1)';
            follower.style.borderColor = '#d4af37';
        });
    });

    // 5. GSAP MULTIVERSE ANIMATIONS
    gsap.registerPlugin(ScrollTrigger);

    function initMultiverseAnimations() {
        // 1. Scroll Progress
        const progressBar = document.querySelector('.scroll-progress-bar');
        gsap.to(progressBar, {
            width: '100%',
            ease: 'none',
            scrollTrigger: {
                scrub: 0.3,
                trigger: 'body',
                start: 'top top',
                end: 'bottom bottom'
            }
        });

        // 2. Hero Cinematic Reveal
        const heroTl = gsap.timeline();
        heroTl.from('.hero-title span', {
            y: 200,
            opacity: 0,
            duration: 1.8,
            stagger: 0.2,
            ease: 'expo.out'
        })
        .from('.hero-subtitle', {
            opacity: 0,
            letterSpacing: '30px',
            duration: 1.5,
            filter: 'blur(10px)'
        }, '-=1.2')
        .from('.cta-group .btn-bold', {
            y: 50,
            opacity: 0,
            stagger: 0.2,
            duration: 1,
            ease: 'power3.out'
        }, '-=0.8');

        // Hero Parallax Zoom
        gsap.to('#hero canvas', {
            scale: 1.2,
            y: 100,
            scrollTrigger: {
                trigger: '#hero',
                start: 'top top',
                end: 'bottom top',
                scrub: true
            }
        });

        // 3. Split Text Reveal (Manual)
        document.querySelectorAll('.split-text-reveal').forEach(el => {
            const words = el.innerText.split(' ');
            el.innerHTML = words.map(word => `<span class="word-reveal"><span>${word}</span></span>`).join(' ');
            
            gsap.to(el.querySelectorAll('.word-reveal span'), {
                y: 0,
                duration: 1.5,
                stagger: 0.1,
                ease: 'expo.out',
                scrollTrigger: {
                    trigger: el,
                    start: 'top 85%'
                }
            });
        });



        // 5. 3D Card Tilt Effect
        document.querySelectorAll('.service-card-premium, .team-card').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = (y - centerY) / 10;
                const rotateY = (centerX - x) / 10;

                gsap.to(card, {
                    rotateX: rotateX,
                    rotateY: rotateY,
                    scale: 1.05,
                    duration: 0.5,
                    ease: 'power2.out'
                });
            });

            card.addEventListener('mouseleave', () => {
                gsap.to(card, {
                    rotateX: 0,
                    rotateY: 0,
                    scale: 1,
                    duration: 1,
                    ease: 'elastic.out(1, 0.3)'
                });
            });
        });

        // 6. Section Reveal Glow
        gsap.utils.toArray('section').forEach(section => {
            gsap.from(section, {
                opacity: 0,
                y: 100,
                duration: 2,
                filter: 'blur(10px)',
                scrollTrigger: {
                    trigger: section,
                    start: 'top 80%',
                    toggleActions: 'play none none reverse'
                }
            });
        });

        // 7. Navbar Scroll Sophistication
        window.addEventListener('scroll', () => {
            const nav = document.querySelector('nav');
            if (window.scrollY > 100) {
                nav.style.padding = '15px 5%';
                nav.style.background = 'rgba(0,0,0,0.95)';
                nav.style.borderBottom = '1px solid var(--gold)';
            } else {
                nav.style.padding = '40px 5%';
                nav.style.background = 'transparent';
                nav.style.borderBottom = '1px solid transparent';
            }
        });
    }

    // 6. CURSOR GLOW TRAIL
    const createGlowTrail = (e) => {
        const trail = document.createElement('div');
        trail.className = 'cursor-trail';
        trail.style.left = e.clientX + 'px';
        trail.style.top = e.clientY + 'px';
        document.body.appendChild(trail);
        
        gsap.to(trail, {
            scale: 0,
            opacity: 0,
            duration: 0.8,
            onComplete: () => trail.remove()
        });
    };

    document.addEventListener('mousemove', (e) => {
        if (Math.random() > 0.8) createGlowTrail(e);
    });

    // 6. THREE.JS LUXURY MULTIVERSE BACKGROUND
    const initThree = () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        document.getElementById('hero').appendChild(renderer.domElement);
        
        renderer.domElement.style.position = 'absolute';
        renderer.domElement.style.top = '0';
        renderer.domElement.style.left = '0';
        renderer.domElement.style.zIndex = '-2';

        // Particle System
        const particlesGeometry = new THREE.BufferGeometry();
        const count = 3000;
        const posArray = new Float32Array(count * 3);
        const colorArray = new Float32Array(count * 3);

        for(let i = 0; i < count * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 15;
            // Mixed Gold and White particles
            if (i % 3 === 0) {
                colorArray[i] = 1.0; // R
                colorArray[i+1] = 0.84; // G (Goldish)
                colorArray[i+2] = 0.0; // B
            } else {
                colorArray[i] = 1.0;
                colorArray[i+1] = 1.0;
                colorArray[i+2] = 1.0;
            }
        }
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

        const particlesMaterial = new THREE.PointsMaterial({
            size: 0.015,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
        scene.add(particlesMesh);

        // Luxury Floating Orbs
        const orbs = [];
        const orbColors = [0xd4af37, 0xffffff, 0xb76e79]; // Gold, White, Rose Gold
        for(let i = 0; i < 6; i++) {
            const geometry = new THREE.SphereGeometry(Math.random() * 2 + 1, 32, 32);
            const material = new THREE.MeshBasicMaterial({
                color: orbColors[i % 3],
                transparent: true,
                opacity: 0.05,
                blending: THREE.AdditiveBlending
            });
            const orb = new THREE.Mesh(geometry, material);
            orb.position.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 5);
            scene.add(orb);
            orbs.push({ mesh: orb, speed: Math.random() * 0.005 + 0.002 });
        }

        // Floating Glass Panels
        const panels = [];
        for(let i = 0; i < 4; i++) {
            const geometry = new THREE.PlaneGeometry(3, 4);
            const material = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.02,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending
            });
            const panel = new THREE.Mesh(geometry, material);
            panel.position.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 5);
            panel.rotation.set(Math.random(), Math.random(), Math.random());
            scene.add(panel);
            panels.push(panel);
        }

        camera.position.z = 5;

        let mouseX = 0, mouseY = 0;
        document.addEventListener('mousemove', (e) => {
            mouseX = (e.clientX / window.innerWidth) - 0.5;
            mouseY = (e.clientY / window.innerHeight) - 0.5;
        });

        const animate = () => {
            requestAnimationFrame(animate);
            
            // Particles Motion
            particlesMesh.rotation.y += 0.0005;
            particlesMesh.rotation.x += 0.0002;
            
            // Orbs Breathing
            orbs.forEach(obj => {
                obj.mesh.position.y += Math.sin(Date.now() * 0.001 * obj.speed) * 0.005;
                obj.mesh.position.x += Math.cos(Date.now() * 0.001 * obj.speed) * 0.005;
                obj.mesh.scale.setScalar(1 + Math.sin(Date.now() * 0.001) * 0.1);
            });

            // Panels Floating
            panels.forEach((p, i) => {
                p.rotation.y += 0.002;
                p.rotation.x += 0.001;
                p.position.y += Math.sin(Date.now() * 0.0005 + i) * 0.002;
            });

            // Mouse Inertia
            gsap.to(camera.position, {
                x: mouseX * 3,
                y: -mouseY * 3,
                duration: 2,
                ease: 'power2.out'
            });
            camera.lookAt(scene.position);

            renderer.render(scene, camera);
        };
        animate();

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    };

    initThree();

    // ==========================================
    // 7. REAL API-POWERED INTEGRATIONS ENGINE
    // ==========================================

    // Fetch and apply dynamic contents on page load
    async function loadDynamicContent() {
        try {
            const res = await fetch('/api/public/data');
            if (!res.ok) throw new Error('API server unreachable');
            const data = await res.json();

            // 1. Dynamic Hero Content (homepage only)
            const heroTitle = document.querySelector('#hero .hero-title');
            if (heroTitle && data.hero) {
                heroTitle.innerHTML = `
                    <span>${data.hero.title_line1}</span><br>
                    <span class="glow-text-gold">${data.hero.title_line2}</span><br>
                    <span>${data.hero.title_line3}</span>
                `;
            }
            const heroSubtitle = document.querySelector('#hero .hero-subtitle');
            if (heroSubtitle && data.hero) {
                heroSubtitle.innerText = data.hero.subtitle;
            }

            // 2. Dynamic Services Grid
            const servicesMultiverse = document.querySelector('.services-multiverse');
            if (servicesMultiverse && data.services) {
                // Determine if we are on index.html or services.html to load cards accordingly
                const isMainPage = !!document.querySelector('#services');
                servicesMultiverse.innerHTML = data.services.map(s => {
                    const iconClass = s.icon || 'fas fa-cut';
                    const benefitsPreview = s.benefits ? s.benefits.slice(0, 2).map(b => `<p style="font-size:10px; color:var(--text-soft); margin-top:5px;"><i class="fas fa-check gold-text"></i> ${b}</p>`).join('') : '';
                    return `
                        <div class="service-card-premium glass-panel magnetic" onclick="window.location.href='/services/${s.slug}'" style="cursor: pointer; transition: var(--transition);">
                            <div class="card-icon"><i class="${iconClass}"></i></div>
                            <h3 class="glow-text-white" style="font-size: 1.5rem; letter-spacing: 2px;">${s.title}</h3>
                            <p style="color: var(--text-soft); font-size:12px; margin-top:10px; line-height:1.5;">${s.description}</p>
                            <div style="margin-top:15px;">${benefitsPreview}</div>
                            <span class="price-tag gold-text" style="margin-top:20px; font-size: 1.2rem;">FROM ${s.price}</span>
                        </div>
                    `;
                }).join('\n');

                // Re-bind GSAP interactive tilts for new dynamic cards
                initDynamicCardTilts();
            }



            // 4. Dynamic Dedicated Gallery Page Grid
            const gallerySection = document.querySelector('section .team-grid');
            const isGalleryPage = window.location.pathname.includes('gallery.html');
            if (gallerySection && isGalleryPage && data.gallery) {
                // Dynamically inject premium styled filters at the top of the section
                const section = gallerySection.closest('section');
                if (section && !document.querySelector('.gallery-filters')) {
                    const filterDiv = document.createElement('div');
                    filterDiv.className = 'gallery-filters';
                    filterDiv.style.cssText = 'display:flex; justify-content:center; gap:20px; margin-bottom:50px; flex-wrap:wrap;';
                    filterDiv.innerHTML = `
                        <button class="btn-bold active-filter" data-category="all" style="padding: 10px 25px; font-size: 10px; background:var(--gold); color:#000;">ALL</button>
                        <button class="btn-bold" data-category="bridal" style="padding: 10px 25px; font-size: 10px; background:transparent; color:#fff;">BRIDAL</button>
                        <button class="btn-bold" data-category="styling" style="padding: 10px 25px; font-size: 10px; background:transparent; color:#fff;">HAIR</button>
                        <button class="btn-bold" data-category="skin" style="padding: 10px 25px; font-size: 10px; background:transparent; color:#fff;">SKIN</button>
                        <button class="btn-bold" data-category="academy" style="padding: 10px 25px; font-size: 10px; background:transparent; color:#fff;">ACADEMY</button>
                    `;
                    section.insertBefore(filterDiv, gallerySection);
                    
                    // Attach filters click animations
                    const filterButtons = filterDiv.querySelectorAll('button');
                    filterButtons.forEach(btn => {
                        btn.addEventListener('click', () => {
                            filterButtons.forEach(b => {
                                b.classList.remove('active-filter');
                                b.style.background = 'transparent';
                                b.style.color = '#fff';
                            });
                            btn.classList.add('active-filter');
                            btn.style.background = 'var(--gold)';
                            btn.style.color = '#000';
                            renderFilteredGallery(data.gallery, btn.getAttribute('data-category'));
                        });
                    });
                }
                
                renderFilteredGallery(data.gallery, 'all');
            }

            // 5. Dynamic Team Grid
            const teamGrid = document.querySelector('.team-grid');
            const isHomePage = !isGalleryPage && !!document.querySelector('#team');
            if (teamGrid && isHomePage && data.team) {
                teamGrid.innerHTML = data.team.map(t => `
                    <div class="team-card glass-panel magnetic" style="transition: var(--transition);">
                        <div class="team-img" style="height:350px;"><img src="${t.image_url}" alt="${t.name}"></div>
                        <h3 class="glow-text-white" style="font-size: 1.5rem; letter-spacing: 1px; margin-top:20px;">${t.name}</h3>
                        <p style="color: var(--gold); font-size: 11px; letter-spacing: 2px; margin-top:5px;">${t.role}</p>
                    </div>
                `).join('\n');
                initDynamicCardTilts();
            }

            // 6. Dynamic Testimonials (Homepage layout integration)
            const processSection = document.querySelector('#process');
            if (processSection && data.testimonials && !document.querySelector('#testimonials')) {
                const testimonialsSec = document.createElement('section');
                testimonialsSec.id = 'testimonials';
                testimonialsSec.style.cssText = 'background: #000; padding: 120px 10%; border-top: 1px solid var(--glass-border);';
                testimonialsSec.innerHTML = `
                    <div class="section-header" style="text-align: center;">
                        <h2 class="section-title split-text glow-text-white" style="font-size:clamp(2.5rem, 6vw, 4.5rem);">CLIENTS.</h2>
                        <p class="glow-text-gold">WHAT OUR BOLD CLIENTS SAY.</p>
                    </div>
                    <div class="testimonials-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:40px; margin-top:50px;">
                        ${data.testimonials.map(test => `
                            <div class="faq-item glass-panel magnetic" style="padding:40px; border: 1px solid var(--glass-border);">
                                <div style="color:var(--gold); margin-bottom:20px; font-size:14px;">
                                    ${'<i class="fas fa-star"></i>'.repeat(test.rating)}
                                </div>
                                <p style="font-style:italic; color:var(--text-soft); line-height:1.6; font-size:14px;">"${escapeHTML(test.review)}"</p>
                                <h4 style="margin-top:20px; font-size:14px; font-family:var(--font-heading); font-weight:800; letter-spacing:1px; text-transform:uppercase;">${escapeHTML(test.name)}</h4>
                                <span style="font-size:10px; color:var(--gold); letter-spacing:2px;">${escapeHTML(test.role).toUpperCase()}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
                processSection.after(testimonialsSec);
            }

            // 7. Dynamic FAQs Layout
            const faqContainer = document.querySelector('.faq-container');
            if (faqContainer && data.faqs) {
                faqContainer.innerHTML = data.faqs.map(faq => `
                    <div class="faq-item glass-panel magnetic" style="border: 1px solid var(--glass-border); padding:30px; transition: var(--transition);">
                        <h3 class="glow-text-white" style="font-size: 14px; letter-spacing: 2px; cursor:pointer; display:flex; justify-content:space-between;" onclick="const ans = this.nextElementSibling; ans.style.display = ans.style.display === 'block' ? 'none' : 'block';">
                            ${escapeHTML(faq.question)} <span style="color:var(--gold);">+</span>
                        </h3>
                        <p style="display:none; padding-top:15px; color:var(--text-soft); line-height:1.6; font-size:13px;">${escapeHTML(faq.answer)}</p>
                    </div>
                `).join('\n');
            }

            // 8. Global Dynamic Contact & Footer Details
            const footerContactSide = document.querySelector('.footer-contact-side');
            if (footerContactSide && data.contact) {
                footerContactSide.innerHTML = `
                    <h3>CONTACT US.</h3>
                    <p style="margin-bottom: 15px;" class="footer-phone"><i class="fas fa-phone gold-text" style="margin-right: 10px;"></i> ${data.contact.phone}</p>
                    <p style="margin-bottom: 15px;" class="footer-email"><i class="fas fa-envelope gold-text" style="margin-right: 10px;"></i> ${data.contact.email}</p>
                    <p style="margin-bottom: 15px;" class="footer-address"><i class="fas fa-map-marker-alt gold-text" style="margin-right: 10px;"></i> ${data.contact.address}</p>
                    <div style="margin-top: 30px;">
                        <p style="font-size: 12px; color: var(--gold);">OPENING HOURS:</p>
                        <p style="font-size: 13px;">${data.contact.hours}</p>
                    </div>
                `;
            }

            // Page Contact Information specific elements
            const contactInfoSec = document.querySelector('section div[style*="flex: 1; min-width: 300px;"]');
            if (contactInfoSec && window.location.pathname.includes('contact.html') && data.contact) {
                contactInfoSec.innerHTML = `
                    <h2 class="glow-text-white" style="font-size: 3rem; margin-bottom: 20px;">CONTACT US.</h2>
                    <p style="color: var(--text-soft);">${data.contact.address.toUpperCase()}.</p>
                    <div class="footer-divider" style="width: 100px; margin: 20px 0;"></div>
                    <p style="margin-top: 20px; color: var(--gold); font-weight: 800; letter-spacing: 2px;">PHONE</p>
                    <p style="font-size: 1.5rem;"><a href="tel:${data.contact.phone.replace(/\s+/g, '')}" style="color:#fff; text-decoration:none;">${data.contact.phone}</a></p>
                    <p style="margin-top: 20px; color: var(--gold); font-weight: 800; letter-spacing: 2px;">EMAIL</p>
                    <p style="font-size: 1.5rem;"><a href="mailto:${data.contact.email}" style="color:#fff; text-decoration:none;">${data.contact.email}</a></p>
                `;
            }

        } catch (err) {
            console.warn('API data loading skipped, using defaults:', err.message);
        }
    }

    // Interactive card re-binding of GSAP mouse-tilt & hover scales
    function initDynamicCardTilts() {
        document.querySelectorAll('.service-card-premium, .team-card').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = (y - centerY) / 10;
                const rotateY = (centerX - x) / 10;

                gsap.to(card, {
                    rotateX: rotateX,
                    rotateY: rotateY,
                    scale: 1.05,
                    duration: 0.5,
                    ease: 'power2.out'
                });
            });

            card.addEventListener('mouseleave', () => {
                gsap.to(card, {
                    rotateX: 0,
                    rotateY: 0,
                    scale: 1,
                    duration: 1,
                    ease: 'elastic.out(1, 0.3)'
                });
            });
        });

        // Setup cursors hover interactions
        const customCursor = document.getElementById('custom-cursor');
        const follower = document.getElementById('cursor-follower');
        document.querySelectorAll('.service-card-premium, .team-card, .btn-bold, a').forEach(el => {
            el.addEventListener('mouseenter', () => {
                if (customCursor) customCursor.style.transform = 'scale(4)';
                if (follower) follower.style.borderColor = '#fff';
            });
            el.addEventListener('mouseleave', () => {
                if (customCursor) customCursor.style.transform = 'scale(1)';
                if (follower) follower.style.borderColor = '#d4af37';
            });
        });
    }

    // Dynamically render filtered images on dedicated gallery page grid
    function renderFilteredGallery(galleryData, category) {
        const galleryGrid = document.querySelector('section .team-grid');
        if (!galleryGrid) return;

        const filtered = category === 'all' 
            ? galleryData 
            : galleryData.filter(g => g.category === category);

        // Fade container out
        gsap.to(galleryGrid, { opacity: 0, y: 30, duration: 0.4, onComplete: () => {
            galleryGrid.innerHTML = filtered.map(g => `
                <div class="team-card magnetic" style="padding: 10px; cursor:pointer; background:var(--glass); border: 1px solid var(--glass-border);">
                    <div class="image-parallax-wrapper" style="height:350px;">
                        <img src="${g.image_url}" alt="${g.title}" class="parallax-img" style="width:100%; height:120%; object-fit:cover;">
                    </div>
                    <h3 class="glow-text-white" style="margin-top: 20px; font-size:14px; letter-spacing:1px;">${g.title}</h3>
                    <p style="color: var(--gold); font-size: 9px; letter-spacing: 2px; margin-top:5px;">${g.category.toUpperCase()} SERIES</p>
                </div>
            `).join('\n');

            // Attach Lightbox triggers to filtered items
            const items = galleryGrid.querySelectorAll('.team-card');
            items.forEach((item, index) => {
                item.addEventListener('click', () => {
                    openLightbox(filtered, index);
                });
            });

            // Re-apply hover cursor states
            initDynamicCardTilts();

            // Fade container back in
            gsap.to(galleryGrid, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' });
        }});
    }

    // ==========================================
    // 8. PREMIUM LIGHTBOX POPUP SYSTEM
    // ==========================================
    let activeGallery = [];
    let activeIndex = 0;

    // Inject Lightbox container into DOM if not existing
    function injectLightbox() {
        if (document.getElementById('gallery-lightbox')) return;

        const lightboxHTML = `
            <div id="gallery-lightbox" style="position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); backdrop-filter:blur(15px); display:none; justify-content:center; align-items:center; z-index:10002; opacity:0; flex-direction:column; cursor:default;">
                <button id="close-lightbox" style="position: absolute; top: 30px; right: 30px; background: transparent; border: none; color: #fff; font-size: 30px; cursor: pointer; transition: 0.3s; z-index:10005;"><i class="fas fa-times"></i></button>
                <button id="prev-lightbox" style="position: absolute; left: 30px; top: 50%; transform: translateY(-50%); background: var(--glass); border: 1px solid var(--glass-border); width: 60px; height: 60px; border-radius:50%; color: #fff; font-size: 20px; cursor: pointer; display: flex; justify-content: center; align-items: center; transition: 0.3s; z-index:10005;"><i class="fas fa-chevron-left"></i></button>
                <button id="next-lightbox" style="position: absolute; right: 30px; top: 50%; transform: translateY(-50%); background: var(--glass); border: 1px solid var(--glass-border); width: 60px; height: 60px; border-radius:50%; color: #fff; font-size: 20px; cursor: pointer; display: flex; justify-content: center; align-items: center; transition: 0.3s; z-index:10005;"><i class="fas fa-chevron-right"></i></button>
                
                <div id="lightbox-frame" style="max-width: 80%; max-height: 70%; overflow: hidden; border: 1px solid var(--glass-border); position: relative; background:#000;">
                    <img id="lightbox-img" src="" alt="" style="max-width:100%; max-height:70vh; object-fit:contain; display:block; user-select:none; pointer-events:none;">
                </div>
                
                <div style="margin-top: 25px; text-align: center;">
                    <h3 id="lightbox-title" class="glow-text-gold" style="font-size: 1.5rem; letter-spacing: 2px;">IMAGE TITLE</h3>
                    <p id="lightbox-category" style="color: var(--text-soft); font-size: 10px; letter-spacing: 3px; margin-top: 8px; text-transform:uppercase;">CATEGORY SERIES</p>
                </div>
            </div>
        `;
        const div = document.createElement('div');
        div.innerHTML = lightboxHTML;
        document.body.appendChild(div.firstElementChild);

        // Bind events
        document.getElementById('close-lightbox').addEventListener('click', closeLightbox);
        document.getElementById('prev-lightbox').addEventListener('click', navigateLightboxPrev);
        document.getElementById('next-lightbox').addEventListener('click', navigateLightboxNext);
        
        // Block custom cursor interactions within lightbox boundaries for standard cursor experience
        const box = document.getElementById('gallery-lightbox');
        box.addEventListener('mouseenter', () => {
            const cur = document.getElementById('custom-cursor');
            const fol = document.getElementById('cursor-follower');
            if (cur) cur.style.display = 'none';
            if (fol) fol.style.display = 'none';
            document.body.style.cursor = 'default';
        });
        box.addEventListener('mouseleave', () => {
            const cur = document.getElementById('custom-cursor');
            const fol = document.getElementById('cursor-follower');
            if (cur) cur.style.display = 'block';
            if (fol) fol.style.display = 'block';
            document.body.style.cursor = 'none';
        });
    }

    function openLightbox(galleryArray, index) {
        injectLightbox();
        activeGallery = galleryArray;
        activeIndex = index;

        const lightbox = document.getElementById('gallery-lightbox');
        lightbox.style.display = 'flex';
        updateLightboxContent();

        gsap.to(lightbox, { opacity: 1, duration: 0.5, ease: 'power2.out' });
        
        // Hide standard Lenis scrolling during zoom overlay
        document.body.style.overflow = 'hidden';
    }

    function updateLightboxContent() {
        const item = activeGallery[activeIndex];
        const img = document.getElementById('lightbox-img');
        const title = document.getElementById('lightbox-title');
        const category = document.getElementById('lightbox-category');
        const frame = document.getElementById('lightbox-frame');

        gsap.to(frame, { scale: 0.9, opacity: 0, duration: 0.25, onComplete: () => {
            img.src = item.image_url;
            img.alt = item.title;
            title.innerText = item.title;
            category.innerText = `${item.category.toUpperCase()} SERIES`;
            
            gsap.to(frame, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1)' });
        }});
    }

    function navigateLightboxPrev() {
        if (activeGallery.length === 0) return;
        activeIndex = (activeIndex - 1 + activeGallery.length) % activeGallery.length;
        updateLightboxContent();
    }

    function navigateLightboxNext() {
        if (activeGallery.length === 0) return;
        activeIndex = (activeIndex + 1) % activeGallery.length;
        updateLightboxContent();
    }

    function closeLightbox() {
        const lightbox = document.getElementById('gallery-lightbox');
        gsap.to(lightbox, { opacity: 0, duration: 0.4, onComplete: () => {
            lightbox.style.display = 'none';
            document.body.style.overflow = '';
        }});
    }

    // Close lightbox on Escape key
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const lb = document.getElementById('gallery-lightbox');
            if (lb && lb.style.display === 'flex') closeLightbox();
            
            const adminModal = document.getElementById('admin-login-modal');
            if (adminModal && adminModal.style.display === 'flex') closeAdminLoginModal();
        }
    });

    // ==========================================
    // 9. HIDDEN ADMIN LOGIN TRIGGER & MODAL
    // ==========================================
    
    // Check for cookie sessions and inject hidden admin trigger
    function setupHiddenAdminAccess() {
        // Look for copyright bottom bar to append hidden period id
        const footerBottom = document.querySelector('.footer-bottom-bar p');
        if (footerBottom) {
            const copyrightHTML = footerBottom.innerHTML;
            // Avoid double appending
            if (!document.getElementById('hidden-admin-trigger')) {
                if (copyrightHTML.endsWith('.')) {
                    footerBottom.innerHTML = copyrightHTML.slice(0, -1) + `<span id="hidden-admin-trigger" style="cursor: pointer; user-select: none; color:var(--text-soft); padding: 15px 10px; margin: -15px -10px; display: inline-block; transition: color 0.3s;">.</span>`;
                } else if (copyrightHTML.endsWith('RIGHTS RESERVED')) {
                    footerBottom.innerHTML = copyrightHTML + `<span id="hidden-admin-trigger" style="cursor: pointer; user-select: none; color:var(--text-soft); padding: 15px 10px; margin: -15px -10px; display: inline-block; transition: color 0.3s;">.</span>`;
                } else {
                    footerBottom.innerHTML = copyrightHTML + `<span id="hidden-admin-trigger" style="cursor: pointer; user-select: none; margin-left: 2px; padding: 15px 10px; margin: -15px -10px; display: inline-block;">.</span>`;
                }
            }
        }

        // Add clicking events
        const trigger = document.getElementById('hidden-admin-trigger');
        if (trigger) {
            let clicks = 0;
            let clickTimer;
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                clicks++;
                
                // Subtle feedback color glow on click
                trigger.style.color = 'var(--gold)';
                setTimeout(() => { trigger.style.color = 'var(--text-soft)'; }, 200);

                if (clicks === 1) {
                    clickTimer = setTimeout(() => { clicks = 0; }, 2000);
                } else if (clicks >= 3) { // Requires triple click to launch admin gateway
                    clearTimeout(clickTimer);
                    clicks = 0;
                    openAdminLoginGateway();
                }
            });
        }

        // Alternative Keyboard Typing backdoor: type "vickyadmin" anywhere to launch!
        let keysPressed = '';
        window.addEventListener('keydown', (e) => {
            keysPressed += e.key.toLowerCase();
            if (keysPressed.endsWith('vickyadmin') || keysPressed.endsWith('vpadmin')) {
                keysPressed = '';
                openAdminLoginGateway();
            }
            if (keysPressed.length > 25) {
                keysPressed = keysPressed.slice(-12);
            }
        });
    }

    // Dynamically inject beautiful glassmorphism admin modal
    function openAdminLoginGateway() {
        if (document.getElementById('admin-login-modal')) {
            const modal = document.getElementById('admin-login-modal');
            modal.style.display = 'flex';
            gsap.to(modal, { opacity: 1, duration: 0.5 });
            return;
        }

        const gatewayHTML = `
            <div id="admin-login-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); backdrop-filter: blur(15px); display: flex; justify-content: center; align-items: center; z-index: 10001; opacity: 0; cursor:default;">
                <div class="glass-panel" style="padding: 60px 40px; border: 1px solid var(--glass-border); width: 100%; max-width: 450px; position: relative; text-align: center; background:rgba(10,10,10,0.9);">
                    <button id="close-login-modal" style="position: absolute; top: 25px; right: 25px; background: transparent; border: none; color: var(--text-soft); font-size: 22px; cursor: pointer; transition: var(--transition);"><i class="fas fa-times"></i></button>
                    <h2 class="glow-text-gold" style="font-size: 2.2rem; margin-bottom: 30px; letter-spacing: 4px;">VP.ADMIN</h2>
                    <form id="admin-login-form" style="display: flex; flex-direction: column; gap: 25px; text-align: left;">
                        <div class="input-group" style="display: flex; flex-direction: column; gap: 8px;">
                            <label style="font-weight: 800; font-size: 9px; letter-spacing: 2px; color: var(--gold);">USERNAME</label>
                            <input type="text" id="admin-username" required style="background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); padding: 15px; color: #fff; font-family: inherit; font-size: 14px; letter-spacing: 1px; outline:none; border-radius:0;">
                        </div>
                        <div class="input-group" style="display: flex; flex-direction: column; gap: 8px;">
                            <label style="font-weight: 800; font-size: 9px; letter-spacing: 2px; color: var(--gold);">PASSWORD</label>
                            <input type="password" id="admin-password" required style="background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); padding: 15px; color: #fff; font-family: inherit; font-size: 14px; letter-spacing: 1px; outline:none; border-radius:0;">
                        </div>
                        <div id="login-error-msg" style="color: #ff3333; font-size: 11px; font-weight: 800; text-align: center; display: none; letter-spacing:1px;">INVALID LOGIN CREDENTIALS</div>
                        <button type="submit" class="btn-bold glow-button magnetic" style="width: 100%; margin-top: 15px; padding: 18px 0; font-size:12px;">AUTHENTICATE</button>
                    </form>
                </div>
            </div>
        `;

        const div = document.createElement('div');
        div.innerHTML = gatewayHTML;
        document.body.appendChild(div.firstElementChild);

        const modal = document.getElementById('admin-login-modal');
        modal.style.display = 'flex';
        gsap.to(modal, { opacity: 1, duration: 0.5 });

        // Bind events
        document.getElementById('close-login-modal').addEventListener('click', closeAdminLoginModal);
        
        // Block custom cursor within login modal boundaries for normal text-selection cursor
        modal.addEventListener('mouseenter', () => {
            const cur = document.getElementById('custom-cursor');
            const fol = document.getElementById('cursor-follower');
            if (cur) cur.style.display = 'none';
            if (fol) fol.style.display = 'none';
            document.body.style.cursor = 'default';
        });
        modal.addEventListener('mouseleave', () => {
            const cur = document.getElementById('custom-cursor');
            const fol = document.getElementById('cursor-follower');
            if (cur) cur.style.display = 'block';
            if (fol) fol.style.display = 'block';
            document.body.style.cursor = 'none';
        });

        // Submit form handler
        document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById('admin-username').value;
            const passwordInput = document.getElementById('admin-password').value;
            const errorMsg = document.getElementById('login-error-msg');

            errorMsg.style.display = 'none';
            errorMsg.innerText = '';

            try {
                const response = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: usernameInput, password: passwordInput })
                });

                const result = await response.json().catch(() => ({}));

                if (response.ok) {
                    // Success, redirect to Admin page
                    gsap.to(modal, { opacity: 0, duration: 0.3, onComplete: () => {
                        window.location.href = '/admin.html';
                    }});
                } else {
                    errorMsg.innerText = (result && result.error) || 'INVALID LOGIN CREDENTIALS';
                    throw new Error((result && result.error) || 'INVALID LOGIN CREDENTIALS');
                }
            } catch (err) {
                // Shake animation on error
                errorMsg.style.display = 'block';
                if (!errorMsg.innerText) {
                    errorMsg.innerText = 'CONNECTION ERROR: Please run node server & access via http://localhost:3000';
                }
                const panel = modal.querySelector('.glass-panel');
                gsap.timeline()
                    .to(panel, { x: -10, duration: 0.05 })
                    .to(panel, { x: 10, duration: 0.05 })
                    .to(panel, { x: -10, duration: 0.05 })
                    .to(panel, { x: 10, duration: 0.05 })
                    .to(panel, { x: 0, duration: 0.05 });
            }
        });
    }

    function closeAdminLoginModal() {
        const modal = document.getElementById('admin-login-modal');
        if (modal) {
            gsap.to(modal, { opacity: 0, duration: 0.4, onComplete: () => {
                modal.style.display = 'none';
            }});
        }
    }

    // ==========================================
    // 10. REAL BOOKING & CONTACT FORM HANDLERS
    // ==========================================
    
    // Dynamic Form Handlers
    const bookingForm = document.getElementById('appointment-form');
    const successPopup = document.getElementById('booking-success');
    const bookingIdSpan = document.getElementById('booking-id');

    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nameVal = document.getElementById('name').value;
            const phoneVal = document.getElementById('phone').value;
            const emailVal = document.getElementById('email').value;
            const serviceVal = document.getElementById('service').value;
            const dateVal = document.getElementById('date').value;
            const timeVal = document.getElementById('time').value;
            const notesVal = document.getElementById('notes').value;

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const phoneRegex = /^[\d\s+\-()]{7,20}$/;

            if (!phoneRegex.test(phoneVal)) {
                alert('Please enter a valid phone number (minimum 7 digits, digits and spaces/hyphens/parentheses only).');
                return;
            }

            if (emailVal && !emailRegex.test(emailVal)) {
                alert('Please enter a valid email address.');
                return;
            }

            const formData = {
                name: nameVal,
                phone: phoneVal,
                email: emailVal,
                service: serviceVal,
                date: dateVal,
                time: timeVal,
                notes: notesVal
            };

            // Loading state
            gsap.to(bookingForm, { opacity: 0.3, pointerEvents: 'none', duration: 0.5 });
            
            try {
                const response = await fetch('/api/book', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                if (response.ok) {
                    const result = await response.json();
                    bookingIdSpan.innerText = result.bookingId;
                    
                    localStorage.setItem('userHasBooked', 'true');
                    sessionStorage.setItem('userHasBooked', 'true');

                    gsap.to(bookingForm, { display: 'none', duration: 0.5 });
                    successPopup.style.display = 'block';
                    gsap.from(successPopup, { y: 50, opacity: 0, duration: 1, ease: 'expo.out' });
                } else {
                    throw new Error('API rejection');
                }
            } catch (err) {
                alert('Connection error. Booking failed, please try again.');
                gsap.to(bookingForm, { opacity: 1, pointerEvents: 'auto', duration: 0.5 });
            }
        });
    }

    // Contact Us Inquiry submission handler
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const inputs = contactForm.querySelectorAll('input, textarea');
            const submitBtn = contactForm.querySelector('button');

            const nameVal = inputs[0].value;
            const emailVal = inputs[1].value;
            const messageVal = inputs[2].value;

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailRegex.test(emailVal)) {
                alert('Please enter a valid email address.');
                return;
            }

            const formData = {
                name: nameVal,
                email: emailVal,
                message: messageVal
            };

            gsap.to(contactForm, { opacity: 0.3, pointerEvents: 'none', duration: 0.5 });
            
            try {
                const response = await fetch('/api/inquire', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                if (response.ok) {
                    submitBtn.innerText = 'MESSAGE SENT SUCCESSFULLY!';
                    submitBtn.style.background = 'var(--gold)';
                    submitBtn.style.color = '#000';
                    setTimeout(() => {
                        inputs[0].value = '';
                        inputs[1].value = '';
                        inputs[2].value = '';
                        submitBtn.innerText = 'SEND MESSAGE';
                        submitBtn.style.background = '';
                        submitBtn.style.color = '';
                        gsap.to(contactForm, { opacity: 1, pointerEvents: 'auto', duration: 0.5 });
                    }, 3000);
                } else {
                    throw new Error();
                }
            } catch (err) {
                alert('Failed to send contact inquiry. Please check connection and try again.');
                gsap.to(contactForm, { opacity: 1, pointerEvents: 'auto', duration: 0.5 });
            }
        });
    }

    // Boot dynamic loader and hidden entrance setups
    loadDynamicContent();
    setupHiddenAdminAccess();

    // Boot Global Booking Modal & Event Interceptor Engine
    initGlobalBookingModal();
    interceptBookingClicks();

    // ==========================================
    // 11. DYNAMIC GLOBAL LUXURY BOOKING OVERLAY & TOASTS
    // ==========================================
    function initGlobalBookingModal() {
        // 1. Inject Styles dynamically into the head
        const styleTag = document.createElement('style');
        styleTag.innerHTML = `
            .vp-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                z-index: 100000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.4s ease, visibility 0.4s ease;
            }
            .vp-modal-overlay.active {
                opacity: 1;
                visibility: visible;
            }
            .vp-modal-container {
                width: 90%;
                max-width: 550px;
                background: rgba(10, 10, 10, 0.7);
                border: 1px solid rgba(212, 175, 55, 0.25);
                border-radius: 12px;
                padding: 40px;
                position: relative;
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(212, 175, 55, 0.05);
                transform: scale(0.9);
                transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                max-height: 90vh;
                overflow-y: auto;
            }
            .vp-modal-overlay.active .vp-modal-container {
                transform: scale(1);
            }
            .vp-modal-close {
                position: absolute;
                top: 20px;
                right: 25px;
                font-size: 24px;
                color: #fff;
                cursor: pointer;
                transition: color 0.3s, transform 0.3s;
            }
            .vp-modal-close:hover {
                color: #d4af37;
                transform: rotate(90deg);
            }
            .vp-modal-title {
                font-family: 'Cinzel', serif;
                font-size: 1.8rem;
                color: #fff;
                letter-spacing: 3px;
                margin-bottom: 5px;
                text-align: center;
                text-shadow: 0 0 10px rgba(255,255,255,0.1);
            }
            .vp-modal-subtitle {
                font-size: 8px;
                color: #d4af37;
                letter-spacing: 2px;
                margin-bottom: 30px;
                text-align: center;
                text-transform: uppercase;
                font-weight: 800;
            }
            .vp-modal-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
            }
            @media (max-width: 600px) {
                .vp-modal-grid {
                    grid-template-columns: 1fr;
                }
                .vp-modal-container {
                    padding: 25px 20px;
                }
            }
            .vp-modal-group {
                margin-bottom: 20px;
            }
            .vp-modal-group.full-width {
                grid-column: span 2;
            }
            @media (max-width: 600px) {
                .vp-modal-group.full-width {
                    grid-column: span 1;
                }
            }
            .vp-modal-group label {
                display: block;
                font-size: 8px;
                letter-spacing: 2px;
                color: #d4af37;
                font-weight: 800;
                margin-bottom: 8px;
                text-transform: uppercase;
            }
            .vp-modal-group input, 
            .vp-modal-group select, 
            .vp-modal-group textarea {
                width: 100%;
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(212, 175, 55, 0.2);
                padding: 12px 15px;
                color: #fff;
                font-family: inherit;
                font-size: 13px;
                border-radius: 4px;
                outline: none;
                transition: border-color 0.3s, box-shadow 0.3s;
            }
            .vp-modal-group input:focus, 
            .vp-modal-group select:focus, 
            .vp-modal-group textarea:focus {
                border-color: #d4af37;
                box-shadow: 0 0 10px rgba(212, 175, 55, 0.2);
            }
            .vp-modal-group textarea {
                resize: none;
                height: 80px;
            }
            .vp-modal-btn {
                width: 100%;
                background: transparent;
                border: 1px solid #d4af37;
                color: #fff;
                padding: 15px;
                font-family: inherit;
                font-size: 11px;
                font-weight: 800;
                letter-spacing: 3px;
                text-transform: uppercase;
                cursor: pointer;
                transition: background 0.3s, color 0.3s, box-shadow 0.3s;
                margin-top: 10px;
            }
            .vp-modal-btn:hover {
                background: #d4af37;
                color: #000;
                box-shadow: 0 0 20px rgba(212, 175, 55, 0.4);
            }
            .vp-toast {
                position: fixed;
                bottom: 30px;
                right: 30px;
                background: rgba(10, 10, 10, 0.95);
                border: 1px solid #d4af37;
                border-radius: 8px;
                padding: 20px 30px;
                color: #fff;
                z-index: 200000;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9);
                font-family: inherit;
                display: flex;
                align-items: center;
                gap: 15px;
                transform: translateY(100px);
                opacity: 0;
                transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.5s ease;
            }
            .vp-toast.active {
                transform: translateY(0);
                opacity: 1;
            }
            .vp-toast-icon {
                color: #d4af37;
                font-size: 24px;
            }
            .vp-toast-title {
                font-size: 10px;
                font-weight: 800;
                letter-spacing: 2px;
                color: #d4af37;
                text-transform: uppercase;
            }
            .vp-toast-desc {
                font-size: 12px;
                color: #ccc;
                margin-top: 2px;
            }
        `;
        document.head.appendChild(styleTag);

        // 2. Create Modal Overlay DOM
        const overlay = document.createElement('div');
        overlay.id = 'vp-booking-modal-overlay';
        overlay.className = 'vp-modal-overlay';
        overlay.innerHTML = `
            <div class="vp-modal-container">
                <span class="vp-modal-close" id="vp-modal-close-trigger">&times;</span>
                <h2 class="vp-modal-title">BOOK AN EXPERIENCE</h2>
                <div class="vp-modal-subtitle">Elite Beauty Sanctuary</div>
                
                <form id="vp-booking-modal-form">
                    <div class="vp-modal-grid">
                        <div class="vp-modal-group">
                            <label>Full Name</label>
                            <input type="text" id="vp-book-name" required placeholder="Your Name">
                        </div>
                        <div class="vp-modal-group">
                            <label>Phone Number</label>
                            <input type="tel" id="vp-book-phone" required placeholder="+91 XXXXX XXXXX">
                        </div>
                        <div class="vp-modal-group full-width">
                            <label>Email Address</label>
                            <input type="email" id="vp-book-email" required placeholder="your.email@gmail.com">
                        </div>
                        <div class="vp-modal-group full-width">
                            <label>Selected Treatment</label>
                            <select id="vp-book-service" required>
                                <option value="">SELECT A SERVICE</option>
                            </select>
                        </div>
                        <div class="vp-modal-group">
                            <label>Preferred Date</label>
                            <input type="date" id="vp-book-date" required>
                        </div>
                        <div class="vp-modal-group">
                            <label>Preferred Time</label>
                            <input type="time" id="vp-book-time" required>
                        </div>
                        <div class="vp-modal-group full-width">
                            <label>Additional Notes / Instructions</label>
                            <textarea id="vp-book-notes" placeholder="Any structural color specs, bridal requirements, or customized therapies..."></textarea>
                        </div>
                    </div>
                    <button type="submit" class="vp-modal-btn" id="vp-book-submit-btn">Secure Slot Now</button>
                </form>
            </div>
        `;
        document.body.appendChild(overlay);

        // 3. Create Toast Notification DOM
        const toast = document.createElement('div');
        toast.id = 'vp-toast-notification';
        toast.className = 'vp-toast';
        toast.innerHTML = `
            <div class="vp-toast-icon"><i class="fas fa-check-circle"></i></div>
            <div>
                <div class="vp-toast-title" id="vp-toast-title">Booking Success!</div>
                <div class="vp-toast-desc" id="vp-toast-desc">Your spot has been reserved.</div>
            </div>
        `;
        document.body.appendChild(toast);

        // 4. Modal Triggers & Logic
        const closeBtn = document.getElementById('vp-modal-close-trigger');
        const form = document.getElementById('vp-booking-modal-form');
        const serviceSelect = document.getElementById('vp-book-service');

        closeBtn.addEventListener('click', () => {
            overlay.classList.remove('active');
            sessionStorage.setItem('bookingPopupClosed', 'true');
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
                sessionStorage.setItem('bookingPopupClosed', 'true');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay.classList.contains('active')) {
                overlay.classList.remove('active');
                sessionStorage.setItem('bookingPopupClosed', 'true');
            }
        });

        // 5. Populate active services from dynamic public API
        fetch('/api/public/data')
            .then(res => res.json())
            .then(data => {
                if (data.services && data.services.length > 0) {
                    serviceSelect.innerHTML = '<option value="">SELECT A SERVICE</option>';
                    data.services.forEach(srv => {
                        const opt = document.createElement('option');
                        opt.value = srv.title;
                        opt.innerText = `${srv.title.toUpperCase()} (${srv.price || '₹40'})`;
                        serviceSelect.appendChild(opt);
                    });
                }
            })
            .catch(() => {
                // Fallback hardcoded services if API is cold
                const fallbacks = [
                    "ELITE HAIRCUTS", "CHROME COLORING", "BRIDAL COUTURE", 
                    "SKIN REBOOT", "NEO NAIL ART", "HAIR DETOX"
                ];
                serviceSelect.innerHTML = '<option value="">SELECT A SERVICE</option>';
                fallbacks.forEach(srv => {
                    const opt = document.createElement('option');
                    opt.value = srv;
                    opt.innerText = srv;
                    serviceSelect.appendChild(opt);
                });
            });

        // 6. Handle Form Submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nameVal = document.getElementById('vp-book-name').value;
            const phoneVal = document.getElementById('vp-book-phone').value;
            const emailVal = document.getElementById('vp-book-email').value;
            const serviceVal = document.getElementById('vp-book-service').value;
            const dateVal = document.getElementById('vp-book-date').value;
            const timeVal = document.getElementById('vp-book-time').value;
            const notesVal = document.getElementById('vp-book-notes').value;

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const phoneRegex = /^[\d\s+\-()]{7,20}$/;

            const submitBtn = document.getElementById('vp-book-submit-btn');

            if (!phoneRegex.test(phoneVal)) {
                showVPToast("VALIDATION ALERT", "Please enter a valid phone number.", true);
                return;
            }

            if (emailVal && !emailRegex.test(emailVal)) {
                showVPToast("VALIDATION ALERT", "Please enter a valid email address.", true);
                return;
            }

            submitBtn.innerText = 'PROCESSING SLOT...';
            submitBtn.disabled = true;

            const payload = {
                name: nameVal,
                phone: phoneVal,
                email: emailVal,
                service: serviceVal,
                date: dateVal,
                time: timeVal,
                notes: notesVal
            };

            try {
                const response = await fetch('/api/book', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const result = await response.json();
                    overlay.classList.remove('active');
                    form.reset();

                    localStorage.setItem('userHasBooked', 'true');
                    sessionStorage.setItem('userHasBooked', 'true');

                    // Show golden customer toast
                    showVPToast("BOOKING SUCCESS!", `Your spot (${result.bookingId}) has been locked. Confirmation email sent.`);
                } else {
                    throw new Error();
                }
            } catch (err) {
                showVPToast("CONNECTION ALERT", "Failed to book your appointment. Please check connection.", true);
            } finally {
                submitBtn.innerText = 'Secure Slot Now';
                submitBtn.disabled = false;
            }
        });
    }

    // Helper to display luxury toast alerts
    function showVPToast(title, desc, isError = false) {
        const toast = document.getElementById('vp-toast-notification');
        const titleSpan = document.getElementById('vp-toast-title');
        const descSpan = document.getElementById('vp-toast-desc');
        const iconDiv = toast.querySelector('.vp-toast-icon');

        titleSpan.innerText = title;
        descSpan.innerText = desc;
        
        if (isError) {
            toast.style.borderColor = '#ff3333';
            iconDiv.innerHTML = '<i class="fas fa-exclamation-circle" style="color: #ff3333;"></i>';
            titleSpan.style.color = '#ff3333';
        } else {
            toast.style.borderColor = '#d4af37';
            iconDiv.innerHTML = '<i class="fas fa-check-circle" style="color: #d4af37;"></i>';
            titleSpan.style.color = '#d4af37';
        }

        toast.classList.add('active');
        setTimeout(() => {
            toast.classList.remove('active');
        }, 5000);
    }

    // Dynamic Interceptor of all CTA Booking buttons globally
    function interceptBookingClicks() {
        document.body.addEventListener('click', (e) => {
            // Check if clicked element or its parent matches any Book triggers or contact links redirects
            const target = e.target.closest('a, button');
            if (!target) return;

            const text = target.innerText.toUpperCase();
            const href = target.getAttribute('href') || '';
            const id = target.id || '';
            const className = target.className || '';

            // Intercept rules:
            // 1. Has class containing "btn-book" or text includes "BOOK NOW" or "BOOK YOUR LUXURY"
            // 2. Redirects to contact.html (excluding top navbar logo or home anchors)
            const isBookingTrigger = 
                className.includes('btn-book') || 
                text.includes('BOOK NOW') || 
                text.includes('BOOK YOUR LUXURY') ||
                (href.includes('contact.html') && !text.includes('CONTACT'));

            if (isBookingTrigger) {
                e.preventDefault();
                
                // Open overlay booking modal
                const overlay = document.getElementById('vp-booking-modal-overlay');
                if (overlay) {
                    overlay.classList.add('active');
                    
                    // Try to auto-select treatment if triggered from service card
                    const select = document.getElementById('vp-book-service');
                    const parentCard = target.closest('.service-card, .service-details');
                    if (parentCard) {
                        const serviceName = parentCard.querySelector('.service-title, h1, h2')?.innerText;
                        if (serviceName && select) {
                            const trimmed = serviceName.toUpperCase().trim();
                            for (let option of select.options) {
                                if (option.value.toUpperCase().trim().includes(trimmed) || trimmed.includes(option.value.toUpperCase().trim())) {
                                    select.value = option.value;
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    // Auto-trigger Booking Popup after 30 seconds
    const isCheckout = window.location.pathname.includes('checkout');
    const isAdmin = window.location.pathname.includes('admin.html');
    const alreadyBooked = localStorage.getItem('userHasBooked') || sessionStorage.getItem('userHasBooked');
    const popupClosed = sessionStorage.getItem('bookingPopupClosed');

    if (!isCheckout && !isAdmin && !alreadyBooked && !popupClosed) {
        setTimeout(() => {
            const stillNotBooked = !localStorage.getItem('userHasBooked') && !sessionStorage.getItem('userHasBooked');
            const stillNotClosed = !sessionStorage.getItem('bookingPopupClosed');
            
            if (stillNotBooked && stillNotClosed) {
                const overlay = document.getElementById('vp-booking-modal-overlay');
                if (overlay) {
                    overlay.classList.add('active');
                }
            }
        }, 30000);
    }

});

