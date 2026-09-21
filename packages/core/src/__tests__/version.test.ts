import { describe, expect, it } from "vitest";
import { defaultRegistry } from "../registry/registry";
import {
  UIDL_RUNTIME_VERSION,
  UIDL_SPEC_VERSION,
  REGISTRY_VERSION,
  getRegistryVersion,
  getRegistryFingerprint,
  reportDocumentVersion,
  assertSupportedDocumentVersion,
  DocumentVersionError,
} from "../version";

describe("version", () => {
  it("exports a stable runtime version string", () => {
    expect(UIDL_RUNTIME_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("exports the document spec version as major.minor", () => {
    expect(UIDL_SPEC_VERSION).toMatch(/^\d+\.\d+$/);
    expect(UIDL_SPEC_VERSION).toBe("1.0");
  });

  it("computes a registry version covering every registered component", () => {
    const vbWidgets = defaultRegistry.list();
    expect(REGISTRY_VERSION.componentCount).toBe(vbWidgets.length);
    expect(REGISTRY_VERSION.components).toHaveLength(vbWidgets.length);

    const widgetTypes = new Set(vbWidgets.map((w: { type: string }) => w.type));
    for (const component of REGISTRY_VERSION.components) {
      const type = component.split(":")[0];
      expect(widgetTypes.has(type), `registry version should reference known component ${type}`).toBe(true);
    }
  });

  it("exposes a fingerprint that changes when a component's prop/event signature changes", () => {
    const fingerprint = getRegistryFingerprint();
    expect(fingerprint).toContain("Text");
    expect(fingerprint).toContain("value");

    expect(getRegistryVersion()).toEqual(REGISTRY_VERSION);
  });

  it("fingerprint encodes prop and event descriptors per component", () => {
    const fingerprint = getRegistryFingerprint();
    const textEntry = fingerprint.split("\n").find((line) => line.startsWith("Text:"));
    expect(textEntry).toBeDefined();
    expect(textEntry!).toContain("value");
    expect(textEntry!).toContain("heading");

    const buttonEntry = fingerprint.split("\n").find((line) => line.startsWith("Button:"));
    expect(buttonEntry).toBeDefined();
    expect(buttonEntry!).toContain("onClick");
  });

  describe("document version guard", () => {
    it("accepts major.minor and the tolerated three-part form", () => {
      expect(reportDocumentVersion("1.0")).toMatchObject({ status: "supported", major: 1, minor: 0 });
      expect(reportDocumentVersion("1.0.0")).toMatchObject({ status: "supported", major: 1, minor: 0 });
      expect(reportDocumentVersion("1.3")).toMatchObject({ status: "supported", major: 1, minor: 3 });
    });

    it("reports a different major as unsupported", () => {
      expect(reportDocumentVersion("2.0")).toMatchObject({ status: "unsupported", major: 2 });
      expect(reportDocumentVersion("0.9")).toMatchObject({ status: "unsupported", major: 0 });
    });

    it("reports anything else as malformed, without throwing", () => {
      expect(reportDocumentVersion("banana")).toMatchObject({ status: "malformed" });
      expect(reportDocumentVersion("1")).toMatchObject({ status: "malformed" });
      expect(reportDocumentVersion("1.x")).toMatchObject({ status: "malformed" });
      expect(reportDocumentVersion(42)).toMatchObject({ status: "malformed" });
      expect(reportDocumentVersion(undefined)).toMatchObject({ status: "malformed" });
    });

    it("asserts by throwing the versioning error with a stable code", () => {
      expect(() => assertSupportedDocumentVersion("2.0")).toThrowError(DocumentVersionError);
      try {
        assertSupportedDocumentVersion("2.0");
      } catch (error) {
        const e = error as DocumentVersionError;
        expect(e.code).toBe("UNSUPPORTED_VERSION");
      }
      try {
        assertSupportedDocumentVersion("nope");
      } catch (error) {
        const e = error as DocumentVersionError;
        expect(e.code).toBe("MALFORMED_VERSION");
      }
      expect(assertSupportedDocumentVersion("1.0.0")).toMatchObject({ status: "supported" });
    });
  });
});