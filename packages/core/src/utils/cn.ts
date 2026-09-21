import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Meridian's row metrics are custom utilities (`h-row-mid`, `h-row-large`, `w-form`, …), not
 * Tailwind's own, so stock tailwind-merge does not know they conflict with each other — it kept
 * both and let stylesheet order decide. A widget's default height then beat the height the
 * document asked for: a Navbar defaulting to `h-row-largest` (4rem) rendered a form header the
 * document had declared as `h-row-large` (3.5rem) at 4rem, since `.h-row-largest` happens to be
 * defined later in the sheet.
 *
 * Registering them in the same groups as their Tailwind counterparts restores the rule every
 * other utility already follows: the last class wins, so a document can always override a
 * widget default.
 */
const ROW_HEIGHTS = ["row-smallest", "row-small", "row-mid", "row-large", "row-largest"];
const MERIDIAN_WIDTHS = ["form", "app", "sidebar", "desk", "desk-fixed", "quick-edit", "dialog", "toast", "scrollbar"];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      h: [{ h: ROW_HEIGHTS }],
      "min-h": [{ "min-h": ROW_HEIGHTS }],
      "max-h": [{ "max-h": ROW_HEIGHTS }],
      w: [{ w: MERIDIAN_WIDTHS }],
      "min-w": [{ "min-w": MERIDIAN_WIDTHS }],
      "max-w": [{ "max-w": MERIDIAN_WIDTHS }],
    },
  },
});

export function cn(...classes: (string | undefined | false | null)[]) {
  return twMerge(clsx(classes));
}
