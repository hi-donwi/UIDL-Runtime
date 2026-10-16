# ADR-0012: Host integration for generated business modules and exported standalone apps

* **Status:** Proposed (2026-10-16)
* **Deciders:** Project maintainers
* **Project:** uidl-runtime

## Context

A host platform generates business modules (lists, forms with child lines, reports, dashboards) as UIDL documents for many tenants and renders them through this runtime. A tenant may later leave the platform with a standalone application generated from its installed modules. Kerangka's RFC `20261016-host-embedding-and-application-export` covers the logic side. That application must render the same documents with this runtime, without the host's private code.

Four things stand in the way today:

1. **Hosts register widgets that the runtime lacks.** The common one is a child-line editor: add, remove and reorder rows, typed cells, row validation, totals. Each host writes its own, so an exported app cannot render a document that uses it.
2. **Stacked record drawers live in host code.** Opening a linked record, creating it in a nested form and returning its id to the link field is a desk-style interaction that documents cannot request today.
3. **Persisted documents have no standard envelope.** Hosts wrap documents with their own discriminators, runtime and registry versions and a capability profile (public, preview, read, write). Each wrapper is different, and nothing stops a preview document from mutating.
4. **There is no standalone host shell.** `wrapInShell` builds the chrome, but an application still has to write routing, session gating, a REST `DataAdapter` with RFC 9457 mapping, and mutation and command handlers before a document can do anything.

Compilation also has to happen at the edge. `uidl-runtime/recipes` is React-free since 0.1.7/0.1.8, but no test proves it runs in a Workers runtime.

## Decision

Adopt the following items in this order. Each one ships with schema changes in `spec/`, fixtures in `conformance/` and a CHANGELOG entry.

| Order | Item | Decision |
|---|---|---|
| 1 | UX-01 Edge compile | `uidl-runtime/recipes` and document validation run in a Workers runtime; CI proves it |
| 2 | UX-04 Envelope, profiles, host vocabulary | Spec a persisted envelope `{ kind, uidlVersion, runtimeVersion, registryVersion, profile, document }` with profiles `public`, `preview`, `read` and `write`. The runtime enforces the profile: `preview` and `read` refuse `mutate` and non-read `command`. Hosts keep legacy discriminators through a declared alias. Also spec a minimal host command and query vocabulary for record modules (create, update, transition, delete, list, get, aggregate) that generated documents and exported backends share |
| 3 | UX-02 Child-line editor | A registry widget for editable child lines: typed cells from field metadata, add, remove and reorder, row-level `fieldErrorsPath`, footer totals by binding. React first; Flutter and Android declare their support level |
| 4 | UX-03 Record drawer stack | An `openRecord` action and a drawer-stack host component: nested depth, focus trap and restore, dirty guard, Escape handling. A link field can create a record in a nested form and receive the new id |
| 5 | UX-06 Dense business preset | A dense desk-style presentation preset as a recipe option (row height, spacing, money formatting by currency, English and Indonesian chrome), per ADR-0010 |
| 6 | UX-05 Standalone host shell | A `uidl-runtime/host` entry: routes from a navigation manifest, session and permission gating, a REST `DataAdapter` with RFC 9457 error mapping, and mutation and command handlers over a pluggable backend client (a Kerangka client is one implementation). Kerangka's `eject` uses it |
| 7 | UX-07 Document migration | `uidl migrate` upgrades stored documents between UIDL versions. A published compatibility table covers runtime, registry and spec versions |
| 8 | UX-08 Conformance | Every new widget and action has render and action fixtures across all three harnesses, at the support level each runtime declares |

UX-08 runs alongside every item. Items 3 and 4 depend on item 2's vocabulary.

## Alternatives

| Alternative | Why not |
|---|---|
| Leave child lines and drawers to hosts | Every host re-implements them differently, and exported apps break on documents that use them |
| Export host widgets as a separate host package | Splits the registry; native runtimes would never follow |
| No envelope; keep versions inside the document only | Hosts still need a profile and a discriminator for storage, and each invents its own |
| Generate React source per exported app instead of rendering documents | Loses the conformance guarantee and the shared runtime upgrade path |

## Consequences

- The default registry gains a child-line editor and a drawer host. The widget count in the README and conformance matrix changes.
- Profile enforcement adds a check to every `mutate` and `command`. A host that mislabels a document as `preview` sees writes refused, which is intended.
- `uidl-runtime/host` becomes a new public entry with its own semver surface.
- Flutter and Android get new backlog items. They keep declaring partial support rather than claiming parity.
