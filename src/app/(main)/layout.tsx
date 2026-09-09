"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Toolbar } from "@/components/layout/toolbar";
import { useT } from "@/i18n";
import type { SessionInfo } from "@/lib/auth";

interface MeResponse extends SessionInfo {
  roleLevel: number;
  enabledMenus: string[];
  wallet: { id: string; balance: number; currency: string } | null;
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const t = useT();
  const [session, setSession] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (res) => {
        if (!res.ok) {
          router.replace("/login");
          return null;
        }
        const data = await res.json();
        return data.data as MeResponse;
      })
      .then((s) => {
        if (s) setSession(s);
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold animate-pulse">
            TL
          </div>
          <p className="text-sm text-muted-foreground">{t("Cargando TerLux Coop…")}</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar role={session.role} user={session} enabledMenus={session.enabledMenus} />
      <Toolbar user={session} wallet={session.wallet} />
      <div className="pl-64">
        <main className="pt-20 px-6 pb-10 min-h-screen">{children}</main>
      </div>
    </div>
  );
}
