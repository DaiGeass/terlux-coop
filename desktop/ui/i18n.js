/* ============================================================
   TerLux Coop Desktop — i18n (ES → EN)
   Self-contained, no ES modules.
   ============================================================ */

(function () {
  "use strict";

  var COOKIE = "terlux_lang";
  var DEFAULT_LOCALE = "en";

  // ------------------------------------------------------------------
  // Diccionario: clave = español (tal cual aparece en código), valor = inglés
  // ------------------------------------------------------------------
  var dict = {
    // --- Comunes / CLI ---
    "Tauri no disponible": "Tauri not available",
    "Cargando…": "Loading…",
    "Cargando TerLux Coop…": "Loading TerLux Coop…",

    // --- Login ---
    "Suite Empresarial · Cliente de escritorio": "Business Suite · Desktop client",
    "Comprobando conexión con la VPN…": "Checking VPN connection…",
    "Correo corporativo": "Corporate email",
    "Contraseña": "Password",
    "Recordar mi correo en este equipo": "Remember my email on this device",
    "Entrar a la plataforma": "Enter the platform",
    "Configurar servidor y VPN": "Configure server and VPN",
    "Host / IP": "Host / IP",
    "Puerto": "Port",
    "Red VPN": "VPN network",
    "Protocolo": "Protocol",
    "Aceptar certificado autofirmado (red interna)": "Accept self-signed certificate (internal network)",
    "Probar": "Test",
    "Guardar": "Save",
    "Las credenciales son las mismas de la plataforma web.": "Credentials are the same as the web platform.",
    "La sesión se guarda cifrada en el llavero del sistema.": "The session is stored encrypted in the system keychain.",
    "Conectando…": "Connecting…",
    "La sesión ha caducado, vuelve a iniciar sesión": "Session expired, please sign in again",
    "Sesión reanudada": "Session resumed",
    "Bienvenido/a": "Welcome",
    "Sesión cerrada": "Signed out",

    // --- Términos ---
    "Antes de continuar": "Before continuing",
    "TerLux Coop · Términos y Políticas de Uso": "TerLux Coop · Terms and Use Policies",
    "Ver términos (web)": "View terms (web)",
    "Ver privacidad (web)": "View privacy (web)",
    "He leído y acepto los Términos y condiciones y la Política de privacidad de TerLux Coop.":
      "I have read and accept the Terms and Conditions and the Privacy Policy of TerLux Coop.",
    "Aceptar y continuar": "Accept and continue",
    "Debes marcar la casilla para aceptar los términos.":
      "You must check the box to accept the terms.",
    "Guardando…": "Saving…",
    "Términos aceptados. ¡Bienvenido/a!": "Terms accepted. Welcome!",
    "No se pudo guardar la aceptación. Verifica tu conexión.":
      "Could not save acceptance. Check your connection.",

    // --- Sidebar ---
    "Escritorio v1.0.4": "Desktop v1.0.4",
    "Comprobando…": "Checking…",
    "VPN": "VPN",
    "Cambiar tema": "Change theme",
    "Cerrar sesión": "Sign out",
    "Cuenta y seguridad": "Account & security",
    "Contraseña actual": "Current password",
    "Contraseña nueva": "New password",
    "Confirmar contraseña nueva": "Confirm new password",
    "Actualizar contraseña": "Update password",
    "Contraseña actualizada": "Password updated",
    "Completa los tres campos": "Fill in all three fields",
    "Las contraseñas nuevas no coinciden": "New passwords do not match",
    "La contraseña debe tener al menos 8 caracteres": "Password must be at least 8 characters",
    "La contraseña actual es incorrecta": "Current password is incorrect",
    "Buscar…": "Search…",
    "Otros": "Others",
    "Saldo": "Balance",
    "límite": "limit",
    "Sin conexión con el drive": "No connection with Drive",
    "Saldo de monedero": "Credit balance",
    "crédito disponible para pagos": "credit available for payments",
    "Tarjetas registradas": "Registered cards",
    "métodos de pago": "payment methods",
    "Deuda en tarjetas": "Card debt",
    "saldo en números rojos": "balance in the red",
    "Crédito total": "Total credit",
    "suma de límites": "sum of limits",
    "Panel": "Dashboard",
    "Actualizar": "Refresh",
    "Abrir en el navegador": "Open in browser",
    "Notificaciones recientes": "Recent notifications",
    "Sin novedades": "No updates",
    "Sin conexión con el servidor · se muestran los últimos datos guardados en este equipo":
      "Server disconnected · showing the latest cached data on this device",

    // --- Facturación ---
    "Facturación": "Billing",

    // --- NAV groups ---
    "Principal": "Main",
    "Personal": "Personal",
    "Operaciones": "Operations",
    "Comercial": "Sales",
    "Finanzas": "Finance",
    "Administración": "Administration",
    "Sistema": "System",

    // --- NAV items ---
    "Mensajes": "Messages",
    "Trabajos": "Jobs",
    "Tarjetas y facturación": "Cards & billing",
    "Técnico / BD": "Tech / DB",
    "Mensajería": "Messaging",
    "Chat del equipo y bandeja de correo": "Team chat and email inbox",
    "Métodos de pago, saldo, movimientos y pedidos": "Payment methods, balance, transactions and orders",
    "TerLux Coop · Suite Empresarial": "TerLux Coop · Business Suite",

    // --- Conexión ---
    "Conectado": "Connected",
    "Sin conexión": "Disconnected",
    "VPN activa": "VPN active",
    "Fuera de la VPN": "Outside VPN",

    // --- Rol labels ---
    "Super administrador": "Super admin",
    "Administrador": "Admin",
    "Gestor": "Manager",
    "Recursos Humanos": "Human Resources",
    "Finanzas": "Finance",
    "Soporte": "Support",
    "Empleado": "Employee",
    "Cliente": "Client",
    "Invitado": "Guest",

    // --- Dashboard ---
    "Resumen de tu actividad y del sistema": "Your activity and system overview",
    "Mis tareas": "My tasks",
    "Estado de la infraestructura": "Infrastructure status",
    "Este equipo": "This device",
    "Tareas pendientes": "Pending tasks",
    "asignadas a la organización": "assigned to the organization",
    "Tareas completadas": "Completed tasks",
    "histórico registrado": "recorded history",
    "Latencia API": "API latency",
    "servidor accesible": "server reachable",
    "sin respuesta": "no response",
    "Estado VPN": "VPN status",
    "Activa": "Active",
    "Inactiva": "Inactive",
    "sin dirección asignada": "no address assigned",
    "No hay tareas registradas.": "No tasks registered.",
    "Servidor web": "Web server",
    "Puerta de enlace VPN": "VPN gateway",
    "Base de datos": "Database",
    "Almacenamiento": "Storage",
    "Equipo": "Device",
    "Plataforma": "Platform",
    "Sistema": "OS",
    "Procesador": "CPU",
    "Núcleos": "Cores",
    "Memoria": "Memory",
    "IP en la VPN": "VPN IP",
    "no asignada": "not assigned",
    "ID de cliente": "Client ID",

    // --- Tareas / Kanban ---
    "Tablero Kanban sincronizado con la plataforma": "Kanban board synced with the platform",
    "Tareas": "Tasks",
    "Nueva tarea…": "New task…",
    "Baja": "Low",
    "Media": "Medium",
    "Alta": "High",
    "Crítica": "Critical",
    "Añadir": "Add",
    "Tarea creada": "Task created",
    "No se pudieron cargar las tareas": "Could not load tasks",
    "No se pudo mover la tarea": "Could not move the task",
    "No se pudo crear la tarea": "Could not create the task",
    "Por hacer": "To do",
    "En progreso": "In progress",
    "En revisión": "In review",
    "Completadas": "Completed",
    "Completada": "Completed",
    "Bloqueada": "Blocked",

    // --- Archivos ---
    "Sube y sincroniza documentos con el almacenamiento": "Upload and sync files with storage",
    "Archivos": "Files",
    "Subir al almacenamiento": "Upload to storage",
    "Arrastra archivos aquí": "Drag files here",
    "o usa el botón para elegirlos del equipo": "or use the button to pick them from your device",
    "Seleccionar archivos": "Select files",
    "Carpeta sincronizada": "Synced folder",
    "Se comprueba periódicamente y sube lo que cambie.":
      "Checked periodically and uploads any changes.",
    "Carpeta": "Folder",
    "No configurada": "Not configured",
    "Pendientes": "Pending",
    "Última sincronización": "Last sync",
    "Sincronizar automáticamente cada 5 minutos": "Sync automatically every 5 minutes",
    "Elegir carpeta": "Choose folder",
    "Sincronizar ahora": "Sync now",
    "Reiniciar índice": "Reset index",
    "Archivos en el servidor": "Files on server",
    "Todavía no hay archivos en el servidor.": "No files on the server yet.",
    "Nombre": "Name",
    "Tipo": "Type",
    "Tamaño": "Size",
    "Subido": "Uploaded",
    "Compartido": "Shared",
    "compartido": "shared",
    "solo tú": "only you",
    "Descargar": "Download",
    "Compartir": "Share",
    "Descompartir": "Unshare",
    "Eliminar": "Delete",
    "Guardado en": "Saved to",
    "compartido con la organización": "shared with the organization",
    "ya no es compartido": "no longer shared",
    "No se pudo cambiar el estado de compartido": "Could not change share status",
    "Archivo eliminado": "File deleted",
    "No se pudo eliminar el archivo": "Could not delete file",
    "Sin conexión con el servidor de archivos.":
      "Disconnected from file server.",
    "Completado": "Completed",
    "de archivo(s) subidos": "file(s) uploaded",
    "Carpeta de sincronización actualizada": "Sync folder updated",
    "Sincronización:": "Sync:",
    "subidos,": "uploaded,",
    "con error": "with errors",
    "Índice reiniciado: la próxima sincronización subirá todo":
      "Index reset: next sync will upload everything",

    // --- Mensajes ---
    "Chat del equipo": "Team chat",
    "Escribe un mensaje…": "Type a message…",
    "Enviar": "Send",
    "Bandeja de entrada": "Inbox",
    "Sin conexión con el chat.": "Disconnected from chat.",
    "La bandeja está vacía.": "Inbox is empty.",
    "Sin conexión con el correo.": "Disconnected from mail.",
    "No se pudo enviar el mensaje": "Could not send message",
    "Nuevo mensaje": "New message",
    "Respuesta recibida": "Reply received",
    "Equipo": "Team",
    "nuevo": "new",
    "Enviados": "Sent",
    "Todos": "All",
    "De": "From",
    "Para": "To",
    "(sin asunto)": "(no subject)",
    "Subiendo": "Uploading",
    "adjuntado(s)": "attached",
    "Escribe un destinatario": "Enter a recipient",
    "Escribe un asunto": "Enter a subject",
    "Correo enviado": "Email sent",
    "Destinatario(s) externo(s)": "External recipient(s)",
    "No se pudo enviar el correo": "Could not send email",
    "Nuevo correo": "New email",
    "Redactar correo": "Compose email",
    "Adjuntar archivo": "Attach file",
    "Sin destinatario": "No recipient",

    // --- Directorio ---
    "Buscar personas…": "Search people…",
    "Personas de la organización": "People in the organization",
    "Directorio": "Directory",
    "No hay personas que coincidan.": "No matching people.",

    // --- RRHH ---
    "RR. HH.": "HR",
    "Días libres y solicitudes": "Time off and requests",
    "Solicitar días libres": "Request time off",
    "Vacaciones": "Vacation",
    "Enfermedad": "Sick leave",
    "Asuntos propios": "Personal leave",
    "Otro": "Other",
    "Desde": "From",
    "Hasta": "To",
    "Motivo": "Reason",
    "Enviar solicitud": "Submit request",
    "Solicitudes": "Requests",
    "No hay solicitudes registradas.": "No requests registered.",
    "Solicitud enviada": "Request submitted",
    "No se pudo enviar la solicitud": "Could not submit request",
    "Solicitud aprobada": "Request approved",
    "Solicitud rechazada": "Request rejected",
    "No se pudo actualizar la solicitud": "Could not update request",
    "Sin conexión con RR. HH.": "Disconnected from HR.",
    "Indica las fechas": "Enter the dates",
    "Día(s)": "day(s)",

    // --- Dispositivos ---
    "Inventario de equipos (MDM)": "Device inventory (MDM)",
    "Dispositivos": "Devices",
    "Este equipo en el inventario": "This device in inventory",
    "Registrar / actualizar": "Register / update",
    "Parque informático": "Device fleet",
    "IP VPN": "VPN IP",
    "Versión app": "App version",
    "El inventario está vacío.": "Inventory is empty.",
    "Sin conexión con el inventario.": "Disconnected from inventory.",
    "Equipo registrado en el inventario": "Device registered in inventory",
    "sin asignar": "unassigned",

    // --- Trabajos ---
    "Nombre del trabajo…": "Job name…",
    "Email": "Email",
    "Informe": "Report",
    "Importación": "Import",
    "Exportación": "Export",
    "Sincronización": "Sync",
    "Personalizado": "Custom",
    "Encolar": "Queue",
    "Cola de trabajos": "Job queue",
    "Procesos en segundo plano": "Background processes",
    "Sin colas disponibles": "No queues available",
    "No hay trabajos en la cola.": "No jobs in the queue.",
    "Sin conexión con el servicio de trabajos.":
      "Disconnected from job service.",
    "Elige una cola y escribe el nombre": "Choose a queue and enter a name",
    "Trabajo encolado": "Job queued",
    "No se pudo encolar el trabajo": "Could not queue the job",
    "intentos": "attempts",

    // --- Proyectos ---
    "Alta y cartera de proyectos de la organización":
      "Create and manage organization projects",
    "Proyectos": "Projects",
    "Alta de proyecto": "Create project",
    "Nombre (obligatorio)": "Name (required)",
    "Código": "Code",
    "Prioridad": "Priority",
    "Inicio": "Start",
    "Fin": "End",
    "Presupuesto (MXN)": "Budget (MXN)",
    "Descripción": "Description",
    "Crear proyecto": "Create project",
    "Proyecto creado": "Project created",
    "El nombre del proyecto es obligatorio": "Project name is required",
    "No hay proyectos registrados.": "No projects registered.",
    "Sin conexión con los proyectos.": "Disconnected from projects.",
    "Proyecto": "Project",
    "Estado": "Status",
    "Responsable": "Manager",
    "Progreso": "Progress",
    "tareas": "tasks",

    // --- Tienda / Pagos ---
    "Catálogo, pedidos y saldo de crédito":
      "Catalog, orders and credit balance",
    "Tienda y pagos": "Store & payments",
    "Catálogo": "Catalog",
    "Carrito": "Cart",
    "Vacío.": "Empty.",
    "Facturar a nombre de": "Bill to",
    "RFC / ID fiscal": "Tax ID",
    "Dirección": "Address",
    "Pagar con saldo": "Pay with balance",
    "Mi saldo y recarga": "My balance & top-up",
    "Cantidad (MXN)": "Amount (MXN)",
    "Recargar": "Top up",
    "Pedidos": "Orders",
    "Saldo de crédito": "Credit balance",
    "recargable desde esta vista": "rechargeable from this view",
    "Última recarga": "Last top-up",
    "sin movimientos": "no transactions",
    "histórico de compras": "purchase history",
    "Saldo actual": "Current balance",
    "Movimientos": "Transactions",
    "Última operación": "Last transaction",
    "Sin información de saldo.": "No balance info.",
    "Sin conexión con el saldo.": "Disconnected from balance.",
    "El catálogo está vacío.": "Catalog is empty.",
    "Sin conexión con el catálogo.": "Disconnected from catalog.",
    "Añadir al carrito": "Add to cart",
    "añadido al carrito": "added to cart",
    "No se pudo añadir al carrito": "Could not add to cart",
    "El carrito está vacío.": "Cart is empty.",
    "Sin conexión con el carrito.": "Disconnected from cart.",
    "Quitar": "Remove",
    "Total (IVA incl.)": "Total (VAT incl.)",
    "c/u": "each",
    "No se pudo quitar el producto": "Could not remove product",
    "Aún no has hecho pedidos.": "No orders yet.",
    "Sin conexión con los pedidos.": "Disconnected from orders.",
    "Indica una cantidad válida": "Enter a valid amount",
    "El máximo por recarga es 50.000 MXN": "Maximum top-up is 50,000 MXN",
    "Saldo recargado:": "Balance topped up:",
    "No se pudo recargar el saldo": "Could not top up balance",
    "Pedido": "Order",

    // --- Calendario ---
    "Reuniones y eventos de la organización":
      "Meetings and events for the organization",
    "Calendario": "Calendar",
    "Nueva reunión / evento": "New meeting / event",
    "Título (obligatorio)": "Title (required)",
    "Reunión": "Meeting",
    "Evento": "Event",
    "Hito": "Milestone",
    "Revisión": "Review",
    "Ubicación": "Location",
    "Reunión en línea": "Online meeting",
    "Crear reunión": "Create meeting",
    "Reuniones y eventos": "Meetings and events",
    "Reunión creada": "Meeting created",
    "Completa título, inicio y fin": "Enter title, start and end",
    "No hay reuniones programadas.": "No scheduled meetings.",
    "Sin conexión con el calendario.": "Disconnected from calendar.",
    "Reunión eliminada": "Meeting deleted",
    "No se pudo eliminar la reunión": "Could not delete meeting",
    "Sala": "Room",

    // --- Documentos ---
    "Políticas, informes, contratos y manuales":
      "Policies, reports, contracts and manuals",
    "Documentos": "Documents",
    "Nuevo documento": "New document",
    "Documento": "Document",
    "Política": "Policy",
    "Contrato": "Contract",
    "Manual": "Manual",
    "Borrador": "Draft",
    "Publicado": "Published",
    "Archivado": "Archived",
    "Contenido": "Content",
    "Texto del documento…": "Document text…",
    "Guardar documento": "Save document",
    "Documento guardado": "Document saved",
    "Escribe un título": "Enter a title",
    "No hay documentos todavía.": "No documents yet.",
    "Sin conexión con los documentos.": "Disconnected from documents.",
    "¿Eliminar este documento?": "Delete this document?",
    "Documento eliminado": "Document deleted",
    "No se pudo eliminar el documento": "Could not delete document",

    // --- Nóminas ---
    "Desglose salarial por empleado y periodos (datos sensibles)":
      "Salary breakdown by employee and periods (sensitive data)",
    "Nóminas": "Payrolls",
    "Generar nómina (proceso automático: ISR + seguridad social)":
      "Generate payroll (automatic: income tax + social security)",
    "Mes": "Month",
    "Enero": "January",
    "Febrero": "February",
    "Marzo": "March",
    "Abril": "April",
    "Mayo": "May",
    "Junio": "June",
    "Julio": "July",
    "Agosto": "August",
    "Septiembre": "September",
    "Octubre": "October",
    "Noviembre": "November",
    "Diciembre": "December",
    "Año": "Year",
    "Generar nómina": "Generate payroll",
    "Períodos de nómina": "Payroll periods",
    "Periodos": "Periods",
    "meses calculados": "months calculated",
    "Bruto acumulado": "Accumulated gross",
    "todos los periodos": "all periods",
    "Neto acumulado": "Accumulated net",
    "después de impuestos": "after taxes",
    "Empleados en nómina": "Employees on payroll",
    "último periodo": "last period",
    "empleados": "employees",
    "bruto": "gross",
    "neto": "net",
    "Empleado": "Employee",
    "Puesto": "Position",
    "Salario base": "Base salary",
    "Extras": "Extras",
    "Impuestos": "Taxes",
    "Neto": "Net",
    "No hay períodos de nómina. Genera el primero con el formulario.":
      "No payroll periods. Generate the first one using the form.",
    "No puedes consultar nóminas o el servicio no responde. Rol requerido: Finanzas/Administración.":
      "You cannot access payroll or the service is not responding. Required role: Finance/Admin.",
    "Nómina de": "Payroll for",
    "generada con": "generated with",
    "empleado(s)": "employee(s)",
    "Indica un año válido": "Enter a valid year",

    // --- Facturación / Tarjetas ---
    "Métodos de pago": "Payment methods",
    "Número de tarjeta": "Card number",
    "Titular": "Cardholder",
    "Caduca (mes)": "Expiry (month)",
    "Caduca (año)": "Expiry (year)",
    "Añadir método de pago": "Add payment method",
    "Tus tarjetas": "Your cards",
    "Saldo y movimientos": "Balance and transactions",
    "Movimientos de crédito": "Credit transactions",
    "por defecto": "default",
    "No tienes métodos de pago registrados.":
      "No payment methods registered.",
    "Sin conexión con los métodos de pago.":
      "Disconnected from payment methods.",
    "Método de pago añadido": "Payment method added",
    "Método de pago eliminado": "Payment method deleted",
    "No se pudo eliminar": "Could not delete",
    "Introduce un número de tarjeta válido (solo se guardan los últimos 4)":
      "Enter a valid card number (only last 4 digits are stored)",
    "Indica el titular de la tarjeta": "Enter the cardholder name",
    "Último movimiento": "Last transaction",
    "Sin movimientos de saldo.": "No balance transactions.",

    // --- Administración ---
    "Usuarios, clientes y métricas de la plataforma":
      "Users, clients and platform metrics",
    "Administración": "Administration",
    "Alta de usuario": "Create user",
    "Correo": "Email",
    "Contraseña (mín. 8)": "Password (min. 8)",
    "Rol": "Role",
    "Gerente": "Manager",
    "Crear usuario": "Create user",
    "Usuarios de la plataforma": "Platform users",
    "Buscar por nombre o correo…": "Search by name or email…",
    "Usuarios": "Users",
    "activos": "active",
    "en la plataforma": "on the platform",
    "completadas": "completed",
    "Ingresos": "Revenue",
    "pedidos pagados": "paid orders",
    "Usuario": "User",
    "Acciones": "Actions",
    "activo": "active",
    "inactivo": "inactive",
    "No puedes desactivar tu propia cuenta":
      "You cannot deactivate your own account",
    "crédito": "credit",
    "+ crédito": "+ credit",
    "Añadir saldo de crédito": "Add credit balance",
    "Solo administradores pueden crear usuarios":
      "Only admins can create users",
    "No hay clientes registrados.": "No clients registered.",
    "Clientes": "Clients",
    "Cuentas con rol de cliente. Puedes darles de alta desde la pestaña Usuarios o añadirles crédito de demostración.":
      "Accounts with the client role. You can create them from the Users tab or add demo credit.",
    "Último acceso": "Last login",
    "Usuario creado correctamente": "User created successfully",
    "Completa nombre, apellidos, correo y contraseña":
      "Enter first name, last name, email and password",
    "La contraseña debe tener al menos 8 caracteres":
      "Password must be at least 8 characters",
    "Rol actualizado": "Role updated",
    "No se pudo cambiar el rol": "Could not change role",
    "Usuario activado": "User activated",
    "Usuario dado de baja (inactivo)": "User deactivated",
    "No se pudo actualizar el estado": "Could not update status",
    "¿Eliminar definitivamente a este usuario? Esta acción no se puede deshacer.":
      "Permanently delete this user? This action cannot be undone.",
    "Usuario eliminado": "User deleted",
    "No se pudo eliminar el usuario": "Could not delete user",
    "Indica una cantidad": "Enter an amount",
    "Crédito añadido. Saldo:": "Credit added. Balance:",
    "No se pudo añadir crédito": "Could not add credit",
    "Sin conexión con el panel de administración.":
      "Disconnected from admin panel.",
    "Sin conexión.": "Disconnected.",

    // --- Técnico / Base de datos ---
    "Acceso directo a PostgreSQL por VPN":
      "Direct PostgreSQL access over VPN",
    "Panel técnico": "Technical panel",
    "sin comprobar": "not checked",
    "Usuario": "User",
    "Se guarda en el llavero": "Stored in the keychain",
    "Probar conexión": "Test connection",
    "Conexión directa a PostgreSQL": "Direct PostgreSQL connection",
    "Tablas": "Tables",
    "Conecta para listar": "Connect to list",
    "Consola SQL": "SQL console",
    "Ejecutar consulta": "Run query",
    "Ejecutar sentencia": "Run statement",
    "Registro local de operaciones técnicas": "Local technical operations log",
    "Conexión con PostgreSQL establecida": "PostgreSQL connection established",
    "conectado": "connected",
    "sin conexión": "disconnected",
    "Tamaño": "Size",
    "Conexiones": "Connections",
    "En marcha desde": "Uptime since",
    "Versión": "Version",
    "Ejecutado:": "Executed:",
    "fila(s)": "row(s)",
    "resultado recortado": "truncated result",
    "La consulta no devolvió columnas.":
      "The query returned no columns.",
    "Datos de conexión guardados": "Connection data saved",
    "Conectando…": "Connecting…",

    // --- Ajustes ---
    "Servidor, VPN y preferencias": "Server, VPN and preferences",
    "Ajustes": "Settings",
    "Servidor y VPN": "Server and VPN",
    "Puerta de enlace": "Gateway",
    "Puerto almacén": "Storage port",
    "Usar HTTPS": "Use HTTPS",
    "Aceptar certificados autofirmados": "Accept self-signed certificates",
    "Guardar configuración": "Save settings",
    "Restaurar valores": "Reset defaults",
    "Configuración guardada": "Settings saved",
    "Aplicación": "Application",
    "Mostrar notificaciones del sistema": "Show system notifications",
    "Al cerrar, minimizar a la bandeja": "Minimize to tray on close",
    "Sincronización automática de carpeta": "Automatic folder sync",
    "Intervalo de latido (segundos)": "Heartbeat interval (seconds)",
    "IP en la VPN": "VPN IP",
    "Probar notificación": "Test notification",
    "Buscar actualizaciones": "Check for updates",
    "Las notificaciones funcionan correctamente.":
      "Notifications are working correctly.",
    "Diagnóstico de red": "Network diagnostics",
    "Ejecutar diagnóstico": "Run diagnostics",
    "Comprobando…": "Checking…",
    "Valores restaurados": "Defaults restored",
    "Hay una versión nueva disponible:": "A new version is available:",
    "tienes la": "you have",
    "Estás en la última versión": "You are on the latest version",
    "API web": "Web API",
    "Puerta VPN": "VPN gateway",
    "IPs locales": "Local IPs",
    "Estado": "Status",
    "Servidor accesible": "Server reachable",
    "El servidor no responde": "Server not responding",

    // --- Pestañas Admin ---
    "Usuarios": "Users",

    // --- Offline ---
    "Sin conexión con el chat.": "Disconnected from chat.",
    "Sin conexión con el correo.": "Disconnected from mail.",

    // --- Sin conexión (genérico) ---
    "Sin conexión": "Disconnected",

    // --- Términos (texto largo en index.html) ---
    "Antes de continuar": "Before continuing",
    "TerLux Coop · Términos y Políticas de Uso":
      "TerLux Coop · Terms and Use Policies",
    // Intro con <strong>: nodos traducidos individualmente
    "Al usar la aplicación TerLux Coop y los servicios de la Plataforma aceptas los ":
      "By using the TerLux Coop application and the Platform services you accept the ",
    " y la ": " and the ",
    " vigentes. Puntos principales:": " in force. Main points:",
    "Términos y Condiciones de Uso": "Terms and Conditions",
    "Política de Privacidad": "Privacy Policy",
    "Tu cuenta es personal e intransferible; protege tus credenciales.":
      "Your account is personal and non-transferable; protect your credentials.",
    "La información que aportas debe ser veraz y actualizada.":
      "The information you provide must be truthful and up to date.",
    "No usarás la plataforma para actividades ilícitas, difamatorias o que vulneren derechos de terceros.":
      "You will not use the platform for unlawful, defamatory activities or that violate the rights of third parties.",
    "No distribuirás malware ni intentarás acceder a sistemas ajenos.":
      "You will not distribute malware or attempt to access third-party systems.",
    "Las nóminas generadas son registros informativos con impuestos estimados.":
      "Generated payrolls are informative records with estimated taxes.",
    "Tratamos tus datos conforme a la Política de Privacidad; no los vendemos a terceros.":
      "We process your data in accordance with the Privacy Policy; we do not sell it to third parties.",
    "La aplicación guarda tu sesión cifrada en el llavero del sistema y precarga preferencias locales.":
      "The app stores your session encrypted in the system keychain and preloads local preferences.",
    "Versión 1.0 · Vigente desde septiembre de 2026.":
      "Version 1.0 · Effective September 2026.",
    "Versión 1.0.5 · Vigente desde septiembre de 2026.":
      "Version 1.0.5 · Effective September 2026.",
    "Raíz": "Root",
    "Sin archivos en esta carpeta.": "No files in this folder.",
    "Todos": "All",
    "Imágenes": "Images",
    "Videos": "Videos",
    "Audio": "Audio",
    "Almacenamiento": "Storage",
    "Tu cuenta es personal, única e intransferible; protege tus credenciales y no las compartas.":
      "Your account is personal, unique and non-transferable; protect your credentials and do not share them.",
    "No usarás la plataforma para actividades ilícitas, fraudulentas, difamatorias o que vulneren derechos de terceros.":
      "You will not use the platform for illegal, fraudulent, defamatory activities or activities that violate third-party rights.",
    "Los pagos con tarjeta requieren CVV en el cargo y el saldo de tarjeta puede quedar en números rojos (deuda exigible).":
      "Card payments require a CVV at the time of the charge and the card balance may go into the red (enforceable debt).",
    "Las sanciones por incumplimiento incluyen advertencias, suspensión, eliminación de cuenta y reclamación de deuda y cobranza.":
      "Sanctions for breach include warnings, suspension, account deletion and debt and collections claims.",
    "Apellidos": "Last name",
    "Host": "Host",
    "Las credenciales son las mismas de la plataforma web. La sesión se guarda cifrada en el llavero del sistema.":
      "Credentials are the same as on the web platform. The session is stored encrypted in the system keychain.",

    // --- Strings de vistas (helper card/infraRow/kv y estado) ---
    "Tareas pendientes": "Pending tasks",
    "asignadas a la organización": "assigned to the organization",
    "Tareas completadas": "Completed tasks",
    "histórico registrado": "recorded history",
    "Latencia API": "API latency",
    "servidor accesible": "server reachable",
    "sin respuesta": "no response",
    "Estado VPN": "VPN status",
    "Activa": "Active",
    "Inactiva": "Inactive",
    "sin dirección asignada": "no address assigned",
    "Servidor web": "Web server",
    "Puerta de enlace VPN": "VPN gateway",
    "Base de datos": "Database",
    "Almacenamiento": "Storage",
    "Adjuntar archivo del drive": "Attach drive file",
    "Sube archivos al drive para poder adjuntarlos": "Upload files to the drive before attaching them",
    "No hay archivos para adjuntar.": "No files to attach.",
    "Equipo": "Device",
    "Plataforma": "Platform",
    "Sistema": "System",
    "Procesador": "Processor",
    "Núcleos": "Cores",
    "Memoria": "Memory",
    "no asignada": "not assigned",
    "ID de cliente": "Client ID",
    "OK": "OK",
    "Servidor accesible": "Server reachable",
    "Por hacer": "To do",
    "En progreso": "In progress",
    "En revisión": "In review",
    "Completada": "Completed",
    "Completadas": "Completed",
    "Bloqueada": "Blocked",

    // --- Upload progress ---
    "Error:": "Error:",
    "subido(s)": "uploaded",

    // --- Sync status ---
    "Analizados": "Scanned",
    "archivo(s)": "file(s)",
    "pendiente(s) de subir": "pending upload",
    "Sincronización completada": "Sync completed",

    // --- Vistas: mensajes de estado (renderizadas por trSweep) ---
    "Añadir al carrito": "Add to cart",
    "Aún no has hecho pedidos.": "You have not placed any orders yet.",
    "El catálogo está vacío.": "The catalog is empty.",
    "El inventario está vacío.": "The inventory is empty.",
    "La bandeja está vacía.": "The inbox is empty.",
    "No hay documentos todavía.": "No documents yet.",
    "No hay trabajos en la cola.": "No jobs in the queue.",
    "No tienes métodos de pago registrados.": "You have no registered payment methods.",
    "Sin colas disponibles": "No queues available",
    "Sin conexión con el saldo.": "Disconnected from balance.",
    "Sin información de saldo.": "No balance information.",
    "Sin movimientos de saldo.": "No balance transactions.",
    "Todavía no hay archivos en el servidor.": "No files on the server yet.",
    "sin asignar": "unassigned",

    // --- Claves añadidas con las ediciones t() de las vistas ---
    "Aprobar": "Approve",
    "Asignado": "Assigned",
    "Atención:": "Attention:",
    "Bienvenido/a,": "Welcome,",
    "Eliminar definitivamente": "Delete permanently",
    "Movimiento": "Movement",
    "Precio": "Price",
    "Presupuesto": "Budget",
    "Producto": "Product",
    "Rechazar": "Reject",
    "Se guarda en el llavero del sistema": "Stored in the system keychain",
    "Sesión reanudada ·": "Session resumed ·",
    "archivo(s) subidos": "file(s) uploaded",
    "caduca": "expires",
    "de": "of",
    "del almacenamiento?": "from storage?",
    "día(s)": "day(s)",
    "error": "error",
    "estado:": "status:",
    "filas aprox.": "approx. rows",
    "registrado": "registered",
    "¿Confirmas que quieres ejecutarla?": "Do you confirm you want to run it?",
    "¿Eliminar": "Delete",
    "•••••••• (guardada en el llavero)": "•••••••• (saved in keychain)",
  };

  // ------------------------------------------------------------------
  // Locale helpers
  // ------------------------------------------------------------------
  function getLocale() {
    var match = document.cookie.match(new RegExp("(?:^|; )" + COOKIE + "=([^;]*)"));
    return match ? decodeURIComponent(match[1]) : DEFAULT_LOCALE;
  }

  function setLocale(locale) {
    document.cookie = COOKIE + "=" + encodeURIComponent(locale) + ";path=/;max-age=31536000";
    document.documentElement.lang = locale;
    applyTranslations();
    window.dispatchEvent(new CustomEvent("terlux:localechange", { detail: { locale: locale } }));
  }

  function t(key) {
    if (getLocale() === "es") return key;
    return dict[key] || key;
  }

  // ------------------------------------------------------------------
  // Apply translations to DOM
  // ------------------------------------------------------------------
  function applyTranslations() {
    var locale = getLocale();

    // Update document title
    var titleKey = document.querySelector("title")?.textContent?.trim();
    if (titleKey && dict[titleKey]) {
      document.title = locale === "en" ? dict[titleKey] : titleKey;
    }

    // textContent (solo elementos hoja; los que contienen hijos gestionan sus propios nodos)
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (!key) return;
      var hasChildren = el.children.length > 0;
      if (hasChildren) return; // no machar elementos con <strong> etc.
      el.dataset.i18nOrig = el.dataset.i18nOrig || el.textContent;
      if (locale === "es") {
        el.textContent = el.dataset.i18nOrig;
      } else if (locale === "en" && dict[key]) {
        el.textContent = dict[key];
      }
    });

    // title attribute
    document.querySelectorAll("[data-i18n-title]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-title");
      if (!key) return;
      el.dataset.i18nTitleOrig = el.dataset.i18nTitleOrig || el.getAttribute("title") || "";
      if (locale === "es") {
        el.setAttribute("title", el.dataset.i18nTitleOrig);
      } else if (locale === "en" && dict[key]) {
        el.setAttribute("title", dict[key]);
      }
    });

    // placeholder attribute
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-placeholder");
      if (!key) return;
      el.dataset.i18nPhOrig = el.dataset.i18nPhOrig || el.getAttribute("placeholder") || "";
      if (locale === "es") {
        el.setAttribute("placeholder", el.dataset.i18nPhOrig);
      } else if (locale === "en" && dict[key]) {
        el.setAttribute("placeholder", dict[key]);
      }
    });
  }

  // ------------------------------------------------------------------
  // Expose globally
  // ------------------------------------------------------------------
  window.I18n = { t: t, setLocale: setLocale, getLocale: getLocale, applyTranslations: applyTranslations, dict: dict };
  window.t = t;
  window.setLocale = setLocale;
  window.getLocale = getLocale;
  window.applyTranslations = applyTranslations;

  // ------------------------------------------------------------------
  // Auto-apply on DOM ready
  // ------------------------------------------------------------------
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyTranslations);
  } else {
    applyTranslations();
  }
})();
