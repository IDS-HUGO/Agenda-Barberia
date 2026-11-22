import { Appointment } from '../domain/models';
import { formatFriendlyDate, minutesToTime12h } from '../domain/scheduleEngine';

const TELEGRAM_BOT_TOKEN =
  import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '9044206768:AAGA_W0SydYW-WRZKf1-rewV8dWraWDrPy4';

const TELEGRAM_CHAT_ID =
  import.meta.env.VITE_TELEGRAM_CHAT_ID || '-5413977210';

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Servicio de Notificaciones automáticas de Telegram para la Barbería
 */
export const TelegramService = {
  /**
   * Envía un mensaje en formato HTML al grupo de Telegram
   */
  async sendMessage(htmlMessage: string): Promise<boolean> {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.warn('[Telegram] Token o Chat ID no configurados.');
      return false;
    }

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: htmlMessage,
            parse_mode: 'HTML',
            disable_web_page_preview: true
          })
        }
      );

      const data = await response.json();
      if (!data.ok) {
        console.error('[Telegram] Error en respuesta de Telegram:', data);
        return false;
      }
      return true;
    } catch (error) {
      console.error('[Telegram] Error al conectar con Telegram API:', error);
      return false;
    }
  },

  /**
   * Notifica una nueva cita confirmada
   */
  async notifyNewAppointment(appointment: Appointment): Promise<boolean> {
    const barber = appointment.barberName || 'Barbero Asignado';
    const dateFormatted = formatFriendlyDate(appointment.date);
    const timeFormatted = minutesToTime12h(appointment.startMinutes);
    const clientPhone = appointment.clientPhone ? appointment.clientPhone.replace(/\D/g, '') : '';
    const waLink = clientPhone ? `https://wa.me/52${clientPhone}` : '';

    const message = [
      `💈 <b>¡NUEVA CITA AGENDADA!</b> 💈`,
      ``,
      `💈 <b>Barbero:</b> <b>${escapeHtml(barber.toUpperCase())} ✂️</b>`,
      `👤 <b>Cliente:</b> ${escapeHtml(appointment.clientName)}`,
      `✂️ <b>Servicio:</b> ${escapeHtml(appointment.serviceName)} (<b>$${appointment.price} MXN</b>)`,
      `📅 <b>Fecha:</b> ${escapeHtml(dateFormatted)}`,
      `⏰ <b>Horario:</b> ${escapeHtml(timeFormatted)} (${appointment.durationMinutes} min)`,
      `⏱️ <b>Tolerancia:</b> 10 minutos`,
      clientPhone
        ? `📱 <b>WhatsApp:</b> <a href="${waLink}">${escapeHtml(clientPhone)}</a>`
        : '',
      `🎟️ <b>Folio:</b> <code>${escapeHtml(appointment.folio || appointment.id)}</code>`,
      appointment.notes
        ? `📝 <b>Notas:</b> <i>${escapeHtml(appointment.notes)}</i>`
        : '',
      ``,
      `<i>Notificación automática Barber &amp; Shopping</i>`
    ]
      .filter((line) => line !== null && line !== undefined)
      .join('\n');

    return await this.sendMessage(message);
  },

  /**
   * Notifica cuando una cita es cancelada y el horario se libera
   */
  async notifyCancelledAppointment(params: {
    folio: string;
    barberName?: string;
    date: string;
    time?: string;
    clientName?: string;
  }): Promise<boolean> {
    const dateFormatted = formatFriendlyDate(params.date);
    const barber = params.barberName ? escapeHtml(params.barberName.toUpperCase()) : 'BARBERO';

    const message = [
      `❌ <b>CITA CANCELADA</b> ❌`,
      ``,
      `🎟️ <b>Folio:</b> <code>${escapeHtml(params.folio)}</code>`,
      params.barberName ? `💈 <b>Barbero liberado:</b> <b>${barber}</b>` : '',
      params.clientName ? `👤 <b>Cliente:</b> ${escapeHtml(params.clientName)}` : '',
      `📅 <b>Fecha:</b> ${escapeHtml(dateFormatted)} ${params.time ? `a las ${escapeHtml(params.time)}` : ''}`,
      ``,
      `🟢 <b>El horario ha sido liberado nuevamente en la plataforma.</b>`,
      ``,
      `<i>Notificación automática Barber &amp; Shopping</i>`
    ]
      .filter(Boolean)
      .join('\n');

    return await this.sendMessage(message);
  },

  /**
   * Notifica cuando una cita es reprogramada para otra fecha/hora
   */
  async notifyRescheduledAppointment(params: {
    folio: string;
    clientName: string;
    barberName: string;
    oldDate: string;
    oldStartTime: string;
    newDate: string;
    newStartTime: string;
    serviceName: string;
  }): Promise<boolean> {
    const oldDateFormatted = formatFriendlyDate(params.oldDate);
    const newDateFormatted = formatFriendlyDate(params.newDate);

    const message = [
      `🔄 <b>CITA REPROGRAMADA</b> 🔄`,
      ``,
      `🎟️ <b>Folio:</b> <code>${escapeHtml(params.folio)}</code>`,
      `👤 <b>Cliente:</b> ${escapeHtml(params.clientName)}`,
      `💈 <b>Barbero:</b> <b>${escapeHtml(params.barberName.toUpperCase())} ✂️</b>`,
      `✂️ <b>Servicio:</b> ${escapeHtml(params.serviceName)}`,
      `❌ <b>Antes:</b> ${escapeHtml(oldDateFormatted)} a las ${escapeHtml(params.oldStartTime)} hrs`,
      `✅ <b>Nueva Fecha:</b> <b>${escapeHtml(newDateFormatted)} a las ${escapeHtml(params.newStartTime)} hrs</b>`,
      ``,
      `<i>Notificación automática Barber &amp; Shopping</i>`
    ]
      .filter(Boolean)
      .join('\n');

    return await this.sendMessage(message);
  },

  /**
   * Envía mensaje de prueba para verificar conectividad
   */
  async sendTestMessage(): Promise<boolean> {
    const now = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const message = [
      `🔔 <b>PRUEBA DE NOTIFICACIÓN</b> 🔔`,
      ``,
      `✅ El bot de Telegram está correctamente vinculado con la aplicación web.`,
      `⏰ Hora del sistema: <b>${now}</b>`,
      ``,
      `<i>Equipo Barber &amp; Shopping</i>`
    ].join('\n');

    return await this.sendMessage(message);
  }
};
