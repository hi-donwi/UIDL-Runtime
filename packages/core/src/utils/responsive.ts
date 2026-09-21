import type { UIDLNode } from "../types";

export function flattenResponsive(
  obj: Record<string, unknown> = {},
  breakpoints: string[] = ["base", "sm", "md", "lg", "xl", "2xl"],
): string {
  const classes: string[] = [];

  for (const [, value] of Object.entries(obj)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const responsive = value as Record<string, unknown>;
      for (const bp of breakpoints) {
        const val = responsive[bp];
        if (val && typeof val === "string") {
          const prefix = bp === "base" ? "" : `${bp}:`;
          classes.push(`${prefix}${val}`);
        }
      }
    } else if (typeof value === "string") {
      classes.push(value);
    }
  }

  return classes.join(" ");
}

export function normalizeNodeResponsive(node: UIDLNode): UIDLNode {
  if (!node.responsive) return node;

  const style = { ...(node.style ?? { }) };

  for (const [key, value] of Object.entries(node.responsive)) {
    if (typeof key !== "string") continue;
    if (typeof value !== "object" || value === null || Array.isArray(value)) continue;

    const existing = style[key];
    const responsive = value as Record<string, unknown>;

    if (existing && typeof existing === "object" && !Array.isArray(existing)) {
      style[key] = {
        ...(existing as Record<string, unknown>),
        ...responsive,
      };
    } else {
      const base = existing !== undefined ? existing : undefined;
      const merged: Record<string, unknown> = {};
      if (base !== undefined) merged.base = base;
      Object.assign(merged, responsive);
      style[key] = merged;
    }
  }

  return {
    ...node,
    style,
    responsive: undefined,
  };
}
