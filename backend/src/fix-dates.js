const https = require('https');
const http = require('http');

const CONFIG = {
  wpSiteUrl: 'https://karunadasuddi.in',
  cmsApiUrl: 'https://karunadasuddi-api.onrender.com/api',
  cmsEmail: 'admin@karunadasuddi.in',
  cmsPassword: 'ChangeMe123!',
  perPage: 100,
};

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const opts = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DateFixer/1.0',
        ...options.headers,
      },
      timeout: 30000,
    };
    const req = lib.request(opts, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const data = Buffer.concat(chunks).toString('utf8');
        try { resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers }); }
        catch { resolve({ status: res.statusCode, data, headers: res.headers }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function baseSlug(slug) {
  return slug.replace(/-\d+$/, '');
}

async function fixDates() {
  console.log('\n=== Karunada Suddi Date Fixer v2 ===\n');

  console.log('Logging in...');
  let token;
  try {
    const res = await request(`${CONFIG.cmsApiUrl}/auth/login`, {
      method: 'POST',
      body: { email: CONFIG.cmsEmail, password: CONFIG.cmsPassword },
    });
    if (!res.data.token) throw new Error('No token in response');
    token = res.data.token;
    console.log('Logged in\n');
  } catch (err) {
    console.error('Login failed:', err.message);
    process.exit(1);
  }

  console.log('Fetching WordPress posts...');
  const wpDateMap = {};
  let wpPage = 1;

  while (true) {
    try {
      const url = `${CONFIG.wpSiteUrl}/wp-json/wp/v2/posts?per_page=100&page=${wpPage}&status=publish&_fields=slug,date_gmt,date`;
      const res = await request(url);
      if (res.status !== 200 || !Array.isArray(res.data) || res.data.length === 0) break;
      const totalPages = parseInt(res.headers['x-wp-totalpages'] || '1', 10);
      for (const post of res.data) {
        wpDateMap[post.slug] = post.date_gmt ? post.date_gmt + 'Z' : post.date;
      }
      console.log(`WP page ${wpPage}/${totalPages} (${Object.keys(wpDateMap).length} slugs)`);
      if (wpPage >= totalPages) break;
      wpPage++;
      await sleep(300);
    } catch (err) {
      console.error('WP fetch error:', err.message);
      break;
    }
  }
  console.log(`Built date map for ${Object.keys(wpDateMap).length} posts\n`);

  console.log('Fetching ALL CMS articles (this may take a few minutes)...');
  let cmsArticles = [];
  let cmsPage = 1;
  let totalPages = null;

  while (true) {
    try {
      const res = await request(
        `${CONFIG.cmsApiUrl}/articles?status=published&page=${cmsPage}&pageSize=${CONFIG.perPage}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.status !== 200) {
        console.error(`CMS fetch failed at page ${cmsPage}, status ${res.status}`);
        console.error(JSON.stringify(res.data).slice(0, 300));
        break;
      }

      const arr = res.data.articles || [];
      const pagination = res.data.pagination || {};
      if (totalPages === null) {
        totalPages = pagination.totalPages || 1;
        console.log(`Total CMS pages to fetch: ${totalPages} (${pagination.total} articles)`);
      }

      if (arr.length === 0) break;
      cmsArticles = cmsArticles.concat(arr);
      console.log(`CMS page ${cmsPage}/${totalPages} -> ${cmsArticles.length} articles so far`);

      if (cmsPage >= totalPages) break;
      cmsPage++;
      await sleep(200);
    } catch (err) {
      console.error('CMS fetch error:', err.message);
      break;
    }
  }
  console.log(`\nFound ${cmsArticles.length} CMS articles total\n`);

  console.log('Patching dates...');
  let fixed = 0, skipped = 0, notFound = 0, failed = 0;

  for (const article of cmsArticles) {
    let wpDate = wpDateMap[article.slug];
    if (!wpDate) {
      const stripped = baseSlug(article.slug);
      if (stripped !== article.slug) wpDate = wpDateMap[stripped];
    }

    if (!wpDate) { notFound++; continue; }

    if (article.publishedAt) {
      const diff = Math.abs(new Date(article.publishedAt) - new Date(wpDate));
      if (diff < 60000) { skipped++; continue; }
    }

    try {
      const res = await request(`${CONFIG.cmsApiUrl}/articles/${article.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: { publishedAt: wpDate },
      });
      if (res.status === 200 || res.status === 204) {
        fixed++;
        if (fixed % 25 === 0) console.log(`Fixed ${fixed} so far...`);
      } else {
        failed++;
      }
    } catch (err) {
      failed++;
    }
    await sleep(120);
  }

  console.log('\n=== Done ===');
  console.log(`Fixed: ${fixed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`No WP match: ${notFound}`);
  console.log(`Failed: ${failed}`);
}

fixDates().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
