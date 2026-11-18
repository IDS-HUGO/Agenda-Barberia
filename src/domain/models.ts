export type AppointmentStatus = 'confirmed' | 'completed' | 'cancelled';
export type AppointmentSource = 'client_web' | 'barber_manual';

export interface Barber {
  id: string;
  name: string;
  color: string; // Para insignia visual en el panel
  isActive: boolean;
}

export interface Appointment {
  id: string;
  folio: string;
  clientName: string;
  clientPhone: string; // 10 dígitos numéricos
  serviceId: string;
  serviceName: string;
  price: number;
  durationMinutes: number;
  barberId: string; // 'barber-1' | 'barber-2' | 'barber-3'
  barberName: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  startMinutes: number; // Minutos desde medianoche (ej. 540 = 09:00)
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
  availableBarbersCount: number; // Cuántos barberos están libres (0 a 3)
  freeBarbers: Barber[]; // Lista de barberos libres en este bloque
  occupiedReason?: string;
  appointment?: Appointment; // Cita individual (compatibilidad)
  appointments?: Appointment[]; // Citas en este bloque (vista del barbero)
}

export interface ServiceItem {
  id: string;
  name: string;
  price: number; // MXN
  durationMinutes: number; // 40, 60, etc.
  description: string;
  icon?: string;
  isActive: boolean;
}

export interface BlockedSlot {
  id: string;
  date: string; // "YYYY-MM-DD"
  startMinutes: number;
  endMinutes: number;
  barberId?: string; // Opcional: si bloquea a un barbero específico o a todos
  reason?: string;
}

export interface ShopConfig {
  shopName: string;
  shopPhone: string; // WhatsApp para confirmación (10 dígitos)
  shopAddress: string;
  slotIntervalMinutes: number; // 40 min por corte
  weekdayOpeningMinutes: number; // 540 (09:00 AM)
  weekdayClosingMinutes: number; // 1140 (07:00 PM / 19:00)
  sundayOpeningMinutes: number; // 540 (09:00 AM)
  sundayClosingMinutes: number; // 900 (03:00 PM / 15:00)
  activeDays: number[]; // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado (Abierto todos los días)
  barbers: Barber[];
  allowSoundNotifications: boolean;
}

export const DEFAULT_BARBERS: Barber[] = [
  { id: 'barber-1', name: 'Barbero 1', color: '#76C81C', isActive: true },
  { id: 'barber-2', name: 'Barbero 2', color: '#38BDF8', isActive: true },
  { id: 'barber-3', name: 'Barbero 3', color: '#F59E0B', isActive: true }
];

export const DEFAULT_SERVICES: ServiceItem[] = [
  {
    id: 'srv-corte',
    name: 'Corte',
    price: 180,
    durationMinutes: 40,
    description: 'Corte clásico o degradado fade con navaja y peinado profesional.',
    isActive: true
  },
  {
    id: 'srv-corte-barba',
    name: 'Corte y barba',
    price: 230,
    durationMinutes: 60,
    description: 'Corte completo, toalla caliente y ritual de barba con aceites.',
    isActive: true
  },
  {
    id: 'srv-corte-cejas',
    name: 'Corte más cejas',
    price: 200,
    durationMinutes: 40,
    description: 'Corte a elección más perfilado y diseño de cejas con navaja.',
    isActive: true
  },
  {
    id: 'srv-servicio-completo',
    name: 'Servicio completo',
    price: 300,
    durationMinutes: 60,
    description: 'Experiencia total: Corte fade, ritual de barba, cejas y peinado VIP.',
    isActive: true
  }
];

export const DEFAULT_SHOP_CONFIG: ShopConfig = {
  shopName: 'BARBER Y SHOPPING',
  shopPhone: '5219999999999',
  shopAddress: 'Plaza Shopping - Pasillo Central #12',
  slotIntervalMinutes: 40, // 40 minutos por corte
  weekdayOpeningMinutes: 540, // 09:00 AM
  weekdayClosingMinutes: 1140, // 07:00 PM (19:00)
  sundayOpeningMinutes: 540, // 09:00 AM
  sundayClosingMinutes: 900, // 03:00 PM (15:00)
  activeDays: [0, 1, 2, 3, 4, 5, 6], // Abierto de Lunes a Domingo
  barbers: DEFAULT_BARBERS,
  allowSoundNotifications: true
};
