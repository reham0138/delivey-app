# Food Ordering App

**Browse meals, build a cart, place an order, track it, and review what you ate, with a dedicated dashboard for every role.**
Search for a meal, filter by category, add it to the cart, check out, and follow the order status from *pending* to *delivered*. After delivery, customers can rate and review the meals they ordered.

<!-- Add a screenshot or GIF of the running app here, e.g. ![App](docs/screenshot.png) -->

---

## How it works

```
Frontend (React + TypeScript + Vite)
        │  Axios  →  GET /meals, POST /orders, POST /meals/:id/reviews, ...
        ▼
REST API (Node.js backend)
        │
        ▼
Database (users, meals, orders, reviews)
        │
        ▼
JSON response → React Query cache → UI components
```

The frontend never talks to the database directly. Every action (login, load meals, place an order, submit a review) goes through the REST API, and React Query caches the responses so the UI stays fast.

## Roles

| Role | What they can do |
|------|------------------|
| **Customer** | Browse meals, order, track orders, write reviews, manage profile |
| **Restaurant** | Manage own meals, handle incoming orders, see reviews on own meals |
| **Admin** | Manage users, meals, categories and all orders, moderate reviews, see analytics |

Each role gets its own dashboard under `/dashboard`. The user's role comes from the API (`user.role`) after login, and the router blocks access to dashboards that don't match it.

## Pages

### Store (public)

| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Hero section, categories, popular meals |
| Login / Register | `/login`, `/register` | Authentication forms |
| Meals | `/meals` | Search, category filter, sort, pagination |
| Meal Details | `/meals/:id` | Image, description, price, ingredients, nutrition, **reviews list**, quantity → add to cart |
| Cart | `/cart` | Items, quantity controls, remove, subtotal / tax / total, clear cart |
| Not Found | `*` | 404 page |

### Customer (protected)

| Page | Route | Description |
|------|-------|-------------|
| Checkout | `/checkout` | Customer info, address, payment method, order summary |
| Orders | `/orders` | Order history with status badges and pagination |
| Order Details | `/orders/:id` | Full order info, status timeline, **"Write a review" per meal once delivered** |
| Profile | `/profile` | View and edit name, phone and account info |

### Dashboards (protected by role)

| Role | Route | Sections |
|------|-------|----------|
| Customer | `/dashboard/customer` | My orders, my reviews (edit / delete), profile |
| Restaurant | `/dashboard/restaurant` | Stats, my meals (add / edit / delete), incoming orders (update status), reviews on my meals |
| Admin | `/dashboard/admin` | Analytics, users, all meals and categories, all orders, review moderation |

Every list page handles three states: **loading** (spinner / skeleton), **error** (message + retry) and **empty** (EmptyState with a call to action).

## Reviews

- A customer can review a meal **only after an order containing it is marked `delivered`**.
- One review per customer per meal (rating 1–5 + optional comment).
- The customer can edit or delete their own review; admins can remove any review.
- A meal's average `rating` is recalculated by the backend whenever a review changes.

## Tech stack

- **Frontend:** React, TypeScript, Vite, React Router
- **Server state:** TanStack React Query (meals, orders, reviews, profile)
- **Client state:** React Context (auth, cart, theme) persisted in `localStorage`
- **HTTP:** Axios (token interceptor + refresh on 401)
- **Styling:** Tailwind CSS
- **Notifications:** react-hot-toast
- **Tooling:** ESLint, Prettier, Husky (optional), TypeScript strict mode

## State management

| State type | Tool | Used for |
|-----------|------|----------|
| Server state | React Query | meals, categories, orders, reviews, profile, dashboard data |
| Client state | Context | auth user + role, cart items, theme, toasts |
| Local state | `useState` | form inputs, quantity picker, rating stars |

The cart and auth contexts persist to `localStorage`, so a refresh doesn't lose the cart or the session.

## Project Structure

```text
src/
├── main.tsx
├── App.tsx
├── pages/          # route-level, app-specific
└── shared/         # reused across pages
    ├── layouts/
    ├── components/
    ├── api/
    ├── services/
    ├── contexts/
    ├── hooks/
    ├── types/
    └── utils/
```

### What goes where

```text
src/
├── main.tsx                    # entry point, mounts <App />
├── App.tsx                     # providers (QueryClient, Contexts, Toaster) + RouterProvider
│
├── pages/                      # route-level, app-specific
│   ├── routes.tsx              # all routes collected in one place
│   ├── home/                   # Home.tsx + page-only components
│   ├── auth/                   # Login.tsx, Register.tsx, LoginForm
│   ├── meals/                  # Meals.tsx, MealDetails.tsx, MealCard, MealFilters,
│   │                           # ReviewList, ReviewForm
│   ├── cart/                   # Cart.tsx, CartItem, CartSummary
│   ├── checkout/               # Checkout.tsx
│   ├── orders/                 # Orders.tsx, OrderDetails.tsx, OrderCard, OrderTimeline
│   ├── profile/                # Profile.tsx, ProfileForm
│   ├── dashboard/
│   │   ├── customer/           # my orders, my reviews
│   │   ├── restaurant/         # my meals, incoming orders, stats
│   │   └── admin/              # users, meals, orders, moderation, analytics
│   └── not-found/              # NotFound.tsx
│
└── shared/                     # reused across pages
    ├── layouts/                # StoreLayout (Header + Footer + Outlet), AuthLayout,
    │                           # DashboardLayout (sidebar + Outlet, menu per role)
    ├── components/             # Button, Input, Select, Modal, Card, Spinner, EmptyState,
    │                           # Badge, Rating (stars), ProtectedRoute, RoleRoute
    ├── api/                    # apiClient.ts (Axios + interceptors), queryClient.ts,
    │                           # endpoint modules: auth, meals, cart, orders, reviews, user, admin
    ├── services/               # business logic: token storage, cart totals, role helpers
    ├── contexts/               # AuthContext, CartContext, ThemeContext
    ├── hooks/                  # useAuth, useCart, useDebounce, useMeals, useOrders, useReviews
    ├── types/                  # user.ts, meal.ts, order.ts, review.ts, cart.ts
    └── utils/                  # format.ts, validation.ts, constants.ts
```

**Rule of thumb:** if a component or hook is used by a single page, keep it inside that page's folder. As soon as a second page needs it, move it to `shared/`.

Path aliases are configured in `tsconfig.json` and `vite.config.ts`: `@/pages` and `@/shared`.

### Layouts

- **StoreLayout** — Header + Footer + `<Outlet />`, used by all store pages.
- **AuthLayout** — a minimal centered layout for login and register.
- **DashboardLayout** — sidebar + `<Outlet />`; the sidebar items change according to the user's role.

### Routing

All routes are collected in `pages/routes.tsx` using `createBrowserRouter`, and two guards live in `shared/components`:

- `<ProtectedRoute>` — redirects to `/login` if the user isn't authenticated.
- `<RoleRoute allow={['admin']}>` — redirects away if the user's role isn't allowed.

```tsx
{ path: 'dashboard/admin/*', element: <RoleRoute allow={['admin']}><AdminDashboard /></RoleRoute> }
```

Heavy or rarely visited pages (checkout, orders, dashboards) are lazy-loaded with `React.lazy` + `Suspense`.

## API overview

The frontend consumes a REST API. The base URL is set through `VITE_API_URL`.

### Auth & user

| Endpoint | Purpose |
|----------|---------|
| `POST /auth/login` · `/register` · `/logout` · `/refresh` | Authentication, returns `{ access_token, refresh_token, user }` |
| `PUT /user/profile` · `PUT /user/password` | Profile updates |

### Meals & categories

| Endpoint | Purpose |
|----------|---------|
| `GET /meals?page=&limit=&category=&search=` | Paginated meal list |
| `GET /meals/:id` · `GET /meals/popular` | Details / popular |
| `GET /categories` | Category list |

### Orders

| Endpoint | Purpose |
|----------|---------|
| `POST /orders` | Create an order |
| `GET /orders` · `GET /orders/:id` | Order history and details (own orders) |

### Reviews

| Endpoint | Purpose |
|----------|---------|
| `GET /meals/:id/reviews` | Reviews of a meal (paginated) |
| `POST /meals/:id/reviews` | Create a review (delivered orders only) |
| `PUT /reviews/:id` · `DELETE /reviews/:id` | Edit / delete own review |

### Dashboards

| Endpoint | Role | Purpose |
|----------|------|---------|
| `GET /restaurant/meals` · `POST` · `PUT /:id` · `DELETE /:id` | Restaurant | Manage own meals |
| `GET /restaurant/orders` · `PUT /restaurant/orders/:id/status` | Restaurant | Incoming orders and status updates |
| `GET /restaurant/stats` | Restaurant | Sales and rating summary |
| `GET /admin/users` · `PUT /admin/users/:id` | Admin | Manage users and roles |
| `GET /admin/orders` | Admin | All orders |
| `DELETE /admin/reviews/:id` | Admin | Review moderation |
| `GET /admin/stats` | Admin | Platform analytics |

Cart endpoints (`GET/POST /cart`, `PUT/DELETE /cart/items/:id`) are optional if the cart is kept only on the client.

The backend must check the role on every dashboard endpoint. Hiding a route in the frontend is only for UX, not security.

### Core data models

```ts
type Role = 'customer' | 'restaurant' | 'admin';

interface User {
  id: number; name: string; email: string; phone?: string; role: Role;
}

interface Meal {
  id: number; name: string; description: string; price: number;
  image: string; category_id: number; rating: number; reviews_count: number;
  ingredients: string[]; preparation_time: number;
  nutrition?: { calories: number; protein: number; carbs: number; fat: number };
}

interface Review {
  id: number; meal_id: number; user_id: number; user_name: string;
  rating: number;            // 1-5
  comment?: string;
  created_at: string;
}

interface Order {
  id: number; customer_name: string; phone: string; address: string;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  total: number; items: OrderItem[];
  payment_method: 'cash' | 'card'; notes?: string;
  created_at: string;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; total_pages: number };
}
```

### Authentication flow

1. The user logs in; the API returns an access token, a refresh token and the user (with `role`).
2. An Axios request interceptor attaches `Authorization: Bearer <token>` to every request.
3. On a `401` response, the client calls `POST /auth/refresh` and replays the failed request. If refresh fails, the user is logged out.
4. On logout, tokens are cleared and `queryClient.clear()` is called.
5. After login, the user is redirected by role: customer → `/`, restaurant → `/dashboard/restaurant`, admin → `/dashboard/admin`.

## Quick start

```bash
npm create vite@latest food-ordering-app -- --template react-ts
cd food-ordering-app
npm install react-router-dom @tanstack/react-query axios react-hot-toast
npm install -D tailwindcss postcss autoprefixer @types/node
```

Create a `.env` file:

```
VITE_API_URL=http://localhost:5000/api
```

Run the app:

```bash
npm run dev
```

Then open <http://localhost:5173>.

## Implementation order

1. **Project setup** — Vite, strict TypeScript, ESLint, Prettier, path aliases
2. **Shared components** — Button, Input, Select, Modal, Card, Spinner, EmptyState, Badge, Rating
3. **Layouts** — StoreLayout, AuthLayout, DashboardLayout
4. **Router** — collect all routes in `pages/routes.tsx`, add `ProtectedRoute` and `RoleRoute`
5. **API layer** — Axios client, React Query client, endpoint modules
6. **Contexts** — auth (with role) and cart with persistence
7. **Store pages** — Meals → Meal Details → Cart → Auth → Checkout → Orders → Profile
8. **Reviews** — review list on Meal Details, review form on Order Details
9. **Dashboards** — Customer → Restaurant → Admin
10. **Polish** — loading / empty / error states, responsive design, lazy loading, accessibility

## Non-functional goals

- **Performance:** first paint < 1.5s, bundle < 500 KB gzipped
- **Security:** JWT with refresh, protected and role-based routes, input validation, no secrets on the client
- **Accessibility:** keyboard navigation, screen-reader friendly (WCAG AA)
- **Responsive:** mobile-first, touch-friendly

## Possible extensions

Real-time order updates (WebSocket), Stripe payments, Light / Dark mode, PWA support, favorites, review photos, automated tests (unit, integration, E2E).

## About

Built as a capstone project for the React track: a food ordering application with authentication, cart, checkout, order tracking, reviews and role-based dashboards.

## License

For academic / educational use only.
