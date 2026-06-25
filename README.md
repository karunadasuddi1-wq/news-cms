# Pressroom News CMS

A self-hosted admin panel for publishing news content, with role-based editorial workflow: authors write, editors and admins review and publish, admins manage staff.

```
news-cms/
├── backend/    Express API — Sequelize ORM (SQLite or Postgres), JWT auth
└── frontend/   React admin panel (Vite)
```

## What's included

- **JWT auth** with bcrypt password hashing
- **Three roles**: admin, editor, author — see [Roles & permissions](#roles--permissions)
- **Articles** with a draft → in review → published workflow, categories, slugs, featured images
- **Staff management** (admin only): create/deactivate/delete editors and authors
- **Categories** management
- **Dashboard** with queue counts
- Switchable database: **SQLite** (zero-config, single file) or **Postgres** (one env var)

This is the admin/editorial side of the product — the piece you asked to build first. It does **not** include the public-facing reader website (the homepage, category pages, and story pages your readers would see). The API is designed so that's a straightforward next phase: it can query the same `articles` table for `status = 'published'` rows.

## Quick start (local)

You'll need Node.js 18+ installed.

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env
npm run seed     # creates the first admin account + default categories
npm run dev       # starts on http://localhost:4000

# 2. Frontend (in a new terminal)
cd frontend
npm install
cp .env.example .env
npm run dev       # starts on http://localhost:5173
```

Open `http://localhost:5173` and sign in with the credentials printed by `npm run seed` (default: `admin@newscms.local` / `ChangeMe123!` — **change this immediately**, either by editing `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` in `.env` before seeding, or by updating the password from the Staff page after first login).

By default the backend uses **SQLite** — a single file at `backend/data/newscms.sqlite`. No database server to install. Good enough for a small/medium publication on a single VPS.

## Switching to Postgres

Set two things in `backend/.env`:

```bash
DB_DIALECT=postgres
DATABASE_URL=postgres://user:password@host:5432/dbname
```

(Or use the discrete `PGHOST`/`PGPORT`/`PGDATABASE`/`PGUSER`/`PGPASSWORD` vars instead of `DATABASE_URL` — both work.) Then run `npm run seed` again against the new database. The application code is identical either way — Sequelize handles the dialect difference.

> **A note on how this was built:** I developed and tested this against Postgres in my own sandbox, because SQLite's native bindings need to compile from source and my sandbox's network is locked down to package registries only (it can't reach the binary mirrors `sqlite3` needs). On Railway, Render, or a normal VPS — which have unrestricted internet — `npm install` will fetch SQLite's prebuilt binary with no extra steps, the same as any other Node project using it. Both paths run the exact same Sequelize models and routes, so nothing about the app's behavior differs between them.

## Deploying

**Railway / Render (recommended for this stack):**
1. Push this repo to GitHub.
2. Create a new Web Service, point it at `backend/`, build command `npm install`, start command `npm start`.
3. Add env vars from `backend/.env.example` (set a strong `JWT_SECRET`, set `CORS_ORIGIN` to your frontend's URL). For Postgres, both platforms can provision a Postgres instance and inject `DATABASE_URL` for you automatically — just set `DB_DIALECT=postgres`.
4. Run `npm run seed` once (Railway/Render both support one-off run commands in their dashboard) to create the first admin.
5. Deploy `frontend/` as a separate static site (Render Static Site, Vercel, Netlify), with `VITE_API_URL` set to your backend's URL.

**Plain VPS:**
1. Install Node.js 18+, clone the repo, `npm install` in `backend/`.
2. Set up `.env`, run `npm run seed`.
3. Run the API behind a process manager (`pm2 start src/server.js --name newscms-api`) and a reverse proxy (nginx/Caddy) terminating HTTPS.
4. `npm run build` the frontend, serve the `dist/` folder via nginx (or the same reverse proxy) as static files, pointed at the API.

## Roles & permissions

| Action | Author | Editor | Admin |
|---|---|---|---|
| Write & edit own draft articles | ✅ | ✅ | ✅ |
| Submit own article for review | ✅ | ✅ | ✅ |
| Edit/delete *other people's* articles | ❌ | ✅ | ✅ |
| Publish / unpublish any article | ❌ | ✅ | ✅ |
| Edit a published article | ❌ (ask an editor) | ✅ | ✅ |
| Manage categories | ❌ | ✅ | ✅ |
| Create/deactivate/delete staff accounts | ❌ | ❌ | ✅ |

Authors only ever see their own articles in the list and dashboard; editors and admins see everything. An author can withdraw a submitted article back to draft, but only an editor or admin can move anything to "published."

## API reference

All routes are prefixed `/api`. Authenticated routes need `Authorization: Bearer <token>`.

| Method | Route | Who | Description |
|---|---|---|---|
| POST | `/auth/login` | anyone | `{ email, password }` → `{ token, user }` |
| GET | `/auth/me` | any signed-in user | current user |
| GET | `/articles` | any | list (own articles for authors, all for editor/admin). Query: `status`, `categoryId`, `authorId`, `search`, `page`, `pageSize` |
| GET | `/articles/:id` | owner or editor/admin | single article |
| POST | `/articles` | any | create (status starts as `draft`) |
| PUT | `/articles/:id` | owner (if not published) or editor/admin | edit fields |
| PATCH | `/articles/:id/status` | see [roles table](#roles--permissions) | `{ status: "draft" \| "pending_review" \| "published" }` |
| DELETE | `/articles/:id` | owner (if not published) or editor/admin | delete |
| GET | `/categories` | any | list |
| POST/PUT/DELETE | `/categories` | editor/admin | manage |
| GET/POST/PUT/DELETE | `/users` | admin | manage staff accounts |
| GET | `/dashboard/stats` | any | queue counts, scoped by role |

Errors come back as `{ "error": "human-readable message" }` with an appropriate HTTP status.

## Environment variables (backend)

See `backend/.env.example` for the full list with comments. The essentials: `DB_DIALECT`, `JWT_SECRET` (generate with `openssl rand -hex 32`), `CORS_ORIGIN`, `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`.

## Extending this

A few natural next steps, roughly in order of how most newsrooms would prioritize them:
- **Public reader site** — a separate frontend (or server-rendered pages) that queries `GET /articles?status=published` and renders the homepage/category/story pages like the site you originally linked.
- **Rich text editor** — the story field is currently a plain textarea (content is stored as-is — markdown or HTML, your choice). Swapping in something like Tiptap or Lexical is a frontend-only change; the API already stores arbitrary text.
- **Image uploads** — featured images are currently just a URL field. Adding real uploads means wiring in object storage (S3, Cloudinary, etc.) and a new `/uploads` endpoint.
- **Audit log** — track who changed what, useful once you have several editors.
