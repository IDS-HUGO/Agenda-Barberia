import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Appointment,
  BlockedSlot,
  PublicSlot,
  ShopConfig,
  Barber,
  DEFAULT_BARBERS
} from './models';

/**
 * Convierte minutos desde medianoche a formato HH:mm (24 horas)
 * Ej: 540 -> "09:00", 630 -> "10:30"
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Convierte minutos a formato amigable de 12 horas con AM/PM
 * Ej: 580 -> "09:40 AM", 860 -> "02:20 PM"
 */
export function minutesToTime12h(minutes: number): string {
  let hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${ampm}`;
}

/**
 * Convierte un string "HH:mm" a minutos desde medianoche
 * Ej: "09:40" -> 580
 */
export function timeToMinutes(timeStr: string): number {
  const [hours, mins] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (mins || 0);
}

/**
 * Obtiene la fecha local de hoy en string canónico "YYYY-MM-DD"
 */
export function getTodayCanonical(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convierte un objeto Date a formato canónico "YYYY-MM-DD"
 */
export function dateToCanonical(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parsea un string canónico "YYYY-MM-DD" a Date local de forma segura
 */
export function parseCanonicalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

/**
 * Formatea un string canónico para mostrar al usuario (Ej: "Martes, 18 de Noviembre")
 */
export function formatFriendlyDate(dateStr: string): string {
  const date = parseCanonicalDate(dateStr);
  const formatted = format(date, "EEEE, d 'de' MMMM", { locale: es });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
 * Minutos transcurridos en el día actual
 */
export function getCurrentDayMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Genera un Folio único para la cita
 * Ej: "BYSH-7X8A9B"
 */
export function generateFolio(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `BYSH-${code}`;
}

/**
 * Valida teléfono mexicano de 10 dígitos numéricos
 */
export function isValidMexicanPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10;
}

/**
 * Determina el horario de apertura y cierre según el día de la semana:
 * Lunes a Sábado: 9:00 AM a 7:00 PM (540 a 1140 min)
 * Domingo: 9:00 AM a 3:00 PM (540 a 900 min)
 */
export function getScheduleHoursForDate(dateStr: string, config: ShopConfig) {
  const dateObj = parseCanonicalDate(dateStr);
  const dayOfWeek = dateObj.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado

  if (dayOfWeek === 0) {
    // Domingo: 9:30 AM a 3:00 PM (570 a 900 min)
    return {
      openingMinutes: config.sundayOpeningMinutes ?? 570,
      closingMinutes: config.sundayClosingMinutes ?? 900,
      isSunday: true
    };
  }

  // Lunes a Sábado: 9:30 AM a 7:00 PM (570 a 1140 min)
  return {
    openingMinutes: config.weekdayOpeningMinutes ?? 570,
    closingMinutes: config.weekdayClosingMinutes ?? 1140,
    isSunday: false
  };
}

/**
 * Motor de cálculo de disponibilidad MULTI-BARBERO (3 Barberos en Paralelo)
 * 
 * Reglas fundamentales:
 * 1. Hay 3 barberos activos operando en simultáneo.
 * 2. Un horario está DISPONIBLE si al menos 1 barbero está libre.
 * 3. Si un cliente solicita un barbero en específico, se evalúa ese barbero.
 * 4. Si se solicita "Cualquiera", el sistema asigna el primer barbero libre.
 * 5. Si los 3 barberos están ocupados o bloqueados en ese horario, se marca como OCUPADO.
 */
export function calculateScheduleSlots(
  date: string,
  config: ShopConfig,
  appointments: Appointment[],
  blockedSlots: BlockedSlot[],
  serviceDurationMinutes: number = 40,
  filterBarberId?: string
): PublicSlot[] {
  const slots: PublicSlot[] = [];
  const todayStr = getTodayCanonical();
  const isToday = date === todayStr;
  const currentMinutes = getCurrentDayMinutes();

  const { openingMinutes, closingMinutes } = getScheduleHoursForDate(date, config);
  const stepInterval = config.slotIntervalMinutes || 40;

  const activeBarbers = (config.barbers && config.barbers.length > 0 ? config.barbers : DEFAULT_BARBERS).filter(
    (b) => b.isActive
  );

  // Filtrar citas activas para esta fecha (excluyendo canceladas)
  const activeAppointments = appointments.filter(
    (app) => app.date === date && app.status !== 'cancelled'
  );

  // Filtrar bloqueos para esta fecha
  const activeBlocks = blockedSlots.filter((block) => block.date === date);

  for (let start = openingMinutes; start < closingMinutes; start += stepInterval) {
    const end = start + stepInterval;
    const slotId = `${date}_${start}`;
    const startTimeStr = minutesToTime(start);
    const endTimeStr = minutesToTime(end);

    // Citas que caen en este intervalo
    const slotAppointments = activeAppointments.filter(
      (app) => start < app.endMinutes && end > app.startMinutes
    );

    // 1. Verificar si está en el pasado (solo para el día actual con margen de 5 minutos)
    if (isToday && start < currentMinutes + 5) {
      slots.push({
        id: slotId,
        date,
        startMinutes: start,
        endMinutes: end,
        startTime: startTimeStr,
        endTime: endTimeStr,
        status: 'past',
        availableBarbersCount: 0,
        freeBarbers: [],
        appointments: slotAppointments
      });
      continue;
    }

    // 2. Heurística #5 de Nielsen: Verificar si la duración del servicio cabe antes del cierre
    const requiredEnd = start + serviceDurationMinutes;
    if (requiredEnd > closingMinutes) {
      slots.push({
        id: slotId,
        date,
        startMinutes: start,
        endMinutes: end,
        startTime: startTimeStr,
        endTime: endTimeStr,
        status: 'insufficient_time',
        availableBarbersCount: 0,
        freeBarbers: [],
        appointments: slotAppointments
      });
      continue;
    }

    // 3. Evaluar disponibilidad por cada uno de los 3 barberos
    const targetBarbers = filterBarberId
      ? activeBarbers.filter((b) => b.id === filterBarberId)
      : activeBarbers;

    const freeBarbers: Barber[] = [];

    for (const barber of targetBarbers) {
      // ¿Este barbero tiene una cita que colisione con el intervalo requerido?
      const isBarberBusy = activeAppointments.some(
        (app) =>
          app.barberId === barber.id &&
          start < app.endMinutes &&
          requiredEnd > app.startMinutes
      );

      // ¿Este barbero tiene un bloqueo manual (comida, descanso)?
      const isBarberBlocked = activeBlocks.some(
        (block) =>
          (!block.barberId || block.barberId === barber.id) &&
          start < block.endMinutes &&
          requiredEnd > block.startMinutes
      );

      if (!isBarberBusy && !isBarberBlocked) {
        freeBarbers.push(barber);
      }
    }

    // 4. Si hay al menos un barbero libre -> DISPONIBLE
    if (freeBarbers.length > 0) {
      slots.push({
        id: slotId,
        date,
        startMinutes: start,
        endMinutes: end,
        startTime: startTimeStr,
        endTime: endTimeStr,
        status: 'available',
        availableBarbersCount: freeBarbers.length,
        freeBarbers,
        appointment: slotAppointments[0],
        appointments: slotAppointments
      });
    } else {
      // 5. Todos los barberos están ocupados o bloqueados -> OCUPADO
      slots.push({
        id: slotId,
        date,
        startMinutes: start,
        endMinutes: end,
        startTime: startTimeStr,
        endTime: endTimeStr,
        status: 'occupied',
        availableBarbersCount: 0,
        freeBarbers: [],
        occupiedReason: 'Todos los barberos ocupados',
        appointment: slotAppointments[0],
        appointments: slotAppointments
      });
    }
  }

  return slots;
}
