# Boarding House Management System

A small, local-first boarding house manager: track rooms, tenants, and payments.

## Features

- Dashboard with live stats (total / occupied / available rooms, monthly rent, recent payments)
- Rooms: add, edit, delete (number, type, rent, status)
- Tenants: add, edit, delete — assigning a tenant marks a room **Occupied**; removing one frees it
- Payments: add and view history
- Data persists in `localStorage` (survives refresh)

## Run locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000

No build step, no dependencies, no backend.

## Firebase

**Firebase is NOT connected yet.** All data lives in `localStorage` via the
`store` helpers in `app.js` (`store.get` / `store.set`). When Firebase is added,
replace those two functions (rooms, tenants, payments) with Firestore calls.
No Firebase config files exist yet.

## Git

```bash
git init
git add .
git commit -m "Initial boarding house app"
git remote add origin <your-repo-url>
git push -u origin main
```