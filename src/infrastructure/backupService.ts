import { Appointment } from '../domain/models';
import { getTodayCanonical } from '../domain/scheduleEngine';

/**
 * Descarga las citas en formato JSON para copia de seguridad completa
 */
export function exportAppointmentsToJson(appointments: Appointment[]): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(appointments, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `respaldo_barber_shopping_${getTodayCanonical()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Descarga las citas en formato CSV compatible con Excel y Google Sheets
 */
export function exportAppointmentsToCsv(appointments: Appointment[]): void {
  const headers = [
    'Folio',
    'Cliente',
    'Teléfono',
    'Servicio',
    'Precio MXN',
    'Duración (min)',
    'Fecha',
    'Hora Inicio',
    'Hora Fin',
    'Estado',
    'Origen',
    'Notas',
    'Fecha Registro'
  ];

  const rows = appointments.map((app) => [
    app.folio,
    `"${app.clientName.replace(/"/g, '""')}"`,
    app.clientPhone,
    `"${app.serviceName.replace(/"/g, '""')}"`,
    app.price,
    app.durationMinutes,
    app.date,
    app.startTime,
    app.endTime,
    app.status,
    app.source === 'client_web' ? 'Web Cliente' : 'Barbero / Manual',
    `"${(app.notes || '').replace(/"/g, '""')}"`,
    app.createdAt
  ]);

  const csvContent =
    '\uFEFF' + // BOM para que Excel respete acentos en español
    [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', url);
  downloadAnchor.setAttribute('download', `citas_barber_shopping_${getTodayCanonical()}.csv`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Lee y valida un archivo JSON de respaldo
 */
export function readBackupJsonFile(file: File): Promise<Appointment[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);
        if (!Array.isArray(data)) {
          throw new Error('El archivo no contiene una lista válida de citas.');
        }
        resolve(data as Appointment[]);
      } catch (err: any) {
        reject(new Error('Archivo JSON inválido o corrupto: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo.'));
    reader.readAsText(file);
  });
}
