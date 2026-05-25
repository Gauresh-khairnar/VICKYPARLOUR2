// Vercel Serverless Function Entrypoint
// This file wraps server.js for Vercel deployment
// server.js uses __dirname which points here (api/), so we resolve to parent
process.chdir(require('path').join(__dirname, '..'));
const app = require('../server.js');
module.exports = app;
