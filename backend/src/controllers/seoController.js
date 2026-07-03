const asyncHandler = require('../utils/asyncHandler');
const { generateUniqueSlug } = require('../utils/slug');
const { Article } = require('../models');
const { callAI } = require('../utils/aiProvider');

function extractJson(text) {
  try { return JSON.parse(text.trim()); } catch {}
  const stripped = text.replace(/```(?:json)?/gi, '').trim();
  try { return JSON.parse(stripped); } catch {}
  const match = text.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }

  function extract(key) {
    const re = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'i');
    const m = text.match(re); return m ? m[1].replace(/\\"/g, '"') : '';
  }
  // For tags array
  function extractArray(key) {
    const re = new RegExp(`"${key}"\\s*:\\s*\\[([^\\]]*)\\]`, 'i');
    const m = text.match(re);
    if (!m) return [];
    return m[1].split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
  }

  const headline = extract('headline');
  if (headline) {
    return {
      headline,
      slug: extract('slug'),
      excerpt: extract('excerpt'),
      seoTitle: extract('seoTitle'),
      seoDescription: extract('seoDescription'),
      focusKeyword: extract('focusKeyword'),
      tags: extractArray('tags'),
    };
  }
  return null;
}

const generateSeo = asyncHandler(async (req, res) => {
  const { title = '', content = '', existingArticleId } = req.body;

  if (!content || content.trim().length < 50) {
    return res.status(400).json({
      error: 'Add at least 50 characters of article content before generating SEO fields.',
    });
  }

  // AI provider configured via Settings

  const contentPreview = content.trim().slice(0, 4000);
  const currentTitle = title.trim();

  const prompt = `You are a Kannada news SEO editor. Analyze this article and return optimized metadata.

ARTICLE TITLE: ${currentTitle || '(not yet set)'}

ARTICLE CONTENT:
${contentPreview}

Respond with ONLY this JSON object, nothing else before or after it:

{"headline":"compelling headline under 70 chars for Google Discover","slug":"url-slug-lowercase-hyphenated-max-60-chars","excerpt":"2-3 sentence summary 150-200 chars","seoTitle":"SEO title 30-60 chars with keyword","seoDescription":"meta description 120-155 chars with keyword and call to action","focusKeyword":"primary keyword 2-4 words","tags":["tag1","tag2","tag3","tag4","tag5"]}

Rules for tags:
- Generate 4-6 relevant tags in English (lowercase, no spaces, use hyphens for multi-word)
- Tags should be searchable topic keywords — people, places, organizations, topics mentioned in the article
- Examples: "ksrtc", "bus-fare", "karnataka-transport", "siddaramaiah", "bengaluru"
- Mix specific (person/org names) and broad (topic) tags`;

  const raw = await callAI('You are a Kannada news SEO editor.', prompt, 900, {
    userId: req.user?.id,
    action: 'ai_seo_generate',
    metadata: { articleId: existingArticleId },
  });
  console.log('[seo-generate] raw response:', raw.slice(0, 400));

  const parsed = extractJson(raw);

  if (!parsed || !parsed.headline) {
    console.error('[seo-generate] Could not extract fields from:', raw);
    return res.status(502).json({
      error: 'AI returned an unexpected response. Try again or fill the fields manually.',
    });
  }

  const baseSlug = (parsed.slug || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

  const uniqueSlug = await generateUniqueSlug(
    Article,
    baseSlug || parsed.headline,
    existingArticleId ? parseInt(existingArticleId, 10) : null
  );

  // Clean and validate tags
  const tags = (Array.isArray(parsed.tags) ? parsed.tags : [])
    .map(t => String(t).toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''))
    .filter(t => t.length >= 2 && t.length <= 50)
    .slice(0, 6);

  res.json({
    headline: parsed.headline || '',
    slug: uniqueSlug,
    excerpt: parsed.excerpt || '',
    seoTitle: parsed.seoTitle || '',
    seoDescription: parsed.seoDescription || '',
    focusKeyword: parsed.focusKeyword || '',
    tags,
  });
});

module.exports = { generateSeo };
