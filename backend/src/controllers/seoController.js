const asyncHandler = require('../utils/asyncHandler');
const { generateUniqueSlug } = require('../utils/slug');
const { Article } = require('../models');
const { callAI } = require('../utils/aiProvider');
const { getSetting } = require('./settingController');
const { getLanguageConfig, DEFAULT_LANGUAGE } = require('../utils/languages');
const {
  extractJson,
  extractFocusKeyword,
  slugifyKeyword,
  buildBaseSlug,
  buildTags,
  checkFocusKeywordCoverage,
  checkKannadaKeywordCoverage,
} = require('../utils/seoHelpers');

function buildRegionalPrompt(lang, currentTitle, contentPreview) {
  return `You are a ${lang.label} news SEO editor. Analyze this article and return optimized metadata.

ARTICLE TITLE: ${currentTitle || '(not yet set)'}

ARTICLE CONTENT:
${contentPreview}

STEP 1: Identify ONE single English word — the single term real people are most likely to type into Google when searching for this story. It must be exactly one word (a proper noun, organization, place, or key entity name — e.g. "KSRTC", "Budget", "Cyclone"). Not a phrase, not multiple words.

STEP 1B: Separately, read the FIRST PARAGRAPH of the article content only. Pick ONE prominent ${lang.label} keyword or short ${lang.label} phrase that is ALREADY PRESENT, word-for-word, in that first paragraph — the main ${lang.label} topic term a ${lang.label}-speaking reader would search for. Do not invent or translate a new phrase; it must be text that genuinely already appears in the first paragraph as written.

STEP 2: Use that EXACT same English word, unchanged, inline in ALL FOUR of: the ${lang.label} headline, the ${lang.label} excerpt, the ${lang.label} SEO title, and the ${lang.label} SEO description. Every one of these four fields MUST contain that exact word — this is the most important rule.

STEP 2B: Also use the exact ${lang.label} keyword/phrase from STEP 1B, unchanged, inline in the headline, the SEO title, and the SEO description (it is already present in the article's first paragraph, so no change to the article content itself is needed).

STRICT RULE — NO OTHER ENGLISH WORDS ALLOWED: The ONLY English word permitted anywhere in the headline, excerpt, SEO title, and SEO description is that one single keyword. Every other proper noun, place name, organization name, or number-word must be written in ${lang.nativeName} script instead — transliterate it naturally into ${lang.label}, the way a ${lang.label} newspaper normally would, unless that proper noun happens to be your chosen keyword. Do not mix in any other English names or phrases beyond the one designated keyword — if you catch yourself writing a second English word or phrase, replace it with its ${lang.label} equivalent before responding.

Respond with ONLY this JSON object, nothing else before or after it:

{"headline":"compelling ${lang.label} headline under 70 chars for Google Discover, with the English keyword embedded inline","slug":"url-slug-lowercase-hyphenated-max-60-chars, must include the English keyword","excerpt":"2-3 sentence ${lang.label} summary 150-200 chars, with the English keyword embedded inline","seoTitle":"${lang.label} SEO title, roughly 30-60 chars, with the English keyword embedded inline","seoDescription":"${lang.label} meta description, roughly 120-155 chars, with the English keyword embedded inline and a call to action","focusKeyword":"the single English word from Step 1","kannadaKeyword":"the ${lang.label} keyword/phrase from Step 1B, copied exactly as it appears in the article's first paragraph","tags":["tag1","tag2","tag3","tag4","tag5"]}

Rules for tags:
- Generate 4-6 relevant tags in English (lowercase, no spaces, use hyphens for multi-word)
- The focus keyword itself should be the first tag
- Tags should be searchable topic keywords — people, places, organizations, topics mentioned in the article
- Mix specific (person/org names) and broad (topic) tags`;
}

function buildEnglishPrompt(currentTitle, contentPreview) {
  return `You are an English-language news SEO editor. Analyze this article and return optimized metadata.

ARTICLE TITLE: ${currentTitle || '(not yet set)'}

ARTICLE CONTENT:
${contentPreview}

Identify the single most important SEO focus keyword or short keyword phrase (2-4 words) that real people are most likely to search for regarding this story — a proper noun, event, or topic term.

Use that exact keyword/phrase, unchanged, inline in the headline, the excerpt, the SEO title, and the SEO description. All four fields MUST contain it.

Respond with ONLY this JSON object, nothing else before or after it:

{"headline":"compelling headline under 70 chars for Google Discover, with the focus keyword included","slug":"url-slug-lowercase-hyphenated-max-60-chars, must include the focus keyword","excerpt":"2-3 sentence summary 150-200 chars, with the focus keyword included","seoTitle":"SEO title, roughly 30-60 chars, with the focus keyword included","seoDescription":"meta description, roughly 120-155 chars, with the focus keyword included and a call to action","focusKeyword":"the focus keyword or short phrase identified above","tags":["tag1","tag2","tag3","tag4","tag5"]}

Rules for tags:
- Generate 4-6 relevant tags (lowercase, no spaces, use hyphens for multi-word)
- The focus keyword itself should be the first tag
- Tags should be searchable topic keywords — people, places, organizations, topics mentioned in the article
- Mix specific (person/org names) and broad (topic) tags`;
}

const generateSeo = asyncHandler(async (req, res) => {
  const { title = '', content = '', existingArticleId } = req.body;

  if (!content || content.trim().length < 50) {
    return res.status(400).json({
      error: 'Add at least 50 characters of article content before generating SEO fields.',
    });
  }

  const contentPreview = content.trim().slice(0, 4000);
  const currentTitle = title.trim();

  const langKey = (await getSetting('content_language', null)) || DEFAULT_LANGUAGE;
  const lang = getLanguageConfig(langKey);

  const prompt = lang.isEnglish
    ? buildEnglishPrompt(currentTitle, contentPreview)
    : buildRegionalPrompt(lang, currentTitle, contentPreview);

  const raw = await callAI(`You are a ${lang.label} news SEO editor.`, prompt, 900, {
    userId: req.user?.id,
    action: 'ai_seo_generate',
    metadata: { articleId: existingArticleId, language: lang.key },
    providerSettingKey: 'seo_ai_provider',
  });
  console.log('[seo-generate] raw response:', raw.slice(0, 400));

  const parsed = extractJson(raw);

  if (!parsed || !parsed.headline) {
    console.error('[seo-generate] Could not extract fields from:', raw);
    return res.status(502).json({
      error: 'AI returned an unexpected response. Try again or fill the fields manually.',
    });
  }

  const focusKeyword = lang.isEnglish
    ? (parsed.focusKeyword || '').trim()
    : extractFocusKeyword(parsed.focusKeyword);
  const keywordSlugPart = slugifyKeyword(focusKeyword);

  const baseSlug = buildBaseSlug(parsed.slug, keywordSlugPart);

  const uniqueSlug = await generateUniqueSlug(
    Article,
    baseSlug || parsed.headline,
    existingArticleId ? parseInt(existingArticleId, 10) : null
  );

  const altText = uniqueSlug;

  const tags = buildTags(parsed.tags, keywordSlugPart);

  const kannadaKeyword = lang.isEnglish ? '' : (parsed.kannadaKeyword || '');

  const focusWarnings = checkFocusKeywordCoverage(focusKeyword, {
    headline: parsed.headline,
    excerpt: parsed.excerpt,
    seoTitle: parsed.seoTitle,
    seoDescription: parsed.seoDescription,
  }, { checkExtraEnglishWords: !lang.isEnglish });
  focusWarnings.forEach(w => console.warn(`[seo-generate] ${w}`));

  if (!lang.isEnglish) {
    const kannadaWarnings = checkKannadaKeywordCoverage(kannadaKeyword, {
      headline: parsed.headline,
      seoTitle: parsed.seoTitle,
      seoDescription: parsed.seoDescription,
    }, contentPreview);
    kannadaWarnings.forEach(w => console.warn(`[seo-generate] ${w}`));
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
    language: lang.key,
  });
});

module.exports = { generateSeo };
