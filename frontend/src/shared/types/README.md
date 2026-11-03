# Shared TypeScript Types

This folder is the single shared source of truth for the delivery app's domain types. Import types from this folder; use the relative path appropriate to the file you're editing.

## Importing

~~~ts
import type {
  User,
  CustomerUser,
  RestaurantOwnerUser,
  Restaurant,
  MenuItem,
  Category,
  Order,
  OrderItem,
  OrderStatus,
  Review,
  Stats,
  RestaurantStats,
} from "../shared/types";
~~~

Adjust the relative path based on the importing file. Do not redefine these interfaces inside pages, components, hooks, or services. If the team agrees on a new domain field, update the shared type here and keep the mock/API contract aligned.

## Types included

| Type | Represents |
|---|---|
| User | Discriminated union of admin, restaurant owner, and customer users |
| Restaurant | Restaurant profile, availability, delivery settings, and owner reference |
| MenuItem | Menu item, nullable image, nullable nutrition data, and availability |
| Category | Menu category and its active/item-count fields |
| Order | Order, item price snapshots, payment, status history, and cancellation fields |
| Review | Customer review and moderation/reporting fields |
| Stats | Admin analytics and per-restaurant analytics |
| OrderStatus | All six statuses in the mock data, including on_the_way |

## Important compatibility notes

- These types match the current JSON fixtures in public/mock. They do not validate JSON at runtime.
- JSON timestamps are represented as string (ISO 8601), not JavaScript Date.
- IDs, quantities, ratings, counts, prices, and nutrition values are represented as number.
- MenuItem.image, MenuItem.nutrition, Order.notes, review comments/update timestamps, and cancellation fields can be null in the fixtures. Keep null handling in consuming code.
- User is a discriminated union: narrow by user.role before accessing role-specific fields such as restaurantId or address.
- OrderItem.unitPrice is the price snapshot saved on the order. It can differ from the menu item's current price.
- OrdersByStatus is a partial record because status keys with zero orders may be absent; an empty object is valid.
- Stats.restaurants uses string keys because JSON object keys are strings, even when they represent numeric restaurant IDs.
- mockPassword exists only in the demo fixture. It is optional in the shared type for compatibility with real API users and must never be used as a real password or exposed in production authentication flows.
- These interfaces describe the data shape, not business-rule validation. They do not guarantee referenced IDs exist or that order totals add up.

## Mock data endpoints

Static fixtures are served from the Vite public directory:

| Fixture | URL | Type |
|---|---|---|
| Users | /mock/users.json | UsersData |
| Restaurants | /mock/restaurants.json | RestaurantsData |
| Menu items | /mock/menu-items.json | MenuItemsData |
| Categories | /mock/categories.json | CategoriesData |
| Orders | /mock/orders.json | OrdersData |
| Reviews | /mock/reviews.json | ReviewsData |
| Stats | /mock/stats.json | Stats |

Example:

~~~ts
import type { RestaurantsData } from "../shared/types";

const response = await fetch("/mock/restaurants.json");
const restaurants: RestaurantsData = await response.json();
~~~

The assignment above is a compile-time assertion only. For untrusted API responses, add runtime validation before treating the response as a Restaurant[].

## Updating the contract

1. Check the current mock JSON and agree the data change with the team.
2. Update the matching interface in src/shared/types/index.ts.
3. Update this README if the public contract or usage changes.
4. Run npm run lint and npm run build from frontend/.
