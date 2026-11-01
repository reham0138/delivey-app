# Frontend

The Crown & Anchor Delivery web app is built with React, TypeScript, Vite, and Tailwind CSS v4.

> **Project status:** This is an early frontend shell. It currently renders the shared header and footer and includes static sample data. Authentication, API integration, cart, checkout, orders, and dashboards described in the product vision are not implemented yet.

For repository-wide onboarding and team workflow, start with the [root README](../README.md).

## Requirements

- Node.js `^20.19.0` or `>=22.12.0`
- npm

## Install and run

From this directory:

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite, normally <http://localhost:5173>.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run lint` | Run ESLint against the frontend |
| `npm run build` | Type-check with `tsc -b` and build production files into `dist/` |
| `npm run preview` | Serve the production build locally |

Before sharing a change, run:

```bash
npm run lint
npm run build
```

## Code map

```text
src/
├── main.tsx                    # Browser entry point
├── App.tsx                     # Router and top-level route
├── App.css                     # Global CSS and Tailwind v4 theme tokens
├── pages/                      # Route-level screens
│   └── login.tsx
└── shared/
    ├── components/             # NavBar and Footer
    ├── contexts/               # App-wide React contexts
    ├── hooks/                  # Shared React hooks
    ├── layouts/                # Main page shell
    ├── services/               # Service functions
    ├── types/                  # TypeScript types
    └── utils/                  # Shared utility functions
```

Some folders and files are placeholders for future work. Check their implementation before depending on them.

## Static assets and sample data

- Put files that should be served directly by the web server in `public/`.
- Brand assets are under `public/brand/`.
- Sample JSON files are under `public/mock/` and are served from `/mock/`, for example `/mock/menu-items.json`.
- Sample JSON is static frontend data; it does not persist changes and is not a substitute for an API.

## Styling and design

- Tailwind CSS v4 is integrated using `@tailwindcss/vite` in `vite.config.ts`.
- Global styles and the current brand color/font tokens are in `src/App.css`.
- Use the [shared design reference](../Crown_Anchor_Shared_Design_Reference/README.md) for visual, accessibility, and RTL/LTR guidance.
- The shared design pack's tagline is generic; the delivery app currently uses its delivery-specific tagline. Keep product wording appropriate to the app.

## Environment and API

No API base URL or environment variables are currently configured. When adding an API:

1. Agree on the API contract and error/loading behavior with the team.
2. Keep credentials and private keys on the server; frontend `VITE_*` variables are public.
3. Document required variable names and safe local setup here without committing secret values.
