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

STEP 1: Identify ONE single English word — the single term real people are most likely to type into Google when searching for this story. It must be exactly one word (a proper noun, organization, place, or key entity name — e.g. "KSRTC", "Budget", "Siddaramaiah", "Cyclone"). Not a phrase, not multiple words.

STEP 1B: Separately, read the FIRST PARAGRAPH of the article content only. Pick ONE prominent Kannada keyword or short Kannada phrase that is ALREADY PRESENT, word-for-word, in that first paragraph — the main Kannada topic term a Kannada-speaking reader would search for. Do not invent or translate a new phrase; it must be text that genuinely already appears in the first paragraph as written.

STEP 2: Use that EXACT same English word, unchanged, inline in ALL FOUR of: the Kannada headline, the Kannada excerpt, the Kannada SEO title, and the Kannada SEO description. Every one of these four fields MUST contain that exact word — this is the most important rule.

STEP 2B: Also use the exact Kannada keyword/phrase from STEP 1B, unchanged, inline in the headline, the SEO title, and the SEO description (it is already present in the article's first paragraph, so no change to the article content itself is needed).

STRICT RULE — NO OTHER ENGLISH WORDS ALLOWED: The ONLY English word permitted anywhere in the headline, excerpt, SEO title, and SEO description is that one single keyword. Every other proper noun, place name, organization name, or number-word must be written in Kannada script instead — e.g. write ಅಹಮದಾಬಾದ್ instead of "Ahmedabad" (unless Ahmedabad happens to be your chosen keyword), ಗುಜರಾತ್ ಹೈಕೋರ್ಟ್ instead of "Gujarat High Court", ೨೦೦೮ or 2008 written naturally in the Kannada sentence instead of an extra English phrase. Do not mix in any other English names or phrases beyond the one designated keyword — if you catch yourself writing a second English word or phrase, replace it with its Kannada equivalent before responding.

Respond with ONLY this JSON object, nothing else before or after it:

{"headline":"compelling Kannada headline under 70 chars for Google Discover, with the English keyword embedded inline","slug":"url-slug-lowercase-hyphenated-max-60-chars, must include the English keyword","excerpt":"2-3 sentence Kannada summary 150-200 chars, with the English keyword embedded inline","seoTitle":"Kannada SEO title, roughly 30-60 chars, with the English keyword embedded inline","seoDescription":"Kannada meta description, roughly 120-155 chars, with the English keyword embedded inline and a call to action","focusKeyword":"the single English word from Step 1","kannadaKeyword":"the Kannada keyword/phrase from Step 1B, copied exactly as it appears in the article's first paragraph","tags":["tag1","tag2","tag3","tag4","tag5"]}

Rules for tags:
- Generate 4-6 relevant tags in English (lowercase, no spaces, use hyphens for multi-word)
- The focus keyword itself should be the first tag
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

  const focusKeyword = (parsed.focusKeyword || '').trim().split(/\s+/)[0] || '';
  const keywordSlugPart = focusKeyword
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  let baseSlug = (parsed.slug || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

  if (keywordSlugPart && !baseSlug.includes(keywordSlugPart)) {
    baseSlug = `${keywordSlugPart}-${baseSlug}`.replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  }

  const uniqueSlug = await generateUniqueSlug(
    Article,
    baseSlug || parsed.headline,
    existingArticleId ? parseInt(existingArticleId, 10) : null
  );

  const altText = uniqueSlug;

  let tags = (Array.isArray(parsed.tags) ? parsed.tags : [])
    .map(t => String(t).toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''))
    .filter(t => t.length >= 2 && t.length <= 50);
  if (keywordSlugPart && !tags.includes(keywordSlugPart)) {
    tags = [keywordSlugPart, ...tags];
  }
  tags = tags.slice(0, 6);

  const kannadaKeyword = parsed.kannadaKeyword || '';

  if (focusKeyword) {
    const kw = focusKeyword.toLowerCase();
    const checks = { headline: parsed.headline, excerpt: parsed.excerpt, seoTitle: parsed.seoTitle, seoDescription: parsed.seoDescription };
    for (const [field, value] of Object.entries(checks)) {
      const text = String(value || '');
      if (!text.toLowerCase().includes(kw)) {
        console.warn(`[seo-generate] Focus keyword "${focusKeyword}" missing from ${field}`);
      }
      const englishWords = (text.match(/[A-Za-z]+/g) || []).filter(w => w.toLowerCase() !== kw);
      if (englishWords.length > 0) {
        console.warn(`[seo-generate] Extra English word(s) beyond keyword "${focusKeyword}" in ${field}: ${englishWords.join(', ')}`);
      }
    }
  }

  if (kannadaKeyword) {
    const requiredFields = { headline: parsed.headline, seoTitle: parsed.seoTitle, seoDescription: parsed.seoDescription };
    for (const [field, value] of Object.entries(requiredFields)) {
      if (!String(value || '').includes(kannadaKeyword)) {
        console.warn(`[seo-generate] Kannada keyword "${kannadaKeyword}" missing from ${field}`);
      }
    }
    if (!contentPreview.includes(kannadaKeyword)) {
      console.warn(`[seo-generate] Kannada keyword "${kannadaKeyword}" was not actually found in the article's first paragraph — AI may have invented it instead of sourcing it`);
    }
  }

  res.json({
    headline: parsed.headline || '',
    slug: uniqueSlug,
    excerpt: parsed.excerpt || '',
    seoTitle: parsed.seoTitle || '',
    seoDescription: parsed.seoDescription || '',
    focusKeyword,
    kannadaKeyword,
    altText,
    tags,
  });
});

module.exports = { generateSeo };
