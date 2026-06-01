# InDev Movies

InDev Movies is a multi-page movie discovery and watchlist web app built with HTML, CSS, and vanilla JavaScript, powered by Firebase Authentication, Firestore profile data, and TMDB movie metadata.

The product combines a polished streaming-style UI with practical account and catalog flows:

- Guest users land on a split-screen auth page with a cinematic movie carousel.
- Authenticated users enter a protected app experience with searchable movie collections.
- Users can open detailed movie pages, build a personal watchlist, and manage their session from a profile dropdown.
- Admin users get access to an audit dashboard for role/status controls and action logging.

## Full Site Description

### 1. Landing and Authentication Experience

The root page (`index.html`) acts as the sign-in gateway and first-touch product surface.

It includes:

- A left-side movie showcase carousel with dynamic title and navigation controls.
- A right-side authentication panel with:
	- Login form (email/password)
	- Sign-up form (username/email/password)
	- Google OAuth sign-in/sign-up actions
	- Password visibility toggles
- Friendly auth error handling (invalid credentials, weak passwords, provider mismatch, popup blockers, unauthorized domain fallbacks).

The authentication logic is handled in `js/firebase.js`, while Firebase app initialization lives in `js/firebase-core.js`.

### 2. Protected App Experience

After successful authentication, users are redirected into the protected pages under `Pages/`.

Core pages:

- `Pages/HomePage.html`
	- Main hero carousel
	- Trending sections with genre chips
	- Search and sort controls
	- Discovery sections for movies/series/new releases
- `Pages/Movie Library Page.html`
	- Library-focused browsing with filters and sorting
	- Search toolbar
	- Featured player section UI
	- Recommended content rows
- `Pages/Movie Detail.html`
	- Dedicated detail view with backdrop, metadata, rating ring, genres, overview, gallery, and action buttons
- `Pages/watchlist.html`
	- Saved-content dashboard with stats (total items, movies, series)
	- Filtering and sorting controls
	- Trailer carousel support for watchlist content

`Pages/profile.html` currently redirects to `Pages/HomePage.html`, because profile data/actions are surfaced in the navbar profile menu.

### 3. Route Protection and Session Control

Authentication guarding is implemented in `js/auth-guard.js` using Firebase Auth state listeners.

Behavior:

- Guest-only pages redirect authenticated users to the app.
- Protected pages redirect unauthenticated users back to the login page.
- Redirect paths are preserved for smooth post-login return.
- Logout links are bound centrally through `data-auth-action="logout"`.
- User profile metadata (name, role, last seen) is hydrated into UI placeholders.
- Role-aware visibility is applied through `data-admin-only` elements.

### 4. User Profiles and Roles (Firestore)

When users sign up or log in, profile documents are upserted in Firestore (`users/{uid}`) with fields such as:

- `displayName`
- `email`
- `role` (default `user`)
- `isActive`
- timestamps for creation/updates/login

This allows the UI to persist account identity and support role-based admin capabilities.

### 5. Movie Data and Discovery Engine

Movie and TV content is loaded from TMDB through front-end requests in `js/imdb-top250.js`.

Capabilities include:

- Trending movie and TV retrieval
- Search by title
- Genre mapping/filtering
- Rating/year/title sorting options
- Trailer enrichment via TMDB video endpoints
- Detail-page navigation links with query parameters

The app uses runtime configuration from `js/app-config.local.js` (ignored by git), and `js/api-config.js` applies TMDB tokens/keys to the browser runtime.

### 6. Watchlist Behavior

The watchlist feature stores saved items in browser local storage.

Each saved item contains normalized identity and metadata, including:

- movie/series identifier
- TMDB ID (when available)
- title, type, year, poster
- rating snapshot
- date added

Users can browse their saved list with status counters, filtering, and sorting controls on `Pages/watchlist.html`.

### 7. Admin Audit Dashboard

Admin functionality is available at `Pages/admin.html` and powered by `js/admin.js`.

Features:

- View user inventory from Firestore
- Search and filter users by role/status
- Enable/disable accounts
- Promote/demote roles (`user` <-> `admin`)
- Protection against demoting the last admin
- Log admin actions into `adminAuditEvents`
- View recent audit events

Role protection for this page is controlled through `data-required-role="admin"` and `js/auth-guard.js`.

## Tech Stack

- Frontend: HTML5, CSS3, JavaScript (ES modules + vanilla DOM)
- UI libraries: Bootstrap 5, Font Awesome, Google Fonts
- Authentication: Firebase Auth (email/password + Google OAuth)
- Data storage: Firestore (user profiles + admin audit events)
- Movie data: TMDB API
- Hosting-ready config: Firebase config files are present (`firebase.json`, `firestore.rules`, indexes)

## Runtime Configuration

This project relies on runtime config loaded before auth/data scripts.

Important files:

- `js/app-config.example.js` (tracked template)
- `js/app-config.local.js` (local secret/config values, gitignored)
- `js/api-config.js` (injects TMDB runtime config)
- `js/firebase-core.js` (initializes Firebase from runtime config)

Minimum runtime requirements:

1. Firebase web app config (apiKey, projectId, appId, etc.)
2. TMDB bearer token or API key

## Quick Start (Local)

This is a static multi-page app with no build step.

1. Start a local web server from the project root:

```bash
python3 -m http.server 5500
```

2. Open:

```text
http://127.0.0.1:5500/index.html
```

3. Sign up or log in.

Protected routes under `Pages/` will redirect to `index.html` when no authenticated Firebase session exists.

## Firebase Setup Summary

Detailed setup steps are documented in `firebase/SETUP.md`.

At minimum, ensure:

1. Firebase CLI dependencies are installed in `firebase/`.
2. A Firebase project is selected.
3. Email/Password auth is enabled.
4. Firestore is enabled.
5. `js/app-config.local.js` contains valid Firebase + TMDB runtime values.

## Project Structure

```text
Asset/               Fonts and images
css/                 Shared site styles
firebase/            Firebase CLI scripts and setup notes
js/                  Frontend logic (auth, config, catalog, admin)
Pages/               Protected app pages
public/              Firebase hosting assets
index.html           Guest auth entry page
firebase.json        Firebase hosting/emulator config
firestore.rules      Firestore security rules
```
