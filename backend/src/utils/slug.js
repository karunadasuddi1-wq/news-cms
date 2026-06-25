const slugify = require('slugify');

function sanitizeSlug(text) {
  if (!text) return '';
  // slugify strips non-Latin chars — what's left may be empty or too short
  const s = slugify(text, { lower: true, strict: true }).slice(0, 180);
  return s;
}

async function generateUniqueSlug(Model, baseText, excludeId = null) {
  let base = sanitizeSlug(baseText);

  // If the base is too short (e.g. Kannada title stripped to nothing),
  // use a timestamp-based fallback so the slug is always meaningful
  if (base.length < 3) {
    base = `article-${Date.now()}`;
  }

  let candidate = base;
  let counter = 2;

  while (true) {
    const existing = await Model.findOne({ where: { slug: candidate } });
    if (!existing || (excludeId && existing.id === excludeId)) {
      return candidate;
    }
    candidate = `${base}-${counter}`;
    counter += 1;
  }
}

// Validate and clean a user-supplied slug
function cleanSlug(raw) {
  if (!raw) return '';
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 180);
}

module.exports = { generateUniqueSlug, cleanSlug };
