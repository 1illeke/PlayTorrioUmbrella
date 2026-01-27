---
name: umbrella-design-system
description: Applies the Umbrella design language for premium UI and design systems. Use when building UI components, layouts, or design system guidance, especially for Umbrella UI, design systems, or component libraries.
---

# Umbrella Design System

## Quick Start

Follow these rules for any UI or component work:

- **Design language**: Translucent glass, no hard borders, minimal color palette, Montserrat typography.
- **Component shape**: Small, reusable components; avoid deep nesting.
- **Layout**: Prefer explicit layout components (`AppShell`, `Header`, `Grid`, `Modal`).
- **Restraint**: Avoid over-styling, visual clutter, and unnecessary animations.
- **Spec fidelity**: Do not add extra controls not in the spec.

## Component Guidelines

- Keep components focused with a single responsibility.
- Use composition over inheritance.
- Favor flat component trees; split large components into smaller ones.
- Prefer subtle gradients, soft shadows, and translucent surfaces instead of borders.
- Use a minimal, consistent color palette; avoid bright accents unless required.

## Do / Don't

**Do**
- Use glass-like translucency for panels and overlays.
- Use Montserrat for all UI typography.
- Keep spacing and sizing consistent and minimal.
- Use `AppShell`, `Header`, `Grid`, and `Modal` for layout structure.

**Don't**
- Add visual clutter or decorative UI.
- Add unnecessary animations or motion effects.
- Add extra UI controls not in the spec.
- Use hard borders or heavy outlines.

## Examples

**Example: panel styling**
- Prefer: translucent background, soft shadow, no border.
- Avoid: thick borders, high-contrast fills.

**Example: layout composition**
- Prefer: `AppShell` → `Header` + `Grid` + `Modal`.
- Avoid: deeply nested wrappers and layout divs.
