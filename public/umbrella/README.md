# Umbrella UI

Umbrella is an optional, switchable UI layer for PlayTorrio. It is a **presentation layer** plus a thin integration layer. All backend logic is borrowed from the main app. 


## Integration

Umbrella does **not** duplicate business logic. It:

- Loads `../js/config.js`, `../js/servers.js`, `../js/downloader.js` for API base URL, TMDB key, streaming URLs, and downloader flows.
- Uses the same localStorage keys (`uiMode`, `appTheme`, `selectedServer`, etc.).

## Switching to Umbrella

From the main app, open **Settings**, **User Interface** and use **Switch to Umbrella UI**.

To leave Umbrella, use **Settings → Switch to Basic UI**.

## Reason

I was bored and I didnt like the cluttered design. Sorry Ayman.


## Removal

You need to download the official PlayTorrio and install it again. 