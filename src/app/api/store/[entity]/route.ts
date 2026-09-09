// ============================================
// TERLUX COOP - API COMERCIAL
// /api/store/products | cart | orders | cards
// ============================================

import { NextResponse, type NextRequest } from "next/server";
import { eq, and, asc, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  products, productCategories, cartItems, orders, orderItems,
  paymentMethods, payments, walletTransactions, cardTransactions,
} from "@/db/schema";
import { getSession, getWallet, applyWalletMovement, ensureCardAccount, getCardAccount, applyCardMovement } from "@/lib/auth";

// ---------------- PRODUCTOS ----------------
async function getProducts() {
  const rows = await db
    .select({ p: products, c: productCategories })
    .from(products)
    .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
    .where(eq(products.isActive, true))
    .orderBy(asc(products.sortOrder));

  return rows.map(({ p, c }) => ({ ...p, category: c ? { id: c.id, name: c.name, slug: c.slug } : null }));
}

// ---------------- CARRITO ----------------
async function getCart(userId: string) {
  const rows = await db
    .select({ ci: cartItems, p: products })
    .from(cartItems)
    .leftJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.userId, userId));
  const items = rows
    .filter((r) => r.p)
    .map(({ ci, p }) => ({
      id: ci.id, quantity: ci.quantity, product: p,
      lineTotal: Number(p!.price) * ci.quantity,
    }));
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  return { items, subtotal, tax: +(subtotal * 0.21).toFixed(2), total: +(subtotal * 1.21).toFixed(2) };
}

// ---------------- TARJETAS / MÉTODOS DE PAGO ----------------
async function addCard(userId: string, body: Record<string, unknown>) {
  const number = String(body.number || "").replace(/[\s-]/g, "");
  if (number.length < 12) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION", message: "Número de tarjeta no válido" } }, { status: 400 });
  }
  // NUNCA guardamos el número completo: solo marca y últimos 4
  const brand = number.startsWith("4") ? "Visa" : /^(5[1-5]|2[2-7])/.test(number) ? "Mastercard" : number.startsWith("3") ? "Amex" : "Tarjeta";
  const isDefault = body.isDefault === true;
  if (isDefault) {
    await db.update(paymentMethods).set({ isDefault: false }).where(eq(paymentMethods.userId, userId));
  }
  const [row] = await db
    .insert(paymentMethods)
    .values({
      userId,
      type: "card",
      brand,
      holderName: String(body.holderName || ""),
      last4: number.slice(-4),
      expiryMonth: String(body.expiryMonth || ""),
      expiryYear: String(body.expiryYear || ""),
      tokenReference: `tok_sandbox_${Date.now()}`, // token del TPV, nunca el PAN
      isDefault: isDefault,
      isVerified: true,
    })
    .returning();
  await ensureCardAccount(row.id, userId);
  return NextResponse.json({ success: true, data: row });
}

// ---------------- PEDIDOS ----------------
async function createOrder(userId: string, body: Record<string, unknown>) {
  const cart = await getCart(userId);
  if (cart.items.length === 0) {
    return NextResponse.json({ success: false, error: { code: "EMPTY_CART", message: "El carrito está vacío" } }, { status: 400 });
  }

  const orderNumber = `TLC-${new Date().getFullYear()}-${String(Math.floor(10000 + Math.random() * 89999))}`;
  const [order] = await db
    .insert(orders)
    .values({
      orderNumber,
      userId,
      status: "pending",
      subtotal: String(cart.subtotal.toFixed(2)),
      taxAmount: String(cart.tax.toFixed(2)),
      total: String(cart.total.toFixed(2)),
      billingName: String(body.billingName || ""),
      billingTaxId: String(body.billingTaxId || ""),
      billingAddress: body.billingAddress || {},
      paymentMethodId: (body.paymentMethodId as string) || null,
      paymentProvider: body.paymentMethodId ? "card_sandbox" : body.payWithCredit ? "credit_wallet" : "transfer",
    })
    .returning();

  for (const item of cart.items) {
    const p = item.product;
    if (!p) continue;
    await db.insert(orderItems).values({
      orderId: order.id,
      productId: p.id,
      name: p.name,
      sku: p.sku,
      quantity: item.quantity,
      unitPrice: String(p.price),
      total: String(item.lineTotal.toFixed(2)),
    });
  }

  // Pago con crédito de la wallet (PoC)
  if (body.payWithCredit === true) {
    const wallet = await applyWalletMovement(
      userId, "debit", cart.total,
      `Pago del pedido ${orderNumber} con crédito`,
      `ORDER-${order.id.slice(0, 8)}`,
      undefined,
      true
    );
    if (!wallet) {
      await db.update(orders).set({ status: "failed" }).where(eq(orders.id, order.id));
      return NextResponse.json(
        { success: false, error: { code: "INSUFFICIENT_CREDIT", message: "Saldo de crédito insuficiente" } },
        { status: 400 }
      );
    }
    const reference = `CREDIT-${Date.now()}`;
    await db.insert(payments).values({
      reference, orderId: order.id, userId,
      amount: String(cart.total.toFixed(2)),
      provider: "credit_wallet",
      status: "captured",
      providerResponse: {
        wallet: true,
        balanceAfter: wallet.balance,
        message: "Pagado con saldo de crédito TerLux",
      },
    });
    await db.update(orders)
      .set({ status: "paid", paidAt: new Date(), paymentReference: reference })
      .where(eq(orders.id, order.id));
  }

  // Simulación de cobro en TPV sandbox (en producción: Redsys/Stripe con token)
  if (body.paymentMethodId) {
    const [method] = await db
      .select()
      .from(paymentMethods)
      .where(and(eq(paymentMethods.id, String(body.paymentMethodId)), eq(paymentMethods.userId, userId)))
      .limit(1);

    const reference = `PAY-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
    await db.insert(payments).values({
      reference, orderId: order.id, userId,
      amount: String(cart.total.toFixed(2)),
      provider: "card_sandbox",
      status: "captured",
      providerResponse: {
        sandbox: true,
        brand: method?.brand,
        last4: method?.last4,
        authCode: String(Math.floor(100000 + Math.random() * 899999)),
        message: "Autorizado en entorno de pruebas",
      },
    });
    // Simula el saldo de la TARJETA de crédito: el cargo descuenta de su cuenta.
    // allowNegative=true → si no hay saldo, la tarjeta queda en NÚMEROS ROJOS (deuda).
    const cardAcc = await applyCardMovement(
      String(body.paymentMethodId), userId, "charge", cart.total,
      `Cargo del pedido ${orderNumber} a la tarjeta (•••• ${method?.last4 ?? ""})`,
      reference, true
    );
    if (cardAcc) {
      await db.update(payments).set({
        providerResponse: {
          sandbox: true,
          brand: method?.brand,
          last4: method?.last4,
          authCode: String(Math.floor(100000 + Math.random() * 899999)),
          balanceAfter: cardAcc.balance,
          cardLimit: cardAcc.creditLimit,
          message: cardAcc.balance < 0 ? "Autorizado; la tarjeta quedó en números rojos" : "Autorizado en entorno de pruebas",
        },
      }).where(eq(payments.reference, reference));
    }
    await db.update(orders)
      .set({ status: "paid", paidAt: new Date(), paymentReference: reference })
      .where(eq(orders.id, order.id));
  }

  // Vaciar carrito solo cuando el pago ya está confirmado
  await db.delete(cartItems).where(eq(cartItems.userId, userId));

  const [fresh] = await db.select().from(orders).where(eq(orders.id, order.id)).limit(1);
  return NextResponse.json({ success: true, data: fresh });
}

async function listOrders(userId: string, isAdmin: boolean) {
  const rows = isAdmin
    ? await db.select().from(orders).orderBy(orders.createdAt)
    : await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(orders.createdAt);
  const items = await db.select().from(orderItems);
  return rows.map((o) => ({ ...o, items: items.filter((i) => i.orderId === o.id) }));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  const { entity } = await params;

  if (entity === "products") return NextResponse.json({ success: true, data: await getProducts() });
  if (entity === "cart") return NextResponse.json({ success: true, data: await getCart(session.id) });
  if (entity === "cards") {
    const rows = await db.select().from(paymentMethods).where(eq(paymentMethods.userId, session.id));
    const enriched = await Promise.all(
      rows.map(async (card) => {
        const acc = await getCardAccount(card.id, session.id);
        const tx = await db
          .select()
          .from(cardTransactions)
          .where(eq(cardTransactions.cardAccountId, acc.id))
          .orderBy(desc(cardTransactions.createdAt))
          .limit(20);
        return { ...card, account: { balance: acc.balance, creditLimit: acc.creditLimit, currency: acc.currency }, transactions: tx };
      })
    );
    return NextResponse.json({ success: true, data: enriched });
  }
  if (entity === "orders") {
    const isAdmin = ["admin", "super_admin", "finance"].includes(session.role);
    return NextResponse.json({ success: true, data: await listOrders(session.id, isAdmin) });
  }
  if (entity === "wallet") {
    const wallet = await getWallet(session.id);
    const transactions = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.userId, session.id))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(100);
    return NextResponse.json({ success: true, data: { wallet, transactions } });
  }
  return NextResponse.json({ success: false }, { status: 404 });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  const { entity } = await params;
  const body = await request.json();

  if (entity === "cart") {
    const [existing] = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.userId, session.id), eq(cartItems.productId, body.productId)))
      .limit(1);
    if (existing) {
      await db.update(cartItems).set({ quantity: existing.quantity + (body.quantity || 1) }).where(eq(cartItems.id, existing.id));
    } else {
      await db.insert(cartItems).values({ userId: session.id, productId: body.productId, quantity: body.quantity || 1 });
    }
    return NextResponse.json({ success: true, data: await getCart(session.id) });
  }

  if (entity === "orders") return createOrder(session.id, body);

  // Recarga de crédito con tarjeta sandbox (PoC: no cobra dinero real)
  if (entity === "wallet") {
    const amount = Math.round(Number(body.amount || 0) * 100) / 100;
    const cardLast4 = String(body.last4 || "4242");
    if (!Number.isFinite(amount) || amount <= 0 || amount > 50000) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION", message: "Cantidad no válida (máx. 50,000 MXN)" } }, { status: 400 });
    }

    const reference = `TOPUP-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
    await db.insert(payments).values({
      reference,
      userId: session.id,
      amount: String(amount.toFixed(2)),
      provider: "credit_topup_sandbox",
      status: "captured",
      providerResponse: { sandbox: true, last4: cardLast4, message: "Recarga simulada sin cargo real" },
    });

    const wallet = await applyWalletMovement(
      session.id, "credit", amount,
      `Recarga de crédito con tarjeta (•••• ${cardLast4})`,
      reference
    );
    return NextResponse.json({ success: true, data: { wallet } });
  }

  if (entity === "cards") return addCard(session.id, body);

  return NextResponse.json({ success: false }, { status: 404 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  const { entity } = await params;
  const { searchParams } = new URL(request.url);

  if (entity === "cart") {
    const id = searchParams.get("id");
    if (id) await db.delete(cartItems).where(and(eq(cartItems.id, id), eq(cartItems.userId, session.id)));
    return NextResponse.json({ success: true, data: await getCart(session.id) });
  }
  if (entity === "cards") {
    const id = searchParams.get("id");
    if (id) await db.delete(paymentMethods).where(and(eq(paymentMethods.id, id), eq(paymentMethods.userId, session.id)));
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ success: false }, { status: 404 });
}
