"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ShoppingCart, Package, CheckCircle2, Clock, CreditCard, Plus, Minus,
  Trash2, Globe, Cloud, LifeBuoy, Building2, ShieldCheck, X, Loader2, Wallet, Coins,
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

interface Product {
  id: string; sku: string; name: string; description: string; longDescription: string | null;
  price: string; compareAtPrice: string | null; recurringPeriod: string | null;
  features: string[] | null; category: { id: string; name: string; slug: string } | null;
}
interface CartItem { id: string; quantity: number; lineTotal: number; product: Product }
interface Order {
  id: string; orderNumber: string; status: string; subtotal: string; taxAmount: string;
  total: string; createdAt: string; paidAt: string | null; paymentProvider: string | null;
  items: { id: string; name: string; quantity: number; total: string }[];
}
interface Card {
  id: string; brand: string; holderName: string | null; last4: string;
  expiryMonth: string | null; expiryYear: string | null; isDefault: boolean; type: string;
}
interface WalletData {
  wallet: { id: string; balance: number; currency: string };
  transactions: { id: string; type: string; amount: string; description: string | null; reference: string | null; createdAt: string }[];
}

const CAT_ICONS: Record<string, React.ReactNode> = {
  "diseno-web": <Globe size={20} />,
  cloud: <Cloud size={20} />,
  soporte: <LifeBuoy size={20} />,
  enterprise: <Building2 size={20} />,
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b", paid: "#10b981", processing: "#3b82f6",
  completed: "#10b981", cancelled: "#ef4444",
};

export default function StorePage({ initialTab }: { initialTab?: string }) {
  const [tab, setTab] = useState(initialTab || "catalog");
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<{ items: CartItem[]; subtotal: number; tax: number; total: number }>({ items: [], subtotal: 0, tax: 0, total: 0 });
  const [orders, setOrders] = useState<Order[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [category, setCategory] = useState("all");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [checkout, setCheckout] = useState({ billingName: "", billingTaxId: "", paymentMethodId: "" });
  const [cardForm, setCardForm] = useState({ number: "", holderName: "", expiryMonth: "", expiryYear: "", isDefault: false });
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [topup, setTopup] = useState({ amount: "", last4: "4242" });
  const [topping, setTopping] = useState(false);

  const openCheckout = async () => {
    const d = await (await fetch("/api/store/wallet")).json();
    if (d.success) setWalletBalance(Number(d.data.wallet?.balance || 0));
    setCheckoutOpen(true);
  };

  const loadCart = useCallback(async () => {
    const d = await (await fetch("/api/store/cart")).json();
    if (d.success) setCart(d.data);
  }, []);

  useEffect(() => {
    (async () => {
      const [p] = await Promise.all([
        fetch("/api/store/products").then((r) => r.json()),
        loadCart(),
      ]);
      setProducts(p.data || []);
      setLoading(false);
    })();
  }, [loadCart]);

  useEffect(() => {
    if (tab === "orders") fetch("/api/store/orders").then((r) => r.json()).then((d) => setOrders(d.data || []));
    if (tab === "cards") fetch("/api/store/cards").then((r) => r.json()).then((d) => setCards(d.data || []));
    if (tab === "credit") fetch("/api/store/wallet").then((r) => r.json()).then((d) => { if (d.success) setWallet(d.data); });
  }, [tab]);

  const topUp = async () => {
    const amount = Number(topup.amount);
    if (!amount || amount <= 0) { notify("Introduce una cantidad válida"); return; }
    setTopping(true);
    const res = await fetch("/api/store/wallet", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, last4: topup.last4 }),
    });
    const d = await res.json();
    setTopping(false);
    if (d.success) {
      notify("Crédito recargado (sandbox, sin cargo real)");
      setTopup({ amount: "", last4: "4242" });
      const r = await (await fetch("/api/store/wallet")).json();
      if (r.success) setWallet(r.data);
    } else notify(d.error?.message || "Error en la recarga");
  };

  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  const addToCart = async (productId: string) => {
    await fetch("/api/store/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId }) });
    await loadCart();
    notify("Añadido al carrito");
  };
  const changeQty = async (item: CartItem, delta: number) => {
    if (item.quantity + delta <= 0) {
      await fetch(`/api/store/cart?id=${item.id}`, { method: "DELETE" });
    } else {
      await fetch("/api/store/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: item.product.id, quantity: delta }) });
    }
    await loadCart();
  };
  const removeItem = async (id: string) => {
    await fetch(`/api/store/cart?id=${id}`, { method: "DELETE" });
    await loadCart();
  };

  const placeOrder = async () => {
    setPlacing(true);
    const payWithCredit = checkout.paymentMethodId === "__credit__";
    const res = await fetch("/api/store/orders", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        billingName: checkout.billingName,
        billingTaxId: checkout.billingTaxId,
        paymentMethodId: payWithCredit ? "" : checkout.paymentMethodId,
        payWithCredit,
      }),
    });
    const d = await res.json();
    setPlacing(false);
    if (d.success) {
      notify(d.data.status === "paid" ? "Pedido pagado correctamente 🎉" : "Pedido registrado (pendiente de transferencia)");
      setCheckoutOpen(false);
      await loadCart();
      setTab("orders");
    } else {
      notify(d.error?.message || "Error al procesar el pedido");
    }
  };

  const addCard = async () => {
    const res = await fetch("/api/store/cards", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cardForm),
    });
    const d = await res.json();
    if (d.success) {
      notify("Tarjeta guardada (solo token y últimos 4 dígitos)");
      setCardForm({ number: "", holderName: "", expiryMonth: "", expiryYear: "", isDefault: false });
      const r = await (await fetch("/api/store/cards")).json();
      setCards(r.data || []);
    } else notify(d.error?.message || "Tarjeta no válida");
  };

  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category?.slug).filter(Boolean))) as string[]];
  const filtered = category === "all" ? products : products.filter((p) => p.category?.slug === category);

  const tabs = [
    { id: "catalog", label: "Catálogo", icon: Package },
    { id: "cart", label: `Carrito (${cart.items.length})`, icon: ShoppingCart },
    { id: "orders", label: "Mis pedidos", icon: Clock },
    { id: "cards", label: "Tarjetas y pagos", icon: CreditCard },
    { id: "credit", label: "Créditos", icon: Wallet },
  ];

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tienda de servicios</h1>
          <p className="page-subtitle">Planes de diseño web, cloud, soporte y paquetes enterprise de TerLux Coop</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 p-1 glass-card w-fit">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* CATÁLOGO */}
      {tab === "catalog" && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button key={c} onClick={() => setCategory(c)}
                className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  category === c ? "bg-primary text-primary-foreground" : "glass-card text-muted-foreground hover:text-foreground")}>
                {c === "all" ? "Todos" : products.find((p) => p.category?.slug === c)?.category?.name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <div key={p.id} className={cn("glass-card p-5 flex flex-col", p.category?.slug === "enterprise" && "ring-2 ring-primary/40")}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    {CAT_ICONS[p.category?.slug || ""] || <Package size={20} />}
                  </div>
                  {p.compareAtPrice && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 font-semibold">OFERTA</span>
                  )}
                </div>
                <h3 className="font-semibold text-foreground">{p.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 mb-3">{p.longDescription || p.description}</p>
                <ul className="space-y-1.5 mb-4 flex-1">
                  {(p.features || []).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                      <CheckCircle2 size={13} className="text-emerald-500 mt-0.5 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-2xl font-bold text-foreground">{formatCurrency(Number(p.price))}</span>
                    {p.recurringPeriod === "monthly" && <span className="text-xs text-muted-foreground"> /mes</span>}
                    {p.compareAtPrice && <span className="block text-xs text-muted-foreground line-through">{formatCurrency(Number(p.compareAtPrice))}</span>}
                  </div>
                  <button onClick={() => addToCart(p.id)} className="btn btn-primary btn-sm gap-1.5">
                    <Plus size={14} /> Contratar
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 font-mono">{p.sku}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CARRITO */}
      {tab === "cart" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="glass-card p-4 lg:col-span-2">
            <h3 className="text-sm font-semibold mb-3">Tu carrito</h3>
            {cart.items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">El carrito está vacío</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.items.map((i) => (
                  <div key={i.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/30">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      {CAT_ICONS[i.product.category?.slug || ""] || <Package size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{i.product.name}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(Number(i.product.price))}{i.product.recurringPeriod === "monthly" ? "/mes" : ""}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => changeQty(i, -1)} className="p-1 rounded hover:bg-accent"><Minus size={13} /></button>
                      <span className="text-sm w-6 text-center">{i.quantity}</span>
                      <button onClick={() => changeQty(i, 1)} className="p-1 rounded hover:bg-accent"><Plus size={13} /></button>
                    </div>
                    <span className="text-sm font-semibold w-24 text-right">{formatCurrency(i.lineTotal)}</span>
                    <button onClick={() => removeItem(i.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="glass-card p-4 h-fit sticky top-20">
            <h3 className="text-sm font-semibold mb-4">Resumen</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(cart.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">IVA (21%)</span><span>{formatCurrency(cart.tax)}</span></div>
              <div className="border-t border-border/30 pt-2 flex justify-between font-bold text-base"><span>Total</span><span>{formatCurrency(cart.total)}</span></div>
            </div>
            <button disabled={cart.items.length === 0} onClick={openCheckout} className="btn btn-primary w-full mt-4 gap-2">
              <ShieldCheck size={15} /> Pago seguro
            </button>
            <p className="text-[10px] text-muted-foreground mt-2 text-center flex items-center justify-center gap-1">
              <ShieldCheck size={10} /> Entorno sandbox · no se realizan cargos reales
            </p>
          </div>
        </div>
      )}

      {/* PEDIDOS */}
      {tab === "orders" && (
        <div className="glass-card p-4 space-y-3">
          <h3 className="text-sm font-semibold mb-3">Historial de pedidos</h3>
          {orders.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">Aún no has realizado pedidos.</p>}
          {orders.map((o) => (
            <div key={o.id} className="rounded-lg border border-border/30 p-4">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <span className="font-mono text-sm font-semibold">{o.orderNumber}</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: (STATUS_COLORS[o.status] || "#6b7280") + "20", color: STATUS_COLORS[o.status] }}>
                  {o.status === "paid" ? "Pagado" : o.status === "pending" ? "Pendiente" : o.status}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">{formatDate(o.createdAt, "Pp")}</span>
                <span className="font-bold">{formatCurrency(Number(o.total))}</span>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                {o.items.map((it) => (
                  <div key={it.id} className="flex justify-between">
                    <span>{it.quantity}× {it.name}</span><span>{formatCurrency(Number(it.total))}</span>
                  </div>
                ))}
              </div>
              {o.paymentProvider && <p className="text-[10px] mt-2 text-muted-foreground">Método: {o.paymentProvider} · ref {o.orderNumber}</p>}
            </div>
          ))}
        </div>
      )}

      {/* TARJETAS */}
      {tab === "cards" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold mb-4">Métodos de pago guardados</h3>
            <div className="space-y-3">
              {cards.length === 0 && <p className="text-sm text-muted-foreground">No hay tarjetas guardadas.</p>}
              {cards.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 text-white">
                  <CreditCard size={24} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{c.brand} •••• {c.last4}</p>
                    <p className="text-xs opacity-70">{c.holderName} · cad {c.expiryMonth}/{c.expiryYear}</p>
                  </div>
                  {c.isDefault && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20">Predeterminada</span>}
                </div>
              ))}
            </div>
          </div>
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold mb-4">Añadir tarjeta</h3>
            <div className="space-y-3">
              <input value={cardForm.number} onChange={(e) => setCardForm({ ...cardForm, number: e.target.value })} placeholder="Número de tarjeta (4242 4242 4242 4242)"
                className="form-input font-mono" maxLength={19} />
              <input value={cardForm.holderName} onChange={(e) => setCardForm({ ...cardForm, holderName: e.target.value })} placeholder="Titular" className="form-input" />
              <div className="grid grid-cols-2 gap-3">
                <input value={cardForm.expiryMonth} onChange={(e) => setCardForm({ ...cardForm, expiryMonth: e.target.value })} placeholder="MM" maxLength={2} className="form-input" />
                <input value={cardForm.expiryYear} onChange={(e) => setCardForm({ ...cardForm, expiryYear: e.target.value })} placeholder="AA" maxLength={2} className="form-input" />
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={cardForm.isDefault} onChange={(e) => setCardForm({ ...cardForm, isDefault: e.target.checked })} />
                Marcar como predeterminada
              </label>
              <button onClick={addCard} className="btn btn-primary w-full gap-2"><ShieldCheck size={15} /> Guardar tarjeta (tokenizada)</button>
              <p className="text-[10px] text-muted-foreground">Por seguridad nunca almacenamos el número completo, solo el token del TPV y los últimos 4 dígitos.</p>
            </div>
          </div>
        </div>
      )}

      {/* CRÉDITOS / WALLET */}
      {tab === "credit" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="glass-card p-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Wallet size={26} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Saldo de crédito disponible</p>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {wallet ? wallet.wallet.balance.toLocaleString("es-ES", { style: "currency", currency: wallet.wallet.currency || "MXN" }) : "—"}
                </p>
              </div>
            </div>
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold mb-1 flex items-center gap-2"><Coins size={15} /> Recargar crédito</h3>
              <p className="text-xs text-muted-foreground mb-4">Entorno de pruebas (sandbox): la recarga no cobra dinero real. Usa la tarjeta 4242 4242 4242 4242 · 12/29 · CVC 123.</p>
              <div className="flex gap-2">
                <input
                  type="number" min="1" step="0.01" value={topup.amount}
                  onChange={(e) => setTopup({ ...topup, amount: e.target.value })}
                  placeholder="Importe (MXN)" className="form-input flex-1"
                />
                <input
                  value={topup.last4} maxLength={4}
                  onChange={(e) => setTopup({ ...topup, last4: e.target.value })}
                  placeholder="Últimos 4"
                  className="form-input w-24 font-mono text-center"
                />
              </div>
              <button onClick={topUp} disabled={topping} className="btn btn-primary w-full mt-3 gap-2">
                {topping ? <Loader2 size={15} className="animate-spin" /> : <Wallet size={15} />}
                Recargar crédito
              </button>
            </div>
          </div>
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-3">Movimientos de la cuenta</h3>
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {(wallet?.transactions || []).map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg border border-border/10 text-sm">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                    t.type === "credit" ? "bg-emerald-500/15 text-emerald-600" : "bg-rose-500/15 text-rose-600")}>
                    {t.type === "credit" ? "+" : "−"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{t.description || t.type}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{t.reference} · {formatDate(t.createdAt)}</p>
                  </div>
                  <div className="font-semibold" style={{ color: t.type === "credit" ? "#10b981" : "#e11d48" }}>
                    {t.type === "credit" ? "+" : "−"}{Number(t.amount).toLocaleString("es-ES", { style: "currency", currency: "MXN" })}
                  </div>
                </div>
              ))}
              {(!wallet || wallet.transactions.length === 0) && (
                <p className="text-center text-xs text-muted-foreground py-8">Sin movimientos todavía. Recarga crédito o paga pedidos para ver el historial.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setCheckoutOpen(false)}>
          <div className="glass-modal rounded-2xl p-6 w-full max-w-md animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Confirmar pedido</h3>
              <button onClick={() => setCheckoutOpen(false)}><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input value={checkout.billingName} onChange={(e) => setCheckout({ ...checkout, billingName: e.target.value })} placeholder="Razón social / Nombre" className="form-input" />
              <input value={checkout.billingTaxId} onChange={(e) => setCheckout({ ...checkout, billingTaxId: e.target.value })} placeholder="NIF/CIF" className="form-input" />
              <label className="text-xs font-medium text-muted-foreground">Método de pago</label>
              <select value={checkout.paymentMethodId} onChange={(e) => setCheckout({ ...checkout, paymentMethodId: e.target.value })} className="form-select">
                <option value="">Transferencia bancaria (pago pendiente)</option>
                {walletBalance !== null && (
                  <option value="__credit__">
                    {walletBalance >= cart.total
                      ? `Saldo de crédito (${formatCurrency(walletBalance)})`
                      : `Crédito disponible (${formatCurrency(walletBalance)}) — insuficiente`}
                  </option>
                )}
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>{c.brand} •••• {c.last4}</option>
                ))}
              </select>
              {walletBalance !== null && walletBalance < cart.total && checkout.paymentMethodId === "__credit__" && (
                <p className="text-[11px] text-destructive">Saldo insuficiente para este pedido con crédito.</p>
              )}
              {cards.length === 0 && checkout.paymentMethodId !== "__credit__" && walletBalance === null && <p className="text-[11px] text-muted-foreground">Añade una tarjeta en la pestaña “Tarjetas y pagos” para pagar al instante.</p>}
              <div className="border-t border-border/30 pt-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(cart.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">IVA</span><span>{formatCurrency(cart.tax)}</span></div>
                <div className="flex justify-between font-bold"><span>Total</span><span>{formatCurrency(cart.total)}</span></div>
              </div>
              <button onClick={placeOrder} disabled={placing} className="btn btn-primary w-full gap-2">
                {placing ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                Confirmar y pagar
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[110] glass-modal rounded-xl px-4 py-3 text-sm font-medium animate-slide-in flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-500" /> {toast}
        </div>
      )}
    </div>
  );
}
