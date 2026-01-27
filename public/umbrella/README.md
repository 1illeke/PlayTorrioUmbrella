# Umbrella UI

Umbrella is an optional, switchable UI layer for PlayTorrio. It is a **presentation layer** plus a thin integration layer. All backend logic and functionality stay in the main app.

## Structure

- **`components/`** – Header, SearchBar, Hero, Grid (reusable UI bits)
- **`layouts/`** – AppShell (Header + MainContent + GlobalModals)
- **`modals/`** – Unified watch modal (streaming + downloader)
- **`navigation/`** – Hamburger menu and routing behavior
- **`pages/`** – Home (hero + grid), Settings
- **`styles/`** – Base styles
- **`themes/`** – Design tokens (glass, accent, Montserrat, spacing)
- **`services/`** – API adapter (TMDB trending/search)
- **`hooks/`** – Placeholder for navigation/routing hooks
- **`types/`** – Placeholder for shared types
- **`assets/`** – Static assets
- **`index.html`** – Entry point
- **`app.js`** – Mounts shell, header, tabs, search, hero, grid; wires tabs/search and view switching

## Integration

Umbrella does **not** duplicate business logic. It:

- Loads `../js/config.js`, `../js/servers.js`, `../js/downloader.js` for API base URL, TMDB key, streaming URLs, and downloader flows.
- Uses the same localStorage keys (`uiMode`, `appTheme`, `selectedServer`, etc.).
- For Live TV, IPTV, Books, Music, etc., the hamburger sends the user to the main app with the right hash (`../index.html#/livetv` etc.) after setting `uiMode` to `new`.

## Switching to Umbrella

From the main app (Basic UI), open **Settings** and use **Switch to Umbrella UI**. That sets `localStorage.uiMode = 'umbrella'` and redirects to `umbrella/index.html`. A bootstrap script at the top of `public/index.html` redirects to `umbrella/index.html` when `uiMode === 'umbrella'`.

To leave Umbrella, use **Settings → Switch to Basic UI** (or hamburger → Live TV / Books / etc., which switches to Basic and navigates).

## Design

- **Visual:** Translucent glass, soft fades, depth via blur, no hard borders.
- **Colors:** Dark base, one primary accent (e.g. iOS-style blue). Tokens in `themes/tokens.css`.
- **Typography:** Montserrat (Display Bold, Body Regular, UI Medium). Max 2–3 weights.

## Removal

The Umbrella UI lives under `public/umbrella/`. To remove it:

1. Delete `public/umbrella/`.
2. Remove the bootstrap redirect and “Switch to Umbrella UI” from `public/index.html`.
3. Remove the `window.umbrellaGetServerNames` export from `public/js/servers.js` if nothing else uses it.
4. Remove the `window.themes` export from `public/js/config.js` if nothing else uses it.

The rest of the app continues to work without Umbrella.
