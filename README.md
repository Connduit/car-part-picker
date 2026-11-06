# WrenchPicker (local, zero dependencies)
Automotive build planner: plain Node.js (22+) server and vanilla JS frontend. No npm install, CDNs or network needed.

**Start:** `npm start`, then open http://localhost:3000 (optional: `PORT=4000 DATA_FILE=data/db.json`)
**Test:** `npm test` (engine, model, providers, planning and HTTP API tests; 55 tests)
**Browser checks:** `python3 browser-check.py` (needs Playwright for Python + Chromium; not bundled). Covers workflows, keyboard-only navigation, dialog accessibility, accessible names and WCAG AA contrast in light and dark.

## What works
* **Vehicle model:** 7 platforms / 11 generations with year ranges, trims, engines, drivetrains, bolt pattern, stock wheel/tire, wheel envelope and (where present) fender clearance. Editable per-build vehicle profile (year, trim, engine, drivetrain, nickname, mileage, notes) validated against the model.
* **Catalog:** 42 sample parts in 15 categories with specs, filters, sorting, pagination, comparison of up to 3 parts.
* **Compatibility:** structured fitment records (source, confidence, trim/engine/year limits, exclusions, required supporting parts); bolt pattern; wheel width/offset envelope; tire width vs wheel width; rim-diameter match; estimated speedometer error; estimated outer-edge shift vs sample fender clearance; dependency, recommendation and slot-conflict rules. Missing data returns **Unknown**, never a guess. Advisories (estimates) never change a part's status.
* **Planning:** required vs recommended supporting parts (with one-click suggestions), unresolved compatibility questions (missing parts / conflicts / needs data), optional items, core vs optional cost, target budget and per-category targets, reusable templates (private to your browser).
* **Sharing:** autosaved builds, public/private with stable `/b/<id>` links; other viewers see public builds read-only with notes, override reasons, mileage and profile notes hidden.
* **Dataset import:** drop validated JSON datasets (parts, fitment records with provenance, offers) in a folder and start with `WRENCH_DATA_DIR=<folder>`. See docs/INTEGRATIONS.md and examples/dataset.
* **Integrations:** provider interfaces with source attribution, timestamps, currency, availability and stale-price handling, tested against clearly labeled fixtures. See docs/INTEGRATIONS.md.

## Data honesty
Every vehicle, generation spec, wheel envelope, clearance, part, spec, price, offer, build and guide is **illustrative sample data** (src/vehicles.js, src/sample-parts.js, src/extra.js). No fitment is verified, no retailer is real, no price is live. Wheel/tire results are math estimates from nominal sizes compared with illustrative sample limits.

## Limits
No accounts (anonymous cookie; clearing it loses private builds). JSON file persistence for a single local process. No photos, live pricing, shipping, price history, real provider implementations, staggered-fitment modeling, inner wheel clearance, or brake/caliper clearance. Tested only in Chromium.
