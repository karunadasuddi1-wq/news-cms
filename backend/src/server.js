const app = require('./app');
const config = require('./config/env');
const { sequelize } = require('./models');

async function start() {
  try {
    await sequelize.authenticate();
    console.log(`[db] Connected (${config.dbDialect}).`);

    // sync({ alter: true }) adds missing columns to existing tables,
    // which handles schema changes after the initial deploy.
    await sequelize.sync({ alter: true });
    console.log('[db] Models synced.');
    if (process.env.MIGRATE === 'true') {
      setTimeout(() => {
        try { require('./migrate'); } catch(e) { console.error('[migrate] Error:', e.message); }
      }, 3000);
    }

    app.listen(config.port, () => {
      console.log(`[server] News CMS API listening on http://localhost:${config.port}`);
    });
  } catch (err) {
    console.error('[server] Failed to start:', err);
    process.exit(1);
  }
}

start();
