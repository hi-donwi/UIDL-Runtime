import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

/**
 * Tracks an element's rendered width.
 *
 * Charts need it because Meridian sizes its SVGs by *aspect ratio*, and picks a different
 * ratio at every call site so that the drawn height still lands around 235px — 4.15 for the
 * full-width Cashflow line, 2.05 for the half-width Profit and Loss bars. A reusable widget
 * has no such fixed call site, so it measures instead and derives the ratio from the width it
 * actually got, which keeps the chart the same height in a narrow column and a wide page.
 *
 * Returns 0 until the first measurement (and in environments without ResizeObserver, such as
 * jsdom), which callers must treat as "not measured yet" rather than "zero wide".
 */
export function useElementWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    setWidth(element.getBoundingClientRect().width);

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}
