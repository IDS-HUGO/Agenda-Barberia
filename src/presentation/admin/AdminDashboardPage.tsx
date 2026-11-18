import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Plus,
  QrCode,
  Settings as SettingsIcon,
  DollarSign,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Flame,
  HelpCircle,
  X
} from 'lucide-react';
import { useBarberAuth } from '../../application/useBarberAuth';
import { useShopSettings } from '../../application/useShopSettings';
import { useBarberSchedule } from '../../application/useRealtimeSchedule';
import { Appointment, PublicSlot } from '../../domain/models';
import {
  dateToCanonical,
  formatFriendlyDate,
  getTodayCanonical,
  minutesToTime12h,
  parseCanonicalDate
} from '../../domain/scheduleEngine';
import { addDays, subDays } from 'date-fns';
import { Header } from '../shared/Header';
import { BarberSlotGrid } from './BarberSlotGrid';
import { WalkInModal } from './WalkInModal';
import { QrShareModal } from './QrShareModal';
import { SettingsModal } from './SettingsModal';
import { useToast } from '../shared/ToastProvider';

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isAuthenticated, userEmail, logout, isFirebaseConfigured } = useBarberAuth();
  const { config, services, updateConfig, addService, updateService, deleteService } = useShopSettings();

  const {
    selectedDate,
    setSelectedDate,
    appointments,
    blockedSlots,
    slots,
    stats,
    isLoading,
    soundEnabled,
    toggleSound,
    markAsCompleted,
    cancelAppointment,
    rescheduleAppointment,
    createWalkIn,
    blockSlot,
    unblockSlot
  } = useBarberSchedule(config);

  // Modales
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [preselectedSlot, setPreselectedSlot] = useState<PublicSlot | null>(null);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFirebaseHelpOpen, setIsFirebaseHelpOpen] = useState(false);

  // Estado para Reprogramación de Cita
  const [reschedulingApp, setReschedulingApp] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState(selectedDate);
  const [rescheduleStartMins, setRescheduleStartMins] = useState(600);

  // Redirección si no está autenticado
  if (!isAuthenticated) {
    navigate('/admin/login');
    return null;
  }

  // Navegación de fechas
  const handlePrevDay = () => {
    const current = parseCanonicalDate(selectedDate);
    setSelectedDate(dateToCanonical(subDays(current, 1)));
  };

  const handleNextDay = () => {
    const current = parseCanonicalDate(selectedDate);
    setSelectedDate(dateToCanonical(addDays(current, 1)));
  };

  const handleToday = () => {
    setSelectedDate(getTodayCanonical());
  };

  const handleOpenWalkInForSlot = (slot: PublicSlot) => {
    setPreselectedSlot(slot);
    setIsWalkInOpen(true);
  };

  const handleStartReschedule = (app: Appointment) => {
    setReschedulingApp(app);
    setRescheduleDate(app.date);
    setRescheduleStartMins(app.startMinutes);
  };

  const handleConfirmReschedule = async () => {
    if (!reschedulingApp) return;
    const res = await rescheduleAppointment(
      reschedulingApp,
      rescheduleDate,
      rescheduleStartMins
    );

    if (res.success) {
      showToast('Cita reprogramada con éxito.', 'success');
      setReschedulingApp(null);
    } else {
      showToast(res.error || 'No se pudo mover al horario seleccionado.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#090B0E] flex flex-col font-['Plus_Jakarta_Sans']">
      
      {/* Banner Superior de Estado de Firebase (Fallback Mode) */}
      {!isFirebaseConfigured && (
        <div className="bg-gradient-to-r from-[#12161D] via-[#1A202C] to-[#12161D] border-b border-[#F59E0B]/30 px-4 py-2 text-xs text-[#D1D5DB] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-ping" />
            <span>
              <strong className="text-white">Modo Local Offline Activo (IndexedDB).</strong> Las citas se guardan en este navegador.
            </span>
          </div>
          <button
            onClick={() => setIsFirebaseHelpOpen(true)}
            className="flex items-center gap-1 font-bold text-[#8CE026] hover:underline"
          >
            <span>Conectar Firebase en 2 min</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Admin */}
      <Header
        isAdmin
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        onLogout={logout}
        userEmail={userEmail}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 sm:py-8 space-y-6">
        
        {/* Barra de Acciones Rápidas */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] font-['Space_Grotesk'] tracking-tight flex items-center gap-2">
              Tablero del Barbero
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#76C81C]/15 border border-[#76C81C]/40 text-[#8CE026] font-mono">
                EN VIVO
              </span>
            </h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Administración de citas, ingresos del día y turnos en tiempo real.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setPreselectedSlot(null);
                setIsWalkInOpen(true);
              }}
              className="min-h-[44px] flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#76C81C] hover:bg-[#8CE026] text-black font-extrabold text-xs shadow-[0_0_15px_rgba(118,200,28,0.25)] transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Nueva Cita / Bloqueo
            </button>

            <button
              onClick={() => setIsQrOpen(true)}
              className="min-h-[44px] flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#12161D] hover:bg-[#1A202C] border border-[#1F2937] text-[#D1D5DB] hover:text-white text-xs font-semibold transition-all"
              title="Descargar QR oficial"
            >
              <QrCode className="w-4 h-4 text-[#76C81C]" />
              <span className="hidden sm:inline">QR Espejo</span>
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="min-h-[44px] flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#12161D] hover:bg-[#1A202C] border border-[#1F2937] text-[#D1D5DB] hover:text-white text-xs font-semibold transition-all"
              title="Ajustes de horarios y servicios"
            >
              <SettingsIcon className="w-4 h-4 text-[#76C81C]" />
              <span className="hidden sm:inline">Ajustes</span>
            </button>
          </div>
        </div>

        {/* ================= TARJETAS DE ESTADÍSTICAS DEL DÍA ================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Citas Totales */}
          <div className="p-4 rounded-2xl bg-[#12161D] border border-[#1F2937]">
            <div className="flex items-center justify-between text-xs text-[#94A3B8]">
              <span>Citas del Día</span>
              <Users className="w-4 h-4 text-[#76C81C]" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{stats.total}</span>
              <span className="text-[11px] text-[#94A3B8]">registradas</span>
            </div>
          </div>

          {/* Confirmadas / Pendientes */}
          <div className="p-4 rounded-2xl bg-[#12161D] border border-[#1F2937]">
            <div className="flex items-center justify-between text-xs text-[#94A3B8]">
              <span>Por Atender</span>
              <Clock className="w-4 h-4 text-[#F59E0B]" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#F59E0B]">{stats.confirmed}</span>
              <span className="text-[11px] text-[#94A3B8]">pendientes</span>
            </div>
          </div>

          {/* Completadas */}
          <div className="p-4 rounded-2xl bg-[#12161D] border border-[#1F2937]">
            <div className="flex items-center justify-between text-xs text-[#94A3B8]">
              <span>Completadas</span>
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#10B981]">{stats.completed}</span>
              <span className="text-[11px] text-[#94A3B8]">atendidas</span>
            </div>
          </div>

          {/* Ingreso Real del Día */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#12161D] to-[#101E19] border border-[#10B981]/40 shadow-sm">
            <div className="flex items-center justify-between text-xs text-[#94A3B8]">
              <span>Caja Cobrada Hoy</span>
              <DollarSign className="w-4 h-4 text-[#10B981]" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-[#10B981]">
                ${stats.totalRealRevenue}
              </span>
              <span className="text-[11px] text-[#94A3B8] block">
                Proyectado: ${stats.projectedRevenue} MXN
              </span>
            </div>
          </div>

        </div>

        {/* ================= SELECTOR DE FECHA RESPONSIVO ================= */}
        <div className="p-3 bg-[#12161D] border border-[#1F2937] rounded-2xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handlePrevDay}
              className="p-2 rounded-xl bg-[#1A202C] hover:bg-[#262F3F] text-white transition-colors"
              title="Día anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextDay}
              className="p-2 rounded-xl bg-[#1A202C] hover:bg-[#262F3F] text-white transition-colors"
              title="Día siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 rounded-xl bg-[#1A202C] hover:bg-[#262F3F] text-xs font-bold text-[#76C81C] transition-colors ml-1"
            >
              Hoy
            </button>
          </div>

          <div className="flex items-center gap-2 order-first sm:order-none w-full sm:w-auto justify-center sm:justify-start">
            <CalendarIcon className="w-4 h-4 text-[#76C81C]" />
            <span className="text-sm font-extrabold text-white text-center">
              {formatFriendlyDate(selectedDate)}
            </span>
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="bg-[#090B0E] border border-[#1F2937] text-white text-xs px-2.5 py-1.5 rounded-xl outline-none ml-auto sm:ml-0"
          />
        </div>

        {/* ================= GRILLA DE HORARIOS Y CITAS ================= */}
        <div className="bg-[#090B0E] rounded-3xl border border-[#1F2937] p-4 sm:p-6 shadow-xl">
          <BarberSlotGrid
            slots={slots}
            appointments={appointments}
            blockedSlots={blockedSlots}
            onOpenWalkInForSlot={handleOpenWalkInForSlot}
            onMarkCompleted={markAsCompleted}
            onCancelAppointment={cancelAppointment}
            onReschedule={handleStartReschedule}
            onUnblockSlot={unblockSlot}
          />
        </div>

      </main>

      {/* ================= MODALES ================= */}
      <WalkInModal
        isOpen={isWalkInOpen}
        onClose={() => setIsWalkInOpen(false)}
        selectedDate={selectedDate}
        services={services}
        preselectedSlot={preselectedSlot}
        onCreateWalkIn={createWalkIn}
        onBlockSlot={blockSlot}
      />

      <QrShareModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        services={services}
        onUpdateConfig={updateConfig}
        onAddService={addService}
        onUpdateService={updateService}
        onDeleteService={deleteService}
      />

      {/* MODAL REPROGRAMACIÓN */}
      {reschedulingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#12161D] border border-[#1F2937] rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Reprogramar Cita</h3>
              <button
                onClick={() => setReschedulingApp(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#94A3B8]">
              Cliente: <strong className="text-white">{reschedulingApp.clientName}</strong> ({reschedulingApp.serviceName})
            </p>

            <div>
              <label className="block text-xs font-bold text-[#D1D5DB] mb-1.5 uppercase">
                Nueva Fecha
              </label>
              <input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 bg-[#090B0E] border border-[#1F2937] focus:border-[#76C81C] rounded-xl text-white outline-none text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#D1D5DB] mb-1.5 uppercase">
                Nuevo Horario
              </label>
              <select
                value={rescheduleStartMins}
                onChange={(e) => setRescheduleStartMins(Number(e.target.value))}
                className="w-full min-h-[44px] px-3 py-2 bg-[#090B0E] border border-[#1F2937] focus:border-[#76C81C] rounded-xl text-white outline-none text-xs"
              >
                {Array.from({ length: 24 }, (_, i) => 600 + i * 30).map((mins) => (
                  <option key={mins} value={mins}>
                    {minutesToTime12h(mins)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReschedulingApp(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#1A202C] text-[#D1D5DB] text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReschedule}
                className="flex-1 py-2.5 rounded-xl bg-[#76C81C] hover:bg-[#8CE026] text-black text-xs font-bold transition-all"
              >
                Mover Cita
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INSTRUCCIONES FIREBASE */}
      {isFirebaseHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#12161D] border border-[#76C81C]/40 rounded-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2937]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#76C81C]" />
                Conectar Firebase Spark (100% Gratis)
              </h3>
              <button
                onClick={() => setIsFirebaseHelpOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-[#D1D5DB] space-y-3 py-4">
              <p>
                Para sincronizar en tiempo real entre los celulares de tus clientes y tu computadora sin caídas ni costos:
              </p>
              <ol className="list-decimal pl-4 space-y-2 text-[#94A3B8]">
                <li>
                  Entra a <strong className="text-white">console.firebase.google.com</strong> y crea un proyecto.
                </li>
                <li>
                  En <strong className="text-white">Firestore Database</strong>, crea tu base de datos y copia las reglas de <code className="text-[#8CE026]">firestore.rules</code> de este proyecto.
                </li>
                <li>
                  En <strong className="text-white">Authentication</strong>, habilita Correo/Contraseña y crea tu usuario de barbero.
                </li>
                <li>
                  En <strong className="text-white">Configuración del Proyecto</strong>, registra una App Web (<code className="text-[#8CE026]">&lt;/&gt;</code>) y pega los valores en tu archivo <code className="text-[#8CE026]">.env</code>.
                </li>
              </ol>
              <p className="pt-2 text-[11px] text-[#94A3B8]">
                Toda la guía paso a paso detallada está disponible en el archivo <strong className="text-white">README.md</strong>.
              </p>
            </div>

            <button
              onClick={() => setIsFirebaseHelpOpen(false)}
              className="w-full py-3 rounded-2xl bg-[#1A202C] hover:bg-[#262F3F] text-white font-bold text-xs"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
