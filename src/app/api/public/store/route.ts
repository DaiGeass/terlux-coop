// ============================================
// TERLUX COOP - API PÚBLICA: CATÁLOGO DE TIENDA
// ?lang=es|en
// ============================================

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { products, productCategories } from "@/db/schema";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const en = searchParams.get("lang") === "en";

    const rows = await db
      .select({
        product: products,
        category: productCategories,
      })
      .from(products)
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .where(eq(products.isActive, true));

    const grouped = rows.reduce((acc, { product, category }) => {
      const cat = (en ? category?.nameEn : null) || category?.name || (en ? "Others" : "Otros");
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push({
        ...product,
        name: (en ? product.nameEn : null) || product.name,
        description: (en ? product.descriptionEn : null) || product.description,
        longDescription: (en ? product.longDescriptionEn : null) || product.longDescription,
        features: (en ? product.featuresEn : null) || product.features,
        category: category ? { name: (en ? category.nameEn : null) || category.name, slug: category.slug } : null,
      });
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json({ success: true, data: grouped });
  } catch (err) {
    console.error("[api/public/store]", err);
    return NextResponse.json({ success: false, error: { code: "SERVER", message: "Error del servidor" } }, { status: 500 });
  }
}