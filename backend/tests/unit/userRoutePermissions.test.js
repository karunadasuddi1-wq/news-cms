const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const config = require('../../src/config/env');
const { sequelize, User } = require('../../src/models');

async function makeUser(email, role) {
  const user = User.build({ name: email.split('@')[0], email, role });
  user.password = 'x';
  await user.save();
  return user;
}
function tokenFor(user) { return jwt.sign({ sub: user.id }, config.jwtSecret); }

describe('Users route permissions — the real root cause of the byline mystery', () => {
  let admin, editor, author;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    admin = await makeUser('admin@example.com', 'admin');
    editor = await makeUser('editor@example.com', 'editor');
    author = await makeUser('author@example.com', 'author');
  });
  afterAll(async () => { await sequelize.close(); });

  it('REGRESSION: an editor CAN list staff (previously got a 403, breaking the byline dropdown)', async () => {
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${tokenFor(editor)}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.users)).toBe(true);
  });

  it('an admin can also list staff', async () => {
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${tokenFor(admin)}`);
    expect(res.status).toBe(200);
  });

  it('a regular author CANNOT list staff (not needed for their workflow)', async () => {
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${tokenFor(author)}`);
    expect(res.status).toBe(403);
  });

  it('an editor CANNOT create a new staff account (stays admin-only)', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${tokenFor(editor)}`)
      .send({ name: 'New Person', email: 'new@example.com', password: 'password123', role: 'author' });
    expect(res.status).toBe(403);
  });

  it('an editor CANNOT edit an existing staff account (stays admin-only)', async () => {
    const res = await request(app)
      .put(`/api/users/${author.id}`)
      .set('Authorization', `Bearer ${tokenFor(editor)}`)
      .send({ name: 'Renamed' });
    expect(res.status).toBe(403);
  });

  it('an editor CANNOT delete a staff account (stays admin-only)', async () => {
    const res = await request(app)
      .delete(`/api/users/${author.id}`)
      .set('Authorization', `Bearer ${tokenFor(editor)}`);
    expect(res.status).toBe(403);
  });

  it('an admin CAN create a new staff account', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ name: 'New Person 2', email: 'new2@example.com', password: 'password123', role: 'author' });
    expect(res.status).toBe(201);
  });
});
