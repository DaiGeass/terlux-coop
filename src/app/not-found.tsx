import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.18),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(37,99,235,0.15),transparent_45%)] p-6">
      <div className="max-w-md w-full text-center">
        <div className="text-7xl font-black tracking-tight bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent">
          404
        </div>
        <h1 className="mt-4 text-2xl font-bold">Página no encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          La dirección que has solicitado no existe o se ha movido. Verifica el
          enlace o vuelve al inicio.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-foreground text-background px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition"
          >
            <ArrowLeft size={16} /> Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}