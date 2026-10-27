# Car Part Picker

React + Vite automotive project builder, parts catalog, saved builds, guides, local forums/discussions, community benchmark prototype, and local login/register API.

## Requirements

- Node.js 20+ (Node.js 22 recommended)
- npm

## Start

```bash
npm install
npm run dev
```

Open **http://localhost:5175**. Vite runs on port **5175** (fixed), and the local authentication API runs on **127.0.0.1:5176** through Vite's `/api` proxy. Both processes start with `npm run dev`.

## Features

- System Builder, starter parts catalog, compatibility warnings, saved builds, JSON/CSV export, checklists
- E36 inspection guide, guides, local part discussions and forums
- **Benchmarks:** community-submitted vehicle/engine setup, wheel horsepower, torque, 0–60 mph, and quarter-mile times; sortable leaderboard. Stored in browser localStorage; no verification or cross-device sync yet.
- **Login/register:** working local Node HTTP API with salted scrypt password hashes and signed HttpOnly session cookies. Accounts stored in `server/data/users.json` (created automatically, excluded from Git). Login/register does **not** sync builds, forums, or benchmarks between browsers.
- **Donate / Support:** visible support button and support page. **No payment integration or live donation link** has been configured; no payments are collected.
- Expanded multi-column footer inspired by common marketplace footer structure, with original branding and content.

## Important limitations

This is a **local development prototype**, not production-ready authentication or a hosted multi-user platform. Before deploying publicly, move users and community content to a proper database, implement CSRF protection, email verification, password reset, abuse controls, HTTPS, backups, and deployment hardening. Do not expose the development API to the public internet.

The original catalog contains planning estimates, not live prices or manufacturer-verified fitment. Forums, discussions, saved builds, and benchmarks currently use browser localStorage and are not shared across users.

## Build

```bash
npm run build
npm run preview
```

`npm run preview` previews static frontend assets; login/register requires the API process (`npm run api`) running separately.

### Custom price per selected part
In System Builder, each selected part has an editable **Your price ($)** field. This is saved with the individual build, affects the parts subtotal, overall project total and budget usage, and is included in CSV and JSON exports. Use `0` for a free part; **Reset** restores the catalog estimate. Catalog prices and other builds are not changed.

## Expanded vehicle selector

Includes 62 additional popular project-car profiles across multiple makes, plus the three original E36 variants (65 total). Base vehicle selection works in the builder and saved builds. The new profiles include approximate stock horsepower and weight, but **do not include verified parts fitment or purchase prices**. The original E36 parts catalog is not marked compatible with other vehicles; add custom parts for those builds. Vehicle profiles live in `src/vehicles.json`.
