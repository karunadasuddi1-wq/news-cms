const https = require('https');
const asyncHandler = require('../utils/asyncHandler');
const { Article, Category } = require('../models');
const { generateUniqueSlug } = require('../utils/slug');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = 'claude-sonnet-4-6';

function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 30000,
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function callClaude(systemPrompt, userPrompt, maxTokens = 4000) {
  const res = await httpsRequest('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  let parsed;
  try { parsed = JSON.parse(res.body); } catch { throw new Error('Claude API returned invalid JSON'); }
  if (res.status !== 200) {
    throw new Error(parsed.error?.message || `Claude API error (${res.status})`);
  }
  const textBlock = parsed.content?.find(b => b.type === 'text');
  if (!textBlock) throw new Error('No text in Claude response');
  return textBlock.text;
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractArticleText(html) {
  const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map(m => stripHtml(m[1]))
    .filter(t => t.length > 40);
  if (paragraphs.length === 0) {
    return stripHtml(html).slice(0, 8000);
  }
  return paragraphs.join('\n\n').slice(0, 8000);
}

function extractTitle(html) {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (og) return stripHtml(og[1]);
  const t = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (t) return stripHtml(t[1]);
  return '';
}

function extractImage(html) {
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  return og ? og[1] : null;
}

const fetchUrl = asyncHandler(async (req, res) => {
  const { url } = req.body;
  if (!url || !/^https?:\/\//.test(url)) {
    return res.status(400).json({ error: 'A valid http(s) URL is required.' });
  }

  let html;
  try {
    const result = await httpsRequest(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KarunadaSuddiBot/1.0)' },
    });
    if (result.status >= 400) {
      return res.status(422).json({ error: `Source site returned status ${result.status}.` });
    }
    html = result.body;
  } catch (err) {
    return res.status(422).json({ error: `Could not fetch that URL: ${err.message}` });
  }

  const title = extractTitle(html);
  const text = extractArticleText(html);
  const image = extractImage(html);

  if (!text || text.length < 100) {
    return res.status(422).json({ error: 'Could not extract readable article content from that URL.' });
  }

  res.json({ title, text, image, sourceUrl: url });
});

const TONE_LABELS = {
  neutral: 'Neutral — Factual reporting',
  formal: 'Formal — Official/government tone',
  conversational: 'Conversational — Easy-reading, friendly',
  dramatic: 'Dramatic — Punchy, attention-grabbing (breaking news style)',
};

const rewrite = asyncHandler(async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'AI Writer is not configured. Missing ANTHROPIC_API_KEY.' });
  }

  const { sourceText, tone = 'neutral', categoryId, sourceUrl } = req.body;

  if (!sourceText || sourceText.trim().length < 50) {
    return res.status(400).json({ error: 'Please provide at least a few sentences of source content.' });
  }

  let categoryName = '';
  if (categoryId) {
    const cat = await Category.findByPk(categoryId);
    if (cat) categoryName = cat.name;
  }

  const toneLabel = TONE_LABELS[tone] || TONE_LABELS.neutral;

  const systemPrompt = `You are an expert Kannada news editor and rewriter for a Karnataka news website.
Your job: take a source article (which may be in English, Hindi, Telugu, Tamil, or any language) and produce a COMPLETELY ORIGINAL Kannada news article — not a translation.

Rules you must follow:
1. Write entirely in natural, fluent Kannada (ಕನ್ನಡ) using standard journalistic style.
2. This must be a genuine rewrite: different sentence structure, different paragraph order where sensible, fresh wording throughout. Do not mirror the source's sentence-by-sentence structure.
3. Preserve all facts, names, numbers, dates, places, and direct quotes accurately. Never invent or alter facts.
4. Tone: ${toneLabel}.
5. Structure: a strong opening paragraph (who/what/when/where), then supporting details, then context/background if present in the source.
6. Do not include the source URL, byline, or any meta-commentary in the body.
7. Output ONLY valid JSON (no markdown fences, no commentary) with this exact shape:
{
  "title": "Kannada headline, under 70 characters, attention-grabbing but accurate",
  "excerpt": "1-2 sentence Kannada summary, under 200 characters",
  "content": "Full Kannada article body as HTML using <p> tags for paragraphs",
  "seoTitle": "SEO-friendly Kannada title, under 60 characters",
  "seoDescription": "SEO meta description in Kannada, under 155 characters",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}
Tags should be short lowercase English slugs (e.g. "karnataka-politics", "siddaramaiah") relevant to the story, max 6 tags.`;

  const userPrompt = `${categoryName ? `Category: ${categoryName}\n\n` : ''}Source article to rewrite:\n\n${sourceText.slice(0, 12000)}`;

  let aiText;
  try {
    aiText = await callClaude(systemPrompt, userPrompt, 4000);
  } catch (err) {
    return res.status(502).json({ error: `AI generation failed: ${err.message}` });
  }

  const cleaned = aiText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  let result;
  try {
    result = JSON.parse(cleaned);
  } catch (err) {
    return res.status(502).json({ error: 'AI returned an unexpected format. Please try again.' });
  }

  res.json({
    title: result.title || '',
    excerpt: result.excerpt || '',
    content: result.content || '',
    seoTitle: result.seoTitle || '',
    seoDescription: result.seoDescription || '',
    tags: Array.isArray(result.tags) ? result.tags : [],
    sourceUrl: sourceUrl || null,
  });
});

const saveDraft = asyncHandler(async (req, res) => {
  const { title, excerpt, content, seoTitle, seoDescription, tags, categoryId, featuredImage } = req.body;

  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required.' });
  if (!content || !content.trim()) return res.status(400).json({ error: 'Content is required.' });
  if (!categoryId) return res.status(400).json({ error: 'Category is required.' });

  const category = await Category.findByPk(categoryId);
  if (!category) return res.status(400).json({ error: 'That category does not exist.' });

  const slug = await generateUniqueSlug(Article, title);

  const article = Article.build({
    title: title.trim(),
    slug,
    excerpt: excerpt ? excerpt.trim() : null,
    content,
    featuredImage: featuredImage || null,
    categoryId,
    authorId: req.user.id,
    status: 'draft',
    seoTitle: seoTitle || null,
    seoDescription: seoDescription || null,
  });

  if (Array.isArray(tags)) {
    article.tags = tags.filter(t => t && t.trim()).map(t => t.trim());
  }

  await article.save();

  res.status(201).json({ article, message: 'Saved as draft. Review and publish when ready.' });
});

const TRENDING_FEEDS = [
  { label: 'ಕರ್ನಾಟಕ', url: 'https://news.google.com/rss/search?q=Karnataka&hl=kn&gl=IN&ceid=IN:kn' },
  { label: 'ಭಾರತ', url: 'https://news.google.com/rss/search?q=India&hl=kn&gl=IN&ceid=IN:kn' },
  { label: 'ಟ್ರೆಂಡಿಂಗ್', url: 'https://news.google.com/rss?hl=kn&gl=IN&ceid=IN:kn' },
];

function parseRssItems(xml, limit = 10) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, limit);
  return items.map(m => {
    const block = m[1];
    const title = (block.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
    const link = (block.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '';
    const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || '';
    const source = (block.match(/<source[^>]*>([\s\S]*?)<\/source>/) || [])[1] || '';
    return {
      title: stripHtml(title.replace(/^<!\[CDATA\[|\]\]>$/g, '')),
      link: link.trim(),
      pubDate,
      source: stripHtml(source),
    };
  }).filter(i => i.title);
}

const trending = asyncHandler(async (req, res) => {
  const feedLabel = req.query.feed || 'ಕರ್ನಾಟಕ';
  const feed = TRENDING_FEEDS.find(f => f.label === feedLabel) || TRENDING_FEEDS[0];

  try {
    const result = await httpsRequest(feed.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KarunadaSuddiBot/1.0)' },
    });
    if (result.status !== 200) {
      return res.status(502).json({ error: 'Could not fetch trending news right now.' });
    }
    const items = parseRssItems(result.body, 15);
    res.json({ feed: feed.label, items, availableFeeds: TRENDING_FEEDS.map(f => f.label) });
  } catch (err) {
    console.error("Trending fetch error:", err.message);
    res.status(502).json({ error: `Trending news fetch failed: ${err.message}` });
  }
});

module.exports = { fetchUrl, rewrite, saveDraft, trending };
