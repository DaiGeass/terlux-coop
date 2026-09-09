"use client";

import Link from "next/link";
import { ArrowLeft, ScrollText } from "lucide-react";
import { useT } from "@/i18n";
import { LanguageSwitch } from "@/components/i18n/language-switch";

export default function TerminosPage() {
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
              <ScrollText size={18} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-primary uppercase tracking-wider">{t("Vigente desde septiembre de 2026")}</p>
              <h1 className="text-2xl font-bold text-foreground">{t("Términos y Condiciones de Uso")}</h1>
            </div>
          </div>
        </header>

        <div className="glass-card rounded-2xl p-8 space-y-8 text-sm text-foreground/80 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("1. Aceptación de los términos")}</h2>
            <p>
              {t("Al crear una cuenta, instalar la aplicación de escritorio o utilizar los servicios de")} <strong>TerLux Coop</strong>
              {t("(en adelante, \"la Plataforma\"), aceptas de forma expresa y voluntaria estos Términos y Condiciones, así como")}
              {t("la Política de Privacidad y el resto de políticas aplicables. Si no estás de acuerdo, no debes crear la cuenta")}
              {t("ni usar los servicios.")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("2. Descripción del servicio")}</h2>
            <p>
              {t("La Plataforma ofrece herramientas de gestión cooperativa: directorio, mensajería interna y correo, archivos y")}
              {t("almacenamiento, proyectos y tareas con diagrama de Gantt, calendario y reuniones, nóminas, soporte técnico y")}
              {t("panel administrativo, accesibles desde la página web y la aplicación de escritorio para Windows y Linux.")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("3. Cuentas y responsabilidad del usuario")}</h2>
            <ul className="list-disc list-inside space-y-1.5">
              <li>{t("Debes proporcionar información veraz y mantenerla actualizada en tu perfil.")}</li>
              <li>{t("Eres responsable de confidencialidad de tus credenciales y de toda actividad realizada con tu cuenta.")}</li>
              <li>{t("Notificarás inmediatamente cualquier uso no autorizado escribiendo a")} <span className="text-primary">soporte@terluxcoop.com</span>.</li>
              <li>{t("La cuenta es personal e intransferible y no podrás cederla ni delegarla a terceros.")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("4. Uso aceptable")}</h2>
            <p className="mb-2">{t("Te comprometes a no utilizar la Plataforma para:")}</p>
            <ul className="list-disc list-inside space-y-1.5">
              <li>{t("Actividades ilícitas, fraudulentas o que vulneren derechos de terceros.")}</li>
              <li>{t("Enviar contenido difamatorio, amenazante, discriminatorio o que incite al odio.")}</li>
              <li>{t("Almacenar o distribuir malware, software malicioso o archivos que comprometan la seguridad.")}</li>
              <li>{t("Intentar acceder a cuentas, sistemas o datos ajenos, o interferir en la operación de los servicios.")}</li>
              <li>{t("Realizar ingeniería inversa, descompilar o extraer el código de la aplicación de escritorio.")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("5. Nóminas y datos financieros")}</h2>
            <p>
              {t("Una nómina generada es un registro informativo basado en los salarios y percepciones configurados. La retención")}
              {t("de impuestos mostrada es una estimación orientativa y no sustituye la opinión de un contador o asesor fiscal.")}
              {t("TerLux Coop queda eximida de responsabilidad por su uso fiscal.")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("6. Privacidad y datos personales")}</h2>
            <p>
              {t("Tratamos tus datos conforme a la")} <Link href="/privacidad" className="text-primary hover:underline">{t("Política de Privacidad")}</Link>.
              {t("No vendemos tus datos personales a terceros. Puedes solicitar exportación o eliminación de tu información en")}
              {t("cualquier momento.")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("7. Propiedad intelectual")}</h2>
            <p>
              {t("El software, marca, logotipos, textos e interfaces de la Plataforma son propiedad de TerLux Coop o de sus")}
              {t("licenciantes. El uso de los servicios no transfiere ningún derecho de propiedad. Lo que subas o compartas")}
              {t("mantiene la titularidad de quien lo creó, otorgándonos una licencia limitada para prestar el servicio.")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("8. Disponibilidad y garantías")}</h2>
            <p>
              {t("El servicio se ofrece \"tal cual\" y best-effort. No garantizamos disponibilidad ininterrumpida del 100%. Podremos")}
              {t("realizar mantenimientos, actualizaciones o pausas técnicas avisando con antelación razonable cuando sea posible.")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("9. Limitación de responsabilidad")}</h2>
            <p>
              {t("En la máxima medida permitida por la ley, TerLux Coop no será responsable de daños indirectos, lucro cesante o")}
              {t("pérdida de datos derivados del uso o imposibilidad de uso de los servicios, salvo dolo o negligencia grave.")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("10. Suspensión e incumplimiento")}</h2>
            <p>
              {t("Podremos suspender o eliminar cuentas que incumplan estos términos, previa notificación, o de forma inmediata ante")}
              {t("uso fraudulento o que ponga en riesgo la seguridad de la Plataforma o de otros usuarios.")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("11. Modificaciones")}</h2>
            <p>
              {t("Podemos actualizar estos términos para reflejar cambios legales o funcionales. La versión vigente se publicará en")}
              {t("esta página. El uso continuado tras la publicación supone la aceptación de los cambios.")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("12. Contacto")}</h2>
            <p>
              {t("Para consultas sobre estos términos:")} <span className="text-primary">soporte@terluxcoop.com</span>. TerLux Coop,
              {t("S.C. de R.L. de C.V.")}
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