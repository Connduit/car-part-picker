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


## New: Vehicle photos and part details
The selected base vehicle shows a reference photo fetched from the Wikipedia API when available (requires internet). A fallback car illustration appears when no image is available. Images are illustrative and may not match the exact year/trim. Click a selected part name in the builder to open details, preliminary fitment, specifications, and research links.


## Accurate vehicle photos
Vehicle images are now opt-in curated records in `src/vehicle-images.json`, keyed by the exact vehicle ID from `src/vehicles.json` (or `328`, `325`, `m3` for the original E36s). Automatic Wikipedia search images were removed because they sometimes showed a different generation or model year. Until a photo is verified, the builder shows a labeled placeholder rather than an incorrect car.

Example entry (replace with a licensed local image you have verified):
```json
{
  "platform-001": {
    "src": "/vehicles/bmw-e30-1990.jpg",
    "year": 1990,
    "make": "BMW",
    "model": "E30 325i",
    "credit": "Photographer / license",
    "verified": true
  }
}
```
Put the corresponding file in `public/vehicles/`. The year must be within the vehicle profile's year range and the make/model must match. When selecting photographs, verify the body style, generation, and model year from a reliable photo description. Keep source, photographer, and license records; comply with image licensing. Images use `object-fit: contain` inside consistent aspect-ratio frames so the full car stays visible.
