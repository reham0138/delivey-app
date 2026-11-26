# Crown & Anchor Delivery

Food-delivery app: React + TypeScript + Vite frontend, NestJS + MongoDB backend. Customers browse meals, order, track and review; restaurant owners manage orders and reviews; admins moderate users, restaurants, meals, orders and reviews.

> API contract: [`docs/API_CONTRACT.md`](./docs/API_CONTRACT.md) — the source of truth for endpoints, payloads and error codes.

## Repository layout

```text
.
├── frontend/      # React + TypeScript + Vite app (this is what users see)
├── backend/       # NestJS API + MongoDB (all business logic and persistence)
├── docs/          # API_CONTRACT.md
├── Crown_Anchor_Shared_Design_Reference/   # shared design tokens and conventions
└── Delevery-app.md                         # product vision
```

## Requirements

- Node.js `^20.19.0` or `>=22.12.0`, npm
- MongoDB (Atlas URI works; local MongoDB also fine)
- Optional: the shared semantic-search service for smart meal search (see below)

## Run locally

### Backend

```bash
cd backend
cp .env.example .env   # fill in real values (see backend/.env.example)
npm ci
npm run seed           # optional: load fixture users/restaurants/meals/orders
npm run start:dev      # http://localhost:3000/api/v1
```

`npm run seed` creates the fixture catalog plus demo users. All fixture users share `SEED_USER_PASSWORD` from `.env`; the admin uses `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

### Frontend

```bash
cd frontend
cp .env.example .env   # VITE_API_URL must point at the backend, e.g. http://localhost:3000/api/v1
npm ci
npm run dev            # http://localhost:5173
```

`VITE_*` variables are baked in at **build time** — restart `npm run dev` or rebuild after changing them.

## Roles

| Role | What it can do |
|---|---|
| `customer` | browse, cart, checkout, track orders, cancel (pending only), review delivered meals |
| `restaurant` | owner dashboard: accept/advance orders, cancel with reason, view and report reviews, manage own meals |
| `admin` | users (suspend), restaurants (activate/deactivate), meals (availability), orders (cancel with reason), reviews (hide / dismiss report), categories, platform stats |

Suspending a user revokes all their sessions; suspended users cannot log in.

## Environment variables (names only — never commit real values)

**frontend/.env**

- `VITE_API_URL` — backend base URL including `/api/v1` (required for anything but a static preview)
- `VITE_SEARCH_API_URL` — optional semantic-search service; unset disables smart search

**backend/.env** — see `backend/.env.example`: `PORT`, `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL`, `REFRESH_TTL_DAYS`, `FRONTEND_URL` (CORS origin — set to the deployed frontend URL), `CLOUDINARY_*` (image uploads), `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SEED_USER_PASSWORD`.

## Checks

```bash
cd frontend && npm run lint && npm run build && npm test   # eslint, tsc+vite build, vitest
cd backend  && npm test                                    # jest
```

## Deployment (Render)

- **Backend** — Render *Web Service*, root directory `backend`, build `npm ci && npm run build`, start `node dist/main`. Set all `backend/.env` vars in the dashboard; `FRONTEND_URL` must be the deployed frontend origin or browser calls will be CORS-blocked. Free-plan instances sleep after ~15 min idle — the first request can take ~1 min.
- **Frontend** — Render *Static Site*, root directory `frontend`, build `npm ci && npm run build`, publish directory `dist`. Set `VITE_API_URL` to the backend's `https://.../api/v1` URL **before** building (it is inlined into the bundle). `public/_redirects` already rewrites all routes to `index.html` for client-side routing; on Render also add a rewrite rule `/* → /index.html` (or deploy via a blueprint) so deep links don't 404.
- Image uploads go through Cloudinary — configure `CLOUDINARY_*` on the backend or uploads will fail.

## Semantic search (optional)

The Meals page can rank results by meaning (Arabic + English) via the shared [semantic-search-engine](https://github.com/reham0138/semantic-search-engine) service:

1. Run it locally (`pip install -r requirements.txt`, then `python -m uvicorn app.main:app --port 8000`; first start downloads a ~470 MB model).
2. Set `VITE_SEARCH_API_URL=http://127.0.0.1:8000` in `frontend/.env` and restart the dev server.

If unset, the feature is fully hidden and normal backend search is used — safe for production.

## Security note

If any `.env` values, passwords or API keys were ever pasted into chat or committed anywhere, **rotate them** (JWT secrets, Cloudinary keys, MongoDB credentials, admin password) before real users touch the deployment.

## Team workflow

- Branch per task (`feat/...`), open a PR with a summary + screenshots for UI changes.
- Before review: `npm run lint && npm run build` in `frontend/`, `npm test` in both.
- Never commit secrets, credentials, or real customer data. `frontend/public/mock/` fixtures are static samples still read by the backend seed — do not delete them.
