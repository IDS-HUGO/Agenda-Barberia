import React, { useState } from 'react';
import { X, Users, UserPlus, CheckCircle2, Moon, Scissors, Trash2, Sparkles } from 'lucide-react';
import { Barber } from '../../domain/models';
import { useToast } from '../shared/ToastProvider';

interface BarberManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  barbers: Barber[];
  onToggleActive: (barberId: string) => Promise<void>;
  onAddBarber: (name: string, color?: string) => Promise<void>;
  onDeleteBarber: (barberId: string) => Promise<void>;
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
  onToggleActive,
  onAddBarber,
  onDeleteBarber
}) => {
  const { showToast } = useToast();
  const [newBarberName, setNewBarberName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0].hex);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const activeBarbers = (barbers || []).filter((b) => b.isActive);
  const restingBarbers = (barbers || []).filter((b) => !b.isActive);

  const handleToggle = async (b: Barber) => {
    // Si es el único activo y lo intenta desactivar, advertir
    if (b.isActive && activeBarbers.length <= 1) {
      showToast('Debe haber al menos 1 barbero activo para recibir citas.', 'error');
      return;
    }

    try {
      await onToggleActive(b.id);
      if (b.isActive) {
        showToast(`💈 ${b.name} ahora está en DESCANSO. No recibirá nuevas citas hoy.`, 'info');
      } else {
        showToast(`💈 ${b.name} ahora está ACTIVO y TRABAJANDO. Sus citas están abiertas.`, 'success');
      }
    } catch {
      showToast('Error al actualizar estado del barbero.', 'error');
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
      <div className="relative w-full max-w-lg bg-[#12161D] border border-[#76C81C]/40 rounded-3xl p-5 sm:p-7 shadow-[0_0_40px_rgba(118,200,28,0.15)] max-h-[90dvh] overflow-y-auto">
        
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#1A202C] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div className="pb-4 border-b border-[#1F2937] pr-8 sm:pr-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-[#76C81C]/15 border border-[#76C81C]/30 text-[#8CE026]">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-white font-['Space_Grotesk']">
              Equipo de Barberos y Turnos
            </h3>
          </div>
          <p className="text-xs text-[#94A3B8] mt-1">
            Activa o desactiva quién trabaja hoy. El sistema abrirá o cerrará automáticamente sus horarios para los clientes.
          </p>

          {/* Resumen de estado */}
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-xl bg-[#10B981]/15 text-[#10B981] font-bold border border-[#10B981]/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              {activeBarbers.length} {activeBarbers.length === 1 ? 'Trabajando hoy' : 'Trabajando hoy'}
            </span>
            {restingBarbers.length > 0 && (
              <span className="px-2.5 py-1 rounded-xl bg-amber-950/40 text-amber-400 font-bold border border-amber-800/40 flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5" />
                {restingBarbers.length} {restingBarbers.length === 1 ? 'En descanso' : 'En descanso'}
              </span>
            )}
          </div>
        </div>

        {/* Listado de Barberos */}
        <div className="my-5 space-y-3">
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
                          Trabaja Hoy
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-amber-950/60 text-amber-400 border border-amber-900/50 shrink-0">
                          Descansa Hoy
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      {isWorking
                        ? 'Recibiendo citas y turnos en vivo'
                        : 'Horarios ocultos al público'}
                    </p>
                  </div>
                </div>

                {/* Botón de Toggle Activo / Descanso */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggle(b)}
                    className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-black transition-all active:scale-95 flex items-center gap-1.5 ${
                      isWorking
                        ? 'bg-[#10B981] hover:bg-[#059669] text-black shadow-md'
                        : 'bg-[#1A202C] hover:bg-[#262F3F] text-amber-400 border border-amber-900/40'
                    }`}
                  >
                    {isWorking ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Activo</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-4 h-4" />
                        <span className="hidden sm:inline">Descanso</span>
                      </>
                    )}
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

        {/* Formulario para Agregar Nuevo Barbero */}
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
              className="w-full min-h-[46px] px-4 py-2.5 bg-[#090B0E] border border-[#1F2937] focus:border-[#76C81C] rounded-2xl text-white outline-none text-sm placeholder-[#64748B]"
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

      </div>
    </div>
  );
};
