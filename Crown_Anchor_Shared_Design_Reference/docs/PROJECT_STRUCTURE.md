# Project Structure — Shared Principles and Separate Domain Trees

## Guiding rule
Both projects follow the same architectural principles: route-level pages, reusable UI, API modules, services, contexts/state, hooks, types, and utilities. Their page trees and feature components must reflect their own domain.

## Meals / restaurant project
```text
src/
├── main.tsx
├── App.tsx
├── pages/
│   ├── routes.tsx
│   ├── home/
│   ├── auth/
│   ├── meals/
│   ├── cart/
│   ├── checkout/
│   ├── orders/
│   ├── profile/
│   ├── dashboard/
│   │   ├── customer/
│   │   ├── restaurant/
│   │   └── admin/
│   └── not-found/
└── shared/
    ├── layouts/
    ├── components/
    ├── api/
    ├── services/
    ├── contexts/
    ├── hooks/
    ├── types/
    └── utils/
```

## The Crown & Anchor e-commerce project
```text
src/
├── main.tsx
├── App.tsx
├── pages/
│   ├── routes.tsx
│   ├── home/
│   ├── auth/
│   ├── products/
│   ├── categories/
│   ├── search/
│   ├── cart/
│   ├── checkout/
│   ├── orders/
│   ├── profile/
│   ├── wishlist/
│   ├── branches/
│   ├── dashboard/
│   │   ├── customer/
│   │   ├── branch-manager/
│   │   └── admin/
│   └── not-found/
└── shared/
    ├── layouts/
    ├── components/
    ├── api/
    │   └── endpoints/
    ├── services/
    ├── contexts/
    ├── hooks/
    ├── types/
    ├── utils/
    └── constants/
```

## Folder responsibilities
- `pages/`: route-level screens and page-only components.
- `shared/layouts/`: reusable application layouts.
- `shared/components/`: genuinely reusable UI primitives.
- `shared/api/`: API client, query client, endpoint modules.
- `shared/services/`: business logic and data orchestration.
- `shared/contexts/`: app-wide contexts where appropriate.
- `shared/hooks/`: reusable React hooks.
- `shared/types/`: TypeScript domain types.
- `shared/utils/`: formatting, validation, pure helpers.
- `shared/constants/`: stable values such as roles and route names.

## Domain boundaries
Meals examples: `MealCard`, `MealFilters`, `ReviewList`, `RestaurantDashboard`.
E-commerce examples: `ProductCard`, `ProductFilters`, `BranchSelector`, `InventoryStatus`, `BranchManagerDashboard`.

Do not rename one domain's components to imitate the other. Share only components whose behavior and API are genuinely common. Treat these trees as recommendations; do not restructure a working repository blindly or create many empty files in advance.
