import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { describe, it, expect } from "vitest";
import { evaluate } from "../../expr/evaluate";
import { resolvePath } from "../../state/bindings";
import { DocumentSchema } from "../../schemas/document";
import { ActionSchema } from "../../schemas/actions";
import { assertSupportedDocumentVersion, DocumentVersionError } from "../../version";
import { ActionInterpreter } from "../../actions/interpreter";
import { renderUIDocument, createRenderContext } from "../../renderer/renderDocument";
import type { UIDLDocument } from "../../types";
import type { Action } from "../../types/actions";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../../..");

function* walk(dir: string): Iterable<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walk(full);
    } else if (entry.endsWith(".json")) {
      yield full;
    }
  }
}

interface ConformanceCase {
  id: string;
  class: "expression" | "binding" | "condition" | "render" | "data" | "error" | "action";
  status: "active" | "planned";
  spec: string;
  input: unknown;
  context: Record<string, unknown>;
  expected: unknown;
}

const casesDir = join(REPO_ROOT, "conformance", "cases");
const allCases = [...walk(casesDir)].map((file) => JSON.parse(readFileSync(file, "utf8")) as ConformanceCase);
const active = allCases.filter((c) => c.status === "active");

describe("conformance (spec v1)", () => {
  describe("expression", () => {
    for (const c of active.filter((c) => c.class === "expression")) {
      it(`evaluates ${c.id}`, () => {
        expect(evaluate(c.input, c.context)).toEqual(c.expected);
      });
    }
  });

  describe("condition", () => {
    for (const c of active.filter((c) => c.class === "condition")) {
      it(`condition ${c.id}`, () => {
        expect(Boolean(evaluate(c.input, c.context))).toBe(c.expected);
      });
    }
  });

  describe("binding", () => {
    for (const c of active.filter((c) => c.class === "binding")) {
      it(`resolves ${c.id}`, () => {
        const input = c.input as { $bind: string };
        const result = resolvePath(input.$bind, c.context);
        // undefined cannot round-trip through JSON; cases encode it as null.
        expect(result ?? null).toEqual(c.expected);
      });
    }
  });

  describe("action", () => {
    for (const c of active.filter((c) => c.class === "action")) {
      it(`accepts ${c.id}`, () => {
        const parsed = ActionSchema.safeParse(c.input);
        expect(parsed.success, `expected action ${c.id} to match the v1 action vocabulary`).toBe(c.expected);
      });
    }
  });

  describe("render", () => {
    for (const c of active.filter((c) => c.class === "render")) {
      it(`renders ${c.id}`, () => {
        const doc = c.input as UIDLDocument;
        const rendered = renderUIDocument(doc);
        expect(React.isValidElement(rendered), `expected ${c.id} to render a valid element`).toBe(c.expected);
      });
    }
  });

  describe("data", () => {
    for (const c of active.filter((c) => c.class === "data")) {
      it(`resolves dataSource ${c.id}`, () => {
        const input = c.input as { key: string; config: unknown };
        const doc = {
          version: "1.0.0",
          id: c.id,
          name: c.id,
          root: { id: "root", type: "Container" },
          dataSources: { [input.key]: input.config },
        } as UIDLDocument;
        const context = createRenderContext(doc);
        expect(context.data[input.key]).toEqual(c.expected);
      });
    }
  });

  describe("error", () => {
    for (const c of active.filter((c) => c.class === "error")) {
      it(`reports ${c.expected} for ${c.id}`, () => {
        if (c.expected === "DOCUMENT_VALIDATION") {
          const parsed = DocumentSchema.safeParse(c.input);
          expect(parsed.success, `expected document ${c.id} to fail validation`).toBe(false);
          return;
        }
        if (c.expected === "UNSUPPORTED_VERSION" || c.expected === "MALFORMED_VERSION") {
          const version = (c.input as { version?: unknown }).version;
          let caught: unknown;
          try {
            assertSupportedDocumentVersion(version);
          } catch (error) {
            caught = error;
          }
          expect(caught, `expected ${c.id} to raise a version error`).toBeInstanceOf(DocumentVersionError);
          expect((caught as DocumentVersionError).code).toBe(c.expected);
          return;
        }
        if (c.expected === "UNKNOWN_ACTION") {
          const report = new ActionInterpreter().run(c.input as Action);
          expect(report.ok, `expected ${c.id} to be rejected`).toBe(false);
          expect(report.error?.code).toBe("UNKNOWN_ACTION");
          return;
        }
        throw new Error(`conformance harness has no runner for error code ${String(c.expected)}`);
      });
    }
  });

  it(`reports the active case corpus (${active.length} active, ${allCases.length - active.length} planned)`, () => {
    expect(active.length).toBeGreaterThan(0);
  });
});