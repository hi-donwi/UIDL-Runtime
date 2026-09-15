# Architecture Decision Records

One file per decision, numbered sequentially, never deleted. A superseded ADR stays and
points at its replacement — the reasoning is what makes the history useful.

Template: [.agents/templates/adr.md](https://github.com/anomalyco/opencode/blob/main/.agents/templates/adr.md)

## When to write one

- Choosing between technologies or approaches with lasting consequences
- Promoting a spec semantics file from Draft to Approved
- Anything that will make someone ask "why is it like this?" in six months
- Every answer that comes back from the client kick-off

An ADR with no rejected alternatives records a preference, not a decision.

## Index

| # | Title | Status | Date |
|---|---|---|---|
| [0001](0001-mutations-semantics-approved.md) | Approve mutations semantics for UIDL spec v1 | Accepted | 2026-09-15 |
| [0002](0002-error-taxonomy-approved.md) | Approve the error taxonomy (errors.md) | Accepted | 2026-09-15 |
| [0003](0003-actions-approved.md) | Approve the action vocabulary — add `download` | Accepted | 2026-09-15 |
| [0004](0004-lifecycle-approved.md) | Approve the document lifecycle (lifecycle.md) | Accepted | 2026-09-15 |
| [0005](0005-query-action-approved.md) | Approve the `query` action | Accepted | 2026-09-15 |
| [0006](0006-events-approved.md) | Approve the events semantics (events.md) | Accepted | 2026-09-15 |
| [0007](0007-state-semantics-approved.md) | Approve the state semantics + `$data` envelope (state.md) | Accepted | 2026-09-15 |
| [0008](0008-queries-approved.md) | Approve the queries semantics (queries.md) | Accepted | 2026-09-15 |
| [0009](0009-style-approved.md) | Approve the style semantics (style.md) | Accepted | 2026-09-15 |
