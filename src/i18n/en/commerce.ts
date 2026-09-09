// Páginas: store, billing, admin, settings
export const commerce: Record<string, string> = {
  // Store — catálogo
  "Planes de diseño web, cloud, soporte y paquetes enterprise de TerLux Coop":
    "Web design, cloud, support and TerLux Coop enterprise plans",
  Catálogo: "Catalog",
  Carrito: "Cart",
  "Mis pedidos": "My orders",
  "Tarjetas y pagos": "Cards & payments",
  Créditos: "Credits",
  Todos: "All",
  OFERTA: "SALE",
  "/mes": "/month",
  Contratar: "Sign up",
  "Tu carrito": "Your cart",
  "El carrito está vacío": "Your cart is empty",
  Resumen: "Summary",
  Subtotal: "Subtotal",
  "IVA (21%)": "VAT (21%)",
  Total: "Total",
  "Pago seguro": "Secure checkout",
  "Entorno sandbox · no se realizan cargos reales": "Sandbox environment · no real charges are made",

  // Store — pedidos
  "Historial de pedidos": "Order history",
  "Aún no has realizado pedidos.": "You have not placed any orders yet.",
  Pagado: "Paid",
  Pendiente: "Pending",
  "Método": "Method",
  "ref": "ref",

  // Store — tarjetas
  "Métodos de pago guardados": "Saved payment methods",
  "No hay tarjetas guardadas.": "No saved cards.",
  cad: "exp",
  Predeterminada: "Default",
  "Añadir tarjeta": "Add card",
  "Número de tarjeta (4242 4242 4242 4242)": "Card number (4242 4242 4242 4242)",
  Titular: "Cardholder",
  MM: "MM",
  AA: "YY",
  "Marcar como predeterminada": "Set as default",
  "Guardar tarjeta (tokenizada)": "Save card (tokenized)",
  "Por seguridad nunca almacenamos el número completo, solo el token del TPV y los últimos 4 dígitos.":
    "For security we never store the full number, only the payment gateway token and the last 4 digits.",

  // Store — créditos / wallet
  "Recargar crédito": "Top up credit",
  "Entorno de pruebas (sandbox): la recarga no cobra dinero real. Usa la tarjeta 4242 4242 4242 4242 · 12/29 · CVC 123.":
    "Test environment (sandbox): top-ups are not real charges. Use card 4242 4242 4242 4242 · 12/29 · CVC 123.",
  "Importe (MXN)": "Amount (MXN)",
  "Últimos 4": "Last 4",
  "Movimientos de la cuenta": "Account activity",
  "Sin movimientos todavía. Recarga crédito o paga pedidos para ver el historial.":
    "No movements yet. Top up credit or pay orders to see your history.",

  // Store — checkout
  "Confirmar pedido": "Confirm order",
  "Razón social / Nombre": "Company name / Name",
  "NIF/CIF": "Tax ID",
  "Método de pago": "Payment method",
  "Transferencia bancaria (pago pendiente)": "Bank transfer (payment pending)",
  "Saldo de crédito": "Credit balance",
  "Crédito disponible": "Available credit",
  insuficiente: "insufficient",
  "Saldo insuficiente para este pedido con crédito.": "Insufficient balance for this order with credit.",
  "Añade una tarjeta en la pestaña “Tarjetas y pagos” para pagar al instante.":
    "Add a card on the “Cards & payments” tab to pay instantly.",
  IVA: "VAT",
  "Confirmar y pagar": "Confirm and pay",

  // Store — notificaciones
  "Introduce una cantidad válida": "Enter a valid amount",
  "Crédito recargado (sandbox, sin cargo real)": "Credit topped up (sandbox, no real charge)",
  "Error en la recarga": "Error topping up",
  "Añadido al carrito": "Added to cart",
  "Pedido pagado correctamente 🎉": "Order paid successfully 🎉",
  "Pedido registrado (pendiente de transferencia)": "Order recorded (pending transfer)",
  "Error al procesar el pedido": "Error processing the order",
  "Tarjeta guardada (solo token y últimos 4 dígitos)": "Card saved (token and last 4 digits only)",
  "Tarjeta no válida": "Invalid card",

  // Admin — navegación
  Usuarios: "Users",
  "Roles y permisos": "Roles & permissions",
  "Menús por rol": "Menus per role",
  Auditoría: "Audit",
  "Panel de Administración": "Administration Panel",
  "Gestión de usuarios, privilegios, base de datos y seguridad":
    "User management, privileges, database and security",

  // Admin — roles
  "Super administrador": "Super admin",
  Administrador: "Administrator",
  "Gestor/a": "Manager",
  "RR. HH.": "HR",
  Finanzas: "Finance",
  "Empleado/a": "Employee",
  Cliente: "Client",

  // Admin — resumen (stats)
  "Usuarios totales": "Total users",
  "Usuarios activos": "Active users",
  "Tareas completadas": "Completed tasks",
  Pedidos: "Orders",
  "Pedidos pagados": "Paid orders",
  Ingresos: "Revenue",

  // Admin — usuarios
  "Buscar por correo…": "Search by email…",
  "Nuevo usuario": "New user",
  "Correo corporativo": "Company email",
  "Contraseña temporal (mín. 8)": "Temporary password (min. 8)",
  Puesto: "Position",
  Teléfono: "Phone",
  Cancelar: "Cancel",
  "Crear usuario": "Create user",
  Usuario: "User",
  Departamento: "Department",
  "Rol / privilegios": "Role / privileges",
  Alta: "Created",
  Estado: "Status",
  Activo: "Active",
  Desactivado: "Disabled",
  Desactivar: "Disable",
  Activar: "Enable",

  // Admin — roles / matriz
  "Matriz de privilegios": "Privilege matrix",
  "Los permisos se asignan por rol. Los usuarios heredan los permisos de su rol; los super administradores tienen acceso total.":
    "Permissions are assigned by role. Users inherit the permissions of their role; super admins have full access.",
  Permiso: "Permission",

  // Admin — base de datos
  Tablas: "Tables",
  "Selecciona una tabla para inspeccionar sus registros (máx. 100 filas)":
    "Select a table to inspect its records (max 100 rows)",
  "Sin registros": "No records",

  // Admin — auditoría
  "Registro de actividad y seguridad": "Activity & security log",
  "Inició sesión": "Signed in",
  "Cerró sesión": "Signed out",
  "Se registró": "Registered",
  "Creó": "Created",
  "Actualizó": "Updated",
  "Eliminó": "Deleted",
  "Sin actividad registrada todavía.": "No activity recorded yet.",

  // Admin — menús
  Gantt: "Gantt",
  Drive: "Drive",
  Dispositivos: "Devices",
  "Cola Trabajos": "Job Queue",
  "VPN / Integr.": "VPN / Integr.",
  Ayuda: "Help",
  "Menús activables por rol": "Menus enabled per role",
  Recargar: "Reload",
  "El administrador o el personal TIC activa/desactiva cada ítem del menú lateral por rol. Un ítem desactivado se oculta para todos los usuarios de ese rol.":
    "The admin or IT staff enables/disables each sidebar menu item per role. A disabled item is hidden for all users of that role.",
  "Guardando…": "Saving…",
  Menú: "Menu",

  // Admin — wallets
  "Cuentas de crédito (wallet)": "Credit accounts (wallet)",
  "Saldo de crédito de cada usuario. Puedes añadir crédito a cualquier cuenta.":
    "Each user's credit balance. You can add credit to any account.",
  Rol: "Role",
  Saldo: "Balance",
  "Añadir crédito": "Add credit",
  "Importe MXN": "Amount MXN",
  Añadir: "Add",
  "Movimientos recientes": "Recent movements",
  "Sin movimientos todavía.": "No movements yet.",

  // Admin / store — errores
  Error: "Error",

  // Settings — cabecera y tabs
  "Conexiones por IP: bases de datos, almacenamiento, correo y app de escritorio":
    "IP connections: databases, storage, mail and desktop app",
  Empresa: "Company",
  Apariencia: "Appearance",
  Integraciones: "Integrations",
  "Clientes VPN": "VPN clients",
  Seguridad: "Security",

  // Settings — empresa
  "Datos de la empresa": "Company details",
  "Razón social": "Company name",
  Email: "Email",
  Moneda: "Currency",
  Dirección: "Address",
  "Zona horaria": "Time zone",
  "Guardar cambios": "Save changes",

  // Settings — apariencia
  "Tema de la plataforma": "Platform theme",
  Claro: "Light",
  Oscuro: "Dark",
  Sistema: "System",

  // Settings — integraciones
  Correo: "Email",
  "VPN / Escritorio": "VPN / Desktop",
  "conexión(es)": "connection(s)",
  "Sin configurar": "Not configured",
  "Red privada recomendada": "Recommended private network",
  "Se utiliza": "It uses",
  "(rango CGNAT Tailscale). El rango sugerido": "(Tailscale CGNAT range). The suggested range",
  "es una IP pública asignada al Departamento de Defensa de EE.UU. y no debe usarse en una VPN.":
    "is a public IP assigned to the U.S. Department of Defense and must not be used in a VPN.",
  "Servidor API para la app de escritorio:": "API server for the desktop app:",
  "· socket": "· socket",

  // Settings — clientes VPN
  "Dispositivos conectados por VPN": "Devices connected over VPN",
  Dispositivo: "Device",
  Plataforma: "Platform",
  "IP pública": "Public IP",
  "IP VPN": "VPN IP",
  "Última conexión": "Last connection",
  "Aún no hay dispositivos registrados. La app de escritorio se registra automáticamente al iniciar sesión por VPN (ver PLANTILLA_APP_ESCRITORIO.txt).":
    "No devices registered yet. The desktop app registers automatically when signing in over VPN (see PLANTILLA_APP_ESCRITORIO.txt).",
  "En línea": "Online",
  Bloqueado: "Blocked",
  Desconectado: "Offline",
  Bloquear: "Block",

  // Settings — seguridad
  "Política de seguridad": "Security policy",
  "Doble factor de autenticación (2FA)": "Two-factor authentication (2FA)",
  "Exigir código temporal en los inicios de sesión": "Require a temporary code at sign-in",
  "Longitud mínima de contraseña": "Minimum password length",
  "Expiración de sesión (min)": "Session expiry (min)",
  "Red IP permitida (VPN)": "Allowed IP network (VPN)",
  "Guardar política": "Save policy",

  // Settings — modal conexión
  "Editar conexión": "Edit connection",
  "Nueva conexión": "New connection",
  Protocolo: "Protocol",
  "Red VPN": "VPN network",
  "Host / IP": "Host / IP",
  Puerto: "Port",
  "Secreto / contraseña": "Secret / password",
  "Bucket / recurso compartido": "Bucket / shared resource",
  "Conexión TCP establecida en": "TCP connection established in",
  "Sin conexión": "No connection",
  "Probar conexión": "Test connection",
  Guardar: "Save",
};