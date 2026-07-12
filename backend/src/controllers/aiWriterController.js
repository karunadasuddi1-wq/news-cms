const https = require('https');
const { callAI } = require('../utils/aiProvider');
const asyncHandler = require('../utils/asyncHandler');
const { Article, Category } = require('../models');
const { generateUniqueSlug } = require('../utils/slug');
const { getSetting } = require('./settingController');
const { getLanguageConfig, DEFAULT_LANGUAGE } = require('../utils/languages');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = 'claude-sonnet-4-6';

function httpsRequest(url, options = {}, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error('Too many redirects'));
      return;
    }
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeoutMs || 30000,
    };
    const req = https.request(opts, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        const nextUrl = new URL(res.headers.location, url).toString();
        resolve(httpsRequest(nextUrl, options, redirectCount + 1));
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8'), headers: res.headers }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    if (options.body) req.write(options.body);
    req.end();
  });
}

// callAI is now imported from aiProvider.js — supports Anthropic, OpenAI, Gemini, Groq, Mistral

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
  let paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map(m => stripHtml(m[1]))
    .filter(t => t.length > 40);

  if (paragraphs.join(' ').length >= 150) {
    return paragraphs.join('\n\n').slice(0, 8000);
  }

  const containerMatch = html.match(
    /<(?:div|section|article)[^>]*(?:class|id)=["'][^"']*(?:article-body|articleBody|story-body|storyBody|post-content|entry-content|article-content|content-body|articleContent)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section|article)>/i
  );
  if (containerMatch) {
    const innerParagraphs = [...containerMatch[1].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
      .map(m => stripHtml(m[1]))
      .filter(t => t.length > 30);
    if (innerParagraphs.join(' ').length >= 150) {
      return innerParagraphs.join('\n\n').slice(0, 8000);
    }
    const containerText = stripHtml(containerMatch[1]);
    if (containerText.length >= 150) {
      return containerText.slice(0, 8000);
    }
  }

  const ldJsonBlocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const block of ldJsonBlocks) {
    try {
      const data = JSON.parse(block[1].trim());
      const candidates = Array.isArray(data) ? data : [data];
      for (const item of candidates) {
        if (item.articleBody && item.articleBody.length >= 150) {
          return stripHtml(item.articleBody).slice(0, 8000);
        }
        if (Array.isArray(item['@graph'])) {
          for (const g of item['@graph']) {
            if (g.articleBody && g.articleBody.length >= 150) {
              return stripHtml(g.articleBody).slice(0, 8000);
            }
          }
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  }

  const metaDesc = html.match(/<meta[^>]+(?:property=["']og:description["']|name=["']description["'])[^>]+content=["']([^"']+)["']/i);

  if (paragraphs.length > 0) {
    const fallback = paragraphs.join('\n\n');
    if (fallback.length >= 60) return fallback.slice(0, 8000);
  }

  if (metaDesc && metaDesc[1] && metaDesc[1].length >= 60) {
    return stripHtml(metaDesc[1]).slice(0, 8000);
  }

  return stripHtml(html).slice(0, 8000);
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
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    console.log('fetchUrl status:', result.status, 'bodyLength:', result.body.length);
    if (result.status >= 400) {
      return res.status(422).json({ error: `Source site returned status ${result.status}.` });
    }
    html = result.body;
  } catch (err) {
    console.error('fetchUrl error:', err.message);
    return res.status(422).json({ error: `Could not fetch that URL: ${err.message}` });
  }

  const title = extractTitle(html);
  const text = extractArticleText(html);
  const image = extractImage(html);

  console.log('fetchUrl: title:', JSON.stringify(title), 'text:', JSON.stringify(text.slice(0, 200)));

  if (!text || text.length < 60) {
    return res.status(422).json({
      error: 'Could not extract readable article content from that URL. Try pasting the text directly instead.',
    });
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
  // AI provider is configured via Settings — callAI handles provider selection

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

  const langKey = (await getSetting('content_language', null)) || DEFAULT_LANGUAGE;
  const lang = getLanguageConfig(langKey);
  const languageInstruction = lang.isEnglish
    ? 'Write entirely in clear, natural English using standard journalistic style.'
    : `Write entirely in natural, fluent ${lang.label} (${lang.nativeName}) using standard journalistic style.`;

  const systemPrompt = `You are an expert news editor and rewriter for a ${lang.label} news website.
Your job: take a source article (which may be in English or any other language) and produce a COMPLETELY ORIGINAL ${lang.label} news article — not a translation.

Rules you must follow:
1. ${languageInstruction}
2. This must be a genuine rewrite: different sentence structure, different paragraph order where sensible, fresh wording throughout. Do not mirror the source's sentence-by-sentence structure.
3. Preserve all facts, names, numbers, dates, places, and direct quotes accurately. Never invent or alter facts.
4. Tone: ${toneLabel}.
5. Structure: a strong opening paragraph (who/what/when/where), then supporting details, then context/background if present in the source.
6. Do not include the source URL, byline, or any meta-commentary in the body.
7. Output ONLY valid JSON (no markdown fences, no commentary) with this exact shape:
{
  "title": "${lang.label} headline, under 70 characters, attention-grabbing but accurate",
  "excerpt": "1-2 sentence ${lang.label} summary, under 200 characters",
  "content": "Full ${lang.label} article body as HTML using <p> tags for paragraphs",
  "seoTitle": "SEO-friendly ${lang.label} title, under 60 characters",
  "seoDescription": "SEO meta description in ${lang.label}, under 155 characters",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}
Tags should be short lowercase English slugs (e.g. "karnataka-politics", "siddaramaiah") relevant to the story, max 6 tags.`;

  const userPrompt = `${categoryName ? `Category: ${categoryName}\n\n` : ''}Source article to rewrite:\n\n${sourceText.slice(0, 12000)}`;

  let aiText;
  try {
    aiText = await callAI(systemPrompt, userPrompt, 4000, {
      userId: req.user?.id,
      action: 'ai_writer_rewrite',
      metadata: { tone, categoryId, hasSourceUrl: !!sourceUrl },
    });
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
  { key: 'all', label: 'All', url: 'https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en' },
  { key: 'national', label: 'National', url: 'https://news.google.com/rss/headlines/section/topic/NATION?hl=en-IN&gl=IN&ceid=IN:en' },
  { key: 'karnataka', label: 'Karnataka', url: 'https://news.google.com/rss/search?q=Karnataka&hl=en-IN&gl=IN&ceid=IN:en' },
  { key: 'sports', label: 'Sports', url: 'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-IN&gl=IN&ceid=IN:en' },
  { key: 'business', label: 'Business', url: 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-IN&gl=IN&ceid=IN:en' },
  { key: 'tech', label: 'Tech', url: 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-IN&gl=IN&ceid=IN:en' },
  { key: 'entertainment', label: 'Entertainment', url: 'https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=en-IN&gl=IN&ceid=IN:en' },
  { key: 'kannada', label: 'Kannada', url: 'https://news.google.com/rss?hl=kn&gl=IN&ceid=IN:kn' },
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
  const feedKey = req.query.feed || 'karnataka';
  const feed = TRENDING_FEEDS.find(f => f.key === feedKey) || TRENDING_FEEDS.find(f => f.key === 'karnataka');

  try {
    const result = await httpsRequest(feed.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KarunadaSuddiBot/1.0)' },
    });
    if (result.status !== 200) {
      return res.status(502).json({ error: 'Could not fetch trending news right now.' });
    }
    const items = parseRssItems(result.body, 20).map(item => ({
      ...item,
      category: feed.key,
    }));
    res.json({
      feed: feed.key,
      items,
      availableFeeds: TRENDING_FEEDS.map(f => ({ key: f.key, label: f.label })),
    });
  } catch (err) {
    console.error('Trending fetch error:', err.message);
    res.status(502).json({ error: `Trending news fetch failed: ${err.message}` });
  }
});

module.exports = { fetchUrl, rewrite, saveDraft, trending };
