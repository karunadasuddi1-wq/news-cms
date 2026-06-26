/**
 * fix-dates.js
 * One-time script: updates publishedAt on all migrated articles
 * by fetching original dates from WordPress and patching via your API.
 *
 * Run once:  node fix-dates.js
 */

const https = require('https');
const http = require('http');

const CONFIG = {
  wpSiteUrl: 'https://karunadasuddi.in',
  cmsApiUrl: 'https://karunadasuddi-api.onrender.com/api',
  cmsEmail: 'admin@karunadasuddi.in',
  cmsPassword: 'ChangeMe123!',
  perPage: 50,
};

// ── HTTP helper ──────────────────────────────────────────────────────────────
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
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
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

// ── MAIN ─────────────────────────────────────────────────────────────────────
async function fixDates() {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║   Karunada Suddi — Date Fixer        ║');
  console.log('╚══════════════════════════════════════╝\n');

  // 1. Login to CMS
  console.log('► Logging in to CMS API...');
  let token;
  try {
    const res = await request(`${CONFIG.cmsApiUrl}/auth/login`, {
      method: 'POST',
      body: { email: CONFIG.cmsEmail, password: CONFIG.cmsPassword },
    });
    if (!res.data.token) throw new Error('No token in response');
    token = res.data.token;
    console.log('  ✓ Logged in\n');
  } catch (err) {
    console.error('  ✗ Login failed:', err.message);
    process.exit(1);
  }

  // 2. Fetch ALL WordPress posts (all pages) to build slug → date map
  console.log('► Fetching all WordPress posts to build date map...');
  const wpDateMap = {}; // slug → original ISO date string
  let wpPage = 1;
  let totalWpPosts = 0;

  while (true) {
    try {
      const url = `${CONFIG.wpSiteUrl}/wp-json/wp/v2/posts?per_page=${CONFIG.perPage}&page=${wpPage}&status=publish&_fields=slug,date_gmt,date`;
      const res = await request(url);

      if (res.status !== 200 || !Array.isArray(res.data) || res.data.length === 0) break;

      const totalPages = parseInt(res.headers['x-wp-totalpages'] || '1', 10);
      if (wpPage === 1) {
        totalWpPosts = parseInt(res.headers['x-wp-total'] || res.data.length, 10);
        console.log(`  Found ${totalWpPosts} WordPress posts across ${totalPages} pages`);
      }

      for (const post of res.data) {
        // date_gmt is UTC, date is local — use date_gmt for accuracy
        wpDateMap[post.slug] = post.date_gmt
          ? post.date_gmt + 'Z'   // make it explicit UTC ISO string
          : post.date;
      }

      console.log(`  Page ${wpPage}/${totalPages} fetched (${Object.keys(wpDateMap).length} slugs so far)`);
      if (wpPage >= totalPages) break;
      wpPage++;
      await sleep(500);
    } catch (err) {
      console.error('  ✗ WP fetch error:', err.message);
      break;
    }
  }

  console.log(`  ✓ Built date map for ${Object.keys(wpDateMap).length} WordPress posts\n`);

  // 3. Fetch all CMS articles
  console.log('► Fetching all CMS articles...');
  let cmsArticles = [];
  let cmsPage = 1;

  while (true) {
    try {
      const res = await request(
        `${CONFIG.cmsApiUrl}/articles?status=published&page=${cmsPage}&pageSize=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const arr = Array.isArray(res.data)
        ? res.data
        : (res.data.articles || res.data.rows || []);

      if (!arr || arr.length === 0) break;
      cmsArticles = cmsArticles.concat(arr);
      console.log(`  Fetched ${cmsArticles.length} articles so far...`);

      const total = res.data.total || res.data.count || arr.length;
      if (cmsArticles.length >= total || arr.length < 100) break;
      cmsPage++;
      await sleep(300);
    } catch (err) {
      console.error('  ✗ CMS fetch error:', err.message);
      break;
    }
  }

  console.log(`  ✓ Found ${cmsArticles.length} CMS articles\n`);

  // 4. Patch each article with its correct publishedAt date
  console.log('► Patching article dates...');
  let fixed = 0;
  let skipped = 0;
  let notFound = 0;
  let failed = 0;

  for (const article of cmsArticles) {
    const wpDate = wpDateMap[article.slug];

    if (!wpDate) {
      console.log(`  ⚠ No WP match for slug: "${article.slug}"`);
      notFound++;
      continue;
    }

    // Skip if already correct (within 1 minute of WP date)
    if (article.publishedAt) {
      const diff = Math.abs(new Date(article.publishedAt) - new Date(wpDate));
      if (diff < 60000) {
        skipped++;
        continue;
      }
    }

    try {
      const res = await request(`${CONFIG.cmsApiUrl}/articles/${article.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          publishedAt: wpDate,
        },
      });

      if (res.status === 200 || res.status === 204) {
        fixed++;
        console.log(`  ✓ Fixed: "${article.slug}" → ${new Date(wpDate).toLocaleDateString('en-IN')}`);
      } else {
        console.log(`  ✗ Failed (${res.status}): "${article.slug}"`);
        // Log the response to help debug
        console.log('    Response:', JSON.stringify(res.data).slice(0, 200));
        failed++;
      }
    } catch (err) {
      console.log(`  ✗ Error: "${article.slug}" — ${err.message}`);
      failed++;
    }

    await sleep(300); // be gentle on the API
  }

  // 5. Summary
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║   Done!                              ║');
  console.log('╠══════════════════════════════════════╣');
  console.log(`║  ✓ Fixed:     ${String(fixed).padEnd(22)}║`);
  console.log(`║  ⏭ Skipped:   ${String(skipped).padEnd(22)}║`);
  console.log(`║  ⚠ No WP match: ${String(notFound).padEnd(20)}║`);
  console.log(`║  ✗ Failed:    ${String(failed).padEnd(22)}║`);
  console.log('╚══════════════════════════════════════╝\n');

  if (failed > 0) {
    console.log('Note: If PATCH failed, your API may not support updating publishedAt via PUT.');
    console.log('In that case, use the Supabase SQL fix below:\n');
    console.log('Run this in Supabase SQL Editor for each failed slug:');
    console.log(`UPDATE "Articles" SET "publishedAt" = '<date>' WHERE slug = '<slug>';\n`);
  }
}

fixDates().catch(err => {
  console.error('\n✗ Fatal error:', err.message);
  process.exit(1);
});
