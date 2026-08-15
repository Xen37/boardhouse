# Boarding House Management System

A small boarding house manager: track rooms, tenants, and payments.
Backend: **Firebase Firestore + Firebase Auth**.

## Features

- Login: **Admin** (landlord) and **Tenant** both log in with **email + password**
- Dashboard with live stats (total / occupied / available rooms, monthly rent, recent payments)
- Rooms: add, edit, delete (number, type, rent, status)
- Tenants: add, edit, delete — assigning a tenant marks a room **Occupied**; removing one frees it
- Payments: add and view history
- Data is stored in **Firestore** (rooms / tenants / payments collections)

## Run locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000

No build step, no npm packages — Firebase SDK is loaded from the CDN.

## Admin login (Firebase Auth)

The app signs the admin in with **any email + password** registered as a user
in Firebase Auth.

Create the admin user once in the Firebase console:

1. [console.firebase.google.com](https://console.firebase.google.com) → project **bhs1-ceedb**
2. **Build → Authentication → Users → Add user**
3. Set the email + password you want to use (e.g. `landlord@bhs.local` / `admin123pass`)

Login form: Role **Admin**, Email = the email you created, Password = its password.

## Tenant login

Tenants log in with their **last name + room number**, checked against the
Firestore `tenants` collection.
Each tenant doc has fields: `name`, `contact`, `room`, `rent`, `moveIn`.

Sample seeded tenants: `Dela Cruz` / room `101`, `Santos` / room `201`.

## First run

The app seeds sample data into Firestore automatically on first load if the
`rooms` collection is empty. Clear the collections in the console to reseed.

## Firebase setup already done

- Firestore database created (collection IDs: `rooms`, `tenants`, `payments`)
- Firebase config in `index.html`
- Security rules should be tightened before production (see below)

## Security rules (IMPORTANT — fix before going live)

> ⚠️ **Your Firestore is currently in TEST MODE** (verified 2026-08-15): anyone who
> finds your project ID (it's in the public `index.html`) can read, write, and
> **delete every document** — tenant contacts, payment records, everything.
> Open **Firestore → Rules** in the Firebase console and publish the rules below.

Because tenant login uses **last name + room number** (no real account), the app
must be able to read `rooms` and `tenants` without signing in, and the admin is
the only user who ever signs in to Firebase Auth. These rules match that design:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null &&
        request.auth.token.email == 'landlord@bhs.local';
    }
    // Public read (landing page + tenant last-name login), admin-only write.
    match /rooms { allow read: if true; allow write: if isAdmin(); }
    match /tenants { allow read: if true; allow write: if isAdmin(); }
    match /payments { allow read: if true; allow write: if isAdmin(); }
  }
}
```

Replace `landlord@bhs.local` with the email of the admin user you created in
Firebase Auth (the one you log in with as Admin).

**Known limitation:** with last-name login, tenant names/contacts/payments remain
publicly readable (only writes are locked down). For real privacy, give tenants
their own Firebase Auth accounts and restrict reads — say the word and I'll add it.

## Git

```bash
git init
git add .
git commit -m "Initial boarding house app"
git remote add origin <your-repo-url>
git push -u origin main
```