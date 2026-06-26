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
  // ── Default pages ──
  const { Page } = require('./models');
  const defaultPages = [
    {
      title: 'Privacy Policy',
      slug: 'privacy-policy',
      sortOrder: 1,
      showInFooter: true,
      content: `<h2>Privacy Policy</h2>
<p>Effective Date: June 2025</p>
<p>At ಕರುನಾಡ ಸುದ್ದಿ (karunadasuddi.in), we value your privacy and are committed to protecting your personal information.</p>
<h3>Information We Collect</h3>
<p>We collect information you provide directly to us, such as when you contact us via email. We also collect usage data through Google Analytics to improve our services.</p>
<h3>How We Use Your Information</h3>
<p>We use the information we collect to provide, maintain, and improve our services, and to communicate with you.</p>
<h3>Cookies</h3>
<p>We use cookies to improve your browsing experience and to serve relevant advertisements through Google AdSense.</p>
<h3>Third Party Services</h3>
<p>We use Google AdSense for advertising. Google may use cookies to serve ads based on your visits to our site.</p>
<h3>Contact Us</h3>
<p>If you have any questions about this Privacy Policy, please contact us at: karunadasuddi1@gmail.com</p>`,
    },
    {
      title: 'About Us',
      slug: 'about-us',
      sortOrder: 2,
      showInFooter: true,
      content: `<h2>ನಮ್ಮ ಬಗ್ಗೆ</h2>
<p>ಕರುನಾಡ ಸುದ್ದಿ ಒಂದು ವಿಶ್ವಾಸಾರ್ಹ ಕನ್ನಡ ಸುದ್ದಿ ಮಾಧ್ಯಮ. ನಾವು ಕರ್ನಾಟಕ ಮತ್ತು ರಾಷ್ಟ್ರೀಯ ಸುದ್ದಿಗಳನ್ನು ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ತಲುಪಿಸುತ್ತೇವೆ.</p>
<h3>ನಮ್ಮ ಧ್ಯೇಯ</h3>
<p>ನಿಖರ, ವೇಗ ಮತ್ತು ವಿಶ್ವಾಸಾರ್ಹ ಸುದ್ದಿಗಳನ್ನು ಕನ್ನಡಿಗರಿಗೆ ತಲುಪಿಸುವುದು ನಮ್ಮ ಮುಖ್ಯ ಉದ್ದೇಶ.</p>
<h3>ಸಂಪರ್ಕ</h3>
<p>Email: karunadasuddi1@gmail.com</p>`,
    },
    {
      title: 'Contact Us',
      slug: 'contact-us',
      sortOrder: 3,
      showInFooter: true,
      content: `<h2>ಸಂಪರ್ಕಿಸಿ</h2>
<p>ನಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸಲು ಕೆಳಗಿನ ವಿಳಾಸ ಬಳಸಿ:</p>
<h3>📧 Email</h3>
<p><a href="mailto:karunadasuddi1@gmail.com">karunadasuddi1@gmail.com</a></p>
<h3>📘 Facebook</h3>
<p><a href="https://www.facebook.com/profile.php?id=61562996875045" target="_blank">ಕರುನಾಡ ಸುದ್ದಿ Facebook Page</a></p>
<h3>ಸುದ್ದಿ ಕಳುಹಿಸಿ</h3>
<p>ನಿಮ್ಮ ಊರಿನ ಸುದ್ದಿ, ಘಟನೆ ಅಥವಾ ಮಾಹಿತಿಯನ್ನು ನಮಗೆ ಕಳುಹಿಸಿ. ನಾವು ಅದನ್ನು ಪ್ರಕಟಿಸುತ್ತೇವೆ.</p>`,
    },
    {
      title: 'Advertise With Us',
      slug: 'advertise-with-us',
      sortOrder: 4,
      showInFooter: true,
      content: `<h2>ಜಾಹೀರಾತು ನೀಡಿ</h2>
<p>ಕರುನಾಡ ಸುದ್ದಿಯಲ್ಲಿ ನಿಮ್ಮ ವ್ಯಾಪಾರ ಅಥವಾ ಸೇವೆಯ ಜಾಹೀರಾತು ನೀಡಿ ಮತ್ತು ಲಕ್ಷಾಂತರ ಕನ್ನಡ ಓದುಗರನ್ನು ತಲುಪಿ.</p>
<h3>ಜಾಹೀರಾತು ಅವಕಾಶಗಳು</h3>
<ul>
<li>ಹೋಮ್‌ಪೇಜ್ ಬ್ಯಾನರ್ ಜಾಹೀರಾತು</li>
<li>ಲೇಖನದ ನಡುವೆ ಜಾಹೀರಾತು</li>
<li>ಸ್ಪಾನ್ಸರ್ಡ್ ಸುದ್ದಿ</li>
<li>ಸೈಡ್‌ಬಾರ್ ಜಾಹೀರಾತು</li>
</ul>
<h3>ಸಂಪರ್ಕಿಸಿ</h3>
<p>ಜಾಹೀರಾತಿಗಾಗಿ ನಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸಿ:</p>
<p>📧 Email: <a href="mailto:karunadasuddi1@gmail.com">karunadasuddi1@gmail.com</a></p>`,
    },
    {
      title: 'Disclaimer',
      slug: 'disclaimer',
      sortOrder: 5,
      showInFooter: true,
      content: `<h2>Disclaimer</h2>
<p>The information provided on ಕರುನಾಡ ಸುದ್ದಿ (karunadasuddi.in) is for general informational purposes only.</p>
<p>While we strive to keep the information up to date and correct, we make no representations or warranties of any kind, express or implied, about the completeness, accuracy, reliability, suitability or availability with respect to the website or the information contained on the website.</p>
<p>Any reliance you place on such information is therefore strictly at your own risk.</p>
<h3>External Links</h3>
<p>Our website may contain links to external websites. We have no control over the content of those sites.</p>
<h3>Contact</h3>
<p>For any queries: karunadasuddi1@gmail.com</p>`,
    },
  ];

  for (const pg of defaultPages) {
    await Page.findOrCreate({ where: { slug: pg.slug }, defaults: pg });
  }
  console.log('[seed] Default pages seeded.');

  console.log('[seed] Done.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
