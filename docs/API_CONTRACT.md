# Crown & Anchor Delivery: Backend API Contract

**Version:** v1.1 draft (checked against the frontend code on 2026-11-20)
**Stack:** NestJS + MongoDB (Mongoose)
**Hosting:** Render (API), MongoDB Atlas (database), Cloudinary (images)

This file is the single source of truth for field names, enums, endpoints and business rules.
The frontend already exists (React + Vite, mock JSON + localStorage). This contract describes the real API that replaces the mock services.
If something here conflicts with the frontend, the conflict must be listed and resolved by the team, not silently worked around.
Any change to this file goes through a pull request.

---

## 0. Scope

**In v1**
- Auth with access + refresh tokens, profile, saved addresses
- Public catalog: categories, restaurants, menu items, public reviews
- Restaurant owner tools: profile, menu management, incoming orders and status updates, reporting reviews
- Customer orders (cash, card is simulated), cancellation
- Reviews (create, list, report) with computed ratings
- Admin tools: users, restaurants, orders, reviews, meals, categories, stats
- Image upload

**Out of v1**
- Driver role and dispatch
- Real card payments (card is simulated, see section 9)
- Notifications and real-time sockets (clients poll)
- Customer review editing or deleting
- Restaurant-level stats endpoint
- Audit logs, password reset
- Semantic search (separate service, called directly by the frontend)

### Priorities

- **P1:** built in the one-week plan.
- **P2:** built only if time remains: `POST /auth/logout-all`, `POST /orders/quote`, `PATCH /users/me/addresses/:id`, `GET /restaurant/orders/:id`, `POST /restaurant/orders/:id/cancel`, `GET /admin/orders/:id`, and all `/admin/categories` endpoints (categories come from the seed until then). The owner `isOpen` toggle in the UI is also P2 (the API already accepts it).
- Every other endpoint is P1.

---

## 1. Conventions

| Topic | Rule |
|---|---|
| Base URL | `/api/v1` (frontend env: `VITE_API_URL`) |
| Format | JSON, UTF-8, camelCase fields |
| Exceptions kept for frontend compatibility | `access_token` and `refresh_token` (auth responses and request bodies), `total_pages` (pagination meta) |
| IDs | Strings (Mongo ObjectId, 24 hex chars), exposed as `id`, never `_id`. Frontend types change from `number` to `string` |
| Dates | ISO 8601 UTC strings |
| Money | Numbers rounded to 2 decimals, one currency |
| Auth header | `Authorization: Bearer <access_token>` |
| Single resource response | The object itself, no envelope |
| List response | `{ "data": [...], "meta": { "total", "page", "limit", "total_pages" } }`, `total_pages` is at least 1 |
| Pagination params | `page` (default 1), `limit` (default 10, max 50; categories default 100) |
| Request bodies | Whitelist validation: unknown fields are rejected with 400. Clients never send server-controlled fields (id, createdAt, rating, reviewsCount, order prices and totals, statuses they do not own) |
| Deletion | Nothing is hard-deleted. Restaurants and meals are deactivated, reviews are hidden, orders are cancelled |

### Error format

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "code": "VALIDATION_ERROR",
  "message": "Human readable message",
  "details": [{ "field": "email", "message": "must be an email" }]
}
```

`details` is present only for validation errors.

### Error codes

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Invalid or unknown fields |
| `INVALID_PROMO_CODE` | 400 | Unknown promo code |
| `MIN_ORDER_NOT_MET` | 400 | Subtotal is below the restaurant minimum |
| `RESTAURANT_UNAVAILABLE` | 400 | Restaurant is inactive or closed |
| `ITEM_UNAVAILABLE` | 400 | A meal is unavailable, inactive, or not from this restaurant |
| `REVIEW_NOT_ELIGIBLE` | 400 | Order not delivered, not the customer's, or does not contain the meal |
| `UNAUTHORIZED` | 401 | Missing or invalid access token |
| `TOKEN_EXPIRED` | 401 | Access token expired (client should refresh once and retry) |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh token unknown, expired, revoked or reused |
| `FORBIDDEN` | 403 | Role not allowed |
| `ACCOUNT_SUSPENDED` | 403 | Account is suspended |
| `NOT_FOUND` | 404 | Resource missing, or not visible to this user |
| `EMAIL_ALREADY_EXISTS` | 409 | Email already registered |
| `REVIEW_ALREADY_EXISTS` | 409 | Customer already reviewed this meal |
| `INVALID_STATUS_TRANSITION` | 409 | Order status change not allowed |
| `ORDER_NOT_CANCELLABLE` | 409 | Order cannot be cancelled in its current status |
| `CATEGORY_NAME_TAKEN` | 409 | Category name already exists |
| `TOO_MANY_REQUESTS` | 429 | Rate limit hit |

### Field limits

| Field | Limit |
|---|---|
| Review `comment` | 500 characters |
| Order `notes` | 300 characters |
| Report `reason` and cancellation `reason` | 500 characters |
| Meal `name` / `description` / `category` | 100 / 500 / 60 characters |
| `password` | At least 8 characters on register. Login does not check the length |
| `image`, `cover` | `http(s)` URL, max 2048 characters |

### Search semantics

`search` is a case-insensitive partial match on the trimmed text.

| Endpoint | Matches |
|---|---|
| `GET /restaurants` | name, cuisine |
| `GET /menu-items`, `GET /restaurants/:id/menu-items`, `GET /restaurant/menu-items` | name, description |
| `GET /orders`, `GET /restaurant/orders` | order number (the last 6 characters of the id) and item names |
| `GET /admin/orders` | order number, item names, customer name, restaurant name |
| `GET /admin/users` | name, email, phone |
| `GET /admin/restaurants` | name, cuisine, owner name, owner email |
| `GET /admin/menu-items` | name, restaurant name |

---

## 2. Enums

| Enum | Values |
|---|---|
| `Role` | `customer`, `restaurant`, `admin` |
| `AccountStatus` | `active`, `suspended` |
| `OrderStatus` | `pending`, `preparing`, `ready`, `on_the_way`, `delivered`, `cancelled` |
| `PaymentMethod` | `cash`, `card` |
| `PaymentStatus` | `pending`, `simulated`, `paid` (`paid` is new, the frontend only knows `pending` and `simulated`) |
| `CancellationActor` | `customer`, `restaurant`, `admin` |

---

## 3. Models (response shapes)

`?` means optional. `null` means explicitly nullable.

### 3.1 AuthUser

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `name` | string | |
| `email` | string | |
| `phone?` | string | |
| `role` | Role | |
| `restaurantId?` | string | Only for role `restaurant` |

### 3.2 AuthResponse

`{ "access_token": string, "refresh_token": string, "user": AuthUser }`

### 3.3 Address

`{ id, label, address, phone }` (all strings)

### 3.4 Restaurant

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `ownerId` | string | |
| `name`, `cuisine`, `address`, `phone` | string | |
| `rating` | number | Computed from reviews, 1 decimal, 0 when none. Read-only |
| `reviewsCount` | number | Computed, read-only |
| `deliveryTimeMinutes` | number | |
| `deliveryFee`, `minOrder` | number | |
| `isOpen` | boolean | Owner toggles |
| `isActive` | boolean | Admin toggles. New restaurants start `false` |
| `image` | string | URL, may be empty string |
| `cover?` | string or null | URL |
| `openingHours?` | string | Display text only |
| `createdAt` | string | |

### 3.5 MenuItem

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `restaurantId` | string | |
| `name`, `description` | string | |
| `price` | number | |
| `category` | string | Category **name**. Stored internally as a reference |
| `image` | string or null | URL |
| `isAvailable` | boolean | Temporary out-of-stock switch |
| `ingredients` | string[] | |
| `preparationTimeMinutes` | number | |
| `nutrition` | `{ calories, protein, carbs, fat }` or null | |
| `rating` | number | Computed, read-only |
| `reviewsCount` | number | Computed, read-only |
| `isPopular` | boolean | Set manually by owner or admin |

Internal only (never in responses): `isActive` (soft delete), `categoryId`, `ratingSum`, `ratingCount`.

### 3.6 Category

`{ id, name, isActive, itemsCount }`. `itemsCount` is computed (active meals), not stored.

### 3.7 OrderItem

`{ menuItemId, name, quantity, unitPrice }`. `name` and `unitPrice` are snapshots taken at order time.

### 3.8 Order

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `customerId` | string | |
| `customerName` | string | Snapshot |
| `phone` | string | |
| `restaurantId` | string | |
| `status` | OrderStatus | |
| `items` | OrderItem[] | |
| `subtotal`, `deliveryFee`, `serviceFee`, `tax`, `discount`, `tip`, `total` | number | All computed by the server |
| `deliveryAddress` | string | |
| `paymentMethod` | PaymentMethod | |
| `paymentStatus` | PaymentStatus | |
| `notes` | string or null | |
| `promoCode` | string or null | |
| `scheduledFor` | string or null | |
| `estimatedDeliveryAt` | string | |
| `statusHistory` | `{ status, at }[]` | |
| `cancelledBy` | CancellationActor or null | |
| `cancellationReason` | string or null | |
| `createdAt` | string | |

The frontend field `simulatedTracking` is dropped (real statuses are used).

### 3.9 Review

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `menuItemId`, `restaurantId`, `customerId`, `orderId` | string | |
| `customerName` | string | Snapshot |
| `rating` | number | Integer 1 to 5 |
| `comment` | string or null | Trimmed, empty becomes null |
| `createdAt` | string | |
| `updatedAt` | string or null | Always null in v1 (no editing) |
| `isReported` | boolean | |
| `reportReason` | string or null | |

Internal: `isHidden` (admin). Appears only in admin responses.

### 3.10 AdminStats

| Field | Type |
|---|---|
| `totalOrders` | number |
| `ordersByStatus` | map of OrderStatus to number (zero keys may be omitted) |
| `totalRevenue` | number |
| `usersByRole` | map of Role to number |
| `suspendedUsers` | number |
| `activeRestaurants` | number |
| `reportedReviews` | number |
| `last14Days` | `{ date, orders, revenue }[]` (date as `YYYY-MM-DD`) |
| `topRestaurants` | `{ restaurantId, name, orders, revenue }[]` (top 5) |

Definitions are in section 9.

### 3.11 Admin rows

| Row | Shape |
|---|---|
| `AdminUserRow` | `{ id, name, email, phone, role, status, createdAt }` (`createdAt` is never null; the frontend `source` field is dropped) |
| `AdminRestaurantRow` | Restaurant + `ownerName`, `ownerEmail` |
| `AdminOrderRow` | Order + `restaurantName` |
| `AdminReviewRow` | Review + `menuItemName`, `restaurantName`, `isHidden` |
| `AdminMealRow` | MenuItem + `restaurantName` |

---

## 4. Auth, profile, addresses, uploads, health

Rate limit: 10 requests per minute per IP on `/auth/login`, `/auth/register`, `/auth/refresh` (429 `TOO_MANY_REQUESTS`).

| Method | Path | Role | Request | Success | Errors |
|---|---|---|---|---|---|
| POST | `/auth/register` | public | `{ name, email, password (min 8), phone?, role: customer or restaurant }` | 201 AuthResponse | 409 `EMAIL_ALREADY_EXISTS`, 400 |
| POST | `/auth/login` | public | `{ email, password }` | 200 AuthResponse | 401 `INVALID_CREDENTIALS`, 403 `ACCOUNT_SUSPENDED` |
| POST | `/auth/refresh` | public | `{ refresh_token }` | 200 AuthResponse (new pair) | 401 `INVALID_REFRESH_TOKEN`, 403 `ACCOUNT_SUSPENDED` |
| POST | `/auth/logout` | public | `{ refresh_token }` | 204 | none (always 204) |
| POST | `/auth/logout-all` | any role | none | 204 | 401 |
| GET | `/auth/me` | any role | none | 200 AuthUser | 401 |
| PATCH | `/users/me` | any role | `{ name?, phone? }` | 200 AuthUser | 400 |
| GET | `/users/me/addresses` | customer | none | 200 `{ data: Address[] }` | |
| POST | `/users/me/addresses` | customer | `{ label, address, phone }` | 201 Address | 400 |
| PATCH | `/users/me/addresses/:id` | customer | partial Address | 200 Address | 404 |
| DELETE | `/users/me/addresses/:id` | customer | none | 204 | 404 |
| POST | `/uploads` | restaurant, admin | multipart, field `file` (jpeg, png, webp, max 5 MB) | 201 `{ url }` | 400 |
| GET | `/health` | public | none | 200 `{ status: "ok" }` | |

Rules
- Registration with role `restaurant` also creates a restaurant for that owner with `isActive: false`, `isOpen: false`, `name` = the user's name and empty profile fields. The owner completes the profile, the admin approves.
- Public registration can never create an admin. The admin account is created by the seed (email and password from env).
- Access token: JWT, 15 minutes, claims `sub` and `role`. Refresh token: random opaque string, 7 days, stored hashed, rotated on every use. Reusing an old refresh token revokes that session.
- A user can have several sessions. Suspending a user revokes all their sessions.
- On every authenticated request the guard checks the account status. A suspended user gets 403 `ACCOUNT_SUSPENDED`.
- Passwords are hashed with bcrypt. Password hashes are never returned.
- Image fields (`image`, `cover`) accept only `http(s)` URLs (max 2048 chars) or null. Base64 `data:` values are rejected. Clients upload through `/uploads` first and store the returned URL.

---

## 5. Public catalog (no login required)

| Method | Path | Query | Success |
|---|---|---|---|
| GET | `/categories` | `page`, `limit` | 200 list of Category (active only) |
| GET | `/restaurants` | `search` (name or cuisine), `cuisine`, `isOpen`, `sort` (`rating`, `deliveryTime`, `deliveryFee`, `name`; default `rating`), `page`, `limit` | 200 list of Restaurant (active only) |
| GET | `/restaurants/:id` | none | 200 Restaurant (404 if inactive) |
| GET | `/restaurants/:id/menu-items` | `category`, `search`, `includeUnavailable`, `page`, `limit` | 200 list of MenuItem |
| GET | `/menu-items` | `search`, `category`, `restaurantId`, `minPrice`, `maxPrice`, `isPopular`, `openOnly`, `includeUnavailable`, `sort` (`rating`, `price_asc`, `price_desc`, `name`; default `rating`), `page`, `limit` | 200 list of MenuItem |
| GET | `/menu-items/:id` | none | 200 MenuItem (works even when `isAvailable` is false) |
| GET | `/restaurants/:id/reviews` | `page`, `limit` | 200 list of Review |
| GET | `/menu-items/:id/reviews` | `page`, `limit` | 200 list of Review |

Rules
- Public lists return only items of **active** restaurants. Meals are returned only when `isAvailable` is true unless `includeUnavailable=true`. `openOnly=true` also requires `isOpen` on the restaurant.
- Public reviews exclude reviews that are hidden or reported. Newest first.

---

## 6. Customer endpoints

| Method | Path | Request | Success | Errors |
|---|---|---|---|---|
| POST | `/orders/quote` | same body as `POST /orders` | 200 `{ subtotal, deliveryFee, serviceFee, tax, discount, tip, total }` | same validation as create |
| POST | `/orders` | see below | 201 Order | 400 (`ITEM_UNAVAILABLE`, `RESTAURANT_UNAVAILABLE`, `MIN_ORDER_NOT_MET`, `INVALID_PROMO_CODE`, `VALIDATION_ERROR`) |
| GET | `/orders` | query: `status`, `search`, `from`, `to`, `page`, `limit` | 200 list of Order (own, newest first) | |
| GET | `/orders/:id` | none | 200 Order | 404 if not the customer's |
| POST | `/orders/:id/cancel` | `{ reason? }` | 200 Order | 409 `ORDER_NOT_CANCELLABLE` |
| POST | `/reviews` | `{ orderId, menuItemId, rating, comment? }` | 201 Review | 400 `REVIEW_NOT_ELIGIBLE`, 409 `REVIEW_ALREADY_EXISTS` |
| GET | `/menu-items/:id/reviews/mine` | none | 200 Review | 404 if the customer has no review for this meal |

Create-order body

```json
{
  "restaurantId": "string",
  "items": [{ "menuItemId": "string", "quantity": 2 }],
  "deliveryAddress": "string",
  "phone": "string",
  "paymentMethod": "cash",
  "notes": "string or null",
  "promoCode": "string or null",
  "tip": 0,
  "scheduledFor": "ISO date or null"
}
```

The server **rejects** (400) any of `customerId`, `customerName`, prices, fees, discount, total or status in this body. The customer identity comes from the token.

---

## 7. Restaurant owner endpoints

All require role `restaurant` and only touch the owner's own restaurant. `restaurantId` always comes from the token, never from the request. Another restaurant's data returns 404.

| Method | Path | Request | Success |
|---|---|---|---|
| GET | `/restaurant/me` | none | 200 Restaurant (includes `isActive`, so the owner can see pending approval) |
| PATCH | `/restaurant/me` | any of `name, cuisine, address, phone, deliveryTimeMinutes, deliveryFee, minOrder, image, cover, openingHours, isOpen` | 200 Restaurant |
| GET | `/restaurant/menu-items` | `search`, `category`, `isAvailable`, `page`, `limit` | 200 list of MenuItem (own, including unavailable) |
| POST | `/restaurant/menu-items` | `name, description, price, category, image?, ingredients, preparationTimeMinutes, nutrition?, isAvailable?, isPopular?` | 201 MenuItem |
| PATCH | `/restaurant/menu-items/:id` | any field from the create body | 200 MenuItem |
| DELETE | `/restaurant/menu-items/:id` | none | 204 (soft delete: `isActive = false`) |
| GET | `/restaurant/orders` | `status`, `search`, `from`, `to`, `page`, `limit` | 200 list of Order |
| GET | `/restaurant/orders/:id` | none | 200 Order |
| PATCH | `/restaurant/orders/:id/status` | `{ status }` (must be the next status) | 200 Order |
| POST | `/restaurant/orders/:id/cancel` | `{ reason }` (required) | 200 Order |
| GET | `/restaurant/reviews` | `reported`, `page`, `limit` | 200 list of Review (own restaurant, including reported) |
| POST | `/restaurant/reviews/:id/report` | `{ reason }` | 200 Review |

Rules
- `category` is the category name. It must match an **active** category, otherwise 400.
- The owner cannot change `isActive`, `ownerId`, `rating`, `reviewsCount`.
- Order status moves one step at a time: `pending` to `preparing` to `ready` to `on_the_way` to `delivered`. Any other value returns 409 `INVALID_STATUS_TRANSITION`.
- Reporting a review sets `isReported = true` and `reportReason`. It is allowed only for reviews on the owner's restaurant.

---

## 8. Admin endpoints

All require role `admin`. The whole controller is protected by one guard.

| Method | Path | Request | Success |
|---|---|---|---|
| GET | `/admin/stats` | none | 200 AdminStats |
| GET | `/admin/users` | `search` (name, email, phone), `role`, `status`, `page`, `limit` | 200 list of AdminUserRow |
| PATCH | `/admin/users/:id/status` | `{ status: "active" or "suspended" }` | 200 AdminUserRow |
| GET | `/admin/restaurants` | `search`, `isActive`, `page`, `limit` | 200 list of AdminRestaurantRow |
| PATCH | `/admin/restaurants/:id/status` | `{ isActive: boolean }` | 200 AdminRestaurantRow |
| GET | `/admin/orders` | `search`, `status`, `restaurantId`, `from`, `to`, `page`, `limit` | 200 list of AdminOrderRow |
| GET | `/admin/orders/:id` | none | 200 AdminOrderRow |
| POST | `/admin/orders/:id/cancel` | `{ reason }` (required) | 200 Order |
| GET | `/admin/reviews` | `reported`, `isHidden`, `page`, `limit` | 200 list of AdminReviewRow |
| POST | `/admin/reviews/:id/hide` | none | 200 AdminReviewRow |
| POST | `/admin/reviews/:id/dismiss-report` | none | 200 AdminReviewRow |
| GET | `/admin/menu-items` | `search`, `restaurantId`, `isAvailable`, `page`, `limit` | 200 list of AdminMealRow |
| PATCH | `/admin/menu-items/:id/availability` | `{ isAvailable: boolean }` | 200 AdminMealRow |
| GET | `/admin/categories` | `page`, `limit` | 200 list of Category (including inactive) |
| POST | `/admin/categories` | `{ name, isActive? }` | 201 Category (409 `CATEGORY_NAME_TAKEN`) |
| PATCH | `/admin/categories/:id` | `{ name?, isActive? }` | 200 Category |

Rules
- The admin cannot suspend admin accounts, including their own. Suspending a user revokes all their sessions.
- Admin order **cancel** and review **hide** replace the frontend's current delete buttons. Orders and reviews are never destroyed, because totals, ratings and history depend on them.
- Admin does not edit meal content, only availability. Meal content belongs to the restaurant owner.
- Categories are not deleted, only deactivated.
- The admin Overview page uses `GET /admin/stats` plus `GET /admin/orders?limit=8` for the recent-orders table (rows already include `restaurantName`).

---

## 9. Business rules

### 9.1 Order totals (server-side only)

- `unitPrice` comes from the database. Totals are never read from the client.
- `subtotal` = sum of `unitPrice * quantity`
- `deliveryFee` = the restaurant's `deliveryFee`
- `serviceFee` = 5% of `subtotal`
- `tax` = 10% of `subtotal`
- `discount` and `deliveryFee` are adjusted by the promo code (below)
- `tip` is a number of 0 or more
- `total` = `subtotal + deliveryFee + serviceFee + tax - discount + tip`
- Each computed amount is rounded to 2 decimals

Promo codes (case-insensitive, one per order): `WELCOME10` gives `discount` = 10% of `subtotal`. `FREESHIP` sets the order `deliveryFee` to 0. Any other code returns 400 `INVALID_PROMO_CODE`.

A cart with several restaurants becomes several independent orders (the frontend already splits it). The promo code and the tip apply to **each** order separately, so `FREESHIP` removes the delivery fee on every order. The frontend shows a short note about this at checkout.

### 9.2 Order creation checks

- The restaurant must be `isActive` and `isOpen`.
- Every meal must belong to that restaurant, be active, and be `isAvailable`.
- `subtotal` must be at least the restaurant's `minOrder`.
- 1 to 50 lines, each `quantity` an integer from 1 to 99, no duplicate `menuItemId`.
- `scheduledFor`, if given, must be in the future.
- `estimatedDeliveryAt` = (`scheduledFor` or now) + the restaurant's `deliveryTimeMinutes`.
- The new order starts as `pending` with one `statusHistory` entry.

### 9.3 Order status and cancellation

| Actor | Allowed |
|---|---|
| Restaurant owner | Move one step forward; cancel when `pending` or `preparing` (reason required) |
| Customer | Cancel own order when `pending` or `preparing` (reason optional) |
| Admin | Cancel any order that is not `delivered` or `cancelled` (reason required) |

`delivered` and `cancelled` are final. Every change adds a `statusHistory` entry. A cancellation sets `cancelledBy` and `cancellationReason`.

### 9.4 Payment (cash only is real)

- `cash`: `paymentStatus` is `pending` and becomes `paid` automatically when the order becomes `delivered`. Customers cannot set it.
- `card`: simulated like the current frontend. `paymentStatus` is `simulated`, no gateway, no refunds. A real card flow is attempted last, only if time remains.

### 9.5 Reviews and ratings

- Eligibility: the order belongs to the customer, is `delivered`, and contains the meal. One review per customer per meal.
- `rating` is an integer 1 to 5. `comment` is trimmed, empty becomes null, maximum length is an open point (see section 13).
- Ratings are computed from stored counters `ratingSum` and `ratingCount` on the meal and on the restaurant. Only the reviews module changes them (`$inc`, atomic). The API returns `rating` = sum / count (1 decimal, 0 when none) and `reviewsCount` = count.
- Counters include all reviews that are not hidden.
- A reported review disappears from public lists until the admin acts. Admin `dismiss-report` clears `isReported` and `reportReason`. Admin `hide` sets `isHidden`, removes the review from public lists and counters.
- A reconcile script recomputes all counters from the reviews collection.

### 9.6 Stats definitions

- `totalOrders`: all orders. `ordersByStatus`: counts by status.
- `totalRevenue`: sum of `total` of `delivered` orders only.
- `last14Days`: the 14 days ending today (UTC), by `createdAt`. `orders` counts all orders created that day. `revenue` sums `delivered` orders only.
- `topRestaurants`: top 5 by delivered revenue. `orders` counts delivered orders.
- `activeRestaurants`: restaurants with `isActive = true`. `reportedReviews`: reviews with `isReported = true` and not hidden.

---

## 10. Seed

The seed script reads the frontend fixtures in `frontend/public/mock/` (categories, restaurants, menu items, users, orders, reviews).
- Numeric fixture IDs are mapped to new ObjectIds (the mapping is kept inside the script).
- Counters (`ratingSum`, `ratingCount`) are computed from the seeded reviews, not copied from fixture numbers.
- Dates of seeded orders and reviews are shifted so the newest order is dated yesterday. Without this the 14-day stats chart would be empty.
- The admin account is created from `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Fixture passwords are used for development only.

---

## 11. Environment variables

`PORT`, `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL` (15m), `REFRESH_TTL_DAYS` (7), `FRONTEND_URL` (CORS origin), `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.

---

## 12. Expected frontend impact (to be verified against the code)

1. All `id`, `*Id` fields and route params change from `number` to `string`.
2. Real HTTP client with a token interceptor (refresh once on 401 `TOKEN_EXPIRED`), replacing `shared/api/auth.ts` and the localStorage services.
3. Remove the demo credentials shown on the login page.
4. Checkout sends the slim create-order body. Client-side totals remain only as a preview, and the server's totals are displayed after creation (optionally use `/orders/quote`).
5. `paymentStatus` gains `paid`. Remove `simulatedTracking`.
6. Admin: delete order becomes cancel (with reason), delete review becomes hide or dismiss report.
7. Owner dashboard: meal create, edit and delete use the API. Image upload goes through `/uploads` and stores the URL (no data URLs).
8. Remove the localStorage override keys (`crown-anchor-admin-state`, `crown-anchor-menu-item-availability`, `crown-anchor-restaurant-meal-overrides`, `crown-anchor-restaurant-profile-overrides`, `crown-anchor-orders`, `crown-anchor-reviews`, `crown-anchor-addresses`).
9. Restaurant owners need a visible "pending approval" state while `isActive` is false.
10. Keep the card option visible in checkout (simulated, see 9.4).
11. `/checkout`, `/orders`, `/orders/:id` should be customer-only in the router. The API already enforces roles.
12. The meal editor uses a category picker filled from `GET /categories` instead of free text.
13. The register form requires at least 8 characters for the password. The login form has no minimum.
14. Owners see a "pending approval" banner when `restaurant.isActive` is false. Nothing shows this today, so a pending restaurant looks like a normal one.
15. The cart storage key `crown-anchor-cart` holds numeric IDs. Add a storage version number: when it changes, clear the old keys. This also avoids the stale-data conflicts seen in checkout.
16. The order number shown to users is the last 6 characters of the id (uppercase).
17. A cart with several restaurants becomes several independent orders. The promo code and the tip apply to each order, so show a short note at checkout (see 9.1).
18. List pages pass `limit` (8) and `sort` explicitly. The default sort for meals in the API is `rating`, which differs from the current fixture order.
19. Admin user actions use the user `id` instead of the email, and the `source` field is removed. Call `/auth/me` at app start (P2).
20. Admin stats come only from `GET /admin/stats`. Remove the client-side stats computation and the dead restaurant-stats code.
21. Add translation entries for the new error codes and the `paid` status in `LanguageContext.tsx`.

---

## 13. Open points (answered at the end of this section)

1. Maximum review comment length used by the frontend.
2. Minimum password length the register form enforces (contract says 8).
3. Does checkout enforce `minOrder` today? What does `search` match in the orders list (id, restaurant name, items)?
4. Default sort and page sizes the frontend expects on the restaurants and meals pages.
5. Does the frontend need the `isOpen` toggle for owners (the contract allows it)?
6. Does anything rely on `restaurantId` being present on the user object other than the owner dashboard?
7. Review counters: reported reviews still count toward ratings until hidden. Confirm this is acceptable.

### Answers (frontend checked on 2026-11-20)

1. Review comment: 500 characters (`maxLength={500}` in the frontend). Adopted, see Field limits.
2. Password: the frontend used 6. Decision: 8 on register (change the register schema), no minimum check on login.
3. `minOrder` is enforced client-side today, and the server enforces it too. Search semantics are now defined in section 1.
4. Sort and page size are client-side today (8 per page). The frontend passes `limit` and `sort` explicitly, see section 12 item 18.
5. The `isOpen` toggle is not used by the UI today. The API allows it, and the UI toggle is P2.
6. Nothing in the frontend depends on `restaurantId` on the user object. Owner lookups use `GET /restaurant/me`.
7. Accepted. The frontend keeps hiding reported reviews from public lists, while the server keeps them in the counters until the admin hides them.
