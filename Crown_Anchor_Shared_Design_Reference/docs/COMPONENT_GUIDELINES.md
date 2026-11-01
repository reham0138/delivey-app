# Component Guidelines — Shared UI, Separate Domain Components

## Shared UI primitives
These can follow the same design and behavior rules in both projects:
- `Button`: primary, secondary, outline, ghost, danger; loading and disabled states.
- `Input` and `Select`: labels, hints, errors, required and disabled states.
- `Modal` / `Dialog`: accessible title, keyboard behavior, close handling.
- `Card`: consistent surface, border, radius, and spacing.
- `Badge`: status/category labels.
- `Spinner` / `Skeleton`: loading feedback.
- `EmptyState`: helpful message and next action.
- `Rating`: star display with accessible text, if ratings exist.
- `ProtectedRoute` / `RoleRoute`: route access control.

## Meals-specific components
Keep `MealCard`, `MealFilters`, `ReviewList`, `ReviewForm`, and restaurant-specific order/dashboard components in the meals project.

## E-commerce-specific components
Keep `ProductCard`, `ProductFilters`, `BranchSelector`, `InventoryStatus`, `WishlistButton`, and branch-aware cart/checkout components in The Crown & Anchor project.

## Interaction rules
- Every visible control must have a clear action.
- Define hover, focus-visible, disabled, loading, error, and success states.
- Use semantic HTML and typed props.
- Give icon-only controls accessible names.
- Do not rely on color alone to communicate status.

## Naming and organization
Use PascalCase for React component files/components and camelCase for variables/functions. Keep page-only components near their page. Move components to `shared/` only when reused or genuinely cross-feature. Prefer small, explicit props and avoid unnecessary abstractions or `any`.

## Cross-project code sharing
Initially, maintain consistency by following this guide in both repositories. A shared UI package is optional and should be considered only with an agreed dependency, versioning, testing, and release strategy. Avoid uncontrolled copy-paste between repositories.
