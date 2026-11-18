# ESPECIFICACIÓN DE INGENIERÍA DE SOFTWARE — SISTEMA DE AGENDA "BARBER Y SHOPPING"

## 0. ROL, CONTEXTO Y DIRECTORIO DE TRABAJO

Actúa como un **Principal Software Engineer y Product Designer (UI/UX)**. Tu misión es arquitectar, construir, compilar y verificar al 100% una aplicación web progresiva (PWA) Full-Stack y en Tiempo Real de gestión de citas llamada **"BARBER Y SHOPPING - Sistema de Agenda"**, construyendo absolutamente todo dentro de la carpeta raíz actual: `AgendaBarberia/`.

### Regla Obligatoria sobre el Logotipo Existente

* Actualmente, dentro de `AgendaBarberia/` únicamente existe el archivo de imagen del logotipo de la marca (un alienígena barbero con máquina de cortar cabello, poste de barbero verde/blanco/negro y bolsa de shopping, con el texto metálico *"BARBER Y SHOPPING"*).

* **Acción obligatoria antes de cualquier scaffold:** Lista los archivos de `AgendaBarberia/`, localiza esa imagen sin borrarla ni sobrescribirla, muévela/cópiala a `AgendaBarberia/public/logo-barber.<ext>` (conservando su extensión real `.png`, `.jpg` o `.webp`), actualiza el `<link rel="icon">` en `index.html` y utilízala en el encabezado público, en el panel de administración y en el comprobante de reserva.

---

## 1. ARQUITECTURA DE DOS ROLES + TIEMPO REAL (100% FREE, SIN CAÍDAS NI PAUSAS)

El sistema debe permitir que **clientes externos agenden desde sus propios teléfonos móviles** (mediante link o código QR) y que **el barbero vea las citas reflejadas al instante en su panel**, operando sobre infraestructura **100% gratuita y de disponibilidad continua** (prohibido usar Render, Railway o Supabase free que se duermen por inactividad).

### Roles del Sistema

1. **Vista Pública para Clientes (`/`):**
   * Accesible desde cualquier celular **sin registro ni inicio de sesión**.
   * Muestra en tiempo real los horarios **DISPONIBLES** y **OCUPADOS** para la fecha elegida.
   * **Privacidad de Datos (Zero-Leak):** En la vista pública los horarios ocupados se muestran únicamente como `"OCUPADO / NO DISPONIBLE"`. Jamás expongas nombres, teléfonos ni notas de otros clientes en la vista pública.
   * Flujo de reserva en 3 pasos rápidos:
     1. Elegir servicio(s) (muestra precio en MXN y duración en minutos).
     2. Elegir fecha y tocar un bloque **DISPONIBLE** (el motor bloquea automáticamente los horarios donde la duración del servicio chocaría con la siguiente cita ocupada o con la hora de cierre).
     3. Ingresar Nombre completo y WhatsApp (10 dígitos) -> **Confirmar Cita**.
   * Genera un **Comprobante Digital de Cita** con folio único, fecha, hora, servicio y botón directo para enviar su confirmación por WhatsApp a la barbería.

2. **Panel Privado del Barbero (`/admin`):**
   * Protegido mediante autenticación real con **Firebase Auth (Correo y Contraseña)** (y acceso rápido con PIN local si opera en modo fallback sin `.env`).
   * **Sincronización en Vivo (`onSnapshot`):** Cuando un cliente agenda desde su celular, la tarjeta de la cita aparece automáticamente en el tablero del barbero con notificación visual y alerta sonora opcional (con botón para activar/silenciar sonido, respetando políticas de autoplay de navegadores).
   * Permite al barbero:
     * Agendar citas manuales (clientes que llegan sin cita o llaman por teléfono).
     * Ver detalles completos (Nombre, teléfono con botón de WhatsApp directo, servicio, duración, origen `Web Cliente` vs `Barbero`).
     * Marcar cita como **Completada** (suma al ingreso real del día), **Reprogramar** o **Cancelar** (libera los bloques horarios al instante).
     * Bloquear horarios específicos (ej. hora de comida) o días completos.
     * Descargar **Código QR oficial** listo para imprimir y pegar en el espejo de la barbería.

3. **Estrategia de Infraestructura Resiliente (Cloud + Offline Cache):**
   * **Base de Datos Principal:** **Firebase Firestore (Plan Spark - Gratuito permanente, sin suspensión por inactividad)** con caché local persistente habilitada (`initializeFirestore` con `persistentLocalCache` y `persistentMultipleTabManager`), garantizando que si falla el internet en la barbería, la app siga funcionando y sincronice automáticamente al reconectar.
   * **Prevención de Doble Reserva (Concurrencia Atómica):** Toda creación de cita debe ejecutarse dentro de una **Transacción Atómica de Firestore (`runTransaction`)** verificando un documento de bloqueo de slots por fecha (`daily_locks/{YYYY-MM-DD}`) para garantizar matemáticamente que dos clientes nunca puedan reservar el mismo minuto simultáneamente.
   * **Modo Fallback Automático (Zero-Config Out-of-the-Box):** Si las variables `VITE_FIREBASE_*` no están configuradas todavía en `.env`, la aplicación **NO debe romperse ni mostrar pantalla blanca**; debe operar automáticamente sobre `IndexedDB` (`Dexie`) mostrando un banner superior discreto en `/admin` con botón de instrucciones para conectar Firebase en 2 minutos.

---

## 2. STACK TECNOLÓGICO Y REGLAS ANTI-ERRORES

* **Core:** React 18+ + TypeScript (`strict: true`, `noUnusedLocals: false` para evitar fallos triviales de build) + Vite.
* **Routing:** `react-router-dom` v6+ con archivo `vercel.json` y `public/_redirects` incluidos para evitar errores `404 Not Found` al recargar `/admin` en producción.
* **Estilos:** Tailwind CSS v3 + `lucide-react`.
* **Backend SDK:** `firebase` v10+ (`firebase/app`, `firebase/firestore`, `firebase/auth`).
* **QR:** `qrcode.react` (`QRCodeSVG` con exportación a PNG).
* **Fechas (Cero Bugs de Zona Horaria):**
  * Usar `date-fns` con locale `es`.
  * **Regla estricta:** Todas las fechas de agenda deben almacenarse y compararse como strings canónicos `"YYYY-MM-DD"` (ej. `"2026-11-17"`) y horas en minutos desde medianoche o strings `"HH:mm"` (ej. `"14:30"`). **Prohibido usar `new Date("2026-11-17")` directamente** porque JavaScript lo interpreta en UTC y resta 6 horas en México (`America/Mexico_City`), provocando citas desfasadas un día.

### Estructura Modular Obligatoria (Clean Architecture)

```text
AgendaBarberia/
├── public/
│   ├── logo-barber.<ext>            # Logotipo oficial conservado
│   └── _redirects                   # Regla SPA para Cloudflare Pages ("/* /index.html 200")
├── src/
│   ├── domain/
│   │   ├── models.ts                # Appointment, PublicSlot, ServiceItem, ShopConfig, BlockedSlot
│   │   └── scheduleEngine.ts        # Funciones puras: generación de grilla, cálculo de disponibilidad según duración y detección de traslapes
│   ├── infrastructure/
│   │   ├── firebase.ts              # Inicialización segura con detección de .env y persistentLocalCache
│   │   ├── appointmentRepository.ts # Implementación Firestore (con runTransaction) + Fallback Local IndexedDB
│   │   ├── backupService.ts         # Exportación/Importación JSON y exportación CSV
│   │   └── whatsappService.ts       # Generador de enlaces wa.me/52... con mensajes formateados
│   ├── application/
│   │   ├── useRealtimeSchedule.ts   # Suscripción en tiempo real a slots y citas del día
│   │   ├── useShopSettings.ts       # Horarios laborales, días activos y CRUD de servicios
│   │   └── useBarberAuth.ts         # Manejo de sesión Firebase Auth + PIN fallback
│   ├── presentation/
│   │   ├── client/
│   │   │   ├── ClientBookingPage.tsx  # Vista pública móvil-first para clientes
│   │   │   └── BookingReceipt.tsx     # Comprobante digital con folio y botón WhatsApp
│   │   ├── admin/
│   │   │   ├── AdminLoginPage.tsx     # Login limpio con branding alienígena
│   │   │   ├── AdminDashboardPage.tsx # Tablero completo del barbero en tiempo real
│   │   │   ├── BarberSlotGrid.tsx     # Vista detallada de horarios libres y citas con acciones rápidas
│   │   │   ├── WalkInModal.tsx        # Modal rápido para citas manuales o bloqueo de horario
│   │   │   ├── QrShareModal.tsx       # Generador y descarga de QR PNG para clientes
│   │   │   └── SettingsModal.tsx      # Horarios, servicios, respaldos JSON/CSV
│   │   └── shared/
│   │       ├── Header.tsx             # Logo oficial + navegación + indicador de conexión en vivo
│   │       └── ToastProvider.tsx      # Sistema de notificaciones no intrusivas
│   ├── App.tsx                      # Router principal (/ y /admin)
│   ├── index.css                    # Estilos Tailwind + scrollbar oscura personalizada
│   └── main.tsx
├── firestore.rules                  # Reglas de seguridad Firestore listas para copiar
├── vercel.json                      # Rewrites SPA para Vercel
├── .env.example                     # Plantilla documentada de variables Firebase
├── README.md                        # Guía paso a paso en español (Firebase + Vercel gratis)
├── package.json
└── tsconfig.json
```

---

## 3. SEGURIDAD FIRESTORE (`firestore.rules`)

Genera el archivo `firestore.rules` en la raíz con arquitectura de doble colección para proteger la privacidad de los clientes sin requerir login público:
1. **`public_slots/{slotId}`**: Contiene únicamente `{ date, startMinutes, endMinutes, status }` (sin nombres ni teléfonos). Lectura pública (`allow read: if true;`), escritura solo mediante transacción al crear cita o por el admin autenticado.
2. **`appointments/{appointmentId}`**: Contiene los datos completos `{ folio, clientName, clientPhone, serviceId, serviceName, price, durationMinutes, date, startTime, endTime, startMinutes, endMinutes, status, source, notes, createdAt }`.
   * `allow create`: Permitido públicamente si valida tipos, longitud de teléfono (10 dígitos), `status == 'confirmed'` y coincide con el bloqueo atómico.
   * `allow read, update, delete`: Permitido **exclusivamente** si `request.auth != null` (el barbero autenticado).
3. **`settings/{docId}`**: Lectura pública (para que clientes vean servicios, precios y horario de apertura/cierre), escritura exclusiva para `request.auth != null`.

---

## 4. IDENTIDAD VISUAL, PALETA DE COLORES Y LEYES UI/UX

### Paleta Oficial (Extraída del Logo "BARBER Y SHOPPING")

* **Fondo Principal (Deep Space Black):** `#090B0E`
* **Superficie de Tarjetas (Obsidian):** `#12161D`
* **Superficie Elevada / Hover:** `#1A202C`
* **Bordes:** `#1F2937`
* **Color Primario (Alien Neon Green):** `#76C81C` (Hover: `#8CE026` | Glow: `rgba(118, 200, 28, 0.18)`)
* **Acento Metálico (Chrome Silver):** `#D1D5DB`
* **Texto Principal:** `#F8FAFC` | **Texto Secundario:** `#94A3B8`
* **Estados Semánticos:**
  * **Disponible:** Fondo `rgba(118, 200, 28, 0.08)`, borde `1px dashed rgba(118, 200, 28, 0.5)`, texto `#8CE026`.
  * **Ocupado (Vista Pública):** Fondo `#131720`, borde `#262F3F`, texto `#64748B` con ícono de candado y etiqueta `"OCUPADO"`.
  * **Ocupado Confirmado (Vista Barbero):** Fondo `#161D27`, borde izquierdo sólido `4px` `#F59E0B` (Ámbar metálico).
  * **Completado / Cobrado (Vista Barbero):** Fondo `#101E19`, borde izquierdo sólido `4px` `#10B981` (Esmeralda).

### Leyes UI/UX Aplicadas

1. **Ley de Fitts:** Todos los botones de horario, selección de servicio y acciones táctiles tienen altura mínima de `48px` (`min-h-[48px]`) para operación fluida con el pulgar en smartphones.
2. **Ley de Hick:** Pantalla limpia sin saturación; el cliente completa su reserva en 3 pasos lineales y el barbero gestiona cualquier cita en máximo 2 toques.
3. **Prevención de Errores (Heurística de Nielsen #5):**
   * Validación en tiempo real de teléfono mexicano (10 dígitos numéricos).
   * Si un servicio dura `60 min` (ej. *Corte + Barba*) y hay una cita ocupada a las `11:00`, el sistema marca automáticamente el slot de las `10:30` como **"Tiempo insuficiente para este servicio"** para evitar traslapes antes de que el usuario intente enviar el formulario.
   * Si el día seleccionado ya pasó o es una hora anterior a la hora actual del día de hoy, esos bloques pasados se deshabilitan automáticamente.

---

## 5. PLAN DE EJECUCIÓN Y VERIFICACIÓN OBLIGATORIA

Ejecuta estos pasos en estricto orden dentro de `AgendaBarberia/`:

1. **Inspección y Resguardo del Logo:** Verifica el archivo de imagen existente en `AgendaBarberia/` y asegúrate de conservarlo en `public/`.
2. **Scaffold y Dependencias:** Configura `package.json`, Vite, TypeScript (`tsconfig.json`), Tailwind CSS, PostCSS, `vercel.json` y `public/_redirects`. Instala todas las dependencias (`react`, `react-dom`, `react-router-dom`, `firebase`, `dexie`, `dexie-react-hooks`, `date-fns`, `lucide-react`, `qrcode.react`).
3. **Implementación Completa:** Codifica todos los módulos (`domain`, `infrastructure`, `application`, `presentation`), `firestore.rules`, `.env.example` y `README.md`. Asegúrate de incluir un catálogo inicial atractivo para **BARBER Y SHOPPING** (ej. *Corte Clásico / Fade - $180 / 30 min*, *Arreglo de Barba VIP - $150 / 30 min*, *Combo Alien: Corte + Barba - $300 / 60 min*, *Diseño / Gremas + Ceja - $120 / 30 min*).
4. **Verificación de Cero Errores (Build Check):**
   * Ejecuta `npx tsc --noEmit` y `npm run build`.
   * Si existe cualquier error de importación, tipado o sintaxis, corrígelo inmediatamente y vuelve a ejecutar `npm run build` hasta obtener salida exitosa con **0 errores**.
5. **Entrega Final:** Levanta el servidor local y entrega un resumen claro con las rutas (`/` para clientes y `/admin` para el barbero) y los pasos rápidos para conectar Firebase y publicar en Vercel.