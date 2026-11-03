# Mock data — Crown & Anchor Delivery

Static JSON served from `/mock/*.json`. Use it only until the backend exists.
Everything here is fake. Do not treat it as authoritative for prices, permissions or inventory.

"Now" in this dataset is **2026-11-03 12:35 UTC**. Dates and "live" orders are relative to that moment.

## Files

| File | Rows | What it holds |
|------|------|---------------|
| `users.json` | 21 | 2 admins, 10 restaurant owners, 9 customers |
| `restaurants.json` | 10 | Restaurants, each with `ownerId` |
| `menu-items.json` | 46 | Meals with ingredients, nutrition, `rating`, `reviewsCount`, `isPopular` |
| `categories.json` | 18 | Meal categories for the admin screen |
| `orders.json` | 37 | Orders of all statuses, with `statusHistory` |
| `reviews.json` | 25 | Meal reviews, two of them reported |
| `stats.json` | — | Admin analytics and per-restaurant stats, calculated from the other files |
| `empty.json` | 0 | `[]`, to test empty states |

## Demo accounts (password for all: `Demo@1234`)

| Role | Email | Notes |
|------|-------|-------|
| Admin | `admin@crownanchor.test` | |
| Restaurant | `owner.burgerhub@crownanchor.test` | Restaurant 1, has a pending order |
| Restaurant | `owner.grill@crownanchor.test` | Restaurant 6, has a preparing order |
| Restaurant | `owner.freshstart@crownanchor.test` | Restaurant 9, no menu, no orders, no reviews |
| Customer | `layla@example.com` | 12 orders (pagination), 7 reviews, 1 delivered order not reviewed yet |
| Customer | `sara@example.com` | Arabic name, Arabic address, Arabic notes and reviews (RTL) |
| Customer | `nour@example.com` | Only a pending order, so nothing can be reviewed |
| Customer | `yara@example.com` | No orders, no reviews (empty states) |
| Customer | `tarek@example.com` | **Suspended**, login must be rejected |

`mockPassword` exists only so a fake login can work. Remove it when the real auth API arrives.

## Relations

- `restaurants.ownerId` → `users.id` (role `restaurant`), and that user has `restaurantId`.
- `menu-items.restaurantId` → `restaurants.id`; `menu-items.category` matches `categories.name`.
- `orders.customerId` → `users.id`; `orders.restaurantId` → `restaurants.id`; each `items[].menuItemId` → `menu-items.id` of the same restaurant.
- `reviews.orderId` → a **delivered** order of the same customer that contains the reviewed meal.
- Each customer reviews each meal at most once. A meal's `rating` and `reviewsCount` are computed from `reviews.json`.
- Order money: `subtotal = Σ quantity × unitPrice`, `total = subtotal + deliveryFee`, `deliveryFee` equals the restaurant's fee, and `subtotal ≥ restaurant.minOrder`.

## Order statuses

`pending → preparing → ready → on_the_way → delivered`, or `cancelled` from the start.

`on_the_way` is not in `Badge.tsx` yet (it only has pending, preparing, ready, delivered, cancelled), so add it there.
Cancelled orders carry `cancelledBy` (`customer`, `restaurant` or `admin`) and `cancellationReason`.

## Scenarios covered

**Customer**
- Browse: 10 restaurants, one closed (4), one new with no menu (9), one suspended and hidden from the public list (10, `isActive: false`).
- Meals: one unavailable (25 and 46), one without image (44), one with a very long name (43), one in Arabic (45), 27 meals without reviews, `nutrition: null` on 20, 38, 43.
- Cart and checkout: minimum order per restaurant, different delivery fees, cash and card.
- Orders: every status, 12 orders for one customer (pagination), order 1029 contains item 25 which is unavailable today, order 1013 has item 3 at 7.5 while the menu says 8.0 (price snapshot).
- Reviews: write only for delivered orders (e.g. order 1010), one review per meal, an edited review (id 2), reviews without comment, a 1-star review.

**Restaurant owner**
- Incoming orders in every active status, cancelled orders, history.
- A restaurant with no orders, no menu and no reviews (9).
- Reviews on own meals, including a reported one.

**Admin**
- Users in all roles, two suspended (customer 21 and owner 12).
- All orders across restaurants, including admin-cancelled order 1037.
- Review moderation: reviews 10 and 18 are reported.
- Categories: an empty, inactive one (`Seasonal`).
- Analytics: `stats.json` (`admin`, and `restaurants["<id>"]`).

## Not covered by static files

- **Loading and error states**: throttle the network in DevTools, or request a missing file such as `/mock/not-found.json`.
- **Pagination meta**: the files are plain arrays, so slice them on the client until the API returns `{ data, meta }`.
- **Writes** (placing an order, changing a status, deleting a review): keep them in React state or `localStorage` for now.
