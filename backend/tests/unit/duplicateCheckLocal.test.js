const { checkForDuplicatesLocal } = require('../../src/utils/duplicateCheck');
const { sequelize, Article, User, Category } = require('../../src/models');

describe('checkForDuplicatesLocal — free, zero-API-call duplicate detection', () => {
  let author, category;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    author = User.build({ name: 'Test', email: 'a@example.com', role: 'author' });
    author.password = 'x';
    await author.save();
    category = await Category.create({ name: 'Auto', slug: 'auto' });
  });
  afterAll(async () => { await sequelize.close(); });
  beforeEach(async () => {
    await Article.destroy({ where: {}, force: true });
  });

  async function make(fields, daysAgo) {
    return Article.create({
      slug: 'a-' + Math.random().toString(36).slice(2, 10),
      content: 'x'.repeat(60), excerpt: 'x', authorId: author.id, categoryId: category.id,
      status: 'published',
      publishedAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
      ...fields,
    });
  }

  it('catches the real E20 case via shared focusKeyword, with zero DB writes needed for an AI call', async () => {
    const existing = await make({
      title: 'E20 ಪೆಟ್ರೋಲ್ ಹಳೆಯ ವಾಹನಗಳಿಗೆ ಸುರಕ್ಷಿತವೇ?',
      focusKeyword: 'E20',
      tags: ['e20', 'petrol', 'old-vehicles'],
    }, 1);

    const candidate = await make({
      title: 'ಹಳೆಯ ಕಾರುಗಳಿಗೆ E20 ಇಂಧನ ಅಪಾಯಕಾರಿಯೇ? ಪರಿಣಿತರ ಸಲಹೆ',
      focusKeyword: 'E20',
      tags: ['e20', 'engine-safety'],
    }, 0);

    const result = await checkForDuplicatesLocal(Article, candidate.id, { days: 7 });

    expect(result.duplicates.length).toBe(1);
    expect(result.duplicates[0].id).toBe(existing.id);
    expect(result.duplicates[0].reason).toContain('E20');
  });

  it('flags via shared tags even when focus keywords differ', async () => {
    const existing = await make({
      title: 'Article A', focusKeyword: 'DifferentKeyword',
      tags: ['ipl-2026', 'rcb', 'bengaluru'],
    }, 1);
    const candidate = await make({
      title: 'Article B', focusKeyword: 'AnotherKeyword',
      tags: ['ipl-2026', 'rcb', 'cricket'],
    }, 0);

    const result = await checkForDuplicatesLocal(Article, candidate.id, { days: 7 });
    expect(result.duplicates.length).toBe(1);
    expect(result.duplicates[0].reason).toContain('shared tags');
  });

  it('does NOT flag articles with only 1 shared tag (below the 2-tag threshold)', async () => {
    await make({ title: 'Article A', focusKeyword: 'X', tags: ['sports'] }, 1);
    const candidate = await make({ title: 'Article B', focusKeyword: 'Y', tags: ['sports'] }, 0);

    const result = await checkForDuplicatesLocal(Article, candidate.id, { days: 7 });
    expect(result.duplicates.length).toBe(0);
  });

  it('does NOT flag genuinely unrelated articles', async () => {
    await make({ title: 'Weather news', focusKeyword: 'Monsoon', tags: ['weather', 'rain'] }, 1);
    const candidate = await make({ title: 'Cricket news', focusKeyword: 'IPL', tags: ['cricket', 'sports'] }, 0);

    const result = await checkForDuplicatesLocal(Article, candidate.id, { days: 7 });
    expect(result.duplicates.length).toBe(0);
  });

  it('excludes articles outside the day window', async () => {
    await make({ title: 'Old article', focusKeyword: 'E20', tags: ['e20'] }, 10);
    const candidate = await make({ title: 'New article', focusKeyword: 'E20', tags: ['e20'] }, 0);

    const result = await checkForDuplicatesLocal(Article, candidate.id, { days: 7 });
    expect(result.duplicates.length).toBe(0);
  });

  it('returns no duplicates gracefully when the candidate has no SEO metadata yet', async () => {
    await make({ title: 'Existing', focusKeyword: 'E20', tags: ['e20'] }, 1);
    const candidate = await make({ title: 'Brand new, no SEO run yet', focusKeyword: null, tags: [] }, 0);

    const result = await checkForDuplicatesLocal(Article, candidate.id, { days: 7 });
    expect(result.duplicates).toEqual([]);
  });
});
