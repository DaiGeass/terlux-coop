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
              {t("Al crear una cuenta, instalar la aplicación de escritorio, registrar un método de pago o utilizar los servicios de")}{" "}
              <strong>TerLux Coop</strong>{" "}
              {t("(en adelante, \"la Plataforma\"), aceptas de forma expresa, voluntaria e incondicional estos Términos y Condiciones, la")}
              {t("Política de Privacidad y el resto de políticas aplicables. El simple uso continuado, aunque no inicies sesión, supone la")}
              {t("aceptación de esta versión. Si no estás de acuerdo con cualquier cláusula, no debes crear la cuenta ni usar los servicios.")}
            </p>
            <p className="mt-2">
              {t("No se admiten cuentas creadas, modificadas o utilizadas con la intención de eludir estas condiciones, ni el uso de datos")}
              {t("falsos o de terceros sin autorización.")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("2. Descripción del servicio")}</h2>
            <p>
              {t("La Plataforma ofrece herramientas de gestión cooperativa: directorio, mensajería interna y correo, archivos y")}
              {t("almacenamiento, proyectos y tareas, calendario y reuniones, nóminas, soporte técnico y panel administrativo, accesibles")}
              {t("desde la página web y la aplicación de escritorio. Los saldos, tarjetas y pagos son simulaciones de crédito con fines")}
              {t("operativos: no constituyen una institución financiera ni emitimos, procesamos o garantizamos transacciones de terceros.")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("3. Cuentas y responsabilidad del usuario")}</h2>
            <ul className="list-disc list-inside space-y-1.5">
              <li>{t("Debes proporcionar información veraz, actual y completa, y mantenerla al día en todo momento.")}</li>
              <li>{t("La cuenta es personal, única e intransferible. Está prohibido registrar más de una cuenta con la misma identidad o")} {t("compartir credenciales, sesiones o terminales con terceros.")}</li>
              <li>{t("Eres responsable, sin excepción, de toda la actividad realizada con tu cuenta, se realice por ti o por quien la use.")}</li>
              <li>{t("Cualquier acceso no autorizado deberá notificarse de inmediato a")} <span className="text-primary">soporte@terluxcoop.com</span>{t(", sin perjuicio de tu responsabilidad por todo lo ocurrido antes de la notificación.")}</li>
              <li>{t("Podremos verificar tu identidad o exigir comprobación documental cuando la actividad de la cuenta lo requiera, y denegar")} {t("operaciones si no la facilitas.")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("4. Uso aceptable")}</h2>
            <p className="mb-2">{t("Te comprometes a no utilizar la Plataforma para:")}</p>
            <ul className="list-disc list-inside space-y-1.5">
              <li>{t("Actividades ilícitas, fraudulentas, especulativas o que vulneren derechos de terceros o de TerLux Coop.")}</li>
              <li>{t("Enviar contenido difamatorio, amenazante, discriminatorio, sexualmente explícito o que incite al odio o a la violencia.")}</li>
              <li>{t("Almacenar o distribuir malware, software malicioso, datos robados o archivos que comprometan la seguridad.")}</li>
              <li>{t("Intentar acceder a cuentas, sistemas o datos ajenos, saltarse controles de acceso, o interferir en la operación de los servicios.")}</li>
              <li>{t("Realizar ingeniería inversa, descompilar, extraer el código o imitar la aplicación de escritorio o sus interfaces.")}</li>
              <li>{t("Automatizar el acceso, hacer scraping, o crear cuentas masivas o de prueba con el fin de evadir límites, promociones o sanciones.")}</li>
              <li>{t("Usar los métodos de pago, saldos o cuentas de tarjeta de forma que generen saldos negativos, sobregiros o deudas sin intención de liquidarlas.")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("5. Nóminas y datos financieros")}</h2>
            <p>
              {t("Una nómina generada es un registro informativo basado en los salarios y percepciones configurados. La retención de impuestos")}
              {t("mostrada es una estimación orientativa y no sustituye la opinión de un contador o asesor fiscal. El uso indebido, la")}
              {t("manipulación o la dependencia exclusiva de estos datos son responsabilidad exclusiva del usuario, y TerLux Coop queda eximida de")}
              {t("cualquier responsabilidad fiscal, laboral o legal derivada de ese uso.")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("6. Pagos, tarjetas y saldo de crédito")}</h2>
            <p className="mb-2">{t("Al registrar una tarjeta o usar el saldo de crédito:")}</p>
            <ul className="list-disc list-inside space-y-1.5">
              <li>{t("Debes ser el titular legítimo de la tarjeta. Registrar una tarjeta ajena sin autorización es fraude.")}</li>
              <li>{t("Todo pago con tarjeta exige introducir el CVV en el momento del cargo; la verificación se realiza con el procesador y nunca")} {t("almacenamos el CVV ni el número completo en nuestros servidores.")}</li>
              <li>{t("El saldo de la tarjeta puede quedar en números rojos (negativo). Ese negativo constituye una deuda exigible a tu cargo.")}</li>
              <li>{t("Si tu deuda supera el límite de crédito, podremos bloquear la tarjeta o la cuenta y exigir la liquidación inmediata.")}</li>
              <li>{t("La liquidación de deuda se aplicará preferentemente a tu saldo disponible y, en su defecto, mediante cargo a tu tarjeta registrada.")}</li>
              <li>{t("Las recargas y cargos simulados no son dinero real: no generan derecho a reembolso, intereses ni rendimiento.")}</li>
              <li>{t("Podremos rechazar o revertir cualquier operación sospechosa de fraude, saldo improcedente o error sin previo aviso.")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("7. Prácticas prohibidas y sanciones")}</h2>
            <p className="mb-2">{t("TerLux Coop podrá sancionar, sin perjuicio de las demás medidas, cualquier incumplimiento. Las sanciones incluyen:")}</p>
            <ul className="list-disc list-inside space-y-1.5">
              <li>{t("Amonestación formal con registro en la cuenta y en el historial de auditoría.")}</li>
              <li>{t("Suspensión temporal de funciones, pagos, mensajería, archivos o del acceso a la cuenta.")}</li>
              <li>{t("Eliminación definitiva de la cuenta y de los datos asociados cuando exista fraude, abuso reiterado o riesgo para la Plataforma.")}</li>
              <li>{t("Exigencia de pago de la deuda, de penalizaciones por mora y de los costes de cobranza incurridos.")}</li>
              <li>{t("Denuncia ante las autoridades competentes cuando los hechos puedan ser constitutivos de delito.")}</li>
            </ul>
            <p className="mt-2">
              {t("Las sanciones se aplican en el momento en que se detecta el incumplimiento, sin obligación de aviso previo, y no generan derecho a")}
              {t("reembolso, compensación ni indemnización a tu favor.")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("8. Vigilancia, auditoría y fraude")}</h2>
            <p>
              {t("La Plataforma registra actividad de acceso, pagos y operaciones. Podremos monitorizar, auditar, señalar y congelar cuentas o")}
              {t("tarjetas que presenten patrones de riesgo, y cooperar con autoridades en investigaciones. Negarte a una auditoría motivada")}
              {t("supone motivo suficiente para la suspensión cautelar de la cuenta.")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("9. Privacidad, retención y datos personales")}</h2>
            <p>
              {t("Tratamos tus datos conforme a la")} <Link href="/privacidad" className="text-primary hover:underline">{t("Política de Privacidad")}</Link>.
              {t(" No vendemos tus datos a terceros. Conservaremos los registros de pagos, auditoría y seguridad durante el tiempo que exija la")}
              {t("ley o que sea necesario para prevenir fraude, aun después de que elimines tu cuenta. Solicitar exportación o eliminación no")}
              {t("interrumpe la conservación obligatoria de registros financieros y de seguridad.")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("10. Propiedad intelectual")}</h2>
            <p>
              {t("El software, marca, logotipos, textos e interfaces de la Plataforma son propiedad de TerLux Coop o de sus licenciantes. El uso de")}
              {t("los servicios no transfiere ningún derecho de propiedad. Lo que subas o compartas mantiene la titularidad de quien lo creó, y nos")}
              {t("otorgas una licencia limitada, irrevocable y mundial para prestar, operar y mejorar el servicio, así como para conservar copias")}
              {t("de seguridad de tus archivos.")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("11. Disponibilidad y garantías")}</h2>
            <p>
              {t("El servicio se ofrece \"tal cual\" y best-effort. No garantizamos disponibilidad ininterrumpida, integridad total de datos ni")}
              {t("ausencia de errores. Podremos realizar mantenimientos, actualizaciones o pausas técnicas con o sin aviso previo. Ante una brecha")}
              {t("de seguridad o una pérdida de datos, nuestra obligación se limita a restablecer el servicio a partir de las copias de seguridad.")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("12. Limitación de responsabilidad")}</h2>
            <p>
              {t("En la máxima medida permitida por la ley, TerLux Coop no será responsable de daños indirectos, lucro cesante, pérdida de datos o")}
              {t("de saldo, ni de las consecuencias del uso de datos financieros, salvo dolo o negligencia grave acreditada. Nuestra responsabilidad")}
              {t("máxima agregada en ningún caso superará el importe realmente pagado por el servicio en los doce meses anteriores al hecho que la motiva.")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("13. Suspensión, deuda y cobranza")}</h2>
            <p>
              {t("Podremos suspender o eliminar cuentas que incumplan estos términos, con notificación o de forma inmediata ante uso fraudulento. La")}
              {t("generación intencionada de saldos de tarjeta negativos (números rojos) sin intención de liquidarlos se considera abuso y deuda exigible.")}
              {t("El impago facultará a TerLux Coop a notificar la deuda, aplicar penalizaciones por mora, suspender todos los servicios del titular y")}
              {t("reclamar por cualquier vía legal o extrajudicial, con cargo al deudor de los costes de cobranza.")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("14. Modificaciones")}</h2>
            <p>
              {t("Podemos actualizar estos términos para reflejar cambios legales, funcionales o de política. La versión vigente se publicará en esta")}
              {t("página y, cuando el cambio sea relevante, se notificará por correo electrónico. El uso continuado tras la publicación supone la")}
              {t("aceptación íntegra de la nueva versión, incluso sin haberla leído.")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("15. Ley aplicable y jurisdicción")}</h2>
            <p>
              {t("Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier controversia se someterá a la jurisdicción de los")}
              {t("tribunales de la Ciudad de México, renunciando a cualquier otro fuero.")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("16. Contacto")}</h2>
            <p>
              {t("Para consultas sobre estos términos, pagos o incidencias:")} <span className="text-primary">soporte@terluxcoop.com</span>. TerLux Coop,
              {t("S.C. de R.L. de C.V.")}
            </p>
          </section>

          <div className="pt-4 border-t border-border/20 text-xs text-muted-foreground">
            {t("Última actualización: 9 de septiembre de 2026. Versión 1.0.5.")}
          </div>
        </div>
      </div>
    </div>
  );
}