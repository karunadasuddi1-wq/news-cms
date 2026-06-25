# Pressroom — Admin Frontend

React + Vite admin panel for the Pressroom News CMS. Talks to the backend API in `../backend`.

## Setup

```bash
npm install
cp .env.example .env   # or edit .env — set VITE_API_URL to your backend's URL
npm run dev
```

Opens at `http://localhost:5173`. Sign in with the admin account created by the backend's `npm run seed`.

## Build for production

```bash
npm run build
```

Outputs static files to `dist/`. Deploy `dist/` to any static host (Vercel, Netlify, Render static site, S3 + CloudFront, or just serve it from the backend with a static file middleware). Set `VITE_API_URL` at build time to your backend's deployed URL.

## Structure

- `src/pages` — one file per screen (Login, Dashboard, Articles, ArticleEditor, Categories, Users)
- `src/context/AuthContext.jsx` — login state, token storage, role helpers (`can.manageAny`, `can.manageUsers`)
- `src/api/client.js` — axios instance with auth header injection and 401 handling
- `src/components` — shared UI (Sidebar, Modal, StatusStamp, ErrorBanner, ProtectedRoute)

## Design

Editorial "newsroom desk" theme: dark ink sidebar, paper-white workspace, rubber-stamp-style status badges. Tokens live in `src/index.css` under `@theme` — change colors/fonts there to re-theme the whole app.
