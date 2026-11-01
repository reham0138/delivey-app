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
| Navy | `#0B2D4A` |
| Gold | `#D4AF37` |
| Cream | `#F8F7F4` |
| Slate | `#64748B` |
| Main text | `#1F2937` |
| White | `#FFFFFF` |

Typography: Inter for English and Cairo for Arabic. The reference-pack tagline is **MORE THAN JUST A STORE**; individual products may use product-specific wording.

## Applying these references

Share brand identity, accessibility, naming, and collaboration practices without forcing different products to use identical page trees or domain-specific components. Check the target repository's actual dependencies and Tailwind version before applying code or configuration examples.

For this repository's install and run instructions, see the [root README](../README.md) and [frontend README](../frontend/README.md).
