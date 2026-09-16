import { describe, it, expect } from "vitest";
import { executeAiPipeline, validateAndSanitizeUidl } from "../aiPipeline";
import { validateUidlSemantic } from "../../validate/validateSemantic";
import type { UIDLDocument, UIDLNode } from "../../types";

describe("AI UIDL Generation & Validation Pipeline", () => {
  describe("executeAiPipeline with standard prompt templates", () => {
    it("synthesizes, validates, and accepts a Rental Car fleet console", () => {
      const result = executeAiPipeline("Buatkan konsol rental mobil dan armada kendaraan");
      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      expect(result.document?.id).toBe("ai-rental-fleet-console");
      expect(result.issues).toHaveLength(0);
      expect(result.metrics.nodeCount).toBeGreaterThan(0);
      expect(result.metrics.maxDepth).toBeGreaterThan(0);
    });

    it("synthesizes, validates, and accepts a Payroll HRIS console", () => {
      const result = executeAiPipeline("Sistem penggajian karyawan payroll bpjs");
      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      expect(result.document?.id).toBe("ai-payroll-hr-console");
      expect(result.issues).toHaveLength(0);
    });

    it("synthesizes, validates, and accepts a Hotel Operations console", () => {
      const result = executeAiPipeline("Operasional hotel kamar tamu check-in");
      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      expect(result.document?.id).toBe("ai-hotel-room-console");
      expect(result.issues).toHaveLength(0);
    });

    it("synthesizes, validates, and accepts arbitrary custom prompts via fallback synthesizer", () => {
      const result = executeAiPipeline("Sistem Logistik Drone Kargo Maritim");
      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      expect(result.document?.name).toBe("Sistem Logistik Drone Kargo Maritim");
      expect(result.issues).toHaveLength(0);
    });
  });

  describe("Schema Gate validation", () => {
    it("fails closed on null or non-object candidate", () => {
      const result = validateAndSanitizeUidl(null);
      expect(result.success).toBe(false);
      expect(result.document).toBeUndefined();
      expect(result.issues.some((i) => i.code === "INVALID_JSON_ROOT")).toBe(true);
    });

    it("fails closed on missing required document attributes", () => {
      const invalidDoc = {
        version: "1.0.0",
        // missing id, name, and root
      };
      const result = validateAndSanitizeUidl(invalidDoc);
      expect(result.success).toBe(false);
      expect(result.issues.some((i) => i.phase === "schema")).toBe(true);
    });

    it("fails closed on unsupported document version", () => {
      const invalidVersionDoc: UIDLDocument = {
        version: "99.0.0",
        id: "doc-v99",
        name: "Future Doc",
        root: { id: "root-1", type: "Column" },
      };
      const result = validateAndSanitizeUidl(invalidVersionDoc);
      expect(result.success).toBe(false);
      expect(result.issues.some((i) => i.code === "UNSUPPORTED_VERSION")).toBe(true);
    });
  });

  describe("Semantic Gate: Structure & ID integrity", () => {
    it("fails on duplicate node IDs in the component tree", () => {
      const docWithDupes: UIDLDocument = {
        version: "1.0.0",
        id: "test-dupe-ids",
        name: "Test Dupe IDs",
        root: {
          id: "col-1",
          type: "Column",
          children: [
            { id: "child-node", type: "Text", props: { value: "First" } },
            { id: "child-node", type: "Text", props: { value: "Duplicate" } },
          ],
        },
      };

      const result = validateAndSanitizeUidl(docWithDupes);
      expect(result.success).toBe(false);
      const dupeIssue = result.issues.find((i) => i.code === "DUPLICATE_NODE_ID");
      expect(dupeIssue).toBeDefined();
      expect(dupeIssue?.nodeId).toBe("child-node");
    });

    it("fails on empty or whitespace-only node ID", () => {
      const docWithEmptyId: UIDLDocument = {
        version: "1.0.0",
        id: "test-empty-id",
        name: "Test Empty ID",
        root: {
          id: "col-1",
          type: "Column",
          children: [{ id: "   ", type: "Text", props: { value: "No ID" } }],
        },
      };

      const result = validateAndSanitizeUidl(docWithEmptyId);
      expect(result.success).toBe(false);
      expect(result.issues.some((i) => i.code === "EMPTY_NODE_ID")).toBe(true);
    });
  });

  describe("Semantic Gate: DataSource reference integrity", () => {
    it("fails when a DataTable references an undeclared dataSource", () => {
      const docWithUndeclaredDs: UIDLDocument = {
        version: "1.0.0",
        id: "test-undeclared-ds",
        name: "Test Undeclared DS",
        dataSources: {
          existingTable: [{ id: 1, name: "Item 1" }],
        },
        root: {
          id: "root-col",
          type: "Column",
          children: [
            {
              id: "table-1",
              type: "DataTable",
              props: {
                dataSource: "ghostTable", // Undeclared!
              },
            },
          ],
        },
      };

      const result = validateAndSanitizeUidl(docWithUndeclaredDs);
      expect(result.success).toBe(false);
      const dsIssue = result.issues.find((i) => i.code === "UNDECLARED_DATASOURCE");
      expect(dsIssue).toBeDefined();
      expect(dsIssue?.message).toContain("ghostTable");
    });

    it("accepts when DataTable references a declared dataSource", () => {
      const docWithValidDs: UIDLDocument = {
        version: "1.0.0",
        id: "test-valid-ds",
        name: "Test Valid DS",
        dataSources: {
          realTable: [{ id: 1, name: "Item 1" }],
        },
        root: {
          id: "root-col",
          type: "Column",
          children: [
            {
              id: "table-1",
              type: "DataTable",
              props: {
                dataSource: "realTable",
              },
            },
          ],
        },
      };

      const result = validateAndSanitizeUidl(docWithValidDs);
      expect(result.success).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe("Semantic Gate: Binding scope safety", () => {
    it("rejects illegal binding scopes in render props", () => {
      const docWithIllegalBinding: UIDLDocument = {
        version: "1.0.0",
        id: "test-illegal-bind",
        name: "Test Illegal Bind",
        root: {
          id: "root-col",
          type: "Column",
          children: [
            {
              id: "text-1",
              type: "Text",
              props: {
                value: { $bind: "window.globalSecret" }, // Illegal scope!
              },
            },
          ],
        },
      };

      const result = validateAndSanitizeUidl(docWithIllegalBinding);
      expect(result.success).toBe(false);
      const bindIssue = result.issues.find((i) => i.code === "INVALID_BINDING_SCOPE");
      expect(bindIssue).toBeDefined();
      expect(bindIssue?.message).toContain("window.globalSecret");
    });

    it("accepts valid render scopes ($bind: state.x, data.y, local.z)", () => {
      const docWithValidBindings: UIDLDocument = {
        version: "1.0.0",
        id: "test-valid-bind",
        name: "Test Valid Bind",
        state: { counter: 42 },
        root: {
          id: "root-col",
          type: "Column",
          children: [
            {
              id: "text-1",
              type: "Text",
              props: {
                value: { $bind: "state.counter" },
              },
            },
          ],
        },
      };

      const result = validateAndSanitizeUidl(docWithValidBindings);
      expect(result.success).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("allows event.* binding scope inside actions but not in static props", () => {
      const docWithEventBindInAction: UIDLDocument = {
        version: "1.0.0",
        id: "test-event-bind",
        name: "Test Event Bind",
        root: {
          id: "btn-1",
          type: "Button",
          props: { label: "Click" },
          events: {
            onClick: {
              setState: {
                path: "state.selectedId",
                value: { $bind: "event.record.id" }, // Allowed in action context
              },
            },
          },
        },
      };

      const result = validateAndSanitizeUidl(docWithEventBindInAction);
      expect(result.success).toBe(true);
    });
  });

  describe("Semantic Gate: Action vocabulary & security", () => {
    it("fails closed on unrecognized action types in events", () => {
      const docWithUnknownAction: UIDLDocument = {
        version: "1.0.0",
        id: "test-unknown-action",
        name: "Test Unknown Action",
        root: {
          id: "btn-1",
          type: "Button",
          events: {
            onClick: {
              executeArbitraryScript: "eval('malicious')", // Unallowlisted action!
            } as any,
          },
        },
      };

      const result = validateAndSanitizeUidl(docWithUnknownAction);
      expect(result.success).toBe(false);
      expect(result.issues.some((i) => i.code === "UNKNOWN_ACTION_TYPE")).toBe(true);
    });
  });

  describe("Complexity bounds", () => {
    it("rejects documents exceeding tree depth limit", () => {
      let current: UIDLNode = { id: "leaf", type: "Text" };
      for (let i = 10; i >= 1; i--) {
        current = { id: `level-${i}`, type: "Column", children: [current] };
      }
      const deepDoc: UIDLDocument = {
        version: "1.0.0",
        id: "deep-doc",
        name: "Deep Doc",
        root: current,
      };

      const result = validateAndSanitizeUidl(deepDoc, {
        semanticOptions: { maxDepth: 5 },
      });
      expect(result.success).toBe(false);
      expect(result.issues.some((i) => i.code === "TREE_DEPTH_EXCEEDED")).toBe(true);
    });

    it("rejects documents exceeding total node limit", () => {
      const children: UIDLNode[] = [];
      for (let i = 0; i < 20; i++) {
        children.push({ id: `child-${i}`, type: "Text" });
      }
      const largeDoc: UIDLDocument = {
        version: "1.0.0",
        id: "large-doc",
        name: "Large Doc",
        root: { id: "root", type: "Column", children },
      };

      const result = validateAndSanitizeUidl(largeDoc, {
        semanticOptions: { maxNodeCount: 10 },
      });
      expect(result.success).toBe(false);
      expect(result.issues.some((i) => i.code === "NODE_COUNT_EXCEEDED")).toBe(true);
    });
  });

  describe("Direct validateUidlSemantic", () => {
    it("validates semantic rules and flags unknown component when strict", () => {
      const doc: UIDLDocument = {
        version: "1.0.0",
        id: "direct-sem-test",
        name: "Semantic Test",
        root: {
          id: "root-box",
          type: "NonExistentWidget99",
        },
      };

      const normalResult = validateUidlSemantic(doc, { strictComponents: false });
      expect(normalResult.valid).toBe(true);

      const strictResult = validateUidlSemantic(doc, { strictComponents: true });
      expect(strictResult.valid).toBe(false);
      expect(strictResult.issues.some((i) => i.code === "UNKNOWN_COMPONENT_TYPE")).toBe(true);
    });
  });
});
