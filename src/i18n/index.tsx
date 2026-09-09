"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { EN } from "./en";
import { LOCALE_COOKIE, parseLocale, type Locale } from "./shared";

export { LOCALE_COOKIE, parseLocale, type Locale };

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  /** Traduce una cadena. La clave es el texto en español; en locale "es" se devuelve tal cual. */
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => setLocaleState(l), []);

  const t = useCallback(
    (key: string) => (locale === "en" ? EN[key] ?? key : key),
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n debe usarse dentro de <I18nProvider>");
  return ctx;
}

/** Hook corto para leer solo el traductor. */
export function useT() {
  return useI18n().t;
}