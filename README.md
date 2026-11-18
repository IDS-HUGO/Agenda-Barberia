# 💈 BARBER Y SHOPPING — Sistema de Agenda PWA en Tiempo Real

> Sistema profesional de citas y gestión para barberías, optimizado para smartphones, con sincronización en tiempo real y arquitectura de **Cero Costo (100% Free)** sobre Firebase Spark y Vercel/Cloudflare Pages.

---

## 🚀 Características Principales

1. **Vista Pública para Clientes (`/`)**:
   - **Zero-friction:** Agendado en 3 pasos rápidos sin registros ni contraseñas.
   - **Zero-leak de privacidad:** Los clientes solo ven horarios como `DISPONIBLE` u `OCUPADO`. Jamás se exponen nombres ni teléfonos de otros clientes.
   - **Detección inteligente de traslapes:** Bloquea automáticamente horarios si la duración del servicio no cabe antes de la siguiente cita o de la hora de cierre.
   - **Comprobante Digital:** Genera un comprobante con folio único (`BYSH-XXXXXX`) y botón directo para enviar confirmación por WhatsApp a la barbería.

2. **Panel de Control del Barbero (`/admin`)**:
   - Protegido con **Firebase Auth** (Correo/Contraseña) y **PIN de respaldo local** (`1234`).
   - **Sincronización en vivo (`onSnapshot`):** Las citas agendadas por clientes aparecen en el instante exacto en pantalla.
   - **Alerta auditiva y visual:** Notificación sonora suave cuando entra una nueva reserva (con interruptor de silencio).
   - **Gestión completa:** Registro de clientes que llegan caminando (*Walk-In*), marcar citas como *Completadas* (con cálculo de caja del día), *Reprogramar* o *Cancelar*.
   - **Bloqueo de horarios:** Bloquea horas de almuerzo o días inhábiles con 1 toque.
   - **Generador de Código QR:** Descarga el código QR oficial en PNG con alta resolución para imprimirlo y colocarlo en el espejo de la barbería.
   - **Copias de Seguridad:** Exportación/importación en formato JSON y exportación a planilla CSV (Excel).

3. **Arquitectura Resiliente y Anti-Caídas**:
   - **Firebase Firestore (Plan Spark):** Gratuito para siempre, sin suspensión por inactividad.
   - **Atomic Locking (`runTransaction`):** Imposibilita matemáticamente la doble reserva simultánea de un mismo horario.
   - **Caché Local Offline:** Funciona incluso si se interrumpe la conexión a internet en la barbería.
   - **Modo Fallback Out-of-the-Box:** Si clonas el proyecto sin configurar `.env`, el sistema funciona de inmediato utilizando `IndexedDB` (`Dexie`) en el navegador.

---

## 🛠️ Puesta en Marcha Local

### 1. Clonar e Instalar Dependencias
```bash
npm install
```

### 2. Configurar Variables de Entorno (Opcional para modo local)
Copia el archivo de ejemplo:
```bash
cp .env.example .env
```
*(Si dejas `.env` con los valores por defecto, la app correrá en modo local con IndexedDB).*

### 3. Iniciar Servidor de Desarrollo
```bash
npm run dev
```
- Vista Clientes: `http://localhost:5173/`
- Panel Barbero: `http://localhost:5173/admin` (PIN por defecto en modo local: `1234`)

---

## 🔥 Configuración de Firebase (Paso a Paso en 2 Minutos)

1. Ingresa a la [Consola de Firebase](https://console.firebase.google.com/) con tu cuenta de Google.
2. Haz clic en **"Crear un proyecto"** y nómbralo `barber-y-shopping`.
3. Ve a **Autenticación (Firebase Auth)**:
   - Activa el proveedor de **Correo electrónico/Contraseña**.
   - En la pestaña **Users**, agrega el correo y contraseña del barbero (ej. `admin@barberyshopping.com` / `BarberAlien2026*`).
4. Ve a **Firestore Database**:
   - Haz clic en **Crear base de datos** (elige ubicación `us-central` o la más cercana a México).
   - Inicia en modo de prueba o producción.
   - Ve a la pestaña **Reglas (Rules)**, borra el contenido y pega íntegramente las reglas del archivo `firestore.rules` de este repositorio, luego presiona **Publicar**.
5. Ve a **Configuración del Proyecto (Engrane ⚙️) -> General -> Tus apps**:
   - Haz clic en el ícono web `</>` para registrar la aplicación.
   - Copia las credenciales `apiKey`, `authDomain`, `projectId`, etc., y pégalas en tu archivo `.env`.

---

## 🌐 Publicación Gratuita en Vercel (Producción)

1. Sube tu código a un repositorio en **GitHub**.
2. Entra a [Vercel](https://vercel.com/) e inicia sesión con GitHub.
3. Haz clic en **"Add New... -> Project"** e importa el repositorio `AgendaBarberia`.
4. En **Environment Variables**, agrega cada una de las variables `VITE_FIREBASE_*` de tu `.env`.
5. Haz clic en **Deploy**. ¡Tu barbería estará online 24/7 de forma 100% gratuita!

---

## 📐 Estructura del Código

```text
AgendaBarberia/
├── public/
│   ├── logo-barber.jpeg         # Logotipo oficial de la marca
│   └── _redirects                # Regla SPA Cloudflare
├── src/
│   ├── domain/
│   │   ├── models.ts             # Tipos y modelos del dominio
│   │   └── scheduleEngine.ts     # Motor matemático de cálculo de horarios y traslapes
│   ├── infrastructure/
│   │   ├── firebase.ts           # Inicializador Firebase con persistencia y fallback
│   │   ├── appointmentRepository.ts # Repositorio híbrido (Firestore Atómico + Dexie)
│   │   ├── backupService.ts      # Exportador CSV y backup/restore JSON
│   │   └── whatsappService.ts    # Generación de mensajes y enlaces wa.me
│   ├── application/
│   │   ├── useRealtimeSchedule.ts # Hook de sincronización en tiempo real
│   │   ├── useShopSettings.ts    # Configuración de horarios y catálogo de servicios
│   │   └── useBarberAuth.ts      # Manejo de sesión y autenticación
│   ├── presentation/
│   │   ├── client/
│   │   │   ├── ClientBookingPage.tsx # Flujo público de 3 pasos
│   │   │   └── BookingReceipt.tsx    # Comprobante digital con folio y WhatsApp
│   │   ├── admin/
│   │   │   ├── AdminLoginPage.tsx    # Login seguro con branding alienígena
│   │   │   ├── AdminDashboardPage.tsx# Tablero en tiempo real con estadísticas y filtros
│   │   │   ├── BarberSlotGrid.tsx    # Grilla de turnos y citas con acciones rápidas
│   │   │   ├── WalkInModal.tsx       # Modal para citas manuales o bloqueos
│   │   │   ├── QrShareModal.tsx      # Generador del QR PNG descargable
│   │   │   └── SettingsModal.tsx     # Configuración de horarios y respaldos
│   │   └── shared/
│   │       ├── Header.tsx            # Header institucional con status en vivo
│   │       └── ToastProvider.tsx     # Alertas y notificaciones contextuales
│   ├── App.tsx                   # Enrutador principal SPA
│   ├── index.css                 # Paleta visual Alien Neon + tipografía
│   └── main.tsx
├── firestore.rules               # Reglas de seguridad atómicas
├── vercel.json                   # Reglas de enrutamiento SPA
└── .env.example
```
