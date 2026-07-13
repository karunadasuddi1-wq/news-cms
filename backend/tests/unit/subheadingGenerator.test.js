jest.mock('../../src/utils/aiProvider', () => ({
  callAI: jest.fn(),
}));
jest.mock('../../src/controllers/settingController', () => ({
  getSetting: jest.fn().mockResolvedValue(null),
}));

const { callAI } = require('../../src/utils/aiProvider');
const { addSubheadings, extractParagraphs } = require('../../src/utils/subheadingGenerator');

describe('extractParagraphs', () => {
  it('correctly extracts paragraph text from <p> tags', () => {
    const html = '<p>First paragraph.</p>\n<p>Second paragraph.</p>\n<p>Third paragraph.</p>';
    const result = extractParagraphs(html);
    expect(result).toEqual(['First paragraph.', 'Second paragraph.', 'Third paragraph.']);
  });
});

describe('addSubheadings', () => {
  beforeEach(() => jest.clearAllMocks());

  const sixParagraphHtml = [
    '<p>ಬೆಂಗಳೂರಿನಲ್ಲಿ ಭಾರೀ ಮಳೆಯಾಗಿದೆ.</p>',
    '<p>ಸಂಚಾರ ದಟ್ಟಣೆ ಉಂಟಾಗಿದೆ.</p>',
    '<p>ಸರ್ಕಾರ ಪ್ರತಿಕ್ರಿಯೆ ನೀಡಿದೆ.</p>',
    '<p>ಪರಿಹಾರ ಕಾರ್ಯ ಪ್ರಾರಂಭವಾಗಿದೆ.</p>',
    '<p>ಮುಂದಿನ ದಿನಗಳಲ್ಲಿ ಮಳೆ ಮುಂದುವರಿಯಲಿದೆ.</p>',
    '<p>ನಿವಾಸಿಗಳಿಗೆ ಎಚ್ಚರಿಕೆ ನೀಡಲಾಗಿದೆ.</p>',
  ].join('\n');

  const originalParagraphTexts = [
    'ಬೆಂಗಳೂರಿನಲ್ಲಿ ಭಾರೀ ಮಳೆಯಾಗಿದೆ.',
    'ಸಂಚಾರ ದಟ್ಟಣೆ ಉಂಟಾಗಿದೆ.',
    'ಸರ್ಕಾರ ಪ್ರತಿಕ್ರಿಯೆ ನೀಡಿದೆ.',
    'ಪರಿಹಾರ ಕಾರ್ಯ ಪ್ರಾರಂಭವಾಗಿದೆ.',
    'ಮುಂದಿನ ದಿನಗಳಲ್ಲಿ ಮಳೆ ಮುಂದುವರಿಯಲಿದೆ.',
    'ನಿವಾಸಿಗಳಿಗೆ ಎಚ್ಚರಿಕೆ ನೀಡಲಾಗಿದೆ.',
  ];

  it('CRITICAL: never alters original paragraph text, only inserts headings', async () => {
    callAI.mockResolvedValue(JSON.stringify([
      { beforeParagraph: 3, heading: 'ಸರ್ಕಾರದ ಪ್ರತಿಕ್ರಿಯೆ' },
      { beforeParagraph: 5, heading: 'ಮುಂದಿನ ಮುನ್ಸೂಚನೆ' },
    ]));

    const result = await addSubheadings(sixParagraphHtml);

    for (const originalText of originalParagraphTexts) {
      expect(result).toContain(`<p>${originalText}</p>`);
    }
    expect(result).toContain('<h2>ಸರ್ಕಾರದ ಪ್ರತಿಕ್ರಿಯೆ</h2>');
    expect(result).toContain('<h2>ಮುಂದಿನ ಮುನ್ಸೂಚನೆ</h2>');
  });

  it('inserts headings at the correct positions relative to paragraphs', async () => {
    callAI.mockResolvedValue(JSON.stringify([
      { beforeParagraph: 3, heading: 'Heading A' },
    ]));

    const result = await addSubheadings(sixParagraphHtml);
    const headingIndex = result.indexOf('<h2>Heading A</h2>');
    const para2Index = result.indexOf(`<p>${originalParagraphTexts[1]}</p>`);
    const para3Index = result.indexOf(`<p>${originalParagraphTexts[2]}</p>`);

    expect(headingIndex).toBeGreaterThan(para2Index);
    expect(headingIndex).toBeLessThan(para3Index);
  });

  it('skips articles with fewer than 4 paragraphs entirely (no AI call made)', async () => {
    const shortHtml = '<p>One.</p>\n<p>Two.</p>\n<p>Three.</p>';
    const result = await addSubheadings(shortHtml);

    expect(result).toBe(shortHtml);
    expect(callAI).not.toHaveBeenCalled();
  });

  it('falls back gracefully to original content when the AI call fails (never blocks submission)', async () => {
    callAI.mockRejectedValue(new Error('API key not configured.'));

    const result = await addSubheadings(sixParagraphHtml);
    expect(result).toBe(sixParagraphHtml);
  });

  it('falls back gracefully when the AI returns malformed JSON', async () => {
    callAI.mockResolvedValue('this is not valid json at all');

    const result = await addSubheadings(sixParagraphHtml);
    expect(result).toBe(sixParagraphHtml);
  });

  it('ignores invalid insertion points (out of range, or beforeParagraph: 1) instead of breaking', async () => {
    callAI.mockResolvedValue(JSON.stringify([
      { beforeParagraph: 1, heading: 'Should be ignored (cant be before the first paragraph)' },
      { beforeParagraph: 99, heading: 'Should be ignored (out of range)' },
      { beforeParagraph: 4, heading: 'This one is valid' },
    ]));

    const result = await addSubheadings(sixParagraphHtml);

    expect(result).not.toContain('Should be ignored');
    expect(result).toContain('<h2>This one is valid</h2>');
    for (const originalText of originalParagraphTexts) {
      expect(result).toContain(`<p>${originalText}</p>`);
    }
  });

  it('returns original content unchanged when AI returns an empty array (too short/single-topic)', async () => {
    callAI.mockResolvedValue('[]');

    const result = await addSubheadings(sixParagraphHtml);
    expect(result).toContain('ಬೆಂಗಳೂರಿನಲ್ಲಿ ಭಾರೀ ಮಳೆಯಾಗಿದೆ');
    expect(result).not.toContain('<h2>');
  });
});
