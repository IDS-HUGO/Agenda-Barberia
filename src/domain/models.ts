export type AppointmentStatus = 'confirmed' | 'completed' | 'cancelled';
export type AppointmentSource = 'client_web' | 'barber_manual';

export interface Appointment {
  id: string;
  folio: string;
  clientName: string;
  clientPhone: string; // 10 dígitos numéricos
  serviceId: string;
  serviceName: string;
  price: number;
  durationMinutes: number;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  startMinutes: number; // Minutos desde medianoche (ej. 600 = 10:00)
  endMinutes: number;
  status: AppointmentStatus;
  source: AppointmentSource;
  notes?: string;
  createdAt: string; // ISO 8601
}

export type SlotAvailabilityStatus = 
  | 'available' 
  | 'occupied' 
  | 'blocked' 
  | 'past' 
  | 'insufficient_time';

export interface PublicSlot {
  id: string;
  date: string;
  startMinutes: number;
  endMinutes: number;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  status: SlotAvailabilityStatus;
  occupiedReason?: string; // Para el barbero (en público siempre oculto)
  appointment?: Appointment; // Solo disponible en vista del barbero
}

export interface ServiceItem {
  id: string;
  name: string;
  price: number; // MXN
  durationMinutes: number; // 30, 45, 60, etc.
  description: string;
  icon?: string;
  isActive: boolean;
}

export interface BlockedSlot {
  id: string;
  date: string; // "YYYY-MM-DD"
  startMinutes: number;
  endMinutes: number;
  reason?: string;
}

export interface ShopConfig {
  shopName: string;
  shopPhone: string; // WhatsApp para confirmación (10 dígitos)
  shopAddress: string;
  openingMinutes: number; // default 600 (10:00 AM)
  closingMinutes: number; // default 1260 (09:00 PM / 21:00)
  slotIntervalMinutes: number; // default 30 min
  activeDays: number[]; // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  allowSoundNotifications: boolean;
}

export const DEFAULT_SERVICES: ServiceItem[] = [
  {
    id: 'srv-corte-fade',
    name: 'Corte Clásico / Fade',
    price: 180,
    durationMinutes: 30,
    description: 'Degradado a elección (Low, Mid, High Fade) con navaja, acabado limpio y peinado profesional.',
    isActive: true
  },
  {
    id: 'srv-barba-vip',
    name: 'Arreglo de Barba VIP',
    price: 150,
    durationMinutes: 30,
    description: 'Perfilado con navaja japonesa, toalla caliente relajante, aceites esenciales y bálsamo.',
    isActive: true
  },
  {
    id: 'srv-combo-alien',
    name: 'Combo Alien: Corte + Barba',
    price: 300,
    durationMinutes: 60,
    description: 'Servicio estelar completo: Fade de alta precisión, ritual de barba con toalla caliente y ceja.',
    isActive: true
  },
  {
    id: 'srv-diseno-ceja',
    name: 'Diseño / Gremas + Ceja',
    price: 120,
    durationMinutes: 30,
    description: 'Diseño freestyle o gremas con navaja y perfilado detallado de cejas con máquina y navaja.',
    isActive: true
  }
];

export const DEFAULT_SHOP_CONFIG: ShopConfig = {
  shopName: 'BARBER Y SHOPPING',
  shopPhone: '5219999999999', // Placeholder configurable
  shopAddress: 'Plaza Shopping - Pasillo Central #12',
  openingMinutes: 600, // 10:00 AM
  closingMinutes: 1260, // 09:00 PM (21:00)
  slotIntervalMinutes: 30,
  activeDays: [1, 2, 3, 4, 5, 6], // Lunes a Sábado (Descanso Domingo)
  allowSoundNotifications: true
};
