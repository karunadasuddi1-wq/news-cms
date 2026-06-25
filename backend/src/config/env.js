require('dotenv').config({ quiet: true });

const required = ['JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length && process.env.NODE_ENV !== 'test') {
  console.warn(
    `[config] Missing recommended env vars: ${missing.join(', ')}. Using insecure defaults — do NOT do this in production.`
  );
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 4000,

  // DB_DIALECT: 'sqlite' (default, zero-config, file-based) or 'postgres'
  dbDialect: process.env.DB_DIALECT || 'sqlite',
  sqliteStorage: process.env.SQLITE_STORAGE || './data/newscms.sqlite',

  databaseUrl: process.env.DATABASE_URL,
  pgHost: process.env.PGHOST || 'localhost',
  pgPort: parseInt(process.env.PGPORT, 10) || 5432,
  pgDatabase: process.env.PGDATABASE || 'newscms',
  pgUser: process.env.PGUSER || 'postgres',
  pgPassword: process.env.PGPASSWORD || 'postgres',

  jwtSecret: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  corsOrigin: process.env.CORS_ORIGIN || '*',

  seedAdminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@newscms.local',
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!',
};
