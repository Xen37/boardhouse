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

Tenants log in with the **email + password** stored on their tenant record in
the Firestore `tenants` collection (set in the Add/Edit Tenant form).
Each tenant doc has fields: `name`, `email`, `password`, `contact`, `room`,
`rent`, `moveIn`.

Sample seeded tenants: `juan@bhs.local` / `juan123`, `maria@bhs.local` / `maria123`.

## First run

The app seeds sample data into Firestore automatically on first load if the
`rooms` collection is empty. Clear the collections in the console to reseed.

## Firebase setup already done

- Firestore database created (collection IDs: `rooms`, `tenants`, `payments`)
- Firebase config in `index.html`
- Security rules should be tightened before production (see below)

## Security rules (recommended before going live)

In Firestore → Rules, restrict access so tenants can't rewrite everything:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

For stricter rules (admin-only writes, tenant read-only), use:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null && request.auth.token.email == 'landlord@bhs.local';
    }
    match /rooms { allow read: if request.auth != null; allow write: if isAdmin(); }
    match /tenants { allow read: if request.auth != null; allow write: if isAdmin(); }
    match /payments { allow read: if request.auth != null; allow write: if isAdmin(); }
  }
}
```

## Git

```bash
git init
git add .
git commit -m "Initial boarding house app"
git remote add origin <your-repo-url>
git push -u origin main
```