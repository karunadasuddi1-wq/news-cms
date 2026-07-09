const https = require('https');
const http = require('http');

const { getSetting } = require('./settingController');
const { generateArticleSchema } = require('../utils/schemaGenerator');
const { User } = require('../models');

async function getWpConfig() {
  const site_url = (await getSetting('wp_site_url', 'WP_SITE_URL')) || 'https://karunadasuddi.in';
  const username = (await getSetting('wp_username', 'WP_APP_USER')) || '';
  const password = (await getSetting('wp_app_password', 'WP_APP_PASSWORD')) || '';
  return { site_url, username, password };
}

const CATEGORY_MAP = {
  'breaking-news': 4553,
  'ccl-2025': 772220350,
  'champions-trophy-2025': 772220383,
  'cricket': 772220446,
  'crime-news': 772223383,
  'delhi-assembly-election-2025': 772220071,
  'district': 23480,
  'entertainment': 384,
  'home': 400,
  'imp-news': 772218484,
  'international': 772223380,
  'ipl-2025': 772220953,
  'jobs': 772223384,
  'karunadu': 772225297,
  'latest-news': 772218483,
  'lifestyle': 772223437,
  'lookback-2024': 772219258,
  'mahakumbh-mela-2025': 772219643,
  'money': 772223382,
  'national': 772223379,
  'national-international': 336812,
  'olympic-2024': 772218639,
  'politics': 772223342,
  'psychology': 772222779,
  'science': 772223381,
  'scrolling-news': 772218485,
  'sports': 67,
  'state': 5562,
  'top-story': 772218505,
  'union-budget-2025': 772219947,
};

function wpAuthHeader(username, password) {
  const credentials = Buffer.from(`${username}:${password}`).toString('base64');
  return `Basic ${credentials}`;
}

async function wpRequest(path, options = {}) {
  const { site_url, username, password } = await getWpConfig();
  return new Promise((resolve, reject) => {
    const url = new URL(`${site_url}/wp-json/wp/v2${path}`);
    const lib = url.protocol === 'https:' ? https : http;
    const opts = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': wpAuthHeader(username, password),
        'User-Agent': 'PublisherOS-CMS/1.0 (WordPress-Sync; +https://publisheros.in)',
        ...options.headers,
      },
      timeout: 30000,
    };
    const req = lib.request(opts, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('WordPress request timed out')); });
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function sideloadImage(imageUrl, title, altText) {
  if (!imageUrl) return null;
  const { site_url, username, password } = await getWpConfig();
  try {
    // Download image as binary
    const imageRes = await new Promise((resolve, reject) => {
      const parsed = new URL(imageUrl);
      const lib = parsed.protocol === 'https:' ? https : http;
      lib.get(imageUrl, { headers: { 'User-Agent': 'PublisherOS-CMS/1.0 (WordPress-Sync; +https://publisheros.in)' } }, res => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve({ buffer: Buffer.concat(chunks), headers: res.headers, status: res.statusCode }));
      }).on('error', reject);
    });

    if (imageRes.status !== 200) {
      console.warn('[wp-sync] Image download failed:', imageRes.status);
      return null;
    }

    const contentType = imageRes.headers['content-type'] || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const filename = `${(title || 'image').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 50)}.${ext}`;

    // Upload binary to WordPress media library
    const wpUrl = new URL(`${site_url}/wp-json/wp/v2/media`);
    const uploadRes = await new Promise((resolve, reject) => {
      const opts = {
        hostname: wpUrl.hostname,
        port: 443,
        path: wpUrl.pathname,
        method: 'POST',
        headers: {
          'Authorization': wpAuthHeader(username, password),
          'User-Agent': 'PublisherOS-CMS/1.0 (WordPress-Sync; +https://publisheros.in)',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Type': contentType,
          'Content-Length': imageRes.buffer.length,
        },
        timeout: 30000,
      };
      const req = https.request(opts, res => {
        let data = '';
        res.on('data', c => (data += c));
        res.on('end', () => {
          try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, data }); }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Upload timed out')); });
      req.write(imageRes.buffer);
      req.end();
    });

    if (uploadRes.status === 201 && uploadRes.data.id) {
      console.log('[wp-sync] Image uploaded to WP, ID:', uploadRes.data.id);
      if (altText) {
        try {
          await wpRequest(`/media/${uploadRes.data.id}`, {
            method: 'POST',
            body: { alt_text: altText },
          });
        } catch (err) {
          console.warn('[wp-sync] Failed to set image alt text (non-fatal):', err.message);
        }
      }
      return uploadRes.data.id;
    }
    console.warn('[wp-sync] Image upload failed:', uploadRes.status, JSON.stringify(uploadRes.data).slice(0, 200));
    return null;
  } catch (err) {
    console.warn('[wp-sync] Image sideload error:', err.message);
    return null;
  }
}

async function mapCategory(categorySlug) {
  const defaultId = parseInt((await getSetting('wp_default_category_id', null)) || '772218483', 10);
  if (!categorySlug) return [defaultId];

  let siteMap = {};
  try {
    const raw = await getSetting('wp_category_map', null);
    if (raw) siteMap = JSON.parse(raw);
  } catch (err) {
    console.warn('[wp-sync] Could not parse wp_category_map setting:', err.message);
  }

  const wpId = siteMap[categorySlug] || CATEGORY_MAP[categorySlug];
  return wpId ? [wpId] : [defaultId];
}

// Looks up the WordPress user ID matching this article's CMS author, by email.
// Fetches the author fresh by authorId rather than trusting article.author to
// already be populated — syncToWordPress gets called from places (setStatus,
// resync) that don't always include the author association.
// Returns null if no author, no email, or no matching WordPress user is found —
// callers should fall back gracefully (WordPress defaults to the authenticated
// API user when no author is specified) and log a warning so a byline mismatch
// like this is at least visible in the logs instead of silently wrong.
async function getWpAuthorId(article) {
  if (!article.authorId) return null;
  try {
    const cmsAuthor = await User.findByPk(article.authorId, { attributes: ['id', 'name', 'email'] });
    if (!cmsAuthor || !cmsAuthor.email) return null;

    const searchRes = await wpRequest(`/users?search=${encodeURIComponent(cmsAuthor.email)}&_fields=id,name,email`);
    if (searchRes.status !== 200 || !Array.isArray(searchRes.data) || !searchRes.data.length) {
      console.warn(`[wp-sync] No matching WordPress user found for CMS author "${cmsAuthor.name}" (${cmsAuthor.email}) — post will default to the API-authenticated WP user instead.`);
      return null;
    }
    return searchRes.data[0].id;
  } catch (err) {
    console.warn('[wp-sync] Author lookup failed (non-fatal):', err.message);
    return null;
  }
}

async function syncToWordPress(article, categorySlug) {
  const { username, password } = await getWpConfig();
  if (!username || !password) {
    throw new Error('WordPress credentials not configured. Set them in Settings.');
  }

  console.log(`[wp-sync] Syncing "${article.title}" (CMS ID: ${article.id})...`);

  const featuredMediaId = await sideloadImage(article.featuredImage, article.title, article.imageAlt);
  const wpCategories = await mapCategory(categorySlug);
  const wpAuthorId = await getWpAuthorId(article);

  const injectSchema = (await getSetting('wp_inject_schema', null)) === 'true';
  let contentWithSchema = article.content || '';
  if (injectSchema) {
    const schema = await generateArticleSchema(article);
    contentWithSchema += `\n<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
  }

  const payload = {
    title: article.title,
    content: contentWithSchema,
    excerpt: article.excerpt || '',
    status: 'publish',
    slug: article.slug,
    categories: wpCategories,
    date: article.publishedAt ? new Date(article.publishedAt).toISOString() : new Date().toISOString(),
    date_gmt: article.publishedAt ? new Date(article.publishedAt).toISOString() : new Date().toISOString(),
  };

  if (featuredMediaId) payload.featured_media = featuredMediaId;
  if (wpAuthorId) payload.author = wpAuthorId;

  let res;
  if (article.wpPostId) {
    console.log(`[wp-sync] Updating WP post ID: ${article.wpPostId}`);
    res = await wpRequest(`/posts/${article.wpPostId}`, { method: 'POST', body: payload });
    if (res.status !== 200) {
      console.warn(`[wp-sync] Update failed (${res.status}), creating new post...`);
      res = await wpRequest('/posts', { method: 'POST', body: payload });
    }
  } else {
    res = await wpRequest('/posts', { method: 'POST', body: payload });
  }

  if (res.status !== 201 && res.status !== 200) {
    const errMsg = res.data?.message || JSON.stringify(res.data).slice(0, 300);
    throw new Error(`WordPress API error (${res.status}): ${errMsg}`);
  }

  const wpPost = res.data;
  console.log(`[wp-sync] Done: WP Post ID ${wpPost.id}, URL: ${wpPost.link}`);
  return { wpPostId: wpPost.id, wpUrl: wpPost.link };
}

async function deleteFromWordPress(wpPostId) {
  if (!wpPostId) return { ok: true, skipped: true };
  try {
    // By default WP REST moves the post to Trash rather than permanently deleting it —
    // safer, and recoverable from wp-admin if this was triggered by mistake.
    const res = await wpRequest(`/posts/${wpPostId}`, { method: 'DELETE' });
    if (res.status === 200 || res.status === 410) return { ok: true };
    return { ok: false, error: `Status ${res.status}: ${JSON.stringify(res.data).slice(0, 200)}` };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function testWpConnection() {
  try {
    const res = await wpRequest('/users/me?_fields=id,name,slug');
    if (res.status === 200) return { ok: true, user: res.data };
    return { ok: false, error: `Status ${res.status}: ${JSON.stringify(res.data).slice(0, 200)}` };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}


/**
 * Push author bio/avatar to WordPress user profile
 */
async function syncAuthorToWordPress(author) {
  if (!author) return;
  try {
    // Find WP user by slug/login
    const searchRes = await wpRequest(`/users?search=${encodeURIComponent(author.email)}&_fields=id,name,slug`);
    if (searchRes.status !== 200 || !Array.isArray(searchRes.data) || !searchRes.data.length) {
      console.warn('[wp-sync] Author not found in WordPress:', author.email);
      return;
    }
    const wpUserId = searchRes.data[0].id;
    const payload = {};
    if (author.bio) payload.description = author.bio;
    if (author.name) payload.name = author.name;
    if (Object.keys(payload).length === 0) return;
    const res = await wpRequest(`/users/${wpUserId}`, { method: 'POST', body: payload });
    if (res.status === 200) {
      console.log('[wp-sync] Author bio synced to WordPress user ID:', wpUserId);
    } else {
      console.warn('[wp-sync] Author bio sync failed:', res.status);
    }
  } catch (err) {
    console.warn('[wp-sync] Author bio sync error:', err.message);
  }
}

module.exports = { syncToWordPress, testWpConnection, syncAuthorToWordPress, deleteFromWordPress };
