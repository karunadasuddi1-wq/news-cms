const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const config = require('../../src/config/env');
const { sequelize, User, Category, Article } = require('../../src/models');

async function makeUser(email, role) {
  const user = User.build({ name: email.split('@')[0], email, role });
  user.password = 'x';
  await user.save();
  return user;
}
function tokenFor(user) { return jwt.sign({ sub: user.id }, config.jwtSecret); }

describe('Article assignment (Assigned To) — separate from byline/authorship', () => {
  let admin, editor, author1, author2, guestPlaceholder, category;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    admin = await makeUser('admin@example.com', 'admin');
    editor = await makeUser('editor@example.com', 'editor');
    author1 = await makeUser('author1@example.com', 'author');
    author2 = await makeUser('author2@example.com', 'author');
    guestPlaceholder = await makeUser('guest-contributor@system.local', 'author');
    category = await Category.create({ name: 'General', slug: 'general' });
  });
  afterAll(async () => { await sequelize.close(); });

  it('an editor CAN assign a guest-submitted draft to a specific staff member', async () => {
    const article = await Article.create({
      title: 'Guest draft', slug: 'guest-draft-1', content: 'x'.repeat(60), excerpt: 'x',
      authorId: guestPlaceholder.id, categoryId: category.id, status: 'draft',
    });

    const res = await request(app)
      .put(`/api/articles/${article.id}`)
      .set('Authorization', `Bearer ${tokenFor(editor)}`)
      .send({ assignedToId: author1.id });

    expect(res.status).toBe(200);
    expect(res.body.article.assignedToId).toBe(author1.id);
    expect(res.body.article.authorId).toBe(guestPlaceholder.id);
  });

  it('assignment does NOT change the byline/author — they are genuinely separate', async () => {
    const article = await Article.create({
      title: 'Guest draft 2', slug: 'guest-draft-2', content: 'x'.repeat(60), excerpt: 'x',
      authorId: guestPlaceholder.id, categoryId: category.id, status: 'draft',
    });

    await request(app)
      .put(`/api/articles/${article.id}`)
      .set('Authorization', `Bearer ${tokenFor(editor)}`)
      .send({ assignedToId: author1.id });

    const reloaded = await Article.findByPk(article.id);
    expect(reloaded.authorId).toBe(guestPlaceholder.id);
    expect(reloaded.assignedToId).toBe(author1.id);
  });

  it('a regular author CANNOT assign articles (managers only)', async () => {
    const article = await Article.create({
      title: 'Guest draft 3', slug: 'guest-draft-3', content: 'x'.repeat(60), excerpt: 'x',
      authorId: author1.id, categoryId: category.id, status: 'draft',
    });

    const res = await request(app)
      .put(`/api/articles/${article.id}`)
      .set('Authorization', `Bearer ${tokenFor(author1)}`)
      .send({ assignedToId: author2.id, title: 'Guest draft 3 updated' });

    expect(res.status).toBe(200);
    const reloaded = await Article.findByPk(article.id);
    expect(reloaded.assignedToId).toBe(null);
    expect(reloaded.title).toBe('Guest draft 3 updated');
  });

  it('REGRESSION: the assigned staff member can see the draft in their list, even though they are not the author', async () => {
    const article = await Article.create({
      title: 'Guest draft 4', slug: 'guest-draft-4', content: 'x'.repeat(60), excerpt: 'x',
      authorId: guestPlaceholder.id, categoryId: category.id, status: 'draft', assignedToId: author2.id,
    });

    const res = await request(app)
      .get('/api/articles')
      .set('Authorization', `Bearer ${tokenFor(author2)}`);

    expect(res.status).toBe(200);
    const ids = res.body.articles.map(a => a.id);
    expect(ids).toContain(article.id);
  });

  it('a non-manager author who is neither the author NOR assignee cannot see it', async () => {
    const article = await Article.create({
      title: 'Guest draft 5', slug: 'guest-draft-5', content: 'x'.repeat(60), excerpt: 'x',
      authorId: guestPlaceholder.id, categoryId: category.id, status: 'draft', assignedToId: author2.id,
    });

    const res = await request(app)
      .get('/api/articles')
      .set('Authorization', `Bearer ${tokenFor(author1)}`);

    const ids = res.body.articles.map(a => a.id);
    expect(ids).not.toContain(article.id);
  });

  it('filtering by assignedToId works for managers', async () => {
    const res = await request(app)
      .get(`/api/articles?assignedToId=${author2.id}`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`);

    expect(res.status).toBe(200);
    expect(res.body.articles.every(a => a.assignedToId === author2.id)).toBe(true);
  });

  it('rejects assigning to a non-existent user', async () => {
    const article = await Article.create({
      title: 'Guest draft 6', slug: 'guest-draft-6', content: 'x'.repeat(60), excerpt: 'x',
      authorId: guestPlaceholder.id, categoryId: category.id, status: 'draft',
    });

    const res = await request(app)
      .put(`/api/articles/${article.id}`)
      .set('Authorization', `Bearer ${tokenFor(editor)}`)
      .send({ assignedToId: 999999 });

    expect(res.status).toBe(400);
  });

  it('allows explicit unassignment', async () => {
    const article = await Article.create({
      title: 'Guest draft 7', slug: 'guest-draft-7', content: 'x'.repeat(60), excerpt: 'x',
      authorId: guestPlaceholder.id, categoryId: category.id, status: 'draft', assignedToId: author1.id,
    });

    const res = await request(app)
      .put(`/api/articles/${article.id}`)
      .set('Authorization', `Bearer ${tokenFor(editor)}`)
      .send({ assignedToId: null });

    expect(res.status).toBe(200);
    expect(res.body.article.assignedToId).toBe(null);
  });
});
