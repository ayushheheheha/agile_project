'use strict';

const path = require('path');
// Load .env from project root (single .env file), fallback to cwd
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();

const express    = require('express');
const cors       = require('cors');

const authRoutes         = require('./routes/auth');
const jobRoutes          = require('./routes/jobs');
const applicationRoutes  = require('./routes/applications');
const statsRoutes        = require('./routes/stats');
const profileRoutes      = require('./routes/profile');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// JSON body parser (multer routes handle their own parsing for multipart)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes ────────────────────────────────────────────────────────────────

app.use('/api/auth',         authRoutes);
app.use('/api/jobs',         jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/stats',        statsRoutes);
app.use('/api/profile',      profileRoutes);

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message || err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 4000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[server] Listening on port ${PORT}`);
  });
}

module.exports = app; // export for testing
