# The Crown & Anchor — Shared Design System

## Purpose
Maintain one recognizable visual identity across both projects while allowing each product to serve its own users and workflows.

## Brand identity
- Brand: The Crown & Anchor
- Tagline: MORE THAN JUST A STORE
- Direction: modern, premium, simple, elegant, trustworthy
- English font: Inter; Arabic font: Cairo
- Icons: lucide-react, outline style preferred

## Color palette
| Token | Hex | Use |
|---|---|---|
| Brand Red | `#E63946` | Primary brand color, navigation accents, and primary actions |
| Brand Red Hover | `#C92F3B` | Hover state for primary red actions |
| Brand Yellow | `#FFC857` | Restrained accents, highlights, and selected states |
| Surface Cream | `#FFF8EF` | Main page background |
| Text Slate | `#78716C` | Secondary text and metadata |
| Main Text | `#292524` | Body text and primary content |
| Surface White | `#FFFFFF` | Cards and elevated surfaces |
| Subtle Border | `#E7E5E4` | Dividers, outlines, and component borders |

Use yellow as an accent, not default body text. Check contrast. Avoid excessive gradients and heavy shadows.

## Typography
Use Inter for English and Cairo for Arabic. Suggested sizes: page title 32–40px desktop / 28–32px mobile; section title 24–28px; card title 18–20px; body 16px; helper text 13–14px.

## Spacing and surfaces
Use a 4px base scale: 4, 8, 12, 16, 24, 32, 48, 64px. Recommended radius: 8px for small controls, 8–12px for cards/inputs, up to 16px for large feature surfaces. Prefer subtle borders, restrained shadows, and whitespace.

## Buttons and forms
- Primary: brand red background, white text.
- Secondary: white/cream background, main text, subtle border.
- Outline: transparent/white background, brand red border and text.
- Define hover, focus-visible, disabled, and loading states.
- Inputs need labels, visible focus, and clear validation messages.

## Cards, tables, and dialogs
Use consistent radius, border, padding, and surface treatment. Tables need clear headers and responsive overflow behavior. Dialogs need accessible titles, keyboard support, and predictable close behavior. Provide loading, empty, error, and success states.

## Arabic and English
English is LTR; Arabic is RTL. Prefer logical CSS properties such as `margin-inline`, `padding-inline`, `inset-inline-start`, `border-inline`, and `text-align: start`. Mirror directional icons when appropriate, but never mirror the logo or non-directional icons. Test mixed-language content and numbers.

## Responsive and accessible design
Test desktop, tablet, and mobile. Use semantic HTML, keyboard-operable controls, visible focus, accessible names for icon-only buttons, sufficient contrast, and reduced-motion support. Do not communicate status by color alone.

## Shared vs. project-specific
Share palette, typography, spacing, buttons, inputs, modals, accessibility, RTL/LTR, and icon style. Keep page structures, workflows, entities, and domain-specific components separate. A meal card and product card can share visual principles without being the same component.
