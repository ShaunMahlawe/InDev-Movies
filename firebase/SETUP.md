# Firebase Setup (InDev Movies)

This workspace is prepared for Firebase Auth + Firestore profile storage.

## What is ready
- `js/firebase.js` handles:
  - Sign up with email/password
  - Login with email/password
  - User profile persistence in Firestore: `users/{uid}`
  - Basic auth error handling
- `firebase/package.json` cleaned and standardized
- Duplicate package files removed

## Important
I cannot authenticate to Firebase on your behalf or access your email account directly.
You need to run the login command yourself so it opens your browser account flow for:
`241396@virtualwindow.co.za` (managed by `virtualwindow.co.za`).

## 1) Install Firebase tooling
From the `firebase/` folder:

```bash
npm install
```

## 2) Login with your account

```bash
npm run login
```

## 3) Create and select project

```bash
npm run create:project
npm run use:project
```

If project id `indev-movies` is already taken, create an alternative like:
- `indev-movies-app`
- `indev-movies-vw`

Then run:

```bash
firebase use <your-project-id>
```

## 4) Enable products in Firebase Console
Open Firebase Console for your selected project and enable:
- Authentication: Email/Password provider
- Firestore Database (start in production mode)

## 5) Register web app and update config
In Firebase Console:
1. Project settings -> General -> Your apps -> Web app
2. Copy the config values
3. Replace `firebaseConfig` inside `js/firebase.js`

## 6) Add Firestore security rules (recommended baseline)
Use rules like below:

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow create, read, update: if request.auth != null && request.auth.uid == userId;
      allow delete: if false;
    }
  }
}
```

## 7) Verify end-to-end
- Sign up on `index.html`
- Login on `index.html`
- Confirm user document appears in Firestore under `users/{uid}`
