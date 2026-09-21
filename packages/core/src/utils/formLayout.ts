/*
 * Meridian's form measurements, as style objects the recipe compilers can share.
 *
 * The Meridian reference documents in `templates/src/meridian/meridianLayout.ts` have always carried
 * these, but the compilers are held to a dependency guard that forbids importing anything from
 * templates (`compiler/__tests__/dependencyGuard.test.ts`) — so they grew a second, thinner set
 * of their own and the generated screens came out visibly tighter than the reference: rows with
 * no height and no vertical padding, no rule between fields, no card, and a page title flush
 * against the viewport edge.
 *
 * The measurements are not demo data, so they belong in core next to `meridian-theme.css` and
 * `theme/meridianPreset.ts`, where both paths can reach them. Each constant names the upstream
 * file it reproduces.
 *
 *   FormContainer   w-form (600px) card, `border rounded-lg shadow-lg mx-4`, gray-25 page
 *   FormHeader      h-row-large (3.5rem), px-4, text-xl font-semibold, border-b
 *   TwoColumnForm   1fr/1fr grid, h-row-mid (3rem), border-b, label `ps-4 text-gray-600`
 *   SectionHeader   px-4 py-2.5, text-sm font-semibold, border-b
 */

const BORDER = "{primitives.color.border}";
const TEXT_SECONDARY = "{primitives.color.text-secondary}";

/** FormContainer's page: the card is centred on the page ground, not flush to it. */
export const MERIDIAN_FORM_PAGE_STYLE = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  width: "w-full",
  minHeight: "min-h-full",
  background: "{primitives.color.surface}",
  paddingTop: "pt-4",
  fontSize: "text-base",
} as const;

/** A full-width form (FormContainer's `useFullWidth`, used when the document has a line table). */
export const MERIDIAN_FORM_PAGE_FULL_STYLE = {
  display: "flex",
  flexDirection: "column",
  width: "w-full",
  minHeight: "min-h-full",
  background: "{primitives.color.surface}",
  fontSize: "text-base",
} as const;

/** FormContainer — the one place in Meridian where border, radius and shadow are all used. */
export const MERIDIAN_FORM_SHELL_STYLE = {
  display: "flex",
  flexDirection: "column",
  width: "w-form",
  maxWidth: "max-w-full",
  margin: "mx-4 mb-4",
  background: "{primitives.color.surface-elevated}",
  borderWidth: "border",
  borderColor: BORDER,
  borderRadius: "rounded-lg",
  shadow: "{primitives.shadow.lg}",
} as const;

/** FormHeader — the in-page title bar. */
export const MERIDIAN_FORM_HEADER_STYLE = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "px-4",
  height: "h-row-large",
  borderWidth: "border-b",
  borderColor: BORDER,
} as const;

/** TwoColumnForm — label and control share one row, closed by a rule. */
export const MERIDIAN_FORM_ROW_STYLE = {
  borderWidth: "border-b",
  borderColor: BORDER,
  minHeight: "min-h-row-mid",
} as const;

export const MERIDIAN_FORM_ROW_GRID = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
  alignItems: "center",
} as const;

/** The label sits in the start column; only it carries the leading padding. */
export const MERIDIAN_FORM_LABEL_STYLE = {
  padding: "ps-4",
  color: TEXT_SECONDARY,
  fontSize: "text-base",
} as const;

/** The control sits flush in the end column — the row's rule does the separating. */
export const MERIDIAN_FORM_CONTROL_STYLE = {
  padding: "py-2 pe-4",
} as const;

/**
 * Controls/Base: inside a form row a control is borderless and `size="small"`, because the
 * row it sits in is already bounded. A boxed control there reads as a second frame.
 */
export const MERIDIAN_FORM_CONTROL_PROPS = { border: false, size: "small" } as const;

/** SectionHeader */
export const MERIDIAN_SECTION_HEADER_STYLE = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "px-4 py-2.5",
  background: "{primitives.color.surface}",
  borderWidth: "border-b",
  borderColor: BORDER,
  fontSize: "text-sm",
  fontWeight: 600,
  color: TEXT_SECONDARY,
} as const;

/** CommonForm's footer: actions right-aligned in a `p-4` strip below the last row. */
export const MERIDIAN_FORM_FOOTER_STYLE = {
  display: "flex",
  justifyContent: "end",
  alignItems: "center",
  gap: "gap-2",
  padding: "p-4",
} as const;
