import { format, parseISO, isBefore, addDays, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Appointment, BlockedSlot, PublicSlot, ShopConfig } from './models';

/**
 * Convierte minutos desde medianoche a formato HH:mm (24 horas)
 * Ej: 630 -> "10:30"
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Convierte minutos a formato amigable de 12 horas con AM/PM
 * Ej: 870 -> "02:30 PM"
 */
export function minutesToTime12h(minutes: number): string {
  let hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // la hora '0' debe ser '12'
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${ampm}`;
}

/**
 * Convierte un string "HH:mm" a minutos desde medianoche
 * Ej: "10:30" -> 630
 */
export function timeToMinutes(timeStr: string): number {
  const [hours, mins] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (mins || 0);
}

/**
 * Obtiene la fecha local de hoy en string canónico "YYYY-MM-DD"
 * SIN desfases de UTC.
 */
export function getTodayCanonical(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convierte un objeto Date a formato canónico "YYYY-MM-DD" respetando la zona horaria local.
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
  return new Date(year, month - 1, day, 12, 0, 0); // Al mediodía local para evitar cambios por horario de verano
}

/**
 * Formatea un string canónico para mostrar al usuario (Ej: "Martes, 17 de Noviembre")
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
 * Valida si un número es un teléfono mexicano válido de 10 dígitos numéricos
 */
export function isValidMexicanPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10;
}

/**
 * Motor de cálculo de disponibilidad de la grilla de horarios.
 * 
 * Reglas fundamentales:
 * 1. Los horarios fuera del rango laboral (apertura/cierre) no se generan.
 * 2. Si es el día de hoy, los horarios anteriores a la hora actual se marcan como 'past'.
 * 3. Si un horario choca con una cita confirmada, se marca como 'occupied'.
 * 4. Si choca con un bloqueo del barbero, se marca como 'blocked'.
 * 5. Si el horario está libre, pero la duración del servicio seleccionado se traslaparía con
 *    una cita posterior o con la hora de cierre, se marca como 'insufficient_time'.
 */
export function calculateScheduleSlots(
  date: string,
  config: ShopConfig,
  appointments: Appointment[],
  blockedSlots: BlockedSlot[],
  serviceDurationMinutes: number = 30
): PublicSlot[] {
  const slots: PublicSlot[] = [];
  const todayStr = getTodayCanonical();
  const isToday = date === todayStr;
  const currentMinutes = getCurrentDayMinutes();

  // Filtrar citas activas para esta fecha (excluyendo canceladas)
  const activeAppointments = appointments.filter(
    (app) => app.date === date && app.status !== 'cancelled'
  );

  // Filtrar bloqueos para esta fecha
  const activeBlocks = blockedSlots.filter((block) => block.date === date);

  // Generar bloques con base en el intervalo configurado (ej: 30 minutos)
  for (
    let start = config.openingMinutes;
    start < config.closingMinutes;
    start += config.slotIntervalMinutes
  ) {
    const end = start + config.slotIntervalMinutes;
    const slotId = `${date}_${start}`;
    const startTimeStr = minutesToTime(start);
    const endTimeStr = minutesToTime(end);

    // 1. Verificar si está en el pasado (solo para el día actual con margen de 5 minutos)
    if (isToday && start < currentMinutes + 5) {
      slots.push({
        id: slotId,
        date,
        startMinutes: start,
        endMinutes: end,
        startTime: startTimeStr,
        endTime: endTimeStr,
        status: 'past'
      });
      continue;
    }

    // 2. Verificar si está ocupado directamente por una cita
    const matchingApp = activeAppointments.find(
      (app) => start < app.endMinutes && end > app.startMinutes
    );

    if (matchingApp) {
      slots.push({
        id: slotId,
        date,
        startMinutes: start,
        endMinutes: end,
        startTime: startTimeStr,
        endTime: endTimeStr,
        status: 'occupied',
        occupiedReason: matchingApp.serviceName,
        appointment: matchingApp
      });
      continue;
    }

    // 3. Verificar si está bloqueado por el barbero (comida, día libre, etc.)
    const matchingBlock = activeBlocks.find(
      (block) => start < block.endMinutes && end > block.startMinutes
    );

    if (matchingBlock) {
      slots.push({
        id: slotId,
        date,
        startMinutes: start,
        endMinutes: end,
        startTime: startTimeStr,
        endTime: endTimeStr,
        status: 'blocked',
        occupiedReason: matchingBlock.reason || 'Bloqueado por el barbero'
      });
      continue;
    }

    // 4. Heurística #5 de Nielsen (Prevención de errores):
    // Verificar si el servicio solicitado cabe completamente desde este inicio
    const requiredEnd = start + serviceDurationMinutes;

    // Si la duración excede la hora de cierre:
    if (requiredEnd > config.closingMinutes) {
      slots.push({
        id: slotId,
        date,
        startMinutes: start,
        endMinutes: end,
        startTime: startTimeStr,
        endTime: endTimeStr,
        status: 'insufficient_time'
      });
      continue;
    }

    // Si entre `start` y `requiredEnd` hay alguna cita confirmada o bloqueo:
    const hasCollision =
      activeAppointments.some(
        (app) => start < app.endMinutes && requiredEnd > app.startMinutes
      ) ||
      activeBlocks.some(
        (block) => start < block.endMinutes && requiredEnd > block.startMinutes
      );

    if (hasCollision) {
      slots.push({
        id: slotId,
        date,
        startMinutes: start,
        endMinutes: end,
        startTime: startTimeStr,
        endTime: endTimeStr,
        status: 'insufficient_time'
      });
      continue;
    }

    // 5. El horario está 100% disponible
    slots.push({
      id: slotId,
      date,
      startMinutes: start,
      endMinutes: end,
      startTime: startTimeStr,
      endTime: endTimeStr,
      status: 'available'
    });
  }

  return slots;
}
