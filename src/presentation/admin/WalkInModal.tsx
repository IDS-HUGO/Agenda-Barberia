import React, { useState } from 'react';
import { X, UserPlus, Ban, Clock, Scissors, Calendar, Users } from 'lucide-react';
import { PublicSlot, ServiceItem, Barber, DEFAULT_BARBERS } from '../../domain/models';
import { minutesToTime12h, getScheduleHoursForDate } from '../../domain/scheduleEngine';
import { useToast } from '../shared/ToastProvider';

interface WalkInModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  services: ServiceItem[];
  barbers: Barber[];
  preselectedSlot?: PublicSlot | null;
  onCreateWalkIn: (params: {
    clientName: string;
    clientPhone: string;
    service: ServiceItem;
    barber: Barber;
    startMinutes: number;
    notes?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  onBlockSlot: (startMinutes: number, durationMinutes: number, barberId?: string, reason?: string) => Promise<void>;
}

export const WalkInModal: React.FC<WalkInModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  services,
  barbers,
  preselectedSlot,
  onCreateWalkIn,
  onBlockSlot
}) => {
  const { showToast } = useToast();
  const [mode, setMode] = useState<'walkin' | 'block'>('walkin');

  const activeBarbers = (barbers && barbers.length > 0 ? barbers : DEFAULT_BARBERS).filter((b) => b.isActive);

  // WalkIn State
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>(services[0]?.id || '');
  const [selectedBarberId, setSelectedBarberId] = useState<string>(activeBarbers[0]?.id || 'barber-1');
  const [startMinutes, setStartMinutes] = useState<number>(
    preselectedSlot ? preselectedSlot.startMinutes : 570 // 09:30 AM
  );
  const [notes, setNotes] = useState('');

  // Block State
  const [blockDuration, setBlockDuration] = useState<number>(40);
  const [blockBarberId, setBlockBarberId] = useState<string>('all');
  const [blockReason, setBlockReason] = useState<string>('Comida / Descanso');

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Generar lista de horarios desde las 09:30 hasta las 19:00 en intervalos de 40 min
  const timeOptions = Array.from({ length: 16 }, (_, i) => 570 + i * 40).filter((mins) => mins < 1140);

  const handleWalkInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      showToast('Ingresa el nombre del cliente.', 'error');
      return;
    }

    const service = services.find((s) => s.id === selectedServiceId) || services[0];
    const barber = activeBarbers.find((b) => b.id === selectedBarberId) || activeBarbers[0];

    setIsSubmitting(true);
    const res = await onCreateWalkIn({
      clientName,
      clientPhone: clientPhone.trim() || '0000000000',
      service,
      barber,
      startMinutes,
      notes
    });
    setIsSubmitting(false);

    if (res.success) {
      showToast('Cita manual registrada en el tablero.', 'success');
      onClose();
    } else {
      showToast(res.error || 'Error al agendar cita manual.', 'error');
    }
  };

  const handleBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const targetBarber = blockBarberId === 'all' ? undefined : blockBarberId;
    await onBlockSlot(startMinutes, blockDuration, targetBarber, blockReason);
    setIsSubmitting(false);
    showToast('Horario bloqueado exitosamente.', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#12161D] border border-[#1F2937] rounded-3xl p-5 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#1A202C] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tabs de Modo */}
        <div className="grid grid-cols-2 gap-2 bg-[#090B0E] p-1.5 rounded-2xl mb-6 border border-[#1F2937]">
          <button
            type="button"
            onClick={() => setMode('walkin')}
            className={`min-h-[44px] py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              mode === 'walkin'
                ? 'bg-[#1A202C] text-[#8CE026] shadow-sm'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Cita Manual / Walk-in
          </button>

          <button
            type="button"
            onClick={() => setMode('block')}
            className={`min-h-[44px] py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              mode === 'block'
                ? 'bg-[#1A202C] text-[#EF4444] shadow-sm'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <Ban className="w-4 h-4" />
            Bloquear Horario
          </button>
        </div>

        {/* ======================= MODO WALKIN ======================= */}
        {mode === 'walkin' && (
          <form onSubmit={handleWalkInSubmit} className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 font-['Space_Grotesk']">
              <UserPlus className="w-5 h-5 text-[#76C81C]" />
              Nueva Cita de Barbero
            </h3>

            <div>
              <label className="block text-xs font-bold uppercase text-[#D1D5DB] mb-1.5">
                Nombre del Cliente *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Roberto Martínez"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full min-h-[48px] px-4 py-3 bg-[#090B0E] border border-[#1F2937] focus:border-[#76C81C] rounded-2xl text-white outline-none text-sm placeholder-[#64748B]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-[#D1D5DB] mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#76C81C]" />
                  Barbero Asignado
                </label>
                <select
                  value={selectedBarberId}
                  onChange={(e) => setSelectedBarberId(e.target.value)}
                  className="w-full min-h-[48px] px-3 py-2 bg-[#090B0E] border border-[#1F2937] focus:border-[#76C81C] rounded-2xl text-white outline-none text-xs sm:text-sm font-semibold"
                >
                  {activeBarbers.map((b) => (
                    <option key={b.id} value={b.id}>
                      💈 {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#D1D5DB] mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#76C81C]" />
                  Hora de Inicio
                </label>
                <select
                  value={startMinutes}
                  onChange={(e) => setStartMinutes(Number(e.target.value))}
                  className="w-full min-h-[48px] px-3 py-2 bg-[#090B0E] border border-[#1F2937] focus:border-[#76C81C] rounded-2xl text-white outline-none text-xs sm:text-sm"
                >
                  {timeOptions.map((mins) => (
                    <option key={mins} value={mins}>
                      {minutesToTime12h(mins)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[#D1D5DB] mb-1.5 flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5 text-[#76C81C]" />
                Servicio
              </label>
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full min-h-[48px] px-3 py-2 bg-[#090B0E] border border-[#1F2937] focus:border-[#76C81C] rounded-2xl text-white outline-none text-xs sm:text-sm"
              >
                {services.map((srv) => (
                  <option key={srv.id} value={srv.id}>
                    {srv.name} — ${srv.price} MXN ({srv.durationMinutes} min)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[#D1D5DB] mb-1.5">
                Teléfono / WhatsApp (Opcional)
              </label>
              <input
                type="tel"
                maxLength={10}
                placeholder="5512345678"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full min-h-[48px] px-4 py-3 bg-[#090B0E] border border-[#1F2937] focus:border-[#76C81C] rounded-2xl text-white outline-none font-mono text-sm placeholder-[#64748B]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[#D1D5DB] mb-1.5">
                Notas / Especificaciones (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej. Pagó en efectivo / Viene por recomendación"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full min-h-[48px] px-4 py-3 bg-[#090B0E] border border-[#1F2937] focus:border-[#76C81C] rounded-2xl text-white outline-none text-sm placeholder-[#64748B]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[48px] mt-2 py-3 px-6 rounded-2xl font-bold text-black bg-[#76C81C] hover:bg-[#8CE026] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(118,200,28,0.25)] text-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando Cita...' : 'Registrar Cita en el Tablero'}
            </button>
          </form>
        )}

        {/* ======================= MODO BLOQUEO ======================= */}
        {mode === 'block' && (
          <form onSubmit={handleBlockSubmit} className="space-y-4">
            <h3 className="text-lg font-bold text-[#EF4444] flex items-center gap-2 font-['Space_Grotesk']">
              <Ban className="w-5 h-5" />
              Bloquear Horario de Atención
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-[#D1D5DB] mb-1.5">
                  ¿A quién bloquear?
                </label>
                <select
                  value={blockBarberId}
                  onChange={(e) => setBlockBarberId(e.target.value)}
                  className="w-full min-h-[48px] px-3 py-2 bg-[#090B0E] border border-[#1F2937] focus:border-[#EF4444] rounded-2xl text-white outline-none text-xs"
                >
                  <option value="all">A todos los barberos</option>
                  {activeBarbers.map((b) => (
                    <option key={b.id} value={b.id}>
                      Solo a {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#D1D5DB] mb-1.5">
                  Hora de Inicio
                </label>
                <select
                  value={startMinutes}
                  onChange={(e) => setStartMinutes(Number(e.target.value))}
                  className="w-full min-h-[48px] px-3 py-2 bg-[#090B0E] border border-[#1F2937] focus:border-[#EF4444] rounded-2xl text-white outline-none text-xs"
                >
                  {timeOptions.map((mins) => (
                    <option key={mins} value={mins}>
                      {minutesToTime12h(mins)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[#D1D5DB] mb-1.5">
                Duración del Bloqueo
              </label>
              <select
                value={blockDuration}
                onChange={(e) => setBlockDuration(Number(e.target.value))}
                className="w-full min-h-[48px] px-3 py-2 bg-[#090B0E] border border-[#1F2937] focus:border-[#EF4444] rounded-2xl text-white outline-none text-sm"
              >
                <option value={40}>40 minutos (1 turno)</option>
                <option value={80}>1 hora 20 min (2 turnos)</option>
                <option value={120}>2 horas (Comida)</option>
                <option value={240}>4 horas (Medio turno)</option>
                <option value={600}>Día completo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[#D1D5DB] mb-1.5">
                Motivo del Bloqueo
              </label>
              <input
                type="text"
                required
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Ej. Hora de Comida, Trámite personal"
                className="w-full min-h-[48px] px-4 py-3 bg-[#090B0E] border border-[#1F2937] focus:border-[#EF4444] rounded-2xl text-white outline-none text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[48px] mt-2 py-3 px-6 rounded-2xl font-bold text-white bg-[#DC2626] hover:bg-[#EF4444] active:scale-[0.98] transition-all shadow-lg shadow-[#DC2626]/20 text-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Bloqueando...' : 'Confirmar Bloqueo de Horario'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
