import { Appointment } from '../domain/models';
import { formatFriendlyDate, minutesToTime12h } from '../domain/scheduleEngine';

/**
 * Limpia y normaliza un número telefónico para WhatsApp México (+52)
 */
export function normalizeWhatsAppNumber(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  // Si ya tiene 52 al inicio y 12 dígitos en total:
  if (digits.length === 12 && digits.startsWith('52')) {
    return digits;
  }
  // Si tiene 10 dígitos (estándar México):
  if (digits.length === 10) {
    return `52${digits}`;
  }
  return digits;
}

/**
 * Genera el enlace de WhatsApp para que el cliente envíe su comprobante a la barbería
 */
export function buildClientConfirmationWhatsAppUrl(
  appointment: Appointment,
  barberPhone: string
): string {
  const cleanBarberPhone = normalizeWhatsAppNumber(barberPhone || '5219999999999');
  const dateFormatted = formatFriendlyDate(appointment.date);
  const timeFormatted = minutesToTime12h(appointment.startMinutes);

  const message = 
`💈 *BARBER Y SHOPPING — CONFIRMACIÓN DE CITA* 💈

¡Hola! Acabo de reservar mi cita desde la app:

🎟️ *Folio:* \`${appointment.folio}\`
👤 *Cliente:* ${appointment.clientName}
✂️ *Servicio:* ${appointment.serviceName}
💰 *Total:* $${appointment.price} MXN
📅 *Fecha:* ${dateFormatted}
⏰ *Hora:* ${timeFormatted} (${appointment.startTime} hrs)

¡Quedo al pendiente para mi corte! ✂️🔥`;

  return `https://wa.me/${cleanBarberPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Genera el enlace de WhatsApp para que el barbero contacte al cliente directamente
 */
export function buildBarberToClientWhatsAppUrl(appointment: Appointment): string {
  const cleanClientPhone = normalizeWhatsAppNumber(appointment.clientPhone);
  const dateFormatted = formatFriendlyDate(appointment.date);
  const timeFormatted = minutesToTime12h(appointment.startMinutes);

  const message =
`💈 *BARBER Y SHOPPING* 💈

¡Hola ${appointment.clientName}! Te escribimos de BARBER Y SHOPPING respecto a tu cita:

✂️ *Servicio:* ${appointment.serviceName}
📅 *Fecha:* ${dateFormatted}
⏰ *Hora:* ${timeFormatted}
🎟️ *Folio:* \`${appointment.folio}\`

¡Te esperamos con la mejor atención y estilo alien! Si necesitas algún cambio, escríbenos por aquí. 💈🚀`;

  return `https://wa.me/${cleanClientPhone}?text=${encodeURIComponent(message)}`;
}
