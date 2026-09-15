# Conformance

Machine-checkable test cases: one JSON file per behaviour, an `expected` value, and
(optionally) a render scope (`context`). Active cases run automatically in the
reference runtime's test suite; planned cases are authored and committed but skipped.

## Structure

```
conformance/
  schema/
    conformance-case.schema.json   ← the JSON Schema a case must validate against
  cases/
    expression/   ← evaluate() with null context → expected value
    binding/      ← resolvePath() over a partial scope → expected value
    condition/    ← evaluate() treated as a boolean → expected true/false
    action/       ← ActionSchema must accept the action (the runtime's fixed vocabulary)
    error/        ← input that must fail, mapped to an error code (document validation and the
                    version guard are active; unknown-action is active via ActionInterpreter.run)
    render/       ← renderUIDocument() must produce a valid element from the document
    data/         ← createRenderContext() resolves the dataSource entry (inline array → as-is;
                    unstarted $query → [])
```

## Running

- `npx vitest run packages/core/src/conformance`: reads all `active` cases and
  executes them with the reference runtime.
- `node scripts/validate-spec.mjs`: validates every `*.schema.json` against itself,
  validates the 25 real shipped documents against `document.schema.json`, and
  validates every conformance case against the case schema.

## Adding a case

1. Create a new JSON file under the appropriate `class` directory.
2. Follow the schema: `$schema`, `id`, `class`, `status`, `spec`, `input`, `context`,
   `expected`. Expression/condition cases use an empty `context: {}`.
3. Run `node scripts/validate-spec.mjs` to validate the case is well-formed.
4. Run `npx vitest run packages/core/src/conformance` to confirm it passes.

## Case rules

- An active case evaluates `input` over `context` with the reference runtime and
  compares the result to `expected`. `undefined` cannot round-trip as JSON so
  binding-missing cases use `null` in `expected` — the harness coerces to `undefined`
  during comparison.
- `error`-class active cases: `DOCUMENT_VALIDATION` asserts `input` (a document) fails
  `DocumentSchema`; `UNSUPPORTED_VERSION`/`MALFORMED_VERSION` call the version guard
  (`assertSupportedDocumentVersion`) on `input.version` and assert the raised
  `DocumentVersionError.code`; `UNKNOWN_ACTION` runs the action through
  `ActionInterpreter.run` and asserts `ok: false` with code `UNKNOWN_ACTION`.
- `action`-class active cases assert `ActionSchema` (the runtime's fixed vocabulary)
  accepts `input`.
- `data`-class active cases take `input: {key, config}` and assert `createRenderContext`
  resolves the dataSource to `expected` (inline array → as-is; a `$query` that has never
  started → `[]`).
- `render`-class active cases take a full UIDLDocument as `input` and assert
  `renderUIDocument` produces a valid element (`expected: true`).
- A planned case is committed to the `cases/` tree with `"status": "planned"` so its
  expected shape is visible before the harness covers it. The harness skips planned
  cases.
- A case `id` is a short lowercase-kebab string and should be unique across all
  classes.
- `input` is an expression tree (for `expression`/`condition`), a `{"$bind": "<path>"}`
  leaf (for `binding`), an action (for `action`), a full UIDLDocument (for `render`),
  or a `{key, config}` dataSource entry (for `data`).