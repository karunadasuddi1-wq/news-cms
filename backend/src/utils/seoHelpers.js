// Pure, dependency-free logic extracted from seoController.js so it can be
// unit tested without needing a database, HTTP server, or AI API call.

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
      kannadaKeyword: extract('kannadaKeyword'),
      tags: extractArray('tags'),
    };
  }
  return null;
}

function extractFocusKeyword(rawFocusKeyword) {
  return (rawFocusKeyword || '').trim().split(/\s+/)[0] || '';
}

function slugifyKeyword(keyword) {
  return (keyword || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function buildBaseSlug(rawSlug, keywordSlugPart) {
  let baseSlug = (rawSlug || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

  if (keywordSlugPart && !baseSlug.includes(keywordSlugPart)) {
    baseSlug = `${keywordSlugPart}-${baseSlug}`.replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  }

  return baseSlug;
}

function buildTags(rawTags, keywordSlugPart) {
  let tags = (Array.isArray(rawTags) ? rawTags : [])
    .map(t => String(t).toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''))
    .filter(t => t.length >= 2 && t.length <= 50);

  if (keywordSlugPart && !tags.includes(keywordSlugPart)) {
    tags = [keywordSlugPart, ...tags];
  }

  return tags.slice(0, 6);
}

function checkFocusKeywordCoverage(focusKeyword, fields, options = {}) {
  const { checkExtraEnglishWords = true } = options;
  const warnings = [];
  if (!focusKeyword) return warnings;

  const kw = focusKeyword.toLowerCase();
  for (const [field, value] of Object.entries(fields)) {
    const text = String(value || '');
    if (!text.toLowerCase().includes(kw)) {
      warnings.push(`Focus keyword "${focusKeyword}" missing from ${field}`);
    }
    if (checkExtraEnglishWords) {
      const englishWords = (text.match(/[A-Za-z]+/g) || []).filter(w => w.toLowerCase() !== kw);
      if (englishWords.length > 0) {
        warnings.push(`Extra English word(s) beyond keyword "${focusKeyword}" in ${field}: ${englishWords.join(', ')}`);
      }
    }
  }
  return warnings;
}

function checkKannadaKeywordCoverage(kannadaKeyword, fields, contentPreview) {
  const warnings = [];
  if (!kannadaKeyword) return warnings;

  for (const [field, value] of Object.entries(fields)) {
    if (!String(value || '').includes(kannadaKeyword)) {
      warnings.push(`Kannada keyword "${kannadaKeyword}" missing from ${field}`);
    }
  }
  if (!contentPreview.includes(kannadaKeyword)) {
    warnings.push(`Kannada keyword "${kannadaKeyword}" was not actually found in the article's first paragraph — AI may have invented it instead of sourcing it`);
  }
  return warnings;
}

module.exports = {
  extractJson,
  extractFocusKeyword,
  slugifyKeyword,
  buildBaseSlug,
  buildTags,
  checkFocusKeywordCoverage,
  checkKannadaKeywordCoverage,
};
