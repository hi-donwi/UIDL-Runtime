# ADR-0011: Opt-in Administration Compositions and Stable Control Geometry

- Status: Accepted
- Date: 2026-10-15

## Context

Valid documents can render ungrouped fields and touching actions. Generic layout
widgets deliberately do not impose geometry. Broad host button rules can increase
a pager's height while leaving its narrow width unchanged.

## Decision

Keep generic widgets unchanged. Export small React-free presentation builders for
headers, forms, sections, and action bars. They emit existing registry widgets with
shared CSS hooks owned by the runtime stylesheet. They preserve supplied state and
action descriptors. Generators may use the same hooks without importing React.

Separate pagination target geometry from glyph size and use intrinsic wrapping.
Keep the geometry inline to withstand broad host action-button sizing rules.
Verify appearance with browser geometry, focus, contrast, and reflow checks in
addition to schema and action tests.

## Alternatives

- Global form/column defaults would change layouts that intentionally set their own
  composition, so the new administration styling is opt-in.
- New widget types add registry and cross-platform contracts without independent
  behavior; existing nodes suffice.
- Copying geometry into each generator makes layouts drift. Shared CSS hooks keep
  presentation owned by UIDL Runtime, consistent with ADR-0010.

## Consequences

Consumers must import the matching stylesheet. Existing theme branding remains
subject to contrast review. Runtime-specific CSS does not promise pixel parity in
Flutter or Android.
