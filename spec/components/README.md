# Component model — `packages/uidl-component`

*Status: **Planned**.*

## Ledger

| Date | File | Notes |
|---|---|---|
| — | `packages/uidl-component/package.json` | package.json planned but not yet created |

## Contract rule

`packages/uidl-component` is the neutral component registry and contract. No
`packages/*` source file may import it directly (dependency goes the other direction:
components import the registry). See `docs/architecture/target-state.md` §14 and the
migration-plan component step for the rationale.