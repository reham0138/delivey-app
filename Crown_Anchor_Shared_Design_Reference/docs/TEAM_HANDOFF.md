# Team Handoff — Shared Rules for Both Projects

## Shared agreements
All contributors follow the same brand palette, typography, spacing, component states, RTL/LTR rules, accessibility expectations, and React/TypeScript naming conventions. Do not force identical page structures or business logic across different products.

## Communication
- Discuss shared component/type changes before implementation.
- Notify the team when changing a public component API or domain type.
- Keep pull requests focused and describe affected pages/components.
- Request peer review for shared code and cross-feature changes.

## Git workflow
Suggested branches: `main` for stable releases, `develop` for integration if used, and `feature/<short-name>` for feature work. Use Conventional Commits such as `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, and `chore:`. Follow the workflow already established in each repository if it differs.

## Definition of Done
- Feature works for the intended user role.
- Loading, error, empty, disabled, and success states are considered.
- Arabic RTL and English LTR are checked where relevant.
- Keyboard focus and form labels are usable.
- TypeScript checks pass.
- Repository lint and build commands pass.
- Shared changes are reviewed.
- No credentials or secrets are committed.

## Before parallel work
1. Confirm the repository structure and dependencies.
2. Confirm Tailwind version before applying version-specific configuration.
3. Agree on shared component props and domain types.
4. Agree on page ownership and avoid simultaneous edits to the same shared files.
5. Use mock data behind services/interfaces rather than scattering it across UI components.

## Future shared UI package
A shared component package is optional, not required now. Consider it only when both projects are stable and there is a clear versioning, dependency, testing, and release strategy.
