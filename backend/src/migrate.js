  #!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════
 *  WordPress → Newsroom CMS Migration Script
 *  Migrates all posts, categories and images
 *
 *  Usage:
 *    node migrate-wordpress.js
 * ══════════════════════════════════════════════════════
 */

const https = require('https');
const http = require('http');

// ── Configuration ──
const CONFIG = {
  // WordPress site to migrate FROM
  wpSiteUrl: 'https://karunadasuddi.in',

  // Newsroom CMS API to migrate TO
  cmsApiUrl: 'https://karunadasuddi-api.onrender.com/api',
  cmsEmail:  'admin@karunadasuddi.in',
  cmsPassword: 'ChangeMe123!', // update if you changed it

  // How many posts to fetch per page
  perPage: 20,
};

// ── Colours ──
const c = {
  green:  s => `\x1b[32m${s}\x1b[0m`,
  red:    s => `\x1b[31m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  blue:   s => `\x1b[34m${s}\x1b[0m`,
  dim:    s => `\x1b[2m${s}\x1b[0m`,
  bold:   s => `\x1b[1m${s}\x1b[0m`,
};

// ── HTTP request helper ──
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
        'User-Agent': 'Newsroom-CMS-Migrator/1.0',
        ...options.headers,
      },
    };

    const req = lib.request(opts, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

// ── Sleep helper ──
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Stats tracker ──
const stats = {
  categoriesFound: 0,
  categoriesCreated: 0,
  categoriesSkipped: 0,
  postsFound: 0,
  postsImported: 0,
  postsFailed: 0,
  postsSkipped: 0,
};

// ══════════════════════════════════════════
//  STEP 1: Login to CMS and get token
// ══════════════════════════════════════════
async function cmsLogin() {
  console.log(c.blue('\n[ 1/4 ] Logging into Newsroom CMS...'));
  const res = await request(`${CONFIG.cmsApiUrl}/auth/login`, {
    method: 'POST',
    body: { email: CONFIG.cmsEmail, password: CONFIG.cmsPassword },
  });

  if (res.status !== 200 || !res.data.token) {
    throw new Error(`CMS login failed: ${JSON.stringify(res.data)}`);
  }

  console.log(c.green(`   ✓ Logged in as ${res.data.user.name}`));
  return res.data.token;
}

// ══════════════════════════════════════════
//  STEP 2: Fetch WordPress categories
// ══════════════════════════════════════════
async function fetchWpCategories() {
  console.log(c.blue('\n[ 2/4 ] Fetching WordPress categories...'));
  const res = await request(`${CONFIG.wpSiteUrl}/wp-json/wp/v2/categories?per_page=100`);

  if (res.status !== 200) {
    throw new Error(`Failed to fetch WP categories: ${res.status}`);
  }

  console.log(c.green(`   ✓ Found ${res.data.length} categories`));
  stats.categoriesFound = res.data.length;
  return res.data;
}

// ══════════════════════════════════════════
//  STEP 3: Get or create CMS categories
// ══════════════════════════════════════════
async function syncCategories(wpCategories, token) {
  console.log(c.blue('\n[ 3/4 ] Syncing categories to CMS...'));

  // Get existing CMS categories
  const cmsRes = await request(`${CONFIG.cmsApiUrl}/categories`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const existingCats = cmsRes.data.categories || [];

  const categoryMap = {}; // WP category ID → CMS category ID

  for (const wpCat of wpCategories) {
    if (wpCat.name === 'Uncategorized') continue;

    // Check if already exists in CMS by slug
    const existing = existingCats.find(c =>
      c.slug === wpCat.slug || c.name.toLowerCase() === wpCat.name.toLowerCase()
    );

    if (existing) {
      categoryMap[wpCat.id] = existing.id;
      stats.categoriesSkipped++;
      console.log(c.dim(`   → Exists: ${wpCat.name}`));
      continue;
    }

    // Create new category
    try {
      const createRes = await request(`${CONFIG.cmsApiUrl}/categories`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: { name: wpCat.name, slug: wpCat.slug },
      });

      if (createRes.status === 201) {
        categoryMap[wpCat.id] = createRes.data.category.id;
        stats.categoriesCreated++;
        console.log(c.green(`   ✓ Created: ${wpCat.name}`));
      }
    } catch (err) {
      console.log(c.yellow(`   ⚠ Failed to create category: ${wpCat.name}`));
    }

    await sleep(200);
  }

  return categoryMap;
}

// ══════════════════════════════════════════
//  STEP 4: Fetch and import WordPress posts
// ══════════════════════════════════════════
async function fetchWpPosts(page = 1) {
  const url = `${CONFIG.wpSiteUrl}/wp-json/wp/v2/posts?per_page=${CONFIG.perPage}&page=${page}&_embed=1&status=publish`;
  const res = await request(url);

  if (res.status === 400 || res.status === 404) return { posts: [], totalPages: 0 };
  if (res.status !== 200) throw new Error(`Failed to fetch posts page ${page}: ${res.status}`);

  const totalPages = parseInt(res.headers['x-wp-totalpages'] || '1', 10);
  const total = parseInt(res.headers['x-wp-total'] || '0', 10);

  return { posts: res.data, totalPages, total };
}

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function cleanContent(html) {
  if (!html) return '';
  // Remove WordPress-specific shortcodes
  return html
    .replace(/\[.*?\]/g, '')
    .replace(/<!--.*?-->/gs, '')
    .trim();
}

async function importPosts(token, categoryMap) {
  console.log(c.blue('\n[ 4/4 ] Importing WordPress posts...'));

  // Get first page to know total
  const first = await fetchWpPosts(1);
  if (!first.posts.length) {
    console.log(c.yellow('   No published posts found on WordPress site'));
    return;
  }

  console.log(c.green(`   ✓ Found ${first.total} published posts across ${first.totalPages} pages`));
  stats.postsFound = first.total;

  // Get default category from CMS
  const cmsRes = await request(`${CONFIG.cmsApiUrl}/categories`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const cmsCats = cmsRes.data.categories || [];
  const defaultCatId = cmsCats[0]?.id;

  // Process all pages
  for (let page = 1; page <= first.totalPages; page++) {
    const { posts } = page === 1 ? first : await fetchWpPosts(page);

    console.log(c.dim(`\n   Page ${page}/${first.totalPages}:`));

    for (const post of posts) {
      try {
        // Get featured image
        let featuredImage = '';
        if (post._embedded?.['wp:featuredmedia']?.[0]?.source_url) {
          featuredImage = post._embedded['wp:featuredmedia'][0].source_url;
        }

        // Get category
        const wpCatIds = post.categories || [];
        let cmsCatId = defaultCatId;
        for (const wpCatId of wpCatIds) {
          if (categoryMap[wpCatId]) {
            cmsCatId = categoryMap[wpCatId];
            break;
          }
        }

        if (!cmsCatId) {
          console.log(c.yellow(`   ⚠ Skipping (no category): ${post.title.rendered.slice(0, 50)}`));
          stats.postsSkipped++;
          continue;
        }

        // Get author name
        const authorName = post._embedded?.author?.[0]?.name || 'Admin';

        // Build excerpt
        const excerpt = post.excerpt?.rendered
          ? stripHtml(post.excerpt.rendered).slice(0, 200)
          : stripHtml(post.content?.rendered || '').slice(0, 200);

        // Build tags from WP tags
        const wpTags = post._embedded?.['wp:term']?.[1] || [];
        const tags = wpTags.map(t => t.slug).slice(0, 6);

        // Import to CMS
        const payload = {
          title: post.title.rendered || 'Untitled',
          slug: post.slug,
          excerpt,
          content: cleanContent(post.content?.rendered || ''),
          featuredImage,
          categoryId: cmsCatId,
          tags,
          seoTitle: stripHtml(post.title.rendered || '').slice(0, 60),
          seoDescription: excerpt.slice(0, 155),
          status: 'published',
          publishedAt: post.date,
        };

        const importRes = await request(`${CONFIG.cmsApiUrl}/articles`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: payload,
        });

        if (importRes.status === 201) {
          stats.postsImported++;
          process.stdout.write(c.green('.'));
        } else if (importRes.status === 409) {
          stats.postsSkipped++;
          process.stdout.write(c.dim('s'));
        } else {
          stats.postsFailed++;
          process.stdout.write(c.red('x'));
        }

        // Small delay to avoid overwhelming the API
        await sleep(300);

      } catch (err) {
        stats.postsFailed++;
        process.stdout.write(c.red('x'));
      }
    }

    // Delay between pages
    if (page < first.totalPages) await sleep(1000);
  }
}

// ══════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════
async function main() {
  console.log('\n' + c.bold('═══════════════════════════════════════════════'));
  console.log(c.bold('  WordPress → Newsroom CMS Migration'));
  console.log(c.bold(`  From: ${CONFIG.wpSiteUrl}`));
  console.log(c.bold(`  To:   ${CONFIG.cmsApiUrl}`));
  console.log(c.bold('═══════════════════════════════════════════════'));

  try {
    // Step 1: Login
    const token = await cmsLogin();

    // Step 2: Fetch WP categories
    const wpCategories = await fetchWpCategories();

    // Step 3: Sync categories
    const categoryMap = await syncCategories(wpCategories, token);

    // Step 4: Import posts
    await importPosts(token, categoryMap);

    // ── Summary ──
    console.log('\n\n' + c.bold(c.green('═══════════════════════════════════════════════')));
    console.log(c.bold(c.green('  ✓ Migration Complete!')));
    console.log(c.bold(c.green('═══════════════════════════════════════════════')));
    console.log(`\n  Categories:`);
    console.log(`    Found:    ${stats.categoriesFound}`);
    console.log(`    Created:  ${c.green(stats.categoriesCreated)}`);
    console.log(`    Existed:  ${c.dim(stats.categoriesSkipped)}`);
    console.log(`\n  Articles:`);
    console.log(`    Found:    ${stats.postsFound}`);
    console.log(`    Imported: ${c.green(stats.postsImported)}`);
    console.log(`    Skipped:  ${c.dim(stats.postsSkipped)}`);
    console.log(`    Failed:   ${stats.postsFailed > 0 ? c.red(stats.postsFailed) : c.green(0)}`);
    console.log(`\n  View your articles at:`);
    console.log(`    ${c.blue('https://karunadasuddi-admin.onrender.com/articles')}`);
    console.log(`\n  Public site:`);
    console.log(`    ${c.blue('https://karunadasuddi-public.onrender.com')}\n`);

  } catch (err) {
    console.error(c.red('\n✗ Migration failed: ' + err.message));
    process.exit(1);
  }
}

main();
