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

describe('Article authorId (byline) reassignment via update endpoint', () => {
  let admin, author1, author2, category;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    admin = await makeUser('admin@example.com', 'admin');
    author1 = await makeUser('author1@example.com', 'author');
    author2 = await makeUser('author2@example.com', 'author');
    category = await Category.create({ name: 'General', slug: 'general' });
  });
  afterAll(async () => { await sequelize.close(); });

  it('THE REAL BUG: confirms authorId used to be silently ignored (regression guard)', async () => {
    const article = await Article.create({
      title: 'Test', slug: 'test-regression', content: 'x'.repeat(60), excerpt: 'x',
      authorId: author1.id, categoryId: category.id, status: 'draft',
    });

    const res = await request(app)
      .put(`/api/articles/${article.id}`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ authorId: author2.id });

    expect(res.status).toBe(200);
    expect(res.body.article.authorId).toBe(author2.id);
  });

  it('REGRESSION: an editor reassigning a guest-submitted article to THEMSELVES works correctly (the "Me" dropdown case)', async () => {
    const guestPlaceholder = await makeUser('guest-contributor@system.local', 'author');
    const article = await Article.create({
      title: 'Guest submission', slug: 'guest-submission-test', content: 'x'.repeat(60), excerpt: 'x',
      authorId: guestPlaceholder.id, categoryId: category.id, status: 'draft',
    });

    const res = await request(app)
      .put(`/api/articles/${article.id}`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ authorId: admin.id });

    expect(res.status).toBe(200);
    expect(res.body.article.authorId).toBe(admin.id);

    const reloaded = await Article.findByPk(article.id);
    expect(reloaded.authorId).toBe(admin.id);
  });

  it('an admin/editor CAN reassign the byline to a different staff member', async () => {
    const article = await Article.create({
      title: 'Test 2', slug: 'test-2', content: 'x'.repeat(60), excerpt: 'x',
      authorId: author1.id, categoryId: category.id, status: 'draft',
    });

    const res = await request(app)
      .put(`/api/articles/${article.id}`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ authorId: author2.id });

    expect(res.status).toBe(200);
    expect(res.body.article.authorId).toBe(author2.id);

    const reloaded = await Article.findByPk(article.id);
    expect(reloaded.authorId).toBe(author2.id);
  });

  it('a regular author CANNOT reassign the byline (managers only)', async () => {
    const article = await Article.create({
      title: 'Test 3', slug: 'test-3', content: 'x'.repeat(60), excerpt: 'x',
      authorId: author1.id, categoryId: category.id, status: 'draft',
    });

    const res = await request(app)
      .put(`/api/articles/${article.id}`)
      .set('Authorization', `Bearer ${tokenFor(author1)}`)
      .send({ authorId: author2.id, title: 'Test 3 updated' });

    expect(res.status).toBe(200);
    const reloaded = await Article.findByPk(article.id);
    expect(reloaded.authorId).toBe(author1.id);
    expect(reloaded.title).toBe('Test 3 updated');
  });

  it('rejects reassignment to a non-existent user ID', async () => {
    const article = await Article.create({
      title: 'Test 4', slug: 'test-4', content: 'x'.repeat(60), excerpt: 'x',
      authorId: author1.id, categoryId: category.id, status: 'draft',
    });

    const res = await request(app)
      .put(`/api/articles/${article.id}`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ authorId: 999999 });

    expect(res.status).toBe(400);
  });

  it('leaves authorId untouched when not included in the request at all', async () => {
    const article = await Article.create({
      title: 'Test 5', slug: 'test-5', content: 'x'.repeat(60), excerpt: 'x',
      authorId: author1.id, categoryId: category.id, status: 'draft',
    });

    const res = await request(app)
      .put(`/api/articles/${article.id}`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ title: 'Just a title change' });

    expect(res.status).toBe(200);
    expect(res.body.article.authorId).toBe(author1.id);
  });
});
