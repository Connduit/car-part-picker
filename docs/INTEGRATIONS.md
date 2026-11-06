# Data integrations

WrenchPicker never reaches the network. The app talks to four provider interfaces (`src/providers/index.js`). The only implementations
shipped are **local sample/fixture providers**; every one declares `fixture: true`, and every fixture record is labeled
"Sample fixture, not live data". Pointing a `WRENCH_*_PROVIDER` variable at anything else fails at startup rather than pretending.

| Kind | Methods | Purpose | Shipped implementation |
|---|---|---|---|
| `vehicle` | `listPlatforms()`, `getGeneration(id)` | Vehicle database: platform → generation → trims/engines/drivetrains, wheel & tire reference data | `SampleVehicleProvider` (src/vehicles.js, illustrative) |
| `catalog` | `searchParts(q)`, `getPart(id)` | Manufacturer catalog: part identity and specifications | `SampleCatalogProvider` (src/sample-parts.js, illustrative) |
| `fitment` | `getRecords(partId)` | Structured fitment records | `SampleFitmentProvider` |
| `price` | `getOffers(partId)`, `getPriceHistory(partId)` | Authorized retailer feed / pricing service | `FixturePriceProvider` (generated offers, no URLs) |

Each provider also exposes `id` (string) and `fixture` (boolean). `assertProvider(kind, provider)` enforces this.

## Offer shape (price provider)
```
{ partId, retailer, price:{amount, currency:'USD'}, availability:'in_stock'|'out_of_stock'|'backorder'|'unknown',
  url: https-string|null, shippingAmount: number|null, observedAt: ISO timestamp,
  source:{provider, type:'fixture'|'affiliate_feed'|'manufacturer'|'api', fixture:boolean, label} }
```
`validateOffer` rejects bad amounts, non-ISO currencies, unknown availability, unparsable timestamps and non-https URLs; invalid offers are dropped with a warning.

### Stale-price rules (`summarizeOffers`)
* An offer is **stale** when `observedAt` is older than 7 days (configurable `maxAgeMs`). Stale offers are shown with their age but are never the "best" price.
* Out-of-stock offers, and offers in a different currency, are shown but never "best".
* If no offer is fresh and orderable, `bestOffer` is `null`, a warning is returned, and the UI says only the sample list price applies.
* `getPriceHistory` returns `[]` when no genuine history exists; the API then returns `priceHistory: null` and the UI says so. Never synthesize history.
* Build totals currently use the part's sample **list price**, not live offers. Wire totals to `bestOffer` only after a real price provider exists.

## Fitment record shape (`src/fitment.js`)
```
{ part, gen, effect:'fits'|'excludes', trims?:[..], engines?:[..], years?:[a,b],
  source:{type:'manufacturer'|'retailer'|'community'|'illustrative_sample', name, ref?, asOf?},
  confidence:'high'|'medium'|'low', verified?:boolean, note?, requires?:[tag] }
```
Rules: an exclusion that applies wins. A "fits" record is **Verified Fitment** only if `verified === true` *and* the source type is `manufacturer` or `retailer`;
otherwise it is Likely Compatible. If a record is limited to trims/engines/years and the vehicle profile does not say which one the car is, the result is **Unknown**,
as is a vehicle with records only for other trims. `requires` lists supporting-part tags that become required dependencies.

## Adding a real provider
1. Implement the methods above (async), set `id` and `fixture:false`, return data in the shapes above.
2. Register it in `createProviders` under a new name and allow it in `IMPLEMENTED` (src/providers/index.js).
3. Select it with `WRENCH_PRICE_PROVIDER=<name>` (likewise `WRENCH_VEHICLE_PROVIDER`, `WRENCH_CATALOG_PROVIDER`, `WRENCH_FITMENT_PROVIDER`). Keep credentials in the environment, never in the repo.
4. Use only authorized APIs, affiliate feeds, manufacturer catalogs or licensed data; do not scrape.
5. Run `npm test`; add contract tests like test/providers.test.js against recorded fixtures of the real feed.

The compatibility engine and server read parts/vehicles from `src/data.js` / `src/vehicles.js` today; a real catalog or vehicle provider needs those modules
replaced by (or populated from) the provider before the engine can use its data. That wiring is **not done** and needs real data and credentials.

## Importing a dataset without code (`WRENCH_DATA_DIR`)
Point `WRENCH_DATA_DIR` at a folder of `*.json` files (max 20 files, 5 MB each; subfolders and other files are ignored) and start the server:
`WRENCH_DATA_DIR=examples/dataset npm start`. A working illustrative example is in `examples/dataset/example.json`.

```
{ "meta":{"name":"<=80 chars","asOf":"ISO date"},
  "parts":[{"id":1000-999999,"cat":<one of the categories>,"name","price","brand?","cond?","bp?","wheelW?/off?/wheelDia? (all with bp)","tire?":"255/35R18",
            "tag?","slot?","needs?":[tag],"recommends?":[tag],"spec?":{"Key":"text"}}],
  "fitment":[<fitment record, see above; "gen" must be a known generation id>],
  "offers":[<Offer, see above>] }
```
* Every file is validated completely before anything is applied; a bad file stops startup and the error names the file and the field. Nothing is partially loaded.
* `verified: true` is accepted only with `source.type` of `manufacturer` or `retailer` **and** `source.ref` and `source.asOf`. The app cannot check that such a claim is true; it only enforces that the provenance fields exist and shows them.
* Imported parts get their own `dataset` label in the UI. They never receive generated fixture offers: with no offers in the dataset the page says none are available.
* Offers keep their own `source.fixture` flag, so a dataset of real feed data is displayed as not-fixture. Offers older than 7 days are shown as stale and excluded from the best price (the example file's offer is stale by design).
* Vehicle generations cannot be imported yet; datasets reference the built-in generation ids.
