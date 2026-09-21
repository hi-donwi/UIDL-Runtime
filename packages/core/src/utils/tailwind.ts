export function resolveFlexDirection(value: unknown): string | undefined {
  if (value === "row") return "flex-row";
  if (value === "row-reverse") return "flex-row-reverse";
  if (value === "column") return "flex-col";
  if (value === "column-reverse") return "flex-col-reverse";
  return undefined;
}

export function resolveJustify(value: unknown): string | undefined {
  const map: Record<string, string> = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    "space-between": "justify-between",
    "space-around": "justify-around",
    "space-evenly": "justify-evenly",
  };
  return map[value as string];
}

export function resolveAlign(value: unknown): string | undefined {
  const map: Record<string, string> = {
    start: "items-start",
    center: "items-center",
    end: "items-end",
    stretch: "items-stretch",
    baseline: "items-baseline",
  };
  return map[value as string];
}

export function resolvePosition(value: unknown): string | undefined {
  const map: Record<string, string> = {
    static: "static",
    relative: "relative",
    absolute: "absolute",
    fixed: "fixed",
    sticky: "sticky",
  };
  return map[value as string];
}

export function resolvePadding(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  return undefined;
}

export function resolveMargin(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  return undefined;
}

export function resolveTextStyle(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value;
}

const VISIBILITY_BREAKPOINT_ORDER = ["mobile", "tablet", "desktop", "wide"] as const;
const VISIBILITY_BREAKPOINT_PREFIX: Record<(typeof VISIBILITY_BREAKPOINT_ORDER)[number], string> = {
  mobile: "",
  tablet: "md",
  desktop: "lg",
  wide: "xl",
};

/**
 * Turns a `visibility.breakpoints` list (which categories the node should be visible in) into
 * Tailwind `hidden`/`block` classes. Named `resolveBreakpointVisibility` (not `resolveVisibility`)
 * to avoid confusion with `RenderNode.tsx`'s condition-based `resolveVisibility`, which decides
 * whether to render the node at all — this one keeps the node in the DOM and toggles CSS
 * `display` per breakpoint instead.
 *
 * Only emits a class where visibility actually *changes* between adjacent breakpoints, so e.g.
 * `breakpoints: ["mobile"]` produces just `"md:hidden"` (hidden from md up, no need to also
 * repeat `lg:hidden xl:hidden` — nothing turns it back on) instead of one `hidden`/`block`
 * class per category independently, which could contradict a previous one at the same
 * breakpoint (e.g. both `md:block` and `md:hidden` applying at once, whichever wins depending
 * on unrelated CSS declaration order).
 */
export function resolveVisibility(visibility: unknown): string | undefined {
  if (!visibility || typeof visibility !== "object") return undefined;
  const vis = visibility as Record<string, unknown>;
  const breakpoints = vis.breakpoints as string[] | undefined;
  if (!breakpoints || breakpoints.length === 0) return undefined;

  const visible = VISIBILITY_BREAKPOINT_ORDER.map((bp) => breakpoints.includes(bp));

  const classes: string[] = [];
  let state = visible[0];
  if (!state) classes.push("hidden");

  for (let i = 1; i < VISIBILITY_BREAKPOINT_ORDER.length; i++) {
    if (visible[i] !== state) {
      state = visible[i];
      const prefix = VISIBILITY_BREAKPOINT_PREFIX[VISIBILITY_BREAKPOINT_ORDER[i]];
      classes.push(`${prefix}:${state ? "block" : "hidden"}`);
    }
  }

  return classes.length > 0 ? classes.join(" ") : undefined;
}

const PASSTHROUGH_STYLE_KEYS = [
  "gap",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "inset",
  "top",
  "right",
  "bottom",
  "left",
  "lineHeight",
  "letterSpacing",
] as const;

export function resolveClassName(
  style: Record<string, unknown> = {},
  _responsive: Record<string, unknown> = {},
): string {
  const classes: string[] = [];

  for (const key of PASSTHROUGH_STYLE_KEYS) {
    const value = style[key];
    if (value && typeof value === "string") classes.push(value);
  }
  if (style.flexDirection) classes.push(resolveFlexDirection(style.flexDirection) ?? "");
  if (style.justifyContent) classes.push(resolveJustify(style.justifyContent) ?? "");
  if (style.alignItems) classes.push(resolveAlign(style.alignItems) ?? "");
  if (style.position) classes.push(resolvePosition(style.position) ?? "");
  if (style.display && typeof style.display === "string") classes.push(style.display);

  if (style.background && typeof style.background === "string") {
    classes.push(style.background.startsWith("bg-") ? style.background : `bg-[${style.background}]`);
  }

  return classes.filter(Boolean).join(" ");
}
