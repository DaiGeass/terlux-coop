"use client";

import { Languages } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitch({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full border border-border/40 bg-background/60 p-0.5 text-xs font-medium",
        className
      )}
      role="group"
      aria-label="Idioma / Language"
    >
      <Languages size={13} className="ml-1.5 text-muted-foreground" />
      {(["es", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={cn(
            "rounded-full px-2 py-0.5 uppercase transition-colors",
            locale === l
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}