# uidl-runtime

[![npm version](https://img.shields.io/npm/v/uidl-runtime.svg)](https://www.npmjs.com/package/uidl-runtime)
[![pub package](https://img.shields.io/pub/v/uidl_flutter.svg)](https://pub.dev/packages/uidl_flutter)
[![CI](https://github.com/hi-donwi/UIDL-Runtime/actions/workflows/ci.yml/badge.svg)](https://github.com/hi-donwi/UIDL-Runtime/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/npm/l/uidl-runtime.svg)](LICENSE)

A schema-driven React runtime that renders validated JSON documents into real application
surfaces — lists, forms, reports, dashboards and settings — without putting business
workflows inside page components.

A **UIDL document** is JSON describing layout, state, queries, bindings, events and actions.
`uidl-runtime` validates it against a Zod schema and renders it through a component registry.
Nothing in a document names a data source, an HTTP client or a database: reads go through a
single `DataAdapter` seam and writes go through a host-supplied mutation handler, so the same
document runs in memory, against a mock API, or against a real backend.

It was built for three callers: AI agents that generate interfaces from structured
instructions, ERP-style products whose screens are defined by metadata rather than code, and
low-code systems that need a validated document model instead of generated page files.

## Screenshots

Every screen below is generated UIDL, rendered by the same `UIDocumentRenderer` — none of it
is hand-built page markup.

| | |
|---|---|
| ![Reference gallery](docs/screenshots/landing.png) <br> Reference gallery — 11 industry consoles plus Meridian | ![Meridian dashboard](docs/screenshots/meridian-dashboard.png) <br> Meridian — cashflow, P&L and expenses derived from postings |
| ![Meridian POS](docs/screenshots/meridian-pos.png) <br> Point of sale, generated from the same document model | ![Hospital console](docs/screenshots/hospital-console.png) <br> Hospital reference console — one of eleven industry verticals |

## Install

```bash
npm install uidl-runtime
```

Flutter (pub.dev):

```yaml
dependencies:
  uidl_flutter: ^0.1.4
```

https://pub.dev/packages/uidl_flutter

### GitHub Packages mirror

The public npm package above is the primary distribution. A GitHub Packages mirror is
published as `@hi-donwi/uidl-runtime`, because GitHub Packages requires npm packages to
use a scope. GitHub Packages requires authentication even for public packages.

```ini
@hi-donwi:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```bash
NODE_AUTH_TOKEN="$(gh auth token)" npm install @hi-donwi/uidl-runtime
```

```tsx
import { DocumentSchema, UIDocumentRenderer, meridianLightTheme } from "@hi-donwi/uidl-runtime";
import "@hi-donwi/uidl-runtime/style.css";
```

To test the mirror without writing a token to your repository, use a temporary npm config:

```bash
tmpdir="$(mktemp -d)"
printf '%s\n' \
  '@hi-donwi:registry=https://npm.pkg.github.com' \
  '//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}' \
  > "$tmpdir/.npmrc"

NODE_AUTH_TOKEN="$(gh auth token)" \
  npm --userconfig "$tmpdir/.npmrc" \
  view @hi-donwi/uidl-runtime@0.1.1 version \
  --registry=https://npm.pkg.github.com
```

```tsx
import { DocumentSchema, UIDocumentRenderer, meridianLightTheme } from "uidl-runtime";
import "uidl-runtime/style.css";

const document = DocumentSchema.parse(rawDocument);

export function App() {
  return (
    <UIDocumentRenderer
      document={document}
      theme={meridianLightTheme}
      onRouteChange={(path) => navigate(path)}
    />
  );
}
```

## Status

The runtime and its reference suite are functional, extensively tested, and automated across multi-platform CI gates. The reference applications are executable blueprints, not certified systems — read the maturity table below before treating any of them as finished.

- **Web / TypeScript**: 143 test files, 1,312 tests, one typecheck, one lint pass
- **Android Native (Kotlin 2.1 / Java 21)**: 69 tests covering parser, expression evaluator, binding resolver, and Compose widget abstractions
- **Flutter Native (Dart 3.7 / Flutter 3.29)**: 73 tests covering widget rendering, expression evaluator, and native widget tree
- **Server Generator & REST API (Java 21 / Quarkus)**: 43 tests across model generators and REST endpoints
- **Multi-Platform Conformance Suite**: 55 / 55 active fixtures passing across all 4 runtimes (100% pass rate)
- **Interactive Conformance Explorer**: In-browser test evaluator and multi-runtime showcase at `/conformance`
- **Workspace Control Companion**: Real-time bidirectional synchronization with `ws_web.py` for Kanban boards, backlogs, and activity clocks
- **Benchmarked Compiler Throughput**: >350,000 ops/sec across canonical page recipes with sub-millisecond p50/p95 latency
- **Automated Multi-Platform CI Matrix**: GitHub Actions pipeline executing TypeScript, Java/Quarkus, Android Kotlin, and Flutter Dart suites
- 11 industry reference consoles plus a full double-entry accounting reference
- Every financial posting satisfies `sum(debit) === sum(credit)`, checked by an audit gate

---

## Multi-Platform Runtime Ecosystem

UIDL provides native runtimes across web, mobile, and server platforms sharing the same JSON document specification:

| Platform | Directory | Language / Tooling | Package / Artifact |
|---|---|---|---|
| **Web / React** | `packages/core` | TypeScript 5.8, React 18/19 | `npm install uidl-runtime` |
| **Android Native** | `runtime-android/` | Kotlin 2.1, Java 21, Maven | `dev.uidl:uidl-android:1.0.0-SNAPSHOT` |
| **Flutter Native** | `runtime-flutter/` | Dart 3.7, Flutter 3.29 | [`uidl_flutter`](https://pub.dev/packages/uidl_flutter) `^0.1.4` on pub.dev |
| **Server Generator** | `server/uidl-generator/` | Java 21, Jackson, Maven | `dev.uidl:uidl-generator:1.0.0-SNAPSHOT` |
| **Quarkus Server** | `server/uidl-server/` | Java 21, Quarkus 3.x, RESTEasy | Microservice executable |
| **Companion App** | `apps/workspace-control/` | React 19, Vite, Tailwind v4 | Live workspace control desk |
| **CLI Compiler** | `bin/` | Node.js 22+ | `npx uidl-compile`, `npx uidl-validate` |

See the complete specification compliance breakdown in [docs/conformance-matrix.md](docs/conformance-matrix.md).

---

## Multi-Platform Quickstart

### 1. Web (React / TypeScript)

```bash
npm install uidl-runtime
```

```tsx
import { DocumentSchema, UIDocumentRenderer, meridianLightTheme } from "uidl-runtime";
import "uidl-runtime/style.css";

const document = DocumentSchema.parse(rawDocument);

export function App() {
  return (
    <UIDocumentRenderer
      document={document}
      theme={meridianLightTheme}
      onRouteChange={(path) => navigate(path)}
    />
  );
}
```

### 2. Android Native (Kotlin)

```kotlin
import dev.uidl.runtime.model.UidlParser
import dev.uidl.runtime.evaluator.ExpressionEvaluator
import dev.uidl.runtime.binding.BindingResolver

val parser = UidlParser()
val document = parser.parse(jsonString)
val context = mapOf("state" to mapOf("user" to mapOf("name" to "Ada Lovelace")))

// Dot-notation reactive binding resolution
val userName = BindingResolver.resolve("state.user.name", context)

// Evaluates declarative AST expressions
val result = ExpressionEvaluator.evaluate(document.root.props["visible"], context)
```

### 3. Flutter Native (Dart)

```yaml
dependencies:
  uidl_flutter: ^0.1.4
```

```dart
import 'package:flutter/material.dart';
import 'package:uidl_flutter/uidl_flutter.dart';

class UidlScreen extends StatelessWidget {
  const UidlScreen({super.key, required this.rawDocument});

  final Map<String, dynamic> rawDocument;

  @override
  Widget build(BuildContext context) {
    final document = UidlParser.parse(rawDocument);
    return UidlRenderer(document: document);
  }
}
```

### 4. Server Document Generation (Java 21)

```java
import dev.uidl.generator.builder.UIDLDocumentBuilder;
import dev.uidl.generator.model.UIDLDocument;

UIDLDocument doc = UIDLDocumentBuilder.create("invoice-form")
    .version("1.0.0")
    .title("Faktur Penjualan")
    .addState("status", "draft")
    .build();

String jsonOutput = doc.toJson();
```

### 5. Workspace Control Companion Desk

The companion application pairs directly with the local Agent Workspace daemon (`ws_web.py`) for live Kanban boards, backlog grooming, and activity tracking:

```bash
# Start local workspace backend with the UIDL runtime
python3 .agents/bin/ws_web.py --runtime uidl --port 8765

# Or start the companion app in standalone development mode
npm run dev:workspace-control
```

---

## Development Setup

The rest of this document is for working on `uidl-runtime` itself — the runtime, the
reference suite, and the build. If you only want to consume the library, `npm install
uidl-runtime` above is all you need.

### Prerequisites

- Node.js LTS (>= 20.11) and npm
- Java 21 JDK (for server generator and Quarkus server)
- Flutter SDK (for mobile runtime development)

```bash
git clone https://github.com/hi-donwi/UIDL-Runtime.git
cd UIDL-Runtime
npm install
npm run dev
```

To exercise the HTTP adapter instead of the in-memory one, run two terminals:

```bash
npm run mock:api            # mock API on port 8787
npm run dev:reference:http
```

## Release Automation

The public npm package is published from `.github/workflows/publish-npm.yml` using npm
Trusted Publishing with GitHub Actions OIDC. Configure the `uidl-runtime` package on
npmjs.com with this trusted publisher before cutting the next release:

```text
Publisher: GitHub Actions
Organization or user: hi-donwi
Repository: UIDL-Runtime
Workflow filename: publish-npm.yml
Allowed action: npm publish
```

No `NPM_TOKEN` repository secret is required for the public npm publish path. The workflow
uses Node.js 24, disables package-manager cache in the release job, requires manual publish
dispatches to run from the default branch, validates the requested version against
`package.json`, and refuses to publish a version that already exists on npm.

The GitHub Packages mirror is published separately by
`.github/workflows/publish-github-packages.yml` from the same GitHub release. The mirror
workflow waits for the same version to become available on public npm before it publishes,
and it refuses to overwrite an existing mirror version. After a release, run the manual
`Verify npm package` and `Verify GitHub Packages mirror` workflows with the released
version.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the reference application suite in memory |
| `npm run dev:reference:http` | Start the suite with `VITE_DATA_MODE=http` |
| `npm run dev:workspace-control` | Start the companion workspace control desk (port 5174) |
| `npm run mock:api` | Start the local mock API on port 8787 |
| `npm run typecheck` | Type-check all workspaces |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest unit and integration tests |
| `npm run build` | Build the public library and JSON schemas |
| `npm run build:reference` | Build the reference application suite |
| `npm run build:workspace-control` | Build the companion app production bundle |
| `npm run bench:compilers` | Benchmark compiler throughput across all 7 canonical recipes |
| `npm run audit:reference` | Architecture, maturity and balanced-GL gates |
| `npm run test:reference` | Playwright acceptance tests, in memory |
| `npm run test:reference:visual` | Playwright visual baseline tests |
| `npm run test:reference:update` | Regenerate reviewed visual baselines |
| `npm run test:reference:http` | Playwright acceptance tests over HTTP |
| `npm run smoke:package` | Pack and consume the public npm artifact |
| `npm run validate:examples` | Validate the example UIDL documents |
| `npm run validate:spec` | Validate the UIDL specification schemas |

## How it works

Reads flow one way, from metadata to rendered surface:

```text
DoctypeMeta / ModuleSpec
        -> page generator
        -> UIDLDocument            (validated by DocumentSchema)
        -> UIDocumentRenderer
        -> DataAdapter
```

Writes never take that path. They cross an explicit boundary instead:

```text
UIDL mutate action
        -> host mutationHandler
        -> document or domain service
        -> DataAdapter
```

The data mode is chosen in exactly one file, `packages/templates/src/config/data.config.ts`.
Documents and generators must not import a concrete adapter.

### Core concepts

- `$bind` reads reactive state or query results.
- `$query` delegates a read to the `DataAdapter`.
- `$expr` evaluates the supported declarative expressions, including aggregates.
- `mutate` delegates a write to the host and **fails closed** when no permitted handler exists.
- Generic list, form, workspace, settings, dashboard and report surfaces are generated UIDL.
- A composite transaction may use a thin React component when UIDL cannot express the
  interaction — but the business rules stay in services.

## Repository structure

```text
uidl-runtime/
├── packages/
│   ├── core/               # Web runtime, schemas, renderer, expressions, telemetry
│   └── templates/          # Reference generators, 11 verticals, domain services
├── runtime-android/        # Android Native Kotlin 2.1 runtime & Compose abstractions
├── runtime-flutter/        # Flutter Native Dart runtime & widget tree renderer
├── server/
│   ├── uidl-generator/     # Java 21 fluent AST document builder & JSON serializer
│   └── uidl-server/        # Quarkus 3.x REST server backend
├── apps/
│   ├── reference/          # Reference suite, gallery, playground, and consoles
│   └── workspace-control/  # Companion desk for runs, tasks, and telemetry
├── conformance/            # 55 cross-platform test fixtures across 7 domains
├── e2e/                    # Browser acceptance and visual-regression tests
├── scripts/                # Compiler benchmarks, packaging, and validation tools
└── docs/                   # Architecture, ADRs, and cross-platform conformance matrix
```

`packages/core`, `packages/templates`, `apps/reference`, and `apps/workspace-control` are npm workspaces. The
published npm artifact is [`uidl-runtime`](https://www.npmjs.com/package/uidl-runtime) (with `style.css`). The
Flutter runtime is published separately as [`uidl_flutter`](https://pub.dev/packages/uidl_flutter) `0.1.4` on
pub.dev. Android and Java artifacts remain SNAPSHOT libraries in this repository.


Visual regression tests are intentionally separate from the default reference command.
The committed baselines are generated on the canonical Linux CI environment. Run
`npm run test:reference:visual` locally only on an environment with matching platform
baselines, and use `npm run test:reference:update` only for a reviewed visual change.

## Reference suite

**Meridian** is the core reference: a complete double-entry accounting desk — chart of
accounts, sales and purchase cycles, journal entries, payments, stock ledger, POS shifts,
General Ledger, Trial Balance, Profit and Loss and Balance Sheet. Every report is *derived*
from postings rather than hand-written, so the books balance by construction.

Eleven industry consoles sit beside it: shoe retail POS, school finance, manufacturing, food
roasting, EPC contracting, CRM, cooperative/BMT, hospital, medical device, omnichannel
distribution and helpdesk. Several model Indonesian business documents directly — Faktur
Pajak, e-Faktur DJP, Surat Jalan, Akad Murabahah — and the interface runs bilingually in
Indonesian and English.

Maturity is stated per reference rather than claimed for the suite:

| Level | Meaning |
|---|---|
| Concept Reference | Architecture or workflow direction, no complete user journey |
| UI Reference | Reusable interface pattern, no complete business execution |
| Functional Reference | Executable workflow with deterministic data and acceptance evidence |
| Domain-Verified Reference | Functional, plus proven domain invariants and reconciliation |
| Production-Ready | Operations, security, accessibility, performance and support proven |

Most verticals are Functional References. School dunning, koperasi murabahah collectibility,
hospital claim reconciliation and helpdesk SLA are Domain-Verified. **None is
Production-Ready.** A workflow counts as proven only when a browser test drives its UI;
calling a service directly counts as setup, not evidence.

## Implementation rules

- Presentation in components, reusable behaviour in hooks, pure functions in utilities,
  workflows and integrations in services.
- Validate every generated document with `DocumentSchema` before rendering.
- Keep one `DataAdapter` seam; never import a concrete adapter from a document, generator or
  UI component.
- Require `sum(debit) === sum(credit)` for every financial posting.
- Keep API-backed actions fail-closed and explicitly allowlisted.
- Use the shared design tokens and vector icons; respect `prefers-reduced-motion`.
- Do not introduce a second primary runtime model alongside `UIDLDocument`.

## Credits

Outline icons are from [Heroicons](https://heroicons.com) (MIT). The interface type is
[Inter](https://rsms.me/inter/) (SIL Open Font License).

## License

MIT — see [LICENSE](LICENSE).
