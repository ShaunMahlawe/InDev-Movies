# InDev Movies

Multi-page movie browsing site with Firebase authentication and external movie data integrations.

## Quick Start

This project is a static site. There is no build step.

1. Start a local server from the project root.

```bash
python3 -m http.server 5500
```

2. Open the app in a browser.

```text
http://127.0.0.1:5500/index.html
```

3. Sign in or create an account on the landing page.

Protected pages redirect back to `index.html` until Firebase auth has an active session.

## Main Entry Points

- `index.html`: login and sign-up page
- `Pages/HomePage.html`: authenticated home page
- `Pages/Movie Library Page.html`: library and featured player
- `Pages/Movie Detail.html`: detail view for a selected title
- `Pages/watchlist.html`: saved watchlist

## Important Config Files

- `js/app-config.example.js`: tracked template for local runtime config
- `js/app-config.local.js`: local runtime config loaded by the app and ignored by git
- `js/firebase-core.js`: Firebase initialization that reads from the runtime config
- `js/firebase.js`: sign-up, login, and user profile persistence logic
- `js/auth-guard.js`: guest/protected route redirects and logout handling
- `js/api-config.js`: TMDB runtime configuration loader used before movie data scripts
- `firebase/SETUP.md`: Firebase CLI setup and project provisioning notes

## Current Setup Notes

- The site is already wired to protect app pages with Firebase auth.
- Runtime config is loaded from `js/app-config.local.js` before Firebase and TMDB-dependent scripts run.
- The local config in this workspace currently points to the Firebase project `dv100firebaseclass`.
- Home, Library, Detail, and Watchlist now use TMDB in the browser and no longer call RapidAPI from tracked frontend code.
- `js/app-config.local.js` is ignored by git. Keep project-specific Firebase and TMDB values there.

## Project Structure

```text
css/                  Shared site styles
js/                   Frontend logic
Pages/                Authenticated app pages
firebase/             Firebase CLI helpers and setup notes
Asset/                Fonts and images
public/               Static Firebase hosting assets
```

## Firebase Setup

If you need to create or switch the Firebase project, follow the steps in `firebase/SETUP.md`.

At minimum you will need:

1. Firebase CLI installed in `firebase/`
2. A Firebase project selected
3. Authentication enabled with Email/Password
4. Firestore enabled
5. `js/app-config.local.js` updated with the correct Firebase web app config and TMDB access token
