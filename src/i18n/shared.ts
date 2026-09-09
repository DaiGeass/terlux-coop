export type Locale = "es" | "en";

export const LOCALE_COOKIE = "terlux_lang";

export function parseLocale(value: string | undefined): Locale {
  return value === "es" ? "es" : "en";
}