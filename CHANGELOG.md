# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versioning follows
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.3] - 2026-09-16

### Added
- Native Android Kotlin runtime (`runtime-android/`) implementing offline AST parsing, dot-notation `BindingResolver`, depth-limited `ExpressionEvaluator` with reference equality and numeric normalization, `ActionDispatcher`, and Jetpack Compose component contracts.
- Native Flutter runtime (`runtime-flutter/`) with reactive state binding, dynamic widget renderer, and cross-platform conformance suite.
- Java UIDL generator library (`server/uidl-generator/`) supporting 7 canonical page recipes, capability validator, and semantic ID generation.
- Quarkus REST server (`server/uidl-server/`) providing HTTP compilation, validation, and health check endpoints.
- AI UIDL generation and validation pipeline with semantic bounds and safety checks (`validateSemantic.ts`, `aiPipeline.ts`).
- Standalone CLI compiler binary `bin/compile.mjs` (`uidl-compile`).
- Telemetry metrics collector (`MetricsCollector`) for compiler execution latency, percentile calculations (p50/p95), AST node counts, hierarchy depth, and in-flight query deduplication hit ratios.
- Compiler performance and throughput benchmarking harness (`scripts/benchmark-compilers.mts`) verifying >350,000 ops/sec across all 7 page recipes (`npm run bench:compilers`).
- Automated multi-platform test matrix in GitHub Actions CI testing Node.js, Java, Quarkus, Android Kotlin, and Flutter runtimes.
- Companion workspace control application (`apps/workspace-control`).
- Cross-platform conformance suite expanded to 55 test cases across 7 domains.

## [0.1.2] - 2026-09-15

### Added
- Manual GitHub Actions smoke test for installing and importing the GitHub Packages mirror.
- GitHub Actions workflow for publishing the public npm package with npm Trusted Publishing
  and OIDC.
- Manual GitHub Actions smoke test for installing and importing the public npm package.

### Changed
- GitHub Packages mirror publishing now requires an explicit version on manual dispatch.
- GitHub Packages mirror publishing now disables package-manager cache in the release job.
- GitHub Packages mirror publishing now waits for the public npm package and refuses to
  overwrite an existing mirror version.
- Manual publish dispatches now require the default branch.
- Documented npm authentication for installing the GitHub Packages mirror.
- Documented the release automation and npm trusted publisher settings.

### Fixed
- Renamed the ESLint flat config to `eslint.config.mjs` so lint runs without Node module-type
  warnings while preserving the package's CommonJS-compatible publish shape.

## [0.1.1] - 2026-09-13

### Added
- `repository`, `homepage`, `bugs` and `author` fields in `package.json`, so the npm
  package page links back to this repository.

### Fixed
- Normalized the `uidl-validate` bin path (dropped a redundant leading `./`).

## [0.1.0] - 2026-09-13

Initial public release.

### Added
- Schema-driven UIDL document model (`DocumentSchema`) covering layout, state, queries,
  bindings, events and actions.
- `UIDocumentRenderer` and component registry for rendering validated documents.
- A single `DataAdapter` seam for reads, with in-memory and HTTP implementations.
- A fail-closed `mutate` action boundary for writes, delegated to a host-supplied handler.
- List, form, report, dashboard, settings, tree and wizard compiler recipes.
- Meridian: a full double-entry accounting reference (chart of accounts, sales and purchase
  cycles, journal entries, payments, stock ledger, POS shifts, General Ledger, Trial Balance,
  Profit and Loss, Balance Sheet).
- Eleven industry reference consoles: shoe retail POS, school finance, manufacturing, food
  roasting, EPC contracting, CRM, cooperative/BMT, hospital, medical device, omnichannel
  distribution, and helpdesk.
- Bilingual (Indonesian/English) reference interface.
- JSON Schema exports for the document, action, theme-presets and design-tokens contracts.
- `uidl-validate` CLI for validating UIDL documents against the schema.

[Unreleased]: https://github.com/hi-donwi/UIDL-Runtime/compare/v0.1.3...HEAD
[0.1.3]: https://github.com/hi-donwi/UIDL-Runtime/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/hi-donwi/UIDL-Runtime/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/hi-donwi/UIDL-Runtime/releases/tag/v0.1.1
[0.1.0]: https://github.com/hi-donwi/UIDL-Runtime/releases/tag/v0.1.0
