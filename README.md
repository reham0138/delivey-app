# Crown & Anchor Delivery

This repository contains the Crown & Anchor delivery frontend and the shared design references for the team.

> **Current status:** The frontend is an early React shell with branded navigation/footer and sample JSON files. There is no backend or working ordering, authentication, or checkout flow yet. The broader feature list in [Delevery-app.md](./Delevery-app.md) is a product vision, not a description of features that are already implemented.

## Get started

### Requirements

- Node.js `^20.19.0` or `>=22.12.0` (required by the installed Vite version)
- npm

Check your versions:

```bash
node --version
npm --version
```

### Install and run

Run these commands from the repository root:

```bash
cd frontend
npm ci
npm run dev
```

Open the local URL printed by Vite (normally <http://localhost:5173>).

### Available commands

Run these from `frontend/`:

| Command | Purpose |
|---|---|
| `npm run dev` | Start the local Vite development server |
| `npm run lint` | Run ESLint |
| `npm run build` | Run the TypeScript project build and create the production bundle in `dist/` |
| `npm run preview` | Preview the production bundle locally after building |

There is no configured API URL or `.env` file requirement at this stage. Do not add credentials or private keys to frontend environment variables; values prefixed with `VITE_` are included in browser code.

## What is in this repository

```text
.
├── frontend/                         # React + TypeScript + Vite application
│   ├── public/
│   │   ├── brand/                    # App logos and social images
│   │   └── mock/                     # Static sample JSON served from /mock/*
│   └── src/
│       ├── App.tsx                   # React Router setup
│       ├── App.css                   # Global styles and Tailwind v4 theme tokens
│       ├── pages/                    # Route-level screens
│       └── shared/                   # Components, layouts, contexts, hooks, etc.
├── Crown_Anchor_Shared_Design_Reference/
│   ├── README.md                     # Index to shared design and team guidance
│   ├── docs/                         # Design system, structure, component, handoff docs
│   ├── design-reference/tokens/      # Machine-readable brand tokens
│   ├── logo/                         # Brand logo source files
│   ├── social/                       # Social media logo exports
│   └── shared-conventions/           # Cross-project frontend conventions
└── Delevery-app.md                   # Proposed product scope and future direction
```

### Frontend notes

- The application entry point is `frontend/src/main.tsx`; routes are currently composed in `frontend/src/App.tsx`.
- Shared layout and branding components live in `frontend/src/shared/`.
- Files in `frontend/public/mock/` are static examples, not a database or API. They can be requested by their public paths, for example `/mock/restaurants.json`.
- Brand images belong in `frontend/public/brand/` when they need to be referenced by a public URL.
- The styling setup uses Tailwind CSS v4 through `@tailwindcss/vite`; shared CSS theme tokens are in `frontend/src/App.css`.
- Check the existing source and dependencies before assuming a planned feature, API, or folder is already implemented.

## Team workflow

- Create a focused branch for each task, such as `feature/restaurant-list` or `fix/mobile-header`.
- Before editing shared components, types, routes, or design tokens, coordinate with teammates who may be working in those files.
- Keep page-specific UI with its page; move code into `shared/` when it is genuinely reused.
- Use the shared design references for colors, typography, spacing, accessibility, and RTL/LTR behavior. Keep domain-specific page structure specific to this app.
- Open a pull request with a short summary, screenshots for visible UI changes, and the checks you ran.
- Before requesting review, run `npm run lint` and `npm run build` from `frontend/`.
- Never commit secrets, credentials, or real customer data.

## Documentation

- [Frontend setup and code guide](./frontend/README.md)
- [Shared design reference index](./Crown_Anchor_Shared_Design_Reference/README.md)
- [Shared team handoff](./Crown_Anchor_Shared_Design_Reference/docs/TEAM_HANDOFF.md)
- [Product vision and planned features](./Delevery-app.md)
