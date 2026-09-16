# Current State — UIDL Runtime (re-audit, 2026-09-16)

> Stage A snapshot, refreshed after stages B–N. Spec 1.x, the React reference,
> semantic-core Flutter/Android runtimes, the Java generator, Quarkus compile/validate,
> and v0.1.4 exist. The target-state proof — the same UIDL document reasonably
> rendered by React, Flutter, and Compose — is **not** met. Compose has default
> renderers only for `Column` and `Text` (the `text-column` fixture). Flutter
> renders a 10-widget subset. React remains the only runtime that can render Meridian.

## 1. Repo shape at a glance

Monorepo (`npm workspaces`), published package `uidl-runtime` (v0.1.4).

| Path | Responsibility |
|---|---|
| `packages/core/` | The library: schemas, renderer, state, actions, themes, registry, adapters, editor, compiler |
| `packages/templates/` | Page generators, verticals, Meridian reference, domain services, mock data |
| `apps/reference/` | Executable reference suite (gallery, playground, POS, regression harness) |
| `e2e/` | Playwright acceptance + visual-regression tests |
| `scripts/` | Mock API, audit gates, packaging, JSON-schema generation, smoke consumers |
| `docs/product/` | Background product notes (not a status authority) |
| `dist/`, `bin/` | Build output, `uidl-validate` CLI |

Test/code scale (TypeScript, 2026-09-16): 145 test files, 1337 tests, one typecheck, one lint pass, one
Playwright acceptance suite. Native runtimes add their own JUnit/Flutter suites.

## 2. The document model (already framework-agnostic)

`UIDLDocument` (`packages/core/src/types/index.ts`) and its Zod schema
(`packages/core/src/schemas/document.ts`) are pure data — no React import.

```ts
UIDLDocument {
  $schema?: string;       // currently only informational
  version: string;        // required but currently read-as-opaque (see §9)
  id, name, route?, theme?,
  state?, dataSources?, definitions?,
  root: UIDLNode
}
UIDLNode {
  id, type, name?, props?, style?, children?, slots?,
  responsive?, visibility?, bindings?, events?,
  repeat?, ref?, componentId?, themeRef?, testId?
}
```

Node types are **string identifiers** resolved through a `ComponentRegistry`
(`registry/registry.ts` + `registry/defaults.ts`, 34 widgets). Documents never
reference React components by name.

### Sign-language summary

| Concept | UIDL surface | Implementation |
|---|---|---|
| Layout | `Container/Row/Column/Stack/Spacer/Divider` | `components` |
| Base | `Text/Image/Button/Badge/Icon/QRCode/Barcode/DataMatrix` | `components` |
| Form | `TextField/Checkbox/Switch/Slider/Select/Textarea/RadioGroup/Form` | `components` |
| Data | `ListView/GridView/DataTable/Chart/KanbanBoard/TreeView` | `components` |
| Nav | `Sidebar/Navbar/Toolbar/PageBar` | `components` |
| Overlay | `Drawer/Panel/Popover/Dialog/Snackbar` | `components` |
| State | `state.*` + `setState` action | `state/createDocumentState.ts` (Zustand store) |
| Read | `{"$query": {...}}` dataSources | `state/dataSources.ts` → `DataAdapter` |
| Compute | `$bind` / `$expr` / `{"agg": ...}` | `expr/evaluate.ts` |
| Write | `mutate` / `command` actions | `actions/interpreter.ts` → host handler |
| Navigation | `navigate` + `onRouteChange` | `actions/interpreter.ts` + event bus |
| Reuse | `definitions` + `componentId` | `renderer/instantiateComponent.ts` |
| Layout breaks | `visibility` + breakpoints + responsive styles | `utils/responsive` + `utils/tailwind` |
| Theme | theme presets + design tokens + CSS vars | `theme/*` |

## 3. Seams already framework-agnostic

These layers have **no React dependency** and are the natural start of the formal spec:

- **`packages/core/src/types/index.ts`** (`UIDLDocument`, `UIDLNode`, `DesignTokens`,
  `WidgetManifest`, `ComponentRegistry`, prop/event descriptors) — pure TS interfaces.
- **`schemas/document.ts`, `schemas/actions.ts`, `schemas/theme.ts`** — Zod schemas.
- **`expr/evaluate.ts`** — the declarative expression evaluator (see §5).
- **`state/dataSources.ts`** — `$query` resolution, `Query` descriptor, status model.
- **`data/types.ts`** — the `DataAdapter` contract (`query/get/create/update/remove/
  transition/report`) plus `Query`, `Mutation`, `QueryResult`, `RecordMeta`.
- **`compiler/types.ts`** — the recipe/meta/capabilities contract (list/form/report/
  dashboard/settings/tree/wizard), explicitly isolated from demo/company code.
- **`theme/*`** — token maps + presets, serialized to CSS vars only at the edge.

## 4. Where React currently leaks through

| Leak | Location | Why it matters for a cross-platform spec |
|---|---|---|
| `$bind` scopes include `local.*/route.*` and render-only `data.*` | `expr/evaluate.ts`, `RenderNode.tsx` | Semantics differ between render-scope and action/event binding (`event.*`). Must be unified in the semantic model. |
| Event value extraction is DOM-based | `RenderNode.tsx` `getValueExtractor` (reads `e.target.value` off DOM nodes); `VALUE_EVENTS` special-cases `onPageChange`/`onPageSizeChange` | Flutter/Compose do not have a DOM event; the *value payload*, not the DOM event, must be the semantic contract. |
| `ActionInterpreter` ties success/error normalization to `mutationHandler`/`commandHandler` callback signatures | `actions/interpreter.ts` | Contracts are fine (host-implementable) but written as TS types, not as a neutral schema. |
| `api` action is explicitly web (`fetch`, `URL`, allowlist) | `actions/interpreter.ts` | Security-bearing; must become a documented extension/host capability in the spec, not a core assumption. |
| `showDialog`/`showSnackbar` know the host surface | `actions/interpreter.ts` + `UIDocumentRenderer.tsx` | Fine as intents; the spec must define the intent, not the DOM implementation. |
| `style` is tailwind class strings + optional inline style | `utils/tailwind.ts`, `theme/engine.ts` | Tailwind is web-only. The spec needs a neutral style/type system (tokens + class-string vs. rules) and a `StyleIntent` mapping. |
| `responsive` field deprecated, `visibility.breakpoints` is web breakpoint names | `schemas/document.ts` | Breakpoint names (`mobile/tablet/desktop/wide`) are web-ish; must be defined as neutral semantic breakpoints or moved behind capabilities. |
| Node `type` strings like `DataTable`, `TextField` are PascalCase React-component-flavoured | `registry/defaults.ts` | Not React-specific per se, but PascalCase hints at component naming; spec should define semantic identifiers (`button`, `text`, …) and let runtimes map. |
| Docs and package description are "React runtime" | `README.md`, `package.json` | Positioning step in Stage L; no code impact now. |

## 5. Expression language — current feature set

`expr/evaluate.ts` supports, on a `RenderScope { theme, local, state, session, route, data, index }`:

| Operator family | Operators |
|---|---|
| Comparison | `==`, `!=` |
| Boolean | `and`, `or`, `not` |
| Conditional | `if`, `??` (coalesce) |
| Aggregate | `agg` (`sum`/`count`/`avg`) over a collection path |

**Missing** versus plan §10: `gt/gte/lt/lte`, `add/subtract/multiply/divide`,
`contains/startsWith`. `$expr` literals live in `Schemas` as `z.unknown()` — the
evaluator is a runtime switch, not a validated grammar yet.

List of registered `$bind` prefixes: `local.*`, `state.*`, `session.*`, `route.*`,
`data.*`, plus action-time `event.*` (interpreter-only).

## 6. Data contract — current shape

- Document-level `dataSources`: inline array (synchronous, always) **or**
  `{"$query": {collection, filters, sort, page, search, fields}}` (async, via
  `DataAdapter.query`).
- Query result written to `state.$data.<name>.{status,rows,total,error}`.
  Status model: `idle → loading → success | error` (+ abort).
- `DataAdapter` ops: `query`, `get`, `create`, `update`, `remove`, `transition`, `report`.
- Same case matrix tested against `InMemoryAdapter` and `HttpAdapter`
  (`data/__tests__/contract.test.ts`).

## 7. Actions — current feature set

From `types/actions.ts` + `schemas/actions.ts`: `setState`, `navigate`, `api`,
`mutate` (create/update/delete/transition), `command`, `showSnackbar`, `showDialog`,
`validate`, `sequence`, `if`. Fail-closed by default: `api` needs an allowlist,
`mutate`/`command` need a host handler, otherwise they refuse to run.

## 8. Versioning today

- `UIDL_RUNTIME_VERSION = "1.1.0"` (`version.ts`) — the **runtime** version.
- `package.json version = 0.1.4` — the **package** version.
- `DocumentSchema.version: z.string()` — required, but **not validated against a
  supported range**. Nothing checks major/minor compatibility today (plan §6/§25 gap:
  `UNSUPPORTED_VERSION` does not exist).

## 9. Public API surface that must remain backward compatible

`packages/core/src/index.ts` exports (consumer-visible):

- `DocumentSchema`, `DesignTokensSchema`, `ThemePresetsSchema`, `ActionSchema`, `ActionsSchema`
- `generateJsonSchemas` / `JsonSchemaExport`
- `renderUIDocument`, `createRenderContext` (+ `RenderOptions`, `RenderContext`)
- `UIDocumentRenderer` (+ props) — React component
- `createRegistry`, `defaultRegistry`, `registerComponent`
- All `types/*` — `UIDLDocument`, `UIDLNode`, actions, themes, registry, compiler recipe types
- Data: `DataAdapter` types, `InMemoryAdapter`, `HttpAdapter`, `DataError`
- State: `createDocumentState`, `getByPath`, `setByPath`
- `DataSources`: `createInlineArrayResolver`, `isQueryDataSource`, `runDataSources`, …
- Theme: `createThemeEngine`, `registerTheme`, presets, `themeToCssVariables`, serialize helpers
- Compiler: `compileListPage` … `compileWizardPage`, `semanticNodeId`, `semanticListNodeIds`
- Editor (`Editor`), charts, barcodes, icons, i18n utils, `generateUidlFromPrompt`
- `UIDL_RUNTIME_VERSION`, `REGISTRY_VERSION`, `getRegistryFingerprint`

## 10. Build / test / CI

- Build: `tsc -b` + Vite build + Tailwind CSS + JSON-schema generation.
- Tests: Vitest unit+integration; Playwright acceptance + visual baselines (canonical Linux).
- CI: `ci.yml` (lint/typecheck/test/audit), publish workflows for npm (Trusted
  Publishing OIDC) and GitHub Packages mirror, agent-secure security gate, verified
  manually by `verify-*.yml`.

## 11. Architecture gaps vs. the target platform

Closed since the 2026-09-15 snapshot: `spec/` JSON schemas + Approved semantics,
version enforcement (`UNSUPPORTED_VERSION` / `MALFORMED_VERSION`), canonical
expression ops with a depth bound, error taxonomy (`ERROR_CODES`), 55 shared
conformance fixtures, AI pipeline (`validateAndSanitizeUidl`), Java generator +
Quarkus compile/validate, Flutter and Android semantic cores.

Still open (optional / future-major, not 1.x leftovers):

1. **AndroidX Compose UI.** `runtime-android` is a JVM tree + tests. It does not
   ship `@Composable` widgets or an Android APK.
2. **ISO QR / Recharts-level charts.** Flutter paints document data; encoding is
   not a standards QR/barcode library.
3. **StyleIntent on native.** React still uses Tailwind class strings.
4. **Extension actions** and **`spec/components`** stay Planned / future-major.
5. Remaining `error` parser cases still assert “any exception” except
   `unknown-action`. Java generator tests are compiler tests, not the shared suite.

Closed in follow-up: `action-exec` cases execute `setState` (write + `$data`
reject) on React, Flutter, and Android. The same `$query` document renders through
`HttpAdapter` + mock HTTP server. `spec/README.md` no longer claims React Native.

## 12. What NOT to break

- `npm install uidl-runtime` + `DocumentSchema.parse(raw)` + `<UIDocumentRenderer/>`.
- In-memory data mode (default) and HTTP mode (`VITE_DATA_MODE=http`).
- The Meridian double-entry invariant (`sum(debit) === sum(credit)`), the audit gates,
  and the 11 verticals.
- `uidl-validate` CLI (`bin/validate.mjs`).

> This file is a snapshot. Re-audit after every stage that changes the seam resolution
> to keep `current-state.md` honest — see `migration-plan.md`.