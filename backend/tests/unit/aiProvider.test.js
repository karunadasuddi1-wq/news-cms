const fs = require('fs');
const path = require('path');

// IMPORTANT: when a provider retires a model, add it here immediately —
// that turns this into an instant regression guard for next time, exactly
// the kind of check that would have caught the Gemini 1.5 / Groq
// llama-3.1-70b-versatile bugs before they ever reached production.
const KNOWN_RETIRED_MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'llama-3.1-70b-versatile',
  'llama-3.3-70b-versatile',
  'gpt-4o',
  'deepseek-chat',
  'deepseek-reasoner',
];

describe('aiProvider default models — regression guard against retired models', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../../src/utils/aiProvider.js'),
    'utf8'
  );

  it('does not contain any known-retired model string as a default', () => {
    const foundRetired = KNOWN_RETIRED_MODELS.filter(model => {
      const re = new RegExp(`['"\`]${model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`);
      return re.test(source);
    });

    if (foundRetired.length > 0) {
      throw new Error(
        `aiProvider.js references retired model(s): ${foundRetired.join(', ')}. ` +
        `Update the default before deploying — these will fail live API calls.`
      );
    }
  });

  it('every provider function has a non-empty default model string', () => {
    const providerFns = source.match(/async function call\w+\([^)]*model\s*=\s*['"`]([^'"`]+)['"`]/g) || [];
    expect(providerFns.length).toBeGreaterThanOrEqual(5);

    providerFns.forEach(fnSig => {
      const match = fnSig.match(/model\s*=\s*['"`]([^'"`]+)['"`]/);
      expect(match).not.toBeNull();
      expect(match[1].length).toBeGreaterThan(0);
    });
  });
});
