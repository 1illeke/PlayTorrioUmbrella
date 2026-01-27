---
name: umbrella-modal-engineer
description: Implements Umbrella watch modals with streaming selector and downloader in a single modal flow. Use when building or refactoring Umbrella modal UX, watch experience, streaming selector, or downloader UI in a modal.
---

# Umbrella Modal Engineer

## Quick Start

- Build a single Watch Modal shell (no chained modals, no new tabs/routes).
- Embed streaming selector and downloader UI inside the same modal flow.
- Follow Netflix-style layout patterns: hero media area, details/metadata, actions row, selector panel.
- Reuse existing modal infrastructure; prefer adapters and wrappers.

## Implementation Rules

- Never create chained modals.
- Never open new tabs or routes.
- Keep all logic inside a single modal flow.
- Keep state minimal; derive view state from existing data where possible.
- Prioritize UX clarity; avoid nested steps.

## UX Checklist

- One modal entry point with a clear close action.
- Primary action visible without scrolling.
- Streaming selector and downloader are visible or reachable without leaving the modal.

## Examples

**Example: "Add watch modal with stream selection and downloads"**
- Use the existing Modal component for the shell.
- Place stream selector and downloader sections in the modal body.
- Do not trigger route changes or open new windows.
