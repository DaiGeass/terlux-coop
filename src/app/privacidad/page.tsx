"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useT } from "@/i18n";
import { LanguageSwitch } from "@/components/i18n/language-switch";

export default function PrivacidadPage() {
  const t = useT();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <header>
          <div className="flex items-center justify-between mb-2">
            <Link href="/" className="inline-flex items-center gap-2 mb-6 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={14} /> {t("Volver a TerLux Coop")}
            </Link>
            <LanguageSwitch />
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-primary uppercase tracking-wider">{t("Vigente desde septiembre de 2026")}</p>
              <h1 className="text-2xl font-bold text-foreground">{t("Política de Privacidad y Políticas de Uso")}</h1>
            </div>
          </div>
        </header>

        <div className="glass-card rounded-2xl p-8 space-y-8 text-sm text-foreground/80 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("1. Responsable del tratamiento")}</h2>
            <p>
              {t("TerLux Coop, S.C. de R.L. de C.V. es la responsable del tratamiento de los datos personales que se recaban a través")}
              {t("de la plataforma web y de la aplicación de escritorio. Contacto:")} <span className="text-primary">soporte@terluxcoop.com</span>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("2. Datos que recabamos")}</h2>
            <ul className="list-disc list-inside space-y-1.5">
              <li><strong>{t("Identificación:")}</strong> {t("nombre, apellidos, correo electrónico y, cuando aplique, rol y puesto.")}</li>
              <li><strong>{t("Técnicos:")}</strong> {t("dirección IP, tipo de dispositivo, sistema operativo y registros de auditoría de acceso.")}</li>
              <li><strong>{t("De uso:")}</strong> {t("registros de actividad, mensajes, archivos, nóminas y configuraciones creadas dentro de la plataforma.")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("3. Finalidades del tratamiento")}</h2>
            <ul className="list-disc list-inside space-y-1.5">
              <li>{t("Proporcionar, operar y mantener tu cuenta y los servicios contratados.")}</li>
              <li>{t("Gestionar la mensajería, archivos, proyectos, nóminas y soporte técnico.")}</li>
              <li>{t("Garantizar la seguridad, prevenir fraude y cumplir obligaciones legales.")}</li>
              <li>{t("Enviar avisos operativos y, si lo autorizaste, notificaciones del navegador o del sistema.")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("4. Base legal")}</h2>
            <p>
              {t("Tratamos tus datos con tu consentimiento expreso (al aceptar estas políticas al registrar tu cuenta o instalar la")}
              {t("aplicación), para la ejecución del contrato de servicio y para el cumplimiento de obligaciones legales aplicables.")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("5. Almacenamiento y seguridad")}</h2>
            <p>
              {t("Los datos se alojan en servidores propios dentro de tu red privada (Tailscale). Aplicamos cifrado en tránsito,")}
              {t("contraseñas con hash seguro y control de acceso por roles. Los archivos adjuntos y documentos están limitados a")}
              {t("un tamaño máximo de 15 MB por archivo.")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("6. Conservación")}</h2>
            <p>
              {t("Conservamos tus datos mientras tu cuenta esté activa. Tras la solicitud de baja, podremos conservarlos únicamente")}
              {t("para cumplir obligaciones legales (por ejemplo, registros fiscales) y por un plazo máximo adicional de 5 años.")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("7. Compartición con terceros")}</h2>
            <p>
              {t("No vendemos ni alquilamos tus datos personales. Podremos compartir información con proveedores técnicos necesarios")}
              {t("(almacenamiento, correo interno) bajo obligaciones de confidencialidad, o con autoridades cuando lo exija la ley.")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("8. Tus derechos")}</h2>
            <p>
              {t("Puedes ejercer los derechos de acceso, rectificación, cancelación, limitación y oposición, así como la")}
              {t("portabilidad de tus datos, escribiendo a")} <span className="text-primary">soporte@terluxcoop.com</span> e
              {t("identificando tu cuenta. Atenderemos tu solicitud en un máximo de 15 días hábiles.")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("9. Cookies y almacenamiento local")}</h2>
            <p>
              {t("La web utiliza una cookie de sesión estrictamente necesaria para mantener tu inicio de sesión. La aplicación de")}
              {t("escritorio guarda preferencias locales (host, puerto, tema) y tu sesión cifrada en llaveros del sistema")}
              {t("operativo. No usamos cookies de publicidad ni rastreo de terceros.")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("10. Cambios a esta política")}</h2>
            <p>
              {t("Actualizaremos esta política cuando cambie el tratamiento de datos. La versión vigente estará siempre disponible")}
              {t("en esta dirección, junto a los")} <Link href="/terminos" className="text-primary hover:underline">{t("Términos y Condiciones")}</Link>.
            </p>
          </section>

          <div className="pt-4 border-t border-border/20 text-xs text-muted-foreground">
            {t("Última actualización: 8 de septiembre de 2026. Versión 1.0.")}
          </div>
        </div>
      </div>
    </div>
  );
}