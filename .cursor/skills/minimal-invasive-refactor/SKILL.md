---
name: minimal-invasive-refactor
description: Enforces minimal-invasive refactoring: reuse existing APIs and stores, avoid duplicating business logic, wrap instead of rewrite, and flag dead code without removing it. Use when making any code change, refactors, cleanups, or restructuring where stability and safety are prioritized.
---

# Minimal-Invasive Refactor

## Principles
- Stability over elegance.
- Safety over completeness.
- Reuse existing working APIs, stores, and flows.
- Never duplicate business logic; wrap or adapt existing functions instead.
- Identify dead or unused code; do not remove unless explicitly approved.
- Touch as few files as possible; avoid broad rewrites.

## Workflow
1. Locate the existing API/store/flow that already works.
2. If change is needed, add a thin wrapper or adapter around existing functions.
3. If logic appears duplicated, consolidate by calling the existing logic.
4. Note dead/unused code as a finding; keep it in place.

## Examples
**Refactor request**
Input: "Refactor this module to be cleaner."
Output guidance: "Reuse the existing store and API calls; wrap functions rather than rewrite. Call shared logic instead of duplicating it. Flag any dead code but do not remove it."
