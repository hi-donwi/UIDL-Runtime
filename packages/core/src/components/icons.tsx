/*
 * The icon layer.
 *
 * Meridian draws its own chrome with `feather-icons` SVGs at a single stroke weight; this
 * package does the same with Heroicons v2 outline paths, inlined by
 * `scripts/generate-icon-set.mjs` (see `iconPaths.ts`). Outline only — an active row is marked
 * by Meridian's 4px inset bar and a darker label, never by swapping the icon to a filled variant.
 *
 * Two consumers:
 *   - React code (the demo shell, widgets) uses `<Icon name="printer" />`
 *   - JSON documents use the registered `Icon` widget, or `iconName` on `Button`
 */
import type { CSSProperties } from "react";
import { ICON_PATHS } from "./iconPaths";

export interface IconProps {
  /** A name from `ICON_NAMES`. An unknown name renders nothing rather than a broken glyph. */
  name: string;
  /** Tailwind sizing/colour classes. Defaults to Meridian's sidebar icon size. */
  className?: string;
  style?: CSSProperties;
  /** Give the icon an accessible name; without one it stays `aria-hidden`. */
  title?: string;
  /** Meridian strokes its chrome icons at 1.5; 2 reads better below 16px. */
  strokeWidth?: number;
}

/**
 * One outline glyph. `currentColor` on the stroke means an icon inherits the text colour of the
 * row it sits in, which is what keeps the sidebar's active/inactive states in one place.
 */
export function Icon({ name, className, style, title, strokeWidth = 1.5 }: IconProps) {
  const paths = ICON_PATHS[name];
  if (!paths) return null;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-4 w-4 flex-shrink-0"}
      style={style}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : "true"}
      data-icon={name}
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/**
 * The registry widget. Sized in `em` so an icon dropped next to text in a document tracks that
 * text's size instead of needing a class of its own.
 */
export function IconWidget({
  name,
  size,
  title,
  className,
  strokeWidth,
}: {
  name?: string;
  size?: number | string;
  title?: string;
  className?: string;
  strokeWidth?: number;
}) {
  if (!name) return null;
  const resolved = size ?? "1.15em";
  return (
    <Icon
      name={name}
      title={title}
      strokeWidth={strokeWidth}
      className={className ?? "inline-block flex-shrink-0 align-[-0.15em]"}
      style={{ width: typeof resolved === "number" ? `${resolved}px` : resolved, height: typeof resolved === "number" ? `${resolved}px` : resolved }}
    />
  );
}
