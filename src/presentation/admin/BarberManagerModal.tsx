import React, { useState } from 'react';
import { X, Users, UserPlus, CheckCircle2, Moon, Scissors, Trash2, Calendar, AlertCircle, Send } from 'lucide-react';
import { Barber, BlockedSlot } from '../../domain/models';
import { useToast } from '../shared/ToastProvider';
import { formatFriendlyDate } from '../../domain/scheduleEngine';
import { TelegramService } from '../../infrastructure/telegramService';

interface BarberManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  barbers: Barber[];
  selectedDate?: string;
  blockedSlots?: BlockedSlot[];
  onToggleActive: (barberId: string) => Promise<void>;
  onAddBarber: (name: string, color?: string) => Promise<void>;
  onDeleteBarber: (barberId: string) => Promise<void>;
  onBlockSlot?: (startMinutes: number, durationMinutes: number, barberId?: string, reason?: string) => Promise<void>;
  onUnblockSlot?: (id: string) => Promise<void>;
}

const COLOR_PALETTE = [
  { name: 'Verde', hex: '#76C81C' },
  { name: 'Azul', hex: '#38BDF8' },
  { name: 'Ámbar', hex: '#F59E0B' },
  { name: 'Rosa', hex: '#EC4899' },
  { name: 'Morado', hex: '#A855F7' },
  { name: 'Esmeralda', hex: '#10B981' }
];

export const BarberManagerModal: React.FC<BarberManagerModalProps> = ({
  isOpen,
  onClose,
  barbers,
  selectedDate,
  blockedSlots = [],
  onToggleActive,
  onAddBarber,
  onDeleteBarber,
  onBlockSlot,
  onUnblockSlot
}) => {
  const { showToast } = useToast();
  const [newBarberName, setNewBarberName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0].hex);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado para descanso de fecha específica
  const [dayOffBarberId, setDayOffBarberId] = useState<string>(barbers[0]?.id || '');
  const [isBlockingDay, setIsBlockingDay] = useState(false);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);

  if (!isOpen) return null;

  const activeBarbers = (barbers || []).filter((b) => b.isActive);
  const activeDescansos = blockedSlots.filter((b) => !selectedDate || b.date === selectedDate);

  const handleToggle = async (b: Barber) => {
    // Si intenta desactivar globalmente, advertir que afecta a todas las fechas
    if (b.isActive) {
      const confirmDeactivate = confirm(
        `¿Estás seguro de desactivar a ${b.name} de TODO el sistema?\n\n` +
        `⚠️ ADVERTENCIA: Si solo descansa hoy o mañana, NO lo desactives aquí, ya que los clientes no podrán agendar con él en NINGÚN DÍA futuro.\n\n` +
        `¿Deseas desactivarlo de todas las fechas?`
      );
      if (!confirmDeactivate) return;
    }

    try {
      await onToggleActive(b.id);
      if (b.isActive) {
        showToast(`💈 ${b.name} desactivado del equipo.`, 'info');
      } else {
        showToast(`💈 ${b.name} ahora está ACTIVO en el equipo y recibe citas.`, 'success');
      }
    } catch {
      showToast('Error al actualizar estado del barbero.', 'error');
    }
  };

  const handleMarkDayOff = async () => {
    if (!onBlockSlot) return;
    const target = barbers.find((b) => b.id === dayOffBarberId) || barbers[0];
    if (!target) return;

    setIsBlockingDay(true);
    try {
      // Bloquear todo el día para este barbero (10 horas = 600 min a partir de 9:30 AM = 570)
      await onBlockSlot(570, 600, target.id, 'Descanso del día');
      showToast(`¡Descanso registrado para ${target.name} el día de hoy! Mañana seguirá recibiendo citas normalmente.`, 'success');
    } catch {
      showToast('Error al registrar descanso del día.', 'error');
    } finally {
      setIsBlockingDay(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBarberName.trim()) {
      showToast('Escribe el nombre del barbero.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddBarber(newBarberName.trim(), selectedColor);
      showToast(`¡Barbero ${newBarberName.trim()} agregado al equipo!`, 'success');
      setNewBarberName('');
    } catch {
      showToast('Error al agregar barbero.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (b: Barber) => {
    if (barbers.length <= 1) {
      showToast('No puedes eliminar al único barbero de la tienda.', 'error');
      return;
    }
    if (confirm(`¿Eliminar a ${b.name} del equipo de barberos?`)) {
      try {
        await onDeleteBarber(b.id);
        showToast(`Barbero ${b.name} eliminado.`, 'info');
      } catch {
        showToast('Error al eliminar barbero.', 'error');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#12161D] border border-[#76C81C]/40 rounded-3xl p-5 sm:p-7 shadow-[0_0_40px_rgba(118,200,28,0.15)] max-h-[90dvh] overflow-y-auto space-y-5">
        
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#1A202C] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div className="pb-3 border-b border-[#1F2937] pr-8 sm:pr-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-[#76C81C]/15 border border-[#76C81C]/30 text-[#8CE026]">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-white font-['Space_Grotesk']">
              Equipo Oficial de Barberos
            </h3>
          </div>
          <p className="text-xs text-[#94A3B8] mt-1">
            Todos los barberos activos aparecen en el catálogo para que los clientes puedan agendar con ellos hoy, mañana y fechas futuras.
          </p>

          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#10B981]/15 text-[#10B981] font-bold text-xs border border-[#10B981]/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{activeBarbers.length} barberos activos en la barbería</span>
          </div>
        </div>

        {/* SECCIÓN 1: DESCANSO DE UN SOLO DÍA (SIN ELIMINAR DEL SISTEMA) */}
        {onBlockSlot && (
          <div className="p-3.5 bg-[#090B0E] border border-[#F59E0B]/30 rounded-2xl space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#F59E0B] uppercase tracking-wider">
              <Calendar className="w-4 h-4" />
              <span>Marcar Descanso de un Solo Día ({selectedDate ? formatFriendlyDate(selectedDate) : 'Fecha actual'})</span>
            </div>
            <p className="text-[11px] text-[#94A3B8]">
              Si un barbero solo descansa hoy pero mañana sí trabaja, usa esta opción. Sus citas de mañana y días futuros quedarán 100% protegidas y abiertas.
            </p>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={dayOffBarberId}
                onChange={(e) => setDayOffBarberId(e.target.value)}
                className="flex-1 min-h-[44px] px-3.5 py-2 bg-[#12161D] border border-[#1F2937] focus:border-[#F59E0B] rounded-2xl text-white outline-none text-base sm:text-xs font-semibold"
              >
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    💈 {b.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={isBlockingDay}
                onClick={handleMarkDayOff}
                className="min-h-[44px] px-4 py-2 bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800/50 rounded-2xl text-xs font-bold transition-all shrink-0 active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Moon className="w-3.5 h-3.5" />
                <span>{isBlockingDay ? 'Registrando...' : 'Marcar Descanso Solo Esta Fecha'}</span>
              </button>
            </div>

            {/* Listado de descansos activos en esta fecha para poder revertir/quitar */}
            {activeDescansos.length > 0 && (
              <div className="pt-2.5 border-t border-[#1F2937] space-y-2">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                  Descansos registrados para esta fecha ({activeDescansos.length}):
                </span>
                <div className="space-y-1.5">
                  {activeDescansos.map((blk) => {
                    const bName = barbers.find((b) => b.id === blk.barberId)?.name || 'Todos los barberos';
                    return (
                      <div
                        key={blk.id}
                        className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#141923] border border-amber-900/30 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Moon className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-white font-bold">{bName}</span>
                          <span className="text-[10px] text-amber-400">({blk.reason || 'Descanso'})</span>
                        </div>
                        {onUnblockSlot && (
                          <button
                            type="button"
                            onClick={async () => {
                              await onUnblockSlot(blk.id);
                              showToast(`Descanso de ${bName} retirado. Ahora puede recibir citas.`, 'success');
                            }}
                            className="px-2.5 py-1 bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/50 rounded-lg text-[11px] font-bold transition-all"
                          >
                            Quitar descanso
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECCIÓN 2: LISTADO DE BARBEROS DEL EQUIPO */}
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#D1D5DB]">
            Barberos Registrados
          </label>

          {(barbers || []).map((b) => {
            const isWorking = b.isActive;
            return (
              <div
                key={b.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isWorking
                    ? 'bg-[#18202C] border-[#76C81C]/40 shadow-sm'
                    : 'bg-[#0E1218] border-[#1F2937] opacity-80'
                }`}
              >
                {/* Info Barbero */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 border"
                    style={{
                      backgroundColor: `${b.color || '#76C81C'}20`,
                      borderColor: b.color || '#76C81C',
                      color: b.color || '#76C81C'
                    }}
                  >
                    <Scissors className="w-4 h-4" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm sm:text-base text-white truncate">
                        {b.name}
                      </h4>
                      {isWorking ? (
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40 shrink-0">
                          Activo en Tienda
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-red-950/60 text-red-400 border border-red-900/50 shrink-0">
                          Inactivo / Baja
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      {isWorking
                        ? 'Clientes pueden agendar con él cualquier día'
                        : 'Oculto de todo el catálogo'}
                    </p>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggle(b)}
                    className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 ${
                      isWorking
                        ? 'bg-[#101E19] hover:bg-[#101E19]/80 text-[#10B981] border border-[#10B981]/50'
                        : 'bg-[#2A1215] hover:bg-[#2A1215]/80 text-red-400 border border-red-900/50'
                    }`}
                  >
                    {isWorking ? 'Activo' : 'Inactivo'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(b)}
                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-colors"
                    title={`Eliminar barbero ${b.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* SECCIÓN 3: AGREGAR NUEVO BARBERO */}
        <form onSubmit={handleAddSubmit} className="pt-4 border-t border-[#1F2937] space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#8CE026]">
            <UserPlus className="w-4 h-4" />
            <span>Agregar Nuevo Barbero al Equipo</span>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              required
              placeholder="Nombre del nuevo barbero (ej. Jose, Carlos)"
              value={newBarberName}
              onChange={(e) => setNewBarberName(e.target.value)}
              className="w-full min-h-[48px] px-4 py-2.5 bg-[#090B0E] border border-[#1F2937] focus:border-[#76C81C] rounded-2xl text-white outline-none text-base sm:text-sm placeholder-[#64748B]"
            />

            {/* Selector de color */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-[#94A3B8]">Color:</span>
              <div className="flex items-center gap-2">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setSelectedColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      selectedColor === c.hex ? 'scale-125 border-white shadow-lg' : 'border-transparent opacity-80'
                    }`}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[46px] py-3 px-4 rounded-2xl font-bold text-black bg-[#76C81C] hover:bg-[#8CE026] active:scale-[0.98] transition-all text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(118,200,28,0.25)] disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isSubmitting ? 'Guardando...' : '+ Agregar Barbero al Equipo'}</span>
          </button>
        </form>

        {/* SECCIÓN 3: NOTIFICACIONES AUTOMÁTICAS TELEGRAM */}
        <div className="p-3.5 bg-[#090B0E] border border-sky-500/30 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider">
              <Send className="w-4 h-4" />
              <span>Notificaciones Telegram</span>
            </div>
            <span className="text-[10px] bg-sky-950/80 text-sky-300 border border-sky-800/40 px-2 py-0.5 rounded-full font-bold">
              En Vivo
            </span>
          </div>
          <p className="text-[11px] text-[#94A3B8]">
            El bot <strong>@rf_barber_alertas_bot</strong> está conectado al grupo de Telegram. Cada cita agendada, cancelada o reprogramada se envía al instante con sonido y vibración al celular de los barberos.
          </p>
          <button
            type="button"
            disabled={isTestingTelegram}
            onClick={async () => {
              setIsTestingTelegram(true);
              const ok = await TelegramService.sendTestMessage();
              setIsTestingTelegram(false);
              if (ok) {
                showToast('🔔 ¡Alerta de prueba enviada con éxito al grupo de Telegram!', 'success');
              } else {
                showToast('No se pudo enviar la alerta de prueba a Telegram.', 'error');
              }
            }}
            className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-sky-950/60 hover:bg-sky-900/60 text-sky-300 border border-sky-800/50 text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isTestingTelegram ? 'Enviando alerta a Telegram...' : 'Enviar Alerta de Prueba a Telegram'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
