# JSON-First AI UI Product Notes

## Status
Accepted product direction, 2026-08-21.

Terminology note, 2026-08-28: this is a historical product reference. Current source paths use
`apps/reference` and `packages/templates/src`; current product terminology is "reference", not
"demo". Use `README.md` as the maintained status and command source.

## Product Intent
`uidl-runtime` is a JSON-first visual generation runtime. Its primary user is an AI agent that needs
to generate complete visual artifacts from structured instructions and data, then hand that JSON to
a host project for rendering, routing, session context, theming, and future export.

The product must support these artifact families from the same UIDL schema vocabulary:

- Websites and marketing pages.
- App/dashboard interfaces.
- Business documents and reports.
- Slide decks and presentation layouts.
- Spreadsheet-like workmeridian, tables, formulas-as-display, and charts.
- Mixed suites that bundle several artifact types from one brief.

## Current Product Decision
The source of truth is `UIDLDocument` JSON, not a visual editor state tree. `<Editor />` can remain
available, but it is not the product center right now. New work should improve JSON schema coverage,
runtime rendering, catalog quality, validation, and AI-agent authoring loops before investing in
drag-and-drop authoring UI.

## Non-Negotiable Rules For Future Agents

- Generate valid `UIDLDocument` JSON first.
- Use existing widget types before introducing new primitives.
- Put reusable shells and repeated patterns in `definitions`.
- Instantiate reusable patterns with `componentId` and `slots`.
- Put tabular/chart data in `dataSources`; do not manually duplicate table rows as layout nodes.
- For live or mock API data, use `api` actions to write responses into `state.api.*` paths, then bind
  widget rows from those state paths.
- Use `visibility.condition` for conditional UI.
- Use `session.permissions.*` for RBAC UI gating.
- Use `state.*` for transient UI state such as drawers, panels, dialogs, form values, and filters.
- Use `navigate` actions and let the host project handle real routing through `onRouteChange`.
- Treat UIDL visibility as UI gating only; enforce authorization in the host/API.
- Keep catalog examples parseable and renderable; add or update tests when adding examples.
- Prefer additive schema/catalog changes. Breaking public schema changes need migration notes.

## Host Project Contract
Host projects own runtime context. A host should provide:

- `document`: the validated `UIDLDocument`.
- `theme`: optional `Theme` tokens/preset.
- `dataSources`: usually `document.dataSources`, or live data resolved by the host.
- `stateStore`: optional `createDocumentState(document.state).getState()` for interactive state.
- `session`: optional auth/session payload.
- `onRouteChange`: host routing adapter.
- `apiAllowlist`: explicit allowlist before any `api` actions can run.

## API Data Contract

API-backed documents are supported through `api` actions. The action interpreter is intentionally
fail-closed: no API call runs unless the host passes `apiAllowlist` to `renderUIDocument`,
`UIDocumentRenderer`, or `ActionInterpreter`. Beyond the allowlist, every `api` action is also
bounded by a 15s timeout, a 5MB response cap (`apiMaxResponseBytes`, checked against both the
declared `Content-Length` and the actual decoded size), a 6-concurrent-call cap
(`apiMaxConcurrentCalls`, further calls fail fast rather than queue), and a JSON-only
`Content-Type` check — all overridable per host, none of it a substitute for the allowlist. See
README's "API Data" section for the exact defaults and rationale.

Recommended API response shape for table/chart resources:

```json
{
  "rows": [
    { "month": "Apr", "value": 128000 },
    { "month": "May", "value": 164000 }
  ],
  "meta": { "resource": "dashboard.revenueTrend" }
}
```

Recommended UIDL action pattern:

```json
{
  "api": {
    "method": "GET",
    "url": "https://mock.uidl-runtime.local/dashboard/revenue-trend",
    "dataSource": "api.dashboard.revenueTrend"
  }
}
```

Recommended widget binding pattern:

```json
{
  "type": "DataTable",
  "props": {
    "rows": { "$bind": "state.api.dashboard.revenueTrend.rows" }
  }
}
```

Mock API fixtures live under `packages/templates/src/mock-api/`. The manifest is
`packages/templates/src/mock-api/manifest.json`, and the mock host is `https://mock.uidl-runtime.local`.
These fixtures cover website, dashboard, document, slide, spreadsheet, mixed suite, ERP, and session
data. Host references should map fixture paths to responses and pass `apiAllowlist:
["mock.uidl-runtime.local"]`.

Recommended session shape:

```json
{
  "user": { "id": "usr_1", "name": "Finance Manager" },
  "roles": ["Finance Manager"],
  "permissions": {
    "dashboard": true,
    "finance": {
      "enabled": true,
      "close": true,
      "variance": true,
      "admin": false
    },
    "payroll": false
  }
}
```

Important convention: simple nested permissions such as `session.permissions.finance.close` are
best for UIDL expression paths. If a host auth system stores claims as flat strings, the host should
map them into a nested boolean object before rendering.

## Catalog Structure
The machine-readable source of truth is
`packages/templates/src/catalog/recommended-catalog-structure.json`. Structure, updated for the
reference terminology migration on 2026-08-28:

- `catalog/contracts/`: AI-agent output rules, host integration contracts, validation gates. **Live.**
- `catalog/families/`: website, dashboard, document, slide, spreadsheet, app-shell, mixed-suite. **Live.**
- `catalog/patterns/`: reusable definitions such as hero, dashboard shell, report page, slide,
  workbook sheet, RBAC navigation. **Live.**
- `catalog/reference-suites/`: scenario-level reference suite metadata. **Live.**
- `documents/`: renderable `UIDLDocument` examples. **Unchanged** — drafts stay here until a future
  migration separates stable vs experimental references.
- `fixtures/`: shared data fixtures when examples become too large to inline. **Not started.**
- `export-intents/`: future metadata for HTML/PDF/DOCX/PPTX/XLSX adapters. **Not started.**

`catalog/recommended-catalog-structure.json` (classifier
output) deliberately stay at the catalog root rather than moving into one of the folders above —
see that file's own `notMigrated` field for why. `packages/templates/src/mock-api/*.json` was out of scope
for this migration.

## Reference Suite Drafts
Use `packages/templates/src/catalog/reference-suites/reference-suite-drafts.json` as the current list of complete reference suites.

Current draft suites:

- `saas-growth-suite.json`: website, growth dashboard, campaign brief, board slide, channel budget.
- `finance-ops-suite.json`: RBAC finance navigation, month-end close, variance memo, working
  capital workbook.
- `knowledge-pack-suite.json`: resource landing page, learning guide, workshop deck, exercise sheet.

These are draft-level examples. They should demonstrate capability and agent authoring patterns,
not final pixel-perfect templates.

## Visual Family Guidance

### Website
Use for marketing, product, SaaS, ecommerce, community, education, and campaign pages.

Recommended pattern set:

- `websiteShell`
- `navbar`
- `hero`
- `featureGrid`
- `pricingGrid`
- `testimonialGrid`
- `leadForm`
- `faq`
- `ctaBand`
- `footer`

### Dashboard
Use for SaaS apps, admin panels, ERP, analytics, finance, ops, CRM, project management, and
internal tools.

Recommended pattern set:

- `appShell`
- `Sidebar`
- `Navbar`
- `Toolbar`
- `metricCard`
- `filterBar`
- `DataTable`
- `Chart`
- `Drawer`
- `Panel`
- `Dialog`/`Snackbar` via actions

### Document
Use for proposals, memos, reports, invoices, policies, briefs, SOPs, and guides.

Recommended pattern set:

- `docPage`
- `coverBlock`
- `sectionHeading`
- `paragraphBlock`
- `callout`
- `definitionList`
- `reportTable`
- `signatureBlock`
- `appendix`

### Slide
Use for pitch decks, board decks, lessons, training, sales decks, and workshop decks.

Recommended pattern set:

- `deck`
- `slide`
- `titleSlide`
- `agendaSlide`
- `twoColumnSlide`
- `chartSlide`
- `imageSlide`
- `summarySlide`

### Spreadsheet
Use for budgets, forecasts, trackers, variance reviews, reconciliation views, simple models, and
workbook-like business artifacts.

Recommended pattern set:

- `workbookShell`
- `sheetToolbar`
- `sheetTabs`
- `DataTable`
- `formulaDisplay`
- `varianceTable`
- `summaryChart`

Current spreadsheet support is visual/display-oriented. Real formula calculation and XLSX export are
future adapter concerns.

## Doctype-Driven Generation Pattern (reference implementation)

`packages/templates/src/meridian/` is a full reference for generating a *complete* multi-doctype app (list +
form + report + dashboard for ~20 record types, ~37 navigation destinations) instead of one-off
pages. The pattern, worth reusing for any similarly-shaped domain (CRM, helpdesk, inventory, etc.):

- One JSON-side-effect-free generator function per page *shape* (list, flat form, invoice-style
  form with line items, report), each parameterized by a small config object — not one generator
  per doctype. `packages/templates/src/meridian/buildDocument.ts` has the shapes; `pages.ts` has the ~20
  per-doctype configs that feed them.
- A single source of mock/real data (`mockData.ts`) that every generator reads from, plus a
  derivation layer (`ledger.ts`) for anything that must reconcile across pages (a GL posting
  engine here) — compute derived figures, never hand-type the same number in two places.
- Row-level navigation composed from `Row`/`Button` nodes with a literal, pre-resolved `navigate`
  route per record (generated in the host language, not authored by hand) — not `DataTable`,
  whose `rowActions` buttons currently have no `onClick` wired at all (a real SDK gap, tracked,
  out of scope to fix inside a content build).
- Every generated document is validated with `DocumentSchema.parse` in a single test that loops
  over every doctype/route, not one near-duplicate test per doctype — see
  `packages/core/src/renderer/__tests__/meridianSidebarCoverage.test.tsx` for the shape: resolve every real
  navigation destination to a document, assert it's defined, assert it renders with zero console
  errors.

## AI Agent Authoring Workflow

1. Classify the requested artifact family or mixed suite.
2. Read `capabilities.json` and `ai-agent-contract.json`.
3. Pick an existing reference or pattern close to the request.
4. Generate one `UIDLDocument` with `definitions`, `dataSources`, and `root`.
5. Add `session.permissions.*` conditions if the request mentions user roles or permissions.
6. Validate with `DocumentSchema.parse(document)`.
7. Render smoke with `renderUIDocument(document, { dataSources: document.dataSources, session })`.
8. Check key labels exist and denied RBAC content is absent.
9. Only then wire the document into a host reference or export pipeline.

## Validation Commands

Use these before claiming a catalog/schema change is complete:

```bash
npx vitest run src/renderer/__tests__/universalExamples.test.tsx src/renderer/__tests__/navigationWidgets.test.tsx
npm run lint
npm run typecheck
npm test
npm run build
npm run smoke:package
```

## Current Known Boundaries

- Visual rendering is React runtime first.
- DOCX/PPTX/XLSX/PDF export is not implemented yet.
- Spreadsheet formulas are display values today, not computed formulas.
- UIDL visibility does not secure data; host/API authorization must enforce access.
- Existing primitive vocabulary is intentionally small. Add new primitives only when repeated
  patterns cannot be expressed cleanly with current widgets and definitions.

## Recommended Next Product Slices

1. ✅ **Done (2026-08-21).** JSON Schema export files for `UIDLDocument`, `Action`, theme presets,
   and design tokens — `generateJsonSchemas()` (`src/schema/jsonSchema.ts`), built to
   `dist/schema/*.json` via `npm run build:schema`, published as the `./schema/*.json` package
   export. Verified against real catalog documents with `ajv` (not just reasoned about), and
   against a deliberately-invalid document to prove the schema is strict.
2. ✅ **Done (2026-08-21).** CLI validator: `uidl-validate <path...>` (`bin/validate.mjs`,
   `npm run validate:examples` runs it against every catalog document). Non-zero exit + per-field
   errors on invalid input.
3. ✅ **Done (2026-08-21).** Split catalog folders into `contracts/`, `families/`, `patterns/`,
   `reference-suites/` (the four with existing content); `fixtures`/`export-intents` remain unstarted —
   there's nothing to move into them yet. `recommended-catalog-structure.json` deliberately stays
   at the catalog root (see that file's `notMigrated` field). `mock-api/` fixtures were out of scope for this pass.
4. Add more pattern definitions for website pricing/FAQ/testimonials, document cover/report,
   slides, and workbook tabs.
5. ✅ **Done (2026-08-21).** Widened the `form` widget category — added `Select`, `Textarea`,
   `RadioGroup`, and a `Form` wrapper (native submit semantics via `preventDefault` +
   `onSubmit` action) to the existing `TextField`/`Checkbox`/`Switch`/`Slider` set. All field
   widgets now accept an `error` prop for validation-message display, and `TextField`/`Select`/
   `Textarea` labels are programmatically associated (`htmlFor`/`id` via `useId()`) rather than
   unlinked siblings. The `validate` action (`{fields: string[]}`) is still an event-only stub —
   nothing computes field errors automatically; hosts/agents compute them and bind `error` to a
   `state.formErrors.*` path. See README's "Two-way form binding" section for the convention.
6. Add HTML export first, then PDF, then DOCX/PPTX/XLSX adapters.
7. ✅ **Done (2026-08-21).** Real-browser visual regression coverage (Playwright) for the three
   complete reference suite drafts — `e2e/visual-regression.spec.ts`, run via `npm run test:reference`.
   Renders through a dedicated, decoupled harness (`apps/reference/visual-regression.html`/`.tsx`),
   not `ReferenceApp.tsx`'s catalog UI. Screenshot diff tolerance was calibrated empirically (a looser
   default silently let a real text change through) rather than picked by guess. See README's
   "Visual regression testing" section.
8. ✅ **Done (2026-08-21).** Hardened `api` actions beyond the host allowlist: a response-size cap
   (`apiMaxResponseBytes`, default 5MB — checked against declared `Content-Length` first, then
   actual decoded size, so a missing/understated header doesn't bypass it), a concurrent-call cap
   (`apiMaxConcurrentCalls`, default 6 — further calls fail fast instead of queueing, so a
   `repeat`-driven document can't fire unbounded concurrent requests), and a JSON-only
   `Content-Type` check. All three are configurable per host through `renderUIDocument`/
   `UIDocumentRenderer`/`Editor`. See README's "API Data" section.
