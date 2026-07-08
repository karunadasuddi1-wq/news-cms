jest.mock('../../src/controllers/settingController', () => ({
  getSetting: jest.fn(),
}));

const { getSetting } = require('../../src/controllers/settingController');
const { generateArticleSchema } = require('../../src/utils/schemaGenerator');

function mockSettings({ site_url = '', site_name = '', site_logo_url = '' } = {}) {
  getSetting.mockImplementation(async (key) => {
    if (key === 'site_url') return site_url || null;
    if (key === 'site_name') return site_name || null;
    if (key === 'site_logo_url') return site_logo_url || null;
    return null;
  });
}

describe('generateArticleSchema', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('produces a valid NewsArticle schema with core fields', async () => {
    mockSettings({ site_url: 'https://kannadadunia.com', site_name: 'Kannadadunia' });

    const article = {
      title: 'Test Headline',
      seoTitle: 'SEO Title',
      excerpt: 'Short excerpt',
      slug: 'test-headline',
      featuredImage: 'https://example.com/image.jpg',
      publishedAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-02T00:00:00.000Z',
      author: { name: 'Sunil' },
      focusKeyword: 'KSRTC',
      kannadaKeyword: 'ಅಹಮದಾಬಾದ್',
      category: { name: 'Karnataka' },
    };

    const schema = await generateArticleSchema(article);

    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('NewsArticle');
    expect(schema.headline).toBe('SEO Title');
    expect(schema.image).toEqual(['https://example.com/image.jpg']);
    expect(schema.author).toEqual({ '@type': 'Person', name: 'Sunil' });
    expect(schema.publisher.name).toBe('Kannadadunia');
    expect(schema.articleSection).toBe('Karnataka');
    expect(schema.keywords).toBe('KSRTC, ಅಹಮದಾಬಾದ್');
  });

  it('builds a correct canonical URL from site_url + slug when no explicit canonicalUrl is set', async () => {
    mockSettings({ site_url: 'https://kannadadunia.com' });
    const article = { title: 'T', slug: 'my-article' };

    const schema = await generateArticleSchema(article);
    expect(schema.mainEntityOfPage['@id']).toBe('https://kannadadunia.com/article/my-article');
  });

  it('handles a trailing slash on site_url without producing a double slash — the exact bug fixed earlier', async () => {
    mockSettings({ site_url: 'https://kannadadunia.com/' });
    const article = { title: 'T', slug: 'my-article' };

    const schema = await generateArticleSchema(article);
    expect(schema.mainEntityOfPage['@id']).toBe('https://kannadadunia.com/article/my-article');
    expect(schema.mainEntityOfPage['@id']).not.toContain('//article');
  });

  it('respects an explicit canonicalUrl over the generated one', async () => {
    mockSettings({ site_url: 'https://kannadadunia.com' });
    const article = { title: 'T', slug: 'my-article', canonicalUrl: 'https://custom.example.com/x' };

    const schema = await generateArticleSchema(article);
    expect(schema.mainEntityOfPage['@id']).toBe('https://custom.example.com/x');
  });

  it('omits publisher when no site_name is configured', async () => {
    mockSettings({ site_url: 'https://example.com' });
    const article = { title: 'T', slug: 'x' };

    const schema = await generateArticleSchema(article);
    expect(schema.publisher).toBeUndefined();
  });

  it('omits author when the article has no author', async () => {
    mockSettings();
    const article = { title: 'T', slug: 'x' };

    const schema = await generateArticleSchema(article);
    expect(schema.author).toBeUndefined();
  });

  it('never includes literal "undefined" keys in the output', async () => {
    mockSettings();
    const article = { title: 'T', slug: 'x' };

    const schema = await generateArticleSchema(article);
    const json = JSON.stringify(schema);
    expect(json).not.toContain('undefined');
  });
});
