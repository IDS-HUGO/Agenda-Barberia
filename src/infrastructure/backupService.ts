import { Appointment } from '../domain/models';
import { formatFriendlyDate, getTodayCanonical, minutesToTime12h } from '../domain/scheduleEngine';

/**
 * Genera y descarga un Reporte / Historial formal listo para guardar en PDF o imprimir
 */
export function exportAppointmentsToPdf(
  appointments: Appointment[],
  title: string = 'Historial Oficial de Citas'
): void {
  const todayFormatted = formatFriendlyDate(getTodayCanonical());
  const completed = appointments.filter((a) => a.status === 'completed');
  const totalRevenue = completed.reduce((sum, a) => sum + a.price, 0);

  // Desglose por barbero
  const barberRevenue: Record<string, { count: number; total: number }> = {};
  completed.forEach((a) => {
    const name = a.barberName || 'Barbero General';
    if (!barberRevenue[name]) barberRevenue[name] = { count: 0, total: 0 };
    barberRevenue[name].count += 1;
    barberRevenue[name].total += a.price;
  });

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor habilita las ventanas emergentes en tu navegador para generar el PDF.');
    return;
  }

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>BARBER & SHOPPING - ${title}</title>
  <style>
    @page { size: letter landscape; margin: 15mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #111827;
      margin: 0;
      padding: 20px;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header {
      border-bottom: 2px solid #76C81C;
      padding-bottom: 14px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand-title {
      font-size: 26px;
      font-weight: 900;
      letter-spacing: 1px;
      color: #090B0E;
      margin: 0;
    }
    .brand-subtitle {
      font-size: 13px;
      color: #6B7280;
      margin: 4px 0 0 0;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 10px 14px;
    }
    .stat-label {
      font-size: 11px;
      color: #6B7280;
      text-transform: uppercase;
      font-weight: 700;
    }
    .stat-value {
      font-size: 20px;
      font-weight: 900;
      color: #111827;
      margin-top: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th {
      background: #090B0E;
      color: #FFFFFF;
      text-align: left;
      padding: 8px 10px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #E5E7EB;
    }
    tr:nth-child(even) { background-color: #F9FAFB; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-completed { background: #D1FAE5; color: #065F46; }
    .badge-confirmed { background: #FEF3C7; color: #92400E; }
    .badge-cancelled { background: #FEE2E2; color: #991B1B; }
    .footer {
      margin-top: 24px;
      border-top: 1px solid #E5E7EB;
      padding-top: 10px;
      font-size: 11px;
      color: #9CA3AF;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="brand-title">BARBER &amp; SHOPPING</h1>
      <p class="brand-subtitle">${title} • Generado el ${todayFormatted}</p>
    </div>
    <div style="text-align: right;">
      <span style="font-size: 12px; font-weight: bold; background: #76C81C; color: #000; padding: 4px 10px; border-radius: 6px;">
        REPORTE OFICIAL
      </span>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">Total Citas Registradas</div>
      <div class="stat-value">${appointments.length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Citas Atendidas</div>
      <div class="stat-value" style="color: #059669;">${completed.length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Citas Canceladas</div>
      <div class="stat-value" style="color: #DC2626;">${appointments.filter((a) => a.status === 'cancelled').length}</div>
    </div>
    <div class="stat-card" style="border-color: #10B981;">
      <div class="stat-label">Total Cobrado (Caja)</div>
      <div class="stat-value" style="color: #059669;">$${totalRevenue} MXN</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Folio</th>
        <th>Fecha</th>
        <th>Horario</th>
        <th>Barbero</th>
        <th>Cliente</th>
        <th>Teléfono</th>
        <th>Servicio</th>
        <th>Precio</th>
        <th>Estado</th>
      </tr>
    </thead>
    <tbody>
      ${appointments
        .map(
          (app) => `
        <tr>
          <td style="font-family: monospace; font-weight: bold;">${app.folio}</td>
          <td>${app.date}</td>
          <td style="font-weight: 600;">${minutesToTime12h(app.startMinutes)}</td>
          <td style="font-weight: bold; color: #090B0E;">${app.barberName || 'Barbero 1'}</td>
          <td style="font-weight: 600;">${app.clientName}</td>
          <td style="font-family: monospace;">${app.clientPhone}</td>
          <td>${app.serviceName}</td>
          <td style="font-weight: bold;">$${app.price}</td>
          <td>
            <span class="badge ${
              app.status === 'completed'
                ? 'badge-completed'
                : app.status === 'confirmed'
                ? 'badge-confirmed'
                : 'badge-cancelled'
            }">
              ${app.status === 'completed' ? 'Cobrado' : app.status === 'confirmed' ? 'Pendiente' : 'Cancelado'}
            </span>
          </td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  <div class="footer">
    <span>BARBER &amp; SHOPPING — Sistema de Gestión y Respaldo Permanente</span>
    <span>Página 1 • Documento seguro exportable a PDF</span>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

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
    'Barbero',
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
    `"${(app.barberName || 'Barbero 1').replace(/"/g, '""')}"`,
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
    '\uFEFF' +
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
