"use client";

import StorePage from "../store/page";

// Facturación reutiliza el módulo comercial abriendo la pestaña de pagos
export default function BillingPage() {
  return <StorePage initialTab="credit" />;
}
