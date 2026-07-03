const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const config = require('./config/env');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const categoryRoutes = require('./routes/categories');
const articleRoutes = require('./routes/articles');
const dashboardRoutes = require('./routes/dashboard');
const seoRoutes = require('./routes/seo');
const analyticsRoutes = require('./routes/analytics');
const aiWriterRoutes = require('./routes/aiWriter');
const wpSyncRoutes = require('./routes/wpSync');
const settingsRoutes = require('./routes/settings');
const pageRoutes = require('./routes/pages');
const { listPublic: listPublicPages, getPublic: getPublicPage } = require('./controllers/pageController');
const publicRoutes = require('./routes/public');

const app = express();

app.use(helmet());

// Build allowed origins list from CORS_ORIGIN env var.
// Supports: '*', a single URL, or comma-separated URLs.
const rawOrigin = config.corsOrigin || '*';
const allowedOrigins = rawOrigin === '*'
  ? '*'
  : rawOrigin.split(',').map(o => o.trim()).filter(Boolean);

const corsOptions = {
  origin: allowedOrigins === '*'
    ? '*'
    : (origin, cb) => {
        // Allow requests with no origin (mobile apps, curl, server-to-server)
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`CORS: origin ${origin} not allowed`));
      },
  credentials: true,
};

// Public routes: always fully open (no auth, any origin can read published articles)
app.use('/api/public', cors({ origin: '*' }));

// All other routes: use the configured allowed origins
app.use(cors(corsOptions));

app.use(express.json({ limit: '5mb' }));
if (config.nodeEnv !== 'test') {
  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
}

// Rate limiter for login — max 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter — max 200 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', dialect: config.dbDialect }));

app.use('/api', apiLimiter);
app.use('/api/public', publicRoutes);
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/seo', seoRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai-writer', aiWriterRoutes);
app.use('/api/wp-sync', wpSyncRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/pages', pageRoutes);

// Public pages (no auth)
app.get('/api/public/pages', listPublicPages);
app.get('/api/public/pages/:slug', getPublicPage);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
