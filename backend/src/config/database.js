const path = require('path');
const fs = require('fs');
const { Sequelize } = require('sequelize');
const config = require('./env');

let sequelize;

if (config.dbDialect === 'postgres') {
  // Postgres connection — uses DATABASE_URL if provided (common on Railway/Render),
  // otherwise falls back to discrete PGHOST/PGPORT/etc vars.
  sequelize = config.databaseUrl
    ? new Sequelize(config.databaseUrl, {
        dialect: 'postgres',
        logging: false,
        dialectOptions:
          config.nodeEnv === 'production'
            ? { ssl: { require: true, rejectUnauthorized: false } }
            : {},
      })
    : new Sequelize(config.pgDatabase, config.pgUser, config.pgPassword, {
        host: config.pgHost,
        port: config.pgPort,
        dialect: 'postgres',
        logging: false,
      });
} else {
  // SQLite connection — single file on disk, zero extra setup.
  const storagePath = path.resolve(process.cwd(), config.sqliteStorage);
  fs.mkdirSync(path.dirname(storagePath), { recursive: true });

  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: storagePath,
    logging: false,
  });
}

module.exports = sequelize;
