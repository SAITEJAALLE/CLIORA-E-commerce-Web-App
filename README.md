# Cliora [ PERN E-commerce (1.Postgres 2.Express 3.React/Vite 4.Node)]

A production-ready, searchable and sortable store with admin product CRUD, JWT auth (access + refresh), image uploads, and a resilient cart (guest in localStorage, user-synced via API). Designed to be simple to run locally and easy to deploy (Render + Vercel).

## Features:

### 1.Products

Grid with search (?q=), sort (?sort=new|price_asc|price_desc), optional category (?category=), and pagination (?page=).

Product details page by :id (supports both UUID and integer ids).

### 2.Cart

Guest cart persists in localStorage.

Logged-in cart syncs to API automatically.

### 3.Auth

Email/password login.

Access token (Authorization header) + refresh token (HTTP-only cookie).

Axios auto-refresh on 401.

### 4.Admin

Add / edit / delete products.

Multi-image upload with Multer; primary image support.

### 5.DX / Production

Clean React contexts (Auth + Cart).

Express + pg with SSL toggle for managed Postgres in production.

Vercel + Render deployment files included.

## Repository Layout
cliora/
  web/                    # React + Vite app (frontend)
    src/
      components/         # Navbar, ProductCard, Pagination, ...
      context/            # AuthContext, CartContext
      pages/              # Home, ProductDetail, Cart, Admin, Login, Register
    index.html
    vite.config.js
    package.json

  server/                 # Express API (backend)
    src/
      routes/
        products.js       # search/sort/pagination + admin CRUD
        auth.js           # login, refresh, logout (JWT)
      middlewares/
        auth.js           # access token verify
        requireAdmin.js   # admin guard
      db.js               # pg Pool (SSL in prod)
      config.js           # env loader + required checks
      index.js            # server bootstrap
    package.json

  vercel.json             # deploy web/ as static build on Vercel

Quick Setup (Local)

Windows Git Bash commands shown (what you use). On macOS/Linux use equivalent paths.

## Backend

cd ~/Desktop/cliora_project/cliora/server
cp .env.example .env   # if present; otherwise create using the template below
npm i
npm run dev            # http://localhost:5000


## Frontend

cd ~/Desktop/cliora_project/cliora/web
cp .env.development.example .env.development   # or create using the template below
npm i
npm run dev            # http://localhost:5173


Note:If npm i fails with ENOENT package.json, you’re in the wrong folder.
Run installs inside web/ and inside server/.

split the teriminal and then in one terminal cd to web and other terminal cd to server and on both run npm dev

 ## Environment Variables
server/.env (local example)
## Database (local)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/cliora(depends on your database name);

## Server
NODE_ENV=development
PORT=5000

## CORS — your frontend origin
FRONTEND_URL=http://localhost:5173

## JWT
JWT_SECRET=supersecret123
ACCESS_TOKEN_MINUTES=15
REFRESH_TOKEN_DAYS=7

## Optional integrations (placeholders)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback


In server/src/db.js, SSL is false in dev and { rejectUnauthorized:false } in production so managed Postgres (Render) works.

## web/.env.development
VITE_API_URL=http://localhost:5000/api

## web/.env.production (deploy)
VITE_API_URL=https://YOUR-API.onrender.com/api

 ## Database Notes (minimal schema)

users (id, name, email unique, role, password_hash, created_at, ...)

products (id, name, slug unique, description, price_cents int, currency, category_id, created_at, updated_at)

categories (id, name, slug unique)

product_images (id, product_id fk, path, is_primary bool)

Queries use p.id::text = $1, so UUID or integer ids both work.

Seed an admin (local Postgres, Git Bash):

# disable history expansion for the '!' in the password if you use one
set +H
psql "postgresql://postgres:YOUR_PASSWORD@localhost:5432/cliora?sslmode=disable" -v ON_ERROR_STOP=1 -c \
"INSERT INTO users (name, email, role, password_hash)
 VALUES ('Admin','you@example.com','admin', crypt('NewStrongPass!123', gen_salt('bf',10)))
 ON CONFLICT (email) DO UPDATE SET role='admin', password_hash=EXCLUDED.password_hash;"
set -H

 ## API Overview

Base URL: /api

Auth

POST /auth/login → { token, user }

POST /auth/refresh → { token } (uses HTTP-only cookie set by server)

POST /auth/logout → { ok: true }

Products

GET /products?page=1&q=macbook&sort=price_desc&category=laptops
→ { items, total, page, pageSize }

GET /products/:id

POST /products (admin, multipart images[])

PUT /products/:id (admin)

DELETE /products/:id (admin)

Sorting keys supported: new | price_asc | price_desc.

 Frontend Architecture

AuthContext

Holds { token, user } in React state.

Persists to localStorage.

Axios interceptor auto-refreshes access token on 401 with /auth/refresh.

CartContext

Guest: stores items in localStorage.

Logged-in: syncs to API (POST /cart payload like { product_id, quantity }).

## Routing

Navbar renders search box and sort dropdown.

Both write to the URL (?q=&sort=&page=).

Home reads URL params and fetches products (URL is single source of truth).

Admin wrapped by RequireAdmin (checks user.role === 'admin').

## UI

ProductCard shows price/name/image; “Add to Cart” uses CartContext.

Pagination writes page back into the URL.

Backend Architecture

Express + pg Pool (server/src/db.js).

JWT auth; requireAuth middleware protects routes.

requireAdmin guards admin endpoints.

Multer handles image upload -> saved under /uploads and returned as /uploads/<filename>.

Parameterized SQL queries; id::text comparisons for flexible ids.

 ## Deployment
Backend — Render

Create a Web Service for the Express API.

### Build: npm i

### Start: npm run start (or node src/index.js)

### Add env vars from server/.env.

### Use a Render PostgreSQL instance; copy its DATABASE_URL into the service’s env.

### Set FRONTEND_URL to your Vercel domain to allow CORS.

### Frontend — Vercel

Root vercel.json builds only the web app:

### {
  "version": 2,
  "builds": [
    { "src": "web/package.json", "use": "@vercel/static-build" }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "web/$1" }
  ]
### }


### In Vercel > Project Settings > Environment Variables:
### VITE_API_URL=https://YOUR-API.onrender.com/api

 ## Useful Scripts

server/package.json

dev – start with nodemon

start – production start

web/package.json

dev – Vite dev server

build – Vite build

preview – preview production build

 Troubleshooting(bugs)

### ENOENT: package.json
Run npm i inside web/ and inside server/ (not the repo root).

401 on login / refresh

Verify user exists and password_hash is correct.

Confirm FRONTEND_URL (server) and VITE_API_URL (web) are set to the correct origins.

Clear browser cookies + localStorage and try again.

Search/sort not visible
Ensure you’re using the Navbar that renders the search input + sort dropdown, and that Home reads q/sort/page from the URL.

Big side gaps on the home grid
Use the provided .container--wide { max-width: 1400–1540px } class on the Home wrapper to match your preferred margins.

Images not showing
Check upload folder path (/uploads) and confirm the server serves it statically and CORS allows GET for that path.

 ### Roadmap

Server-side cart persistence and reconciliation on login.

Category CRUD in admin and richer filter UI.

Checkout flow (Stripe test mode).

Basic tests (Jest + Supertest + React Testing Library).

### Image CDN + thumbnailing.

## License

MIT: free to use, modify, and distribute. A star is always appreciated!
