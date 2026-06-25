const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
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

app.get('/api/health', (req, res) => res.json({ status: 'ok', dialect: config.dbDialect }));

app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/seo', seoRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
