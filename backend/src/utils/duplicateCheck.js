const { Op } = require('sequelize');
const { callAI } = require('./aiProvider');

async function checkForDuplicatesLocal(Article, candidateId, { days = 7 } = {}) {
  const candidate = await Article.findByPk(candidateId, {
    attributes: ['id', 'focusKeyword', 'kannadaKeyword', 'tags'],
  });
  if (!candidate) return { duplicates: [] };

  const candidateKeyword = (candidate.focusKeyword || '').trim().toLowerCase();
  const candidateKannadaKeyword = (candidate.kannadaKeyword || '').trim().toLowerCase();
  const candidateTags = new Set((candidate.tags || []).map(t => t.toLowerCase()));

  if (!candidateKeyword && !candidateKannadaKeyword && candidateTags.size === 0) {
    return { duplicates: [] };
  }

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const recent = await Article.findAll({
    where: {
      status: 'published',
      publishedAt: { [Op.gte]: since },
      id: { [Op.ne]: candidateId },
    },
    attributes: ['id', 'title', 'slug', 'publishedAt', 'focusKeyword', 'kannadaKeyword', 'tags'],
    order: [['publishedAt', 'DESC']],
    limit: 200,
  });

  const duplicates = [];
  for (const article of recent) {
    const articleKeyword = (article.focusKeyword || '').trim().toLowerCase();
    const articleKannadaKeyword = (article.kannadaKeyword || '').trim().toLowerCase();
    const articleTags = new Set((article.tags || []).map(t => t.toLowerCase()));

    const keywordMatch = candidateKeyword && candidateKeyword === articleKeyword;
    const kannadaKeywordMatch = candidateKannadaKeyword && candidateKannadaKeyword === articleKannadaKeyword;
    const sharedTags = [...candidateTags].filter(t => articleTags.has(t));

    if (keywordMatch || kannadaKeywordMatch || sharedTags.length >= 2) {
      const reasonParts = [];
      if (keywordMatch) reasonParts.push(`same focus keyword ("${article.focusKeyword}")`);
      if (kannadaKeywordMatch) reasonParts.push(`same keyword ("${article.kannadaKeyword}")`);
      if (sharedTags.length >= 2) reasonParts.push(`${sharedTags.length} shared tags (${sharedTags.join(', ')})`);

      duplicates.push({
        id: article.id,
        title: article.title,
        slug: article.slug,
        publishedAt: article.publishedAt,
        reason: reasonParts.join(', '),
      });
    }
  }

  return { duplicates };
}

async function checkForDuplicates(Article, candidate, { excludeId, days = 7 } = {}) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const where = {
    status: 'published',
    publishedAt: { [Op.gte]: since },
  };
  if (excludeId) where.id = { [Op.ne]: excludeId };

  const recent = await Article.findAll({
    where,
    attributes: ['id', 'title', 'slug', 'publishedAt'],
    order: [['publishedAt', 'DESC']],
    limit: 100,
  });

  if (recent.length === 0) return { duplicates: [] };

  const numberedList = recent.map((a, i) => `${i + 1}. ${a.title}`).join('\n');

  const systemPrompt = 'You are a news editor checking whether a new article covers the same real-world event or story as any recently published article. You compare by TOPIC and EVENT, not by wording — differently-phrased headlines about the same news count as duplicates.';

  const userPrompt = `NEW ARTICLE TITLE: ${candidate.title}
${candidate.excerpt ? `NEW ARTICLE EXCERPT: ${candidate.excerpt}` : ''}

RECENTLY PUBLISHED ARTICLES:
${numberedList}

Does the new article cover the same specific news event/story as any of the numbered articles above? Minor differences in angle on the exact same event still count as a duplicate (e.g. two articles both about the same E20 petrol safety announcement). A different event in the same general subject area does NOT count (e.g. two different cricket matches are not duplicates of each other).

Respond with ONLY a JSON array, nothing else. Include an entry only for genuine matches:
[{"number": 3, "reason": "short reason why this is the same story"}]

Return an empty array [] if there are no genuine duplicates.`;

  let raw;
  try {
    raw = await callAI(systemPrompt, userPrompt, 400, { action: 'duplicate_check' });
  } catch (err) {
    console.warn('[duplicate-check] AI call failed, skipping check:', err.message);
    return { duplicates: [], error: 'Could not run the duplicate check right now.' };
  }

  let matches;
  try {
    const stripped = raw.replace(/```(?:json)?/gi, '').trim();
    matches = JSON.parse(stripped);
    if (!Array.isArray(matches)) throw new Error('not an array');
  } catch (err) {
    console.warn('[duplicate-check] Could not parse AI response:', raw.slice(0, 200));
    return { duplicates: [] };
  }

  const duplicates = [];
  for (const m of matches) {
    const idx = parseInt(m?.number, 10);
    if (!idx || idx < 1 || idx > recent.length) continue;
    const article = recent[idx - 1];
    duplicates.push({
      id: article.id,
      title: article.title,
      slug: article.slug,
      publishedAt: article.publishedAt,
      reason: String(m.reason || '').trim(),
    });
  }

  return { duplicates };
}

module.exports = { checkForDuplicates, checkForDuplicatesLocal };
