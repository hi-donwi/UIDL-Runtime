/**
 * `useLanguage` — Internationalization & Language Switcher Hook.
 *
 * Provides reactive language state ("id" | "en"), dictionary translation lookup `t()`,
 * and DoctypeMeta bilingual label resolver `localize()`.
 */

import { useCallback, useState } from "react";
import type { Language } from "~/utils/i18n";
import { t as translate, localize as localizeFn } from "~/utils/i18n";

const STORAGE_KEY = "vb-demo-language";

export interface UseLanguageResult {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: string) => string;
  localize: (label: { id?: string; en?: string } | string | undefined) => string;
}

export function useLanguage(defaultLang: Language = "id"): UseLanguageResult {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "id" || stored === "en") return stored;
    } catch {
      // Ignore localStorage errors
    }
    return defaultLang;
  });

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => {
      const next: Language = prev === "id" ? "en" : "id";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Ignore localStorage errors
      }
      return next;
    });
  }, []);

  const t = useCallback((key: string) => translate(key, lang), [lang]);
  const localize = useCallback(
    (label: { id?: string; en?: string } | string | undefined) => localizeFn(label, lang),
    [lang],
  );

  return {
    lang,
    setLang,
    toggleLang,
    t,
    localize,
  };
}
