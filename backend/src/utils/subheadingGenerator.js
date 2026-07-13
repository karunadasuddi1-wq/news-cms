const { callAI } = require('./aiProvider');
const { getLanguageConfig, DEFAULT_LANGUAGE } = require('./languages');
const { getSetting } = require('../controllers/settingController');

function extractParagraphs(html) {
  const matches = [...html.matchAll(/<p>([\s\S]*?)<\/p>/g)];
  return matches.map(m => m[1]);
}

async function addSubheadings(html) {
  const paragraphs = extractParagraphs(html);
  if (paragraphs.length < 4) return html;

  const langKey = (await getSetting('content_language', null)) || DEFAULT_LANGUAGE;
  const lang = getLanguageConfig(langKey);

  const numberedParagraphs = paragraphs.map((p, i) => `${i + 1}. ${p}`).join('\n\n');

  const systemPrompt = `You are a ${lang.label} news editor adding subheadings to an article for better readability. You do NOT rewrite or rephrase any text — you only decide where subheadings should go.`;

  const userPrompt = `Here is a news article's paragraphs, numbered. Decide where subheadings would genuinely help a reader scan the article — typically every 2-4 paragraphs, only at real topic shifts, not evenly spaced for its own sake. Write each subheading in ${lang.label}.

${numberedParagraphs}

Respond with ONLY a JSON array, nothing else, in this exact shape:
[{"beforeParagraph": 3, "heading": "ಸಬ್ಹೆಡಿಂಗ್ ಪಠ್ಯ"}, {"beforeParagraph": 6, "heading": "..."}]

"beforeParagraph" is the 1-indexed paragraph number the heading goes immediately before. Never use beforeParagraph: 1 (the article already opens with its first paragraph). Return an empty array [] if the article is too short or too single-topic to benefit from any subheadings.`;

  let raw;
  try {
    raw = await callAI(systemPrompt, userPrompt, 500, { action: 'guest_submission_subheadings' });
  } catch (err) {
    console.warn('[subheadings] AI call failed, saving without subheadings:', err.message);
    return html;
  }

  let insertions;
  try {
    const stripped = raw.replace(/```(?:json)?/gi, '').trim();
    insertions = JSON.parse(stripped);
    if (!Array.isArray(insertions)) throw new Error('not an array');
  } catch (err) {
    console.warn('[subheadings] Could not parse AI response, saving without subheadings:', raw.slice(0, 200));
    return html;
  }

  const headingsBefore = {};
  for (const item of insertions) {
    const idx = parseInt(item?.beforeParagraph, 10);
    if (!idx || idx < 2 || idx > paragraphs.length || !item.heading) continue;
    headingsBefore[idx] = String(item.heading).trim();
  }

  const parts = [];
  paragraphs.forEach((text, i) => {
    const paragraphNumber = i + 1;
    if (headingsBefore[paragraphNumber]) {
      parts.push(`<h2>${headingsBefore[paragraphNumber]}</h2>`);
    }
    parts.push(`<p>${text}</p>`);
  });

  return parts.join('\n');
}

module.exports = { addSubheadings, extractParagraphs };
