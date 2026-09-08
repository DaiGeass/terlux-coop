// ============================================
// TERLUX COOP - API PÚBLICA: INFO DE LA EMPRESA
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/db";
import { companySettings, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const [settings] = await db.select().from(companySettings).limit(1);
    const activeUsers = await db.select().from(users).where(eq(users.isActive, true));

    return NextResponse.json({
      success: true,
      data: {
        company: settings ? {
          name: settings.companyName,
          email: settings.companyEmail,
          phone: settings.companyPhone,
          address: settings.companyAddress,
          website: settings.companyWebsite,
          logo: settings.logo,
        } : null,
        stats: {
          activeUsers: activeUsers.length,
          message: "Plataforma operativa",
        },
      },
    });
  } catch (err) {
    console.error("[api/public/info]", err);
    return NextResponse.json({ success: false, error: { code: "SERVER", message: "Error del servidor" } }, { status: 500 });
  }
}
