import { describe, expect, it } from "vitest";
import { cn } from "../cn";

describe("cn — Meridian custom utilities conflict like their Tailwind counterparts", () => {
  it("lets a later row height override an earlier one", () => {
    expect(cn("h-row-largest", "h-row-large")).toBe("h-row-large");
    expect(cn("h-row-mid", "h-row-largest")).toBe("h-row-largest");
  });

  it("lets a later Meridian width override an earlier one", () => {
    expect(cn("w-form", "w-app")).toBe("w-app");
  });

  it("still resolves stock Tailwind conflicts", () => {
    expect(cn("h-8", "h-row-large")).toBe("h-row-large");
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("keeps unrelated classes", () => {
    expect(cn("flex items-center", "h-row-large")).toBe("flex items-center h-row-large");
  });
});
