# Frontend Conventions — React + TypeScript

## Naming
- React components/files: PascalCase, e.g. `ProductCard.tsx`.
- Hooks: camelCase with `use` prefix, e.g. `useBranch.ts`.
- Utilities/services: camelCase, e.g. `formatPrice.ts`, `branchService.ts`.
- Use descriptive TypeScript types such as `Product`, `Branch`, and `Order`.

## Component design
- Prefer function components and typed props.
- Keep components focused on one responsibility.
- Separate business logic/data access from presentational UI.
- Avoid unnecessary prop drilling and duplicate sources of truth.
- Do not create abstractions solely to avoid trivial duplication.

## State and data
- Distinguish local UI state, global client state, and server state.
- Keep API access behind endpoint/service modules.
- Model loading, error, and empty states explicitly.
- Do not treat mock data as authoritative for prices, permissions, or inventory.

## Styling
- Use the shared brand tokens.
- Follow each repository's existing styling approach consistently.
- Confirm Tailwind version before using version-specific syntax.
- Prefer CSS logical properties for RTL/LTR.
- Avoid arbitrary colors and spacing when a shared token exists.

## Quality
- Keep TypeScript strictness enabled where supported.
- Avoid `any`; use `unknown` and narrow types where appropriate.
- Use accessible semantic HTML.
- Run lint, type-check, and build scripts before merging.
