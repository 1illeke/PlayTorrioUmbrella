---
name: umbrella-architecture
description: Enforces UI architecture guardrails focused on Umbrella as a modular layer. Use for any code changes in this repo, especially UI architecture, refactors, or decisions involving Umbrella or Basic UI.
---

# Umbrella Architecture

## Instructions

- Prioritize separation of concerns in design and implementation.
- Design Umbrella as a clean, modular UI layer.
- Avoid cross-importing from Basic UI into Umbrella.
- Prefer composition over inheritance.
- Ensure Umbrella can be deleted without breaking the app.

## When Unsure

- Ask clarifying questions before implementing.
- Propose multiple options with trade-offs.
