const { sequelize, User, Category } = require('./models');
const config = require('./config/env');

async function seed() {
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });

  // ── Admin account ──
  const existingAdmin = await User.findOne({ where: { role: 'admin' } });
  if (existingAdmin) {
    console.log(`[seed] Admin already exists (${existingAdmin.email}). Skipping.`);
  } else {
    const admin = User.build({
      name: 'Admin',
      email: config.seedAdminEmail,
      role: 'admin',
    });
    admin.password = config.seedAdminPassword;
    await admin.save();
    console.log(`[seed] Created admin: ${config.seedAdminEmail}`);
    console.log('        ⚠ Change this password after first login.');
  }

  // ── KannadaDunia.com categories ──
  // Matches all categories from kannadadunia.com exactly
  const categories = [
    { name: 'Latest News',    slug: 'latest-news' },
    { name: 'Karnataka',      slug: 'karnataka' },
    { name: 'India',          slug: 'india-news' },
    { name: 'International',  slug: 'international' },
    { name: 'Crime',          slug: 'crime-news' },
    { name: 'Business',       slug: 'business' },
    { name: 'Sports',         slug: 'sports' },
    { name: 'Entertainment',  slug: 'entertainment' },
    { name: 'Auto',           slug: 'automobile-news' },
    { name: 'Lifestyle',      slug: 'lifestyle' },
    { name: 'Health',         slug: 'health' },
    { name: 'Beauty',         slug: 'beauty' },
    { name: 'Recipes',        slug: 'recipies' },
    { name: 'Mental Health',  slug: 'mental-health' },
    { name: 'Tourism',        slug: 'tourism' },
    { name: 'Astro',          slug: 'astro' },
    { name: 'Special',        slug: 'special' },
    { name: 'Agriculture',    slug: 'agriculture' },
    { name: 'Jobs',           slug: 'jobs' },
  ];

  let added = 0;
  for (const cat of categories) {
    const [, created] = await Category.findOrCreate({
      where: { slug: cat.slug },
      defaults: { name: cat.name, slug: cat.slug },
    });
    if (created) added++;
  }

  console.log(`[seed] Categories: ${added} added, ${categories.length - added} already existed.`);
  console.log('[seed] Done.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
