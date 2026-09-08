// ============================================
// TERLUX COOP - API PÚBLICA: CATÁLOGO DE TIENDA
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/db";
import { products, productCategories } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await db
      .select({
        product: products,
        category: productCategories,
      })
      .from(products)
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .where(eq(products.isActive, true));

    const grouped = rows.reduce((acc, { product, category }) => {
      const cat = category?.name || "Otros";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push({
        ...product,
        category: category ? { name: category.name, slug: category.slug } : null,
      });
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json({ success: true, data: grouped });
  } catch (err) {
    console.error("[api/public/store]", err);
    return NextResponse.json({ success: false, error: { code: "SERVER", message: "Error del servidor" } }, { status: 500 });
  }
}
