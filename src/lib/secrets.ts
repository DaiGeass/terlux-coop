// ============================================
// TERLUX COOP - SECRETOS COMPARTIDOS
// Usa AUTH_SECRET del entorno; si falta, genera
// una clave aleatoria por arranque (nunca fija).
// ============================================

export function getAuthSecret(): string {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production") {
    console.warn("[TerLux] AUTH_SECRET no definido: generando clave aleatoria por arranque.");
  }
  // Clave aleatoria por arranque (compatible con Edge): si no hay AUTH_SECRET,
  // las sesiones no sobreviven a reinicios pero nunca se usa una clave fija pública.
  return `generated-${Date.now()}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}