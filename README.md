# THIS IS NOT OFFICIAL PLAYTORRIO
## PlayTorrio - All-in-One Media Center

![Platform Support](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![Version](https://img.shields.io/badge/version-v2.6.9--umbrella0.1-green)

## Get original PlayTorrio with the latest updates here
https://github.com/ayman708-UX/PlayTorrio


# Umbrella UI

Umbrella is an optional, switchable UI layer for PlayTorrio. It is a **presentation layer** plus a thin integration layer. All backend logic is borrowed from the main app. 

## Umbrella features (not in the original)

- **Design overhaul** — New layout with App Shell, custom draggable title bar (minimize / maximize / close), liquid-glass styling, design tokens (spacing, radius, typography), and Montserrat font. No duplication of business logic; same backend and APIs.
- **Content language (TMDB)** — In **Settings → Content language (TMDB)** you can choose the language used for titles, descriptions, and episode metadata. Trending, search, TV details, and seasons all use this language via the API adapter; a server route `/api/umbrella/tmdb/languages` provides the language list.
- **Watch modal** — One modal for both movies and TV: hero backdrop, meta (year, rating, genres, runtime/seasons), overview, streaming server dropdown, **Play** (in-modal iframe), and for TV a season selector plus episode list with per-episode **Play** and download hints. Optional download block (toggle in Settings).
- **Home experience** — Hero + grid on home; **Movies** / **TV Shows** tabs; trending by category and debounced search; clicking a title opens the watch modal.
- **Umbrella Settings** — **Switch to Basic UI**, **Show download option** (watch modal), and **Content language (TMDB)**. Back to home from Settings without leaving Umbrella.
- **Navigation** — Header with Movies/TV tabs, integrated search bar, and hamburger menu (Settings, Clear Cache, Refresh). Links to Live TV, Books, etc. send you to Basic UI for those sections.
- **Electron** — Custom title bar and preference to open directly in Umbrella UI when you last chose it.

## Switching to Umbrella

From the main app, open **Settings**, **User Interface** and use **Switch to Umbrella UI**.

To leave Umbrella, use **Settings → Switch to Basic UI**.

## Reason

I was bored and I didnt like the cluttered design. Sorry Ayman.


## Removal

You need to download the official PlayTorrio and install it again. 



**Made with ❤️ by Ayman**

**Umbrella UI made with boredom by Lilleke**

[Download Latest Official PlayTorrio](https://github.com/ayman708-UX/PlayTorrio/releases) | [Join Discord](https://discord.com/invite/bbkVHRHnRk)
