const {
  extractJson,
  extractFocusKeyword,
  slugifyKeyword,
  buildBaseSlug,
  buildTags,
  checkFocusKeywordCoverage,
  checkKannadaKeywordCoverage,
} = require('../../src/utils/seoHelpers');

describe('extractJson', () => {
  it('parses clean JSON directly', () => {
    const result = extractJson('{"headline":"Test","slug":"test"}');
    expect(result).toEqual({ headline: 'Test', slug: 'test' });
  });

  it('strips markdown code fences before parsing', () => {
    const result = extractJson('```json\n{"headline":"Test"}\n```');
    expect(result).toEqual({ headline: 'Test' });
  });

  it('extracts a JSON object embedded in surrounding text', () => {
    const result = extractJson('Here you go: {"headline":"Test"} Hope that helps!');
    expect(result).toEqual({ headline: 'Test' });
  });

  it('falls back to regex field extraction when JSON is malformed', () => {
    const raw = '{"headline":"Broken \\"quote\\" here","slug":"test-slug","tags":["a","b","c"]';
    const result = extractJson(raw);
    expect(result.headline).toBe('Broken "quote" here');
    expect(result.slug).toBe('test-slug');
    expect(result.tags).toEqual(['a', 'b', 'c']);
  });

  it('returns null when nothing usable can be extracted', () => {
    expect(extractJson('no json here at all')).toBeNull();
  });
});

describe('extractFocusKeyword', () => {
  it('returns a single word unchanged', () => {
    expect(extractFocusKeyword('KSRTC')).toBe('KSRTC');
  });

  it('takes only the first word if the AI returns a phrase', () => {
    expect(extractFocusKeyword('KSRTC bus fare hike')).toBe('KSRTC');
  });

  it('handles empty/undefined input safely', () => {
    expect(extractFocusKeyword('')).toBe('');
    expect(extractFocusKeyword(undefined)).toBe('');
  });

  it('trims whitespace', () => {
    expect(extractFocusKeyword('  Ahmedabad  ')).toBe('Ahmedabad');
  });
});

describe('slugifyKeyword', () => {
  it('lowercases and strips non-alphanumeric characters', () => {
    expect(slugifyKeyword('KSRTC')).toBe('ksrtc');
    expect(slugifyKeyword('Gujarat High Court')).toBe('gujarathighcourt');
    expect(slugifyKeyword('IPL 2026')).toBe('ipl2026');
  });

  it('handles empty input', () => {
    expect(slugifyKeyword('')).toBe('');
  });
});

describe('buildBaseSlug', () => {
  it('cleans a normal slug', () => {
    expect(buildBaseSlug('KSRTC Bus Fare Hike!', 'ksrtc')).toBe('ksrtc-bus-fare-hike');
  });

  it('prepends the keyword when the AI slug omits it — this is the core guarantee', () => {
    const result = buildBaseSlug('gujarat-high-court-verdict', 'ahmedabad');
    expect(result).toContain('ahmedabad');
    expect(result.startsWith('ahmedabad')).toBe(true);
  });

  it('does not duplicate the keyword if already present', () => {
    const result = buildBaseSlug('ahmedabad-serial-blast-verdict', 'ahmedabad');
    expect(result).toBe('ahmedabad-serial-blast-verdict');
  });

  it('truncates to 60 characters', () => {
    const longSlug = 'a'.repeat(100);
    expect(buildBaseSlug(longSlug, '').length).toBeLessThanOrEqual(60);
  });

  it('handles empty slug with a keyword — trailing hyphen is stripped', () => {
    expect(buildBaseSlug('', 'ksrtc')).toBe('ksrtc');
  });
});

describe('buildTags', () => {
  it('cleans and lowercases tags', () => {
    const result = buildTags(['KSRTC', 'Bus Fare', 'Karnataka!!'], 'ksrtc');
    expect(result).toContain('ksrtc');
    expect(result.every(t => t === t.toLowerCase())).toBe(true);
  });

  it('puts the focus keyword first', () => {
    const result = buildTags(['bus-fare', 'karnataka'], 'ksrtc');
    expect(result[0]).toBe('ksrtc');
  });

  it('does not duplicate the keyword if the AI already included it', () => {
    const result = buildTags(['ksrtc', 'bus-fare'], 'ksrtc');
    expect(result.filter(t => t === 'ksrtc').length).toBe(1);
  });

  it('caps at 6 tags', () => {
    const result = buildTags(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], 'x');
    expect(result.length).toBeLessThanOrEqual(6);
  });

  it('filters out tags that are too short or too long', () => {
    const result = buildTags(['a', 'valid-tag', 'x'.repeat(60)], '');
    expect(result).not.toContain('a');
    expect(result).toContain('valid-tag');
  });

  it('handles non-array input safely', () => {
    expect(buildTags(null, 'ksrtc')).toEqual(['ksrtc']);
    expect(buildTags(undefined, '')).toEqual([]);
  });
});

describe('checkFocusKeywordCoverage', () => {
  it('returns no warnings when the keyword appears everywhere required', () => {
    const warnings = checkFocusKeywordCoverage('Ahmedabad', {
      headline: 'Ahmedabad ಸ್ಫೋಟ ಪ್ರಕರಣ',
      excerpt: 'Ahmedabad ಪ್ರಕರಣದಲ್ಲಿ...',
    });
    expect(warnings).toHaveLength(0);
  });

  it('flags a field missing the keyword', () => {
    const warnings = checkFocusKeywordCoverage('Ahmedabad', {
      headline: 'ಸ್ಫೋಟ ಪ್ರಕರಣ',
    });
    expect(warnings.some(w => w.includes('missing from headline'))).toBe(true);
  });

  it('flags extra English words beyond the single keyword — the exact bug the client reported', () => {
    const warnings = checkFocusKeywordCoverage('Ahmedabad', {
      headline: 'Ahmedabad ಸ್ಫೋಟ Gujarat High Court ಪ್ರಕರಣ',
    });
    expect(warnings.some(w => w.includes('Extra English word'))).toBe(true);
  });

  it('returns no warnings when no keyword was provided', () => {
    expect(checkFocusKeywordCoverage('', { headline: 'anything' })).toHaveLength(0);
  });
});

describe('checkKannadaKeywordCoverage', () => {
  it('flags when the Kannada keyword is missing from a required field', () => {
    const warnings = checkKannadaKeywordCoverage('ಅಹಮದಾಬಾದ್', {
      headline: 'unrelated headline text',
    }, 'ಅಹಮದಾಬಾದ್ ನಗರದಲ್ಲಿ...');
    expect(warnings.some(w => w.includes('missing from headline'))).toBe(true);
  });

  it('flags when the Kannada keyword was not actually in the source content — catches AI inventing it', () => {
    const warnings = checkKannadaKeywordCoverage('ಬೆಂಗಳೂರು', {
      headline: 'ಬೆಂಗಳೂರು ಸುದ್ದಿ',
    }, 'ಅಹಮದಾಬಾದ್ ನಗರದಲ್ಲಿ...');
    expect(warnings.some(w => w.includes('was not actually found'))).toBe(true);
  });

  it('returns no warnings for a correctly sourced keyword', () => {
    const warnings = checkKannadaKeywordCoverage('ಅಹಮದಾಬಾದ್', {
      headline: 'ಅಹಮದಾಬಾದ್ ಸ್ಫೋಟ ಪ್ರಕರಣ',
      seoTitle: 'ಅಹಮದಾಬಾದ್ ಸುದ್ದಿ',
      seoDescription: 'ಅಹಮದಾಬಾದ್ ವಿಚಾರ',
    }, 'ಅಹಮದಾಬಾದ್ ನಗರದಲ್ಲಿ ಸ್ಫೋಟ ನಡೆದಿದೆ...');
    expect(warnings).toHaveLength(0);
  });
});
