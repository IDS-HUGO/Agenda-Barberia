import React, { useState } from 'react';
import {
  Clock,
  User,
  Phone,
  MessageCircle,
  CheckCircle,
  XCircle,
  Calendar,
  Lock,
  PlusCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ExternalLink,
  X,
  Scissors
} from 'lucide-react';
import { Appointment, BlockedSlot, PublicSlot } from '../../domain/models';
import { minutesToTime12h, formatFriendlyDate, getCurrentDayMinutes, getTodayCanonical } from '../../domain/scheduleEngine';
import { buildBarberToClientWhatsAppUrl } from '../../infrastructure/whatsappService';
import { useToast } from '../shared/ToastProvider';

interface BarberSlotGridProps {
  slots: PublicSlot[];
  appointments: Appointment[];
  blockedSlots: BlockedSlot[];
  onOpenWalkInForSlot: (slot: PublicSlot) => void;
  onMarkCompleted: (id: string) => Promise<void>;
  onCancelAppointment: (id: string, folio?: string) => Promise<void>;
  onReschedule: (appointment: Appointment) => void;
  onUnblockSlot: (id: string) => Promise<void>;
}

export const BarberSlotGrid: React.FC<BarberSlotGridProps> = ({
  slots,
  appointments,
  blockedSlots,
  onOpenWalkInForSlot,
  onMarkCompleted,
  onCancelAppointment,
  onReschedule,
  onUnblockSlot
}) => {
  const { showToast } = useToast();
  const [filter, setFilter] = useState<'all' | 'occupied' | 'available'>('all');
  const [appToCancel, setAppToCancel] = useState<Appointment | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Filtrar según botón
  const filteredSlots = slots.filter((slot) => {
    const hasApps = (slot.appointments && slot.appointments.length > 0) || !!slot.appointment;
    if (filter === 'all') return true;
    if (filter === 'occupied') return hasApps || slot.status === 'occupied' || slot.status === 'blocked';
    if (filter === 'available') return slot.status === 'available' || (slot.availableBarbersCount ?? 0) > 0;
    return true;
  });

  const handleConfirmCancel = async () => {
    if (!appToCancel) return;
    setIsCancelling(true);
    try {
      await onCancelAppointment(appToCancel.id, appToCancel.folio);
      showToast(`Cita de ${appToCancel.clientName} cancelada y horario liberado.`, 'info');
      setAppToCancel(null);
    } catch (err: any) {
      showToast('Error al cancelar la cita: ' + (err.message || ''), 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Barra de Filtros Responsiva */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1 bg-[#12161D] p-1 rounded-2xl border border-[#1F2937] overflow-x-auto max-w-full scrollbar-none">
          <button
            onClick={() => setFilter('all')}
            className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filter === 'all'
                ? 'bg-[#1A202C] text-[#8CE026] shadow-sm'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Todos ({slots.length})
          </button>
          <button
            onClick={() => setFilter('occupied')}
            className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filter === 'occupied'
                ? 'bg-[#1A202C] text-[#F59E0B] shadow-sm'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Citas &amp; Ocupados
          </button>
          <button
            onClick={() => setFilter('available')}
            className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filter === 'available'
                ? 'bg-[#1A202C] text-[#76C81C] shadow-sm'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Lugares Libres
          </button>
        </div>

        <span className="text-[11px] sm:text-xs text-[#94A3B8]">
          Toca un horario con sillas libres para agendar Walk-in
        </span>
      </div>

      {/* Listado de Grilla de Turnos */}
      <div className="space-y-3">
        {filteredSlots.map((slot) => {
          const slotApps = slot.appointments && slot.appointments.length > 0
            ? slot.appointments
            : (slot.appointment ? [slot.appointment] : []);
          
          const hasApps = slotApps.length > 0;
          const hasFreeBarbers = (slot.availableBarbersCount ?? (slot.freeBarbers?.length ?? 0)) > 0;

          // ================= CASO 1: TIENE UNA O MÁS CITAS =================
          if (hasApps) {
            return (
              <div
                key={slot.id}
                className="p-3 sm:p-4 rounded-2xl bg-[#141923] border border-[#1F2937] space-y-3"
              >
                {/* Header del Bloque de Horario */}
                <div className="flex items-center justify-between pb-2 border-b border-[#1F2937]/70">
                  <div className="flex items-center gap-2">
                    <div className="px-2.5 py-1 rounded-lg bg-[#090B0E] border border-[#1F2937] font-bold text-xs text-white">
                      {minutesToTime12h(slot.startMinutes)}
                    </div>
                    <span className="text-xs text-[#94A3B8]">
                      {slotApps.length} {slotApps.length === 1 ? 'barbero atendiendo' : 'barberos atendiendo'}
                    </span>
                  </div>

                  {hasFreeBarbers && (
                    <button
                      onClick={() => onOpenWalkInForSlot(slot)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#76C81C]/10 border border-[#76C81C]/30 text-[#8CE026] text-xs font-bold hover:bg-[#76C81C]/20 transition-all active:scale-95"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>{slot.availableBarbersCount} silla(s) libre(s) - Walk-in</span>
                    </button>
                  )}
                </div>

                {/* Listado de Citas en este Bloque */}
                <div className="space-y-2.5">
                  {slotApps.map((app) => {
                    const isCompleted = app.status === 'completed';
                    const whatsappUrl = buildBarberToClientWhatsAppUrl(app);
                    const isToday = slot.date === getTodayCanonical();
                    const currentMins = getCurrentDayMinutes();

                    // Tolerancia de 10 minutos y estado en vivo
                    let liveToleranceBadge = null;
                    if (isToday && !isCompleted && app.status === 'confirmed') {
                      if (currentMins >= app.startMinutes && currentMins <= app.startMinutes + 10) {
                        liveToleranceBadge = (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40 animate-pulse flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Tolerancia (+{currentMins - app.startMinutes}m / 10m)
                          </span>
                        );
                      } else if (currentMins > app.startMinutes + 10 && currentMins < app.endMinutes) {
                        liveToleranceBadge = (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40 flex items-center gap-1">
                            <Scissors className="w-3 h-3" />
                            En Atención
                          </span>
                        );
                      } else if (currentMins < app.startMinutes && currentMins >= app.startMinutes - 10) {
                        liveToleranceBadge = (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-950/60 text-blue-400 border border-blue-700/40 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Inicia en {app.startMinutes - currentMins} min
                          </span>
                        );
                      }
                    }

                    return (
                      <div
                        key={app.id}
                        className={`p-3 sm:p-3.5 rounded-xl border transition-all ${
                          isCompleted
                            ? 'bg-[#101E19]/80 border-[#10B981]/30 border-l-[4px] border-l-[#10B981]'
                            : 'bg-[#18202C] border-[#F59E0B]/20 border-l-[4px] border-l-[#F59E0B]'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          
                          {/* Info del Barbero Asignado y Cliente */}
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#8CE026]/15 text-[#8CE026] border border-[#8CE026]/30 flex items-center gap-1">
                                <Scissors className="w-3 h-3" />
                                {app.barberName || 'Hugo'}
                              </span>

                              <h4 className="font-bold text-sm text-white">
                                {app.clientName}
                              </h4>

                              {liveToleranceBadge}

                              <span
                                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                                  app.source === 'client_web'
                                    ? 'bg-[#76C81C]/15 text-[#8CE026] border border-[#76C81C]/30'
                                    : 'bg-blue-950/40 text-blue-400 border border-blue-800/40'
                                }`}
                              >
                                {app.source === 'client_web' ? 'Web Cliente' : 'Manual'}
                              </span>

                              <span className="text-[10px] font-mono text-[#94A3B8] px-1.5 py-0.5 rounded bg-[#090B0E]">
                                {app.folio}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-[#D1D5DB] flex-wrap">
                              <span className="font-semibold text-[#76C81C]">
                                {app.serviceName} (${app.price} MXN)
                              </span>
                              <span className="text-[11px] text-[#94A3B8]">
                                {app.durationMinutes} min
                              </span>

                              {app.clientPhone && app.clientPhone !== '0000000000' && (
                                <a
                                  href={whatsappUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[#25D366] hover:underline font-mono"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                  {app.clientPhone}
                                  <MessageCircle className="w-3.5 h-3.5 fill-current ml-0.5" />
                                </a>
                              )}
                            </div>

                            {app.notes && (
                              <p className="text-xs text-[#94A3B8] italic">
                                "{app.notes}"
                              </p>
                            )}
                          </div>

                          {/* Acciones Rápidas */}
                          <div className="flex items-center gap-2 shrink-0 justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-[#1F2937]/50 flex-wrap">
                            {!isCompleted ? (
                              <>
                                <button
                                  onClick={() => onMarkCompleted(app.id)}
                                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-black font-extrabold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                                  title="Marcar como atendido y cobrado"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Cobrado
                                </button>

                                <button
                                  onClick={() => onReschedule(app)}
                                  className="min-h-[44px] px-3 py-2 rounded-xl bg-[#1A202C] hover:bg-[#262F3F] text-[#D1D5DB] hover:text-white border border-[#1F2937] text-xs font-semibold flex items-center gap-1 transition-all"
                                  title="Mover a otro horario o fecha"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  Mover
                                </button>

                                <button
                                  onClick={() => setAppToCancel(app)}
                                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#2A1215] hover:bg-red-900/40 text-red-400 hover:text-red-300 border border-red-900/40 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
                                  title="Cancelar cita y liberar horario"
                                >
                                  <XCircle className="w-4 h-4 shrink-0" />
                                  <span>Cancelar</span>
                                </button>
                              </>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#101E19] text-[#10B981] text-xs font-bold border border-[#10B981]/50">
                                <CheckCircle className="w-4 h-4" />
                                Atendido (${app.price})
                              </span>
                            )}
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          // ================= CASO 2: HORARIO BLOQUEADO =================
          if (slot.status === 'blocked') {
            const block = blockedSlots.find(
              (b) => slot.startMinutes < b.endMinutes && slot.endMinutes > b.startMinutes
            );

            return (
              <div
                key={slot.id}
                className="p-3.5 rounded-2xl bg-[#1A1416] border border-red-900/30 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#090B0E] border border-red-900/30 text-red-400 font-bold text-xs min-w-[70px] text-center">
                    {minutesToTime12h(slot.startMinutes)}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-red-400 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      Horario Bloqueado
                    </span>
                    <p className="text-xs text-[#94A3B8]">
                      {slot.occupiedReason || 'Sin atención'}
                    </p>
                  </div>
                </div>

                {block && (
                  <button
                    onClick={() => onUnblockSlot(block.id)}
                    className="min-h-[44px] px-3 py-2 text-xs font-semibold text-red-400 hover:text-white underline rounded-xl"
                  >
                    Desbloquear
                  </button>
                )}
              </div>
            );
          }

          // ================= CASO 3: HORARIO DISPONIBLE (TODAS LAS SILLAS LIBRES) =================
          return (
            <div
              key={slot.id}
              onClick={() => onOpenWalkInForSlot(slot)}
              className="group cursor-pointer p-3.5 rounded-2xl bg-[#12161D]/70 hover:bg-[#1A202C] border border-dashed border-[#1F2937] hover:border-[#76C81C] flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#090B0E] border border-[#1F2937] text-xs font-extrabold text-[#8CE026] min-w-[70px] text-center">
                  {minutesToTime12h(slot.startMinutes)}
                </div>
                <div>
                  <span className="text-xs font-semibold text-white group-hover:text-[#8CE026] transition-colors block">
                    Horario Disponible
                  </span>
                  <span className="text-[11px] text-[#94A3B8]">
                    {slot.availableBarbersCount ?? 3} barberos libres {slot.freeBarbers ? `(${slot.freeBarbers.map(b => b.name).join(', ')})` : ''}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-[#76C81C] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                <PlusCircle className="w-4 h-4" />
                <span>Agendar aquí</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ================= MODAL DE CONFIRMACIÓN DE CANCELACIÓN ================= */}
      {appToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#12161D] border border-red-900/60 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4">
            
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-3 rounded-2xl bg-red-950/60 border border-red-900/50 shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
                  ¿Cancelar esta Cita?
                </h3>
                <p className="text-xs text-[#94A3B8]">
                  El horario se liberará al instante en la vista pública.
                </p>
              </div>
            </div>

            <div className="bg-[#090B0E] p-4 rounded-2xl border border-[#1F2937] text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[#94A3B8]">Cliente:</span>
                <span className="font-bold text-white text-sm">{appToCancel.clientName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#94A3B8]">Barbero:</span>
                <span className="text-[#8CE026] font-bold">{appToCancel.barberName || 'Barbero'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#94A3B8]">Servicio:</span>
                <span className="text-[#76C81C] font-semibold">{appToCancel.serviceName} (${appToCancel.price} MXN)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#94A3B8]">Horario:</span>
                <span className="text-white font-mono">{minutesToTime12h(appToCancel.startMinutes)} ({appToCancel.date})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#94A3B8]">Folio:</span>
                <span className="text-[#8CE026] font-mono font-bold">{appToCancel.folio}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setAppToCancel(null)}
                className="min-h-[48px] py-3 px-4 rounded-2xl bg-[#1A202C] hover:bg-[#262F3F] text-[#D1D5DB] text-xs font-bold transition-all order-2 sm:order-1"
              >
                No, Mantener Cita
              </button>

              <button
                type="button"
                disabled={isCancelling}
                onClick={handleConfirmCancel}
                className="min-h-[48px] py-3 px-4 rounded-2xl bg-[#DC2626] hover:bg-[#EF4444] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-950/60 order-1 sm:order-2"
              >
                <XCircle className="w-4 h-4" />
                <span>{isCancelling ? 'Cancelando...' : 'Sí, Cancelar Cita'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
