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
  X
} from 'lucide-react';
import { Appointment, BlockedSlot, PublicSlot, ServiceItem } from '../../domain/models';
import { minutesToTime12h, formatFriendlyDate } from '../../domain/scheduleEngine';
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
    if (filter === 'all') return true;
    if (filter === 'occupied') return slot.status === 'occupied' || slot.status === 'blocked';
    if (filter === 'available') return slot.status === 'available';
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
      
      {/* Barra de Filtros */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 bg-[#12161D] p-1 rounded-2xl border border-[#1F2937]">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'all'
                ? 'bg-[#1A202C] text-[#8CE026] shadow-sm'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Todos ({slots.length})
          </button>
          <button
            onClick={() => setFilter('occupied')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'occupied'
                ? 'bg-[#1A202C] text-[#F59E0B] shadow-sm'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Citas &amp; Bloqueos
          </button>
          <button
            onClick={() => setFilter('available')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'available'
                ? 'bg-[#1A202C] text-[#76C81C] shadow-sm'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Libres
          </button>
        </div>

        <span className="text-xs text-[#94A3B8]">
          Toca un horario libre para agendar Walk-in o bloquear
        </span>
      </div>

      {/* Listado de Grilla de Turnos */}
      <div className="space-y-2.5">
        {filteredSlots.map((slot) => {
          // ================= CASO 1: HORARIO OCUPADO CON CITA =================
          if (slot.appointment) {
            const app = slot.appointment;
            const isCompleted = app.status === 'completed';
            const whatsappUrl = buildBarberToClientWhatsAppUrl(app);

            return (
              <div
                key={slot.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isCompleted
                    ? 'bg-[#101E19] border-[#10B981]/40 border-l-[6px] border-l-[#10B981]'
                    : 'bg-[#161D27] border-[#F59E0B]/30 border-l-[6px] border-l-[#F59E0B]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  
                  {/* Info Horario y Cliente */}
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 p-2.5 rounded-xl bg-[#090B0E] border border-[#1F2937] text-center min-w-[75px]">
                      <span className="block text-xs font-bold text-white">
                        {minutesToTime12h(app.startMinutes)}
                      </span>
                      <span className="text-[10px] text-[#94A3B8] font-mono">
                        {app.durationMinutes} min
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-base text-white">{app.clientName}</h4>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                            app.source === 'client_web'
                              ? 'bg-[#76C81C]/15 text-[#8CE026] border border-[#76C81C]/30'
                              : 'bg-blue-950/40 text-blue-400 border border-blue-800/40'
                          }`}
                        >
                          {app.source === 'client_web' ? 'Web Cliente' : 'Barbero / Manual'}
                        </span>

                        <span className="text-[10px] font-mono text-[#94A3B8] px-1.5 py-0.5 rounded bg-[#090B0E]">
                          {app.folio}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[#D1D5DB] mt-1 flex-wrap">
                        <span className="font-semibold text-[#76C81C]">
                          {app.serviceName} (${app.price} MXN)
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
                        <p className="text-xs text-[#94A3B8] mt-1 italic">
                          "{app.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Acciones Rápidas del Barbero */}
                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#1F2937]/50 flex-wrap">
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

                        {/* Botón Claro y Responsivo para Cancelar Cita */}
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
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#101E19] text-[#10B981] text-xs font-bold border border-[#10B981]/50">
                        <CheckCircle className="w-4 h-4" />
                        Completado (${app.price})
                      </span>
                    )}
                  </div>

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
                  <div className="p-2 rounded-xl bg-[#090B0E] border border-red-900/30 text-red-400 font-bold text-xs">
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

          // ================= CASO 3: HORARIO DISPONIBLE =================
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
                <span className="text-xs font-semibold text-[#94A3B8] group-hover:text-white transition-colors">
                  Disponible para cita
                </span>
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
                <span className="text-[#94A3B8]">Servicio:</span>
                <span className="text-[#76C81C] font-semibold">{appToCancel.serviceName}</span>
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
