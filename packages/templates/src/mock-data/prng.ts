/**
 * Deterministic PRNG based on mulberry32 algorithm.
 *
 * Ensures all synthetic demo seed data generated for the 11 company consoles
 * is 100% reproducible and byte-identical across runs.
 */

export interface PRNG {
  next: () => number;
  nextInt: (min: number, max: number) => number;
  choice: <T>(items: readonly T[]) => T;
  sample: <T>(items: readonly T[], count: number) => T[];
  dateBetween: (start: string, end: string) => string;
}

export function createPrng(seed: number = 20260822): PRNG {
  let s = Math.floor(seed);

  function next(): number {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function nextInt(min: number, max: number): number {
    const floorMin = Math.ceil(min);
    const floorMax = Math.floor(max);
    return Math.floor(next() * (floorMax - floorMin + 1)) + floorMin;
  }

  function choice<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error("Cannot pick choice from empty array");
    }
    const idx = Math.floor(next() * items.length);
    return items[idx];
  }

  function sample<T>(items: readonly T[], count: number): T[] {
    const copy = [...items];
    const result: T[] = [];
    const n = Math.min(count, copy.length);
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(next() * copy.length);
      result.push(copy.splice(idx, 1)[0]);
    }
    return result;
  }

  function dateBetween(startDateStr: string, endDateStr: string): string {
    const start = new Date(startDateStr).getTime();
    const end = new Date(endDateStr).getTime();
    const target = start + next() * (end - start);
    return new Date(target).toISOString().slice(0, 10);
  }

  return {
    next,
    nextInt,
    choice,
    sample,
    dateBetween,
  };
}
