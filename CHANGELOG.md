# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versioning follows
[Semantic Versioning](https://semver.org/).

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

[0.1.0]: https://github.com/hi-donwi/UIDL-Runtime/releases/tag/v0.1.0
