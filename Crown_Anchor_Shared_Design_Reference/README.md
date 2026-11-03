# The Crown & Anchor — Shared Design Reference

This folder is a documentation and asset pack for the delivery frontend and related Crown & Anchor projects. It is **not** an installable package, application, or shared component library.

## Start here

- [Design system](./docs/DESIGN_SYSTEM.md) — brand, color, typography, spacing, RTL/LTR, and accessibility
- [Component guidelines](./docs/COMPONENT_GUIDELINES.md) — shared UI principles and domain-specific boundaries
- [Project structure](./docs/PROJECT_STRUCTURE.md) — recommended structure for the different projects
- [Team handoff](./docs/TEAM_HANDOFF.md) — collaboration, Git, and definition of done
- [Frontend conventions](./shared-conventions/FRONTEND_CONVENTIONS.md) — React and TypeScript conventions
- [Design tokens](./design-reference/tokens/design-tokens.json) — machine-readable brand values
- [Logo assets](./logo/) and [social assets](./social/)

## Shared brand values

| Token | Value |
|---|---|
| Brand red | `#E63946` |
| Brand red hover | `#C92F3B` |
| Brand yellow | `#FFC857` |
| Surface cream | `#FFF8EF` |
| Text slate | `#78716C` |
| Main text | `#292524` |
| Surface white | `#FFFFFF` |
| Subtle border | `#E7E5E4` |

Typography: Inter for English and Cairo for Arabic. The reference-pack tagline is **MORE THAN JUST A STORE**; individual products may use product-specific wording.

## Applying these references

Share brand identity, accessibility, naming, and collaboration practices without forcing different products to use identical page trees or domain-specific components. Check the target repository's actual dependencies and Tailwind version before applying code or configuration examples.

For this repository's install and run instructions, see the [root README](../README.md) and [frontend README](../frontend/README.md).
