# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versioning follows
[Semantic Versioning](https://semver.org/).

## [Unreleased]

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

[Unreleased]: https://github.com/hi-donwi/UIDL-Runtime/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/hi-donwi/UIDL-Runtime/releases/tag/v0.1.1
[0.1.0]: https://github.com/hi-donwi/UIDL-Runtime/releases/tag/v0.1.0
