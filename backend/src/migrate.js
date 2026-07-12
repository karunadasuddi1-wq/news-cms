/**
 * WordPress → Newsroom CMS Migration
 * Runs as part of startup, then exits so the server can start
 */

const https = require('https');
const http = require('http');

const CONFIG = {
  wpSiteUrl: 'https://karunadasuddi.in',
  cmsApiUrl: 'https://karunadasuddi-api.onrender.com/api',
  cmsEmail: 'admin@karunadasuddi.in',
  cmsPassword: 'ChangeMe123!',
  perPage: 10,
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
        'User-Agent': 'Newsroom-Migrator/1.0',
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
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function migrate() {
  console.log('\n[migrate] Starting WordPress migration...');
  console.log(`[migrate] From: ${CONFIG.wpSiteUrl}`);

  // Wait for API to be ready
  console.log('[migrate] Waiting 5s for API to be ready...');
  await sleep(5000);

  // Login
  console.log('[migrate] Logging in...');
  let token;
  try {
    const loginRes = await request(`${CONFIG.cmsApiUrl}/auth/login`, {
      method: 'POST',
      body: { email: CONFIG.cmsEmail, password: CONFIG.cmsPassword },
    });
    if (!loginRes.data.token) throw new Error('No token received');
    token = loginRes.data.token;
    console.log('[migrate] ✓ Logged in successfully');
  } catch (err) {
    console.error('[migrate] ✗ Login failed:', err.message);
    return;
  }

  // Get CMS categories
  const cmsRes = await request(`${CONFIG.cmsApiUrl}/categories`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const cmsCats = cmsRes.data.categories || [];
  const defaultCatId = cmsCats[0]?.id;
  console.log(`[migrate] Found ${cmsCats.length} CMS categories`);

  // Fetch WP categories
  let wpCatMap = {};
  try {
    const wpCatsRes = await request(`${CONFIG.wpSiteUrl}/wp-json/wp/v2/categories?per_page=100`);
    const wpCats = wpCatsRes.data || [];
    console.log(`[migrate] Found ${wpCats.length} WordPress categories`);

    for (const wpCat of wpCats) {
      if (wpCat.name === 'Uncategorized') continue;
      const existing = cmsCats.find(c =>
        c.slug === wpCat.slug || c.name.toLowerCase() === wpCat.name.toLowerCase()
      );
      if (existing) {
        wpCatMap[wpCat.id] = existing.id;
      } else {
        try {
          const cr = await request(`${CONFIG.cmsApiUrl}/categories`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: { name: wpCat.name, slug: wpCat.slug },
          });
          if (cr.status === 201) {
            wpCatMap[wpCat.id] = cr.data.category.id;
            console.log(`[migrate] Created category: ${wpCat.name}`);
          }
        } catch {}
        await sleep(200);
      }
    }
  } catch (err) {
    console.error('[migrate] Could not fetch WP categories:', err.message);
  }

  // Fetch and import posts
  let page = 1;
  let totalImported = 0;
  let totalFailed = 0;
  let hasMore = true;

  while (hasMore) {
    try {
      const url = `${CONFIG.wpSiteUrl}/wp-json/wp/v2/posts?per_page=${CONFIG.perPage}&page=${page}&_embed=1&status=publish`;
      const res = await request(url);

      if (res.status === 400 || !Array.isArray(res.data) || res.data.length === 0) {
        hasMore = false;
        break;
      }

      const totalPages = parseInt(res.headers['x-wp-totalpages'] || '1', 10);
      const total = parseInt(res.headers['x-wp-total'] || '0', 10);

      if (page === 1) console.log(`[migrate] Found ${total} WordPress posts to import`);

      for (const post of res.data) {
        try {
          let featuredImage = '';
          if (post._embedded?.['wp:featuredmedia']?.[0]?.source_url) {
            featuredImage = post._embedded['wp:featuredmedia'][0].source_url;
          }

          let cmsCatId = defaultCatId;
          for (const wpCatId of (post.categories || [])) {
            if (wpCatMap[wpCatId]) { cmsCatId = wpCatMap[wpCatId]; break; }
          }

          const excerpt = post.excerpt?.rendered
            ? stripHtml(post.excerpt.rendered).slice(0, 200)
            : stripHtml(post.content?.rendered || '').slice(0, 200);

          const wpTags = post._embedded?.['wp:term']?.[1] || [];
          const tags = wpTags.map(t => t.slug).slice(0, 6);

          // Get original author name from WordPress
          const wpAuthorName = post._embedded?.author?.[0]?.name || '';
          
          const importRes = await request(`${CONFIG.cmsApiUrl}/articles`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: {
              title: post.title?.rendered || 'Untitled',
              slug: post.slug,
              excerpt,
              content: (post.content?.rendered || '').replace(/\[.*?\]/g, '').trim(),
              featuredImage,
              categoryId: cmsCatId,
              tags,
              seoTitle: stripHtml(post.title?.rendered || '').slice(0, 60),
              seoDescription: excerpt.slice(0, 155),
              // Preserve original WordPress publish date
              status: 'published',
              publishedAt: post.date,
              // Store original author name in excerpt if different
              wpAuthor: wpAuthorName,
            },
          });

          if (importRes.status === 201) {
            totalImported++;
            if (totalImported % 10 === 0) console.log(`[migrate] Imported ${totalImported} articles...`);
          }
        } catch (err) {
          totalFailed++;
        }
        await sleep(400);
      }

      if (page >= totalPages) hasMore = false;
      else { page++; await sleep(1000); }

    } catch (err) {
      console.error(`[migrate] Error on page ${page}:`, err.message);
      hasMore = false;
    }
  }

  console.log(`\n[migrate] ✓ Migration complete!`);
  console.log(`[migrate]   Imported: ${totalImported} articles`);
  console.log(`[migrate]   Failed:   ${totalFailed} articles`);
}

migrate().catch(err => console.error('[migrate] Fatal error:', err.message));
