/**
 * Naming-series document numbers, e.g. `SINV-.YYYY.-.#####` -> "SINV-2027-00001" — the exact
 * format already used throughout `meridian/mockData.ts`. Replaces
 * `mockApiController.create()`'s `Date.now().toString().slice(-4)`, which can collide (two
 * records created in the same millisecond-truncated-to-4-digits window get the same id).
 *
 * The counter is scoped per resolved prefix (so `SINV-2026-.#####` and `SINV-2027-.#####` count
 * independently, the way a real naming series resets per year) and persists across reloads when
 * given `createLocalStorageCounterStore()` — a fresh in-process counter would silently restart
 * numbering from 1 on every reload, which is exactly the collision risk this service exists to
 * remove.
 */

export interface NamingSeriesCounterStore {
  /** Atomically increments and returns the new (1-based) counter value for `seriesKey`. */
  next(seriesKey: string): number;
}

export function createInMemoryCounterStore(): NamingSeriesCounterStore {
  const counters = new Map<string, number>();
  return {
    next(seriesKey) {
      const value = (counters.get(seriesKey) ?? 0) + 1;
      counters.set(seriesKey, value);
      return value;
    },
  };
}

export function createLocalStorageCounterStore(storageKey = "uidl-runtime-naming-counters"): NamingSeriesCounterStore {
  function load(): Record<string, number> {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as Record<string, number>) : {};
    } catch {
      return {};
    }
  }
  function save(counters: Record<string, number>): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(counters));
    } catch {
      /* storage may be quota exceeded or unavailable */
    }
  }
  return {
    next(seriesKey) {
      const counters = load();
      const value = (counters[seriesKey] ?? 0) + 1;
      counters[seriesKey] = value;
      save(counters);
      return value;
    },
  };
}

type PatternSegment = { literal: string } | { token: "YYYY" | "MM" | "DD" } | { counterWidth: number };

function parsePattern(pattern: string): PatternSegment[] {
  return pattern.split(".").map((chunk): PatternSegment => {
    if (chunk === "YYYY" || chunk === "MM" || chunk === "DD") return { token: chunk };
    if (/^#+$/.test(chunk)) return { counterWidth: chunk.length };
    return { literal: chunk };
  });
}

/**
 * Formats the next number in `pattern` for `collection`, using `store` for the underlying
 * counter. `date` defaults to now; pass a fixed date in tests for determinism.
 */
export function nextDocumentNumber(
  collection: string,
  pattern: string,
  store: NamingSeriesCounterStore,
  date: Date = new Date(),
): string {
  const segments = parsePattern(pattern);
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  const resolvedNonCounter = segments.map((segment) => {
    if ("token" in segment) return segment.token === "YYYY" ? year : segment.token === "MM" ? month : day;
    if ("counterWidth" in segment) return null;
    return segment.literal;
  });

  const seriesKey = `${collection}:${resolvedNonCounter.filter((part): part is string => part !== null).join("")}`;
  const counter = store.next(seriesKey);

  return segments
    .map((segment, index) =>
      "counterWidth" in segment ? String(counter).padStart(segment.counterWidth, "0") : (resolvedNonCounter[index] as string),
    )
    .join("");
}
