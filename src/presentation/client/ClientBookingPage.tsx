import React, { useState } from 'react';
import {
  Scissors,
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  CheckCircle,
  Lock,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  Info,
  Users
} from 'lucide-react';
import { useShopSettings } from '../../application/useShopSettings';
import { useClientBooking } from '../../application/useRealtimeSchedule';
import {
  Appointment,
  PublicSlot,
  ServiceItem
} from '../../domain/models';
import {
  dateToCanonical,
  formatFriendlyDate,
  getTodayCanonical,
  isValidMexicanPhone,
  minutesToTime12h,
  parseCanonicalDate
} from '../../domain/scheduleEngine';
import { addDays, format } from 'date-fns';
import { AppointmentRepository } from '../../infrastructure/appointmentRepository';
import { BookingReceipt } from './BookingReceipt';
import { useToast } from '../shared/ToastProvider';
import { Header } from '../shared/Header';

export const ClientBookingPage: React.FC = () => {
  const { config, services, isLoading: isLoadingSettings } = useShopSettings();
  const { showToast } = useToast();

  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);

  // Pasos de reserva (1: Servicio, 2: Horario, 3: Datos de Cliente)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Formulario de reserva
  const [selectedSlot, setSelectedSlot] = useState<PublicSlot | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hook del cliente
  const activeServices = services.filter((s) => s.isActive);
  const defaultService = activeServices[0];

  const {
    selectedDate,
    setSelectedDate,
    selectedService,
    setSelectedService,
    selectedBarberId,
    setSelectedBarberId,
    slots,
    isLoading: isLoadingSlots,
    confirmBooking
  } = useClientBooking(config, defaultService);

  // Generar los próximos 7 días para selección rápida
  const quickDays = Array.from({ length: 7 }, (_, i) => {
    const today = parseCanonicalDate(getTodayCanonical());
    const nextDate = addDays(today, i);
    const canonical = dateToCanonical(nextDate);
    const dayName = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : format(nextDate, 'EEE');
    const dayNumber = format(nextDate, 'd MMM');
    return { canonical, dayName, dayNumber };
  });

  const handleSelectService = (service: ServiceItem) => {
    setSelectedService(service);
    setSelectedSlot(null);
    setCurrentStep(2);
  };

  const handleSelectSlot = (slot: PublicSlot) => {
    if (slot.status !== 'available') return;
    setSelectedSlot(slot);
    setCurrentStep(3);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim() || clientName.trim().length < 2) {
      showToast('Por favor escribe tu nombre completo.', 'error');
      return;
    }

    if (!isValidMexicanPhone(clientPhone)) {
      showToast('Ingresa un número de WhatsApp válido de 10 dígitos.', 'error');
      return;
    }

    if (!selectedSlot) {
      showToast('Por favor selecciona un horario disponible.', 'error');
      return;
    }

    setIsSubmitting(true);
    const result = await confirmBooking({
      clientName,
      clientPhone,
      slot: selectedSlot,
      notes: clientNotes
    });
    setIsSubmitting(false);

    if (result.success && result.appointment) {
      setConfirmedAppointment(result.appointment);
      showToast('¡Cita confirmada exitosamente!', 'success');
    } else {
      showToast(result.error || 'Ocurrió un error al agendar tu cita.', 'error');
    }
  };

  const handleCancelBooking = async (id: string, date: string, folio: string): Promise<boolean> => {
    try {
      await AppointmentRepository.updateAppointmentStatus(id, date, 'cancelled', folio);
      showToast('Tu cita ha sido cancelada y el horario fue liberado.', 'info');
      return true;
    } catch (err: any) {
      showToast('No se pudo cancelar la cita. Por favor comunícate con la barbería.', 'error');
      return false;
    }
  };

  if (confirmedAppointment) {
    return (
      <div className="min-h-screen bg-[#090B0E] flex flex-col">
        <Header />
        <main className="flex-1 py-8">
          <BookingReceipt
            appointment={confirmedAppointment}
            shopConfig={config}
            onCancelBooking={handleCancelBooking}
            onNewBooking={() => {
              setConfirmedAppointment(null);
              setSelectedSlot(null);
              setCurrentStep(1);
            }}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090B0E] flex flex-col font-['Plus_Jakarta_Sans']">
      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 sm:py-10">
        
        {/* Banner Hero Institucional */}
        <div className="relative mb-6 sm:mb-8 text-center p-5 sm:p-6 rounded-3xl bg-gradient-to-b from-[#12161D] to-[#090B0E] border border-[#1F2937] shadow-xl overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#76C81C]/10 border border-[#76C81C]/30 text-[#8CE026] text-xs font-bold tracking-wide uppercase mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Citas al instante sin registro
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[#F8FAFC] tracking-tight font-['Space_Grotesk'] leading-tight">
            Reserva tu Estilo en <br className="sm:hidden" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#76C81C] to-[#8CE026]">
              BARBER &amp; SHOPPING
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-[#94A3B8] max-w-md mx-auto mt-2">
            Selecciona tu servicio y horario ideal. Tu lugar queda apartado en tiempo real.
          </p>
        </div>

        {/* Indicador de 3 Pasos Lineales (Ley de Hick) */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-6 sm:mb-8">
          <button
            onClick={() => setCurrentStep(1)}
            className={`min-h-[48px] px-1 sm:px-2 py-2.5 sm:py-3 rounded-2xl flex items-center justify-center gap-1 sm:gap-2 text-[11px] sm:text-sm font-bold border transition-all ${
              currentStep === 1
                ? 'bg-[#76C81C] text-black border-[#8CE026] shadow-lg shadow-[#76C81C]/20'
                : selectedService
                ? 'bg-[#12161D] text-[#8CE026] border-[#1F2937]'
                : 'bg-[#12161D] text-[#94A3B8] border-[#1F2937]'
            }`}
          >
            <span>1. Servicio</span>
          </button>

          <button
            onClick={() => selectedService && setCurrentStep(2)}
            disabled={!selectedService}
            className={`min-h-[48px] px-1 sm:px-2 py-2.5 sm:py-3 rounded-2xl flex items-center justify-center gap-1 sm:gap-2 text-[11px] sm:text-sm font-bold border transition-all ${
              currentStep === 2
                ? 'bg-[#76C81C] text-black border-[#8CE026] shadow-lg shadow-[#76C81C]/20'
                : selectedSlot
                ? 'bg-[#12161D] text-[#8CE026] border-[#1F2937]'
                : 'bg-[#12161D] text-[#94A3B8] border-[#1F2937] opacity-60'
            }`}
          >
            <span>2. Horario</span>
          </button>

          <button
            onClick={() => selectedSlot && setCurrentStep(3)}
            disabled={!selectedSlot}
            className={`min-h-[48px] px-1 sm:px-2 py-2.5 sm:py-3 rounded-2xl flex items-center justify-center gap-1 sm:gap-2 text-[11px] sm:text-sm font-bold border transition-all ${
              currentStep === 3
                ? 'bg-[#76C81C] text-black border-[#8CE026] shadow-lg shadow-[#76C81C]/20'
                : 'bg-[#12161D] text-[#94A3B8] border-[#1F2937] opacity-60'
            }`}
          >
            <span>3. Confirmar</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* PASO 1: SELECCIÓN DE SERVICIO */}
        {/* ======================================================== */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Scissors className="w-5 h-5 text-[#76C81C]" />
                1. Elige tu Servicio
              </h3>
              <span className="text-xs text-[#94A3B8]">Paso 1 de 3</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {activeServices.map((service) => {
                const isSelected = selectedService?.id === service.id;
                return (
                  <div
                    key={service.id}
                    onClick={() => handleSelectService(service)}
                    className={`cursor-pointer p-5 rounded-2xl border transition-all relative ${
                      isSelected
                        ? 'bg-[#1A202C] border-[#76C81C] shadow-[0_0_20px_rgba(118,200,28,0.18)]'
                        : 'bg-[#12161D] hover:bg-[#1A202C] border-[#1F2937]'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <h4 className="font-bold text-base text-white">{service.name}</h4>
                        <p className="text-xs text-[#94A3B8] mt-1 line-clamp-2">
                          {service.description}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-lg font-extrabold text-[#76C81C]">
                          ${service.price}
                        </span>
                        <span className="block text-[11px] text-[#94A3B8] uppercase">MXN</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#1F2937] flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#090B0E] text-[#D1D5DB] font-medium border border-[#1F2937]">
                        <Clock className="w-3.5 h-3.5 text-[#76C81C]" />
                        {service.durationMinutes} min
                      </span>

                      <span className="inline-flex items-center gap-1 text-[#8CE026] font-bold">
                        {isSelected ? 'Seleccionado' : 'Elegir'}
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PASO 2: SELECCIÓN DE FECHA Y HORARIO */}
        {/* ======================================================== */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-[#76C81C]" />
                  2. Elige Fecha y Horario
                </h3>
                {selectedService && (
                  <p className="text-xs text-[#8CE026] mt-0.5">
                    Servicio: <span className="font-bold text-white">{selectedService.name}</span> ({selectedService.durationMinutes} min)
                  </p>
                )}
              </div>
              <button
                onClick={() => setCurrentStep(1)}
                className="text-xs text-[#94A3B8] hover:text-[#76C81C] underline"
              >
                Cambiar servicio
              </button>
            </div>

            {/* Selector de Días Horizontal */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {quickDays.map((d) => {
                const isSelected = selectedDate === d.canonical;
                return (
                  <button
                    key={d.canonical}
                    type="button"
                    onClick={() => {
                      setSelectedDate(d.canonical);
                      setSelectedSlot(null);
                    }}
                    className={`min-w-[80px] min-h-[58px] p-2 rounded-2xl flex flex-col items-center justify-center border transition-all shrink-0 ${
                      isSelected
                        ? 'bg-[#76C81C] text-black border-[#8CE026] shadow-md font-extrabold'
                        : 'bg-[#12161D] text-[#D1D5DB] border-[#1F2937] hover:bg-[#1A202C]'
                    }`}
                  >
                    <span className="text-xs uppercase">{d.dayName}</span>
                    <span className="text-sm font-bold">{d.dayNumber}</span>
                  </button>
                );
              })}
            </div>

            {/* Fecha formateada y horario del día */}
            <div className="p-3 bg-[#12161D] border border-[#1F2937] rounded-2xl flex items-center justify-between text-xs sm:text-sm">
              <span className="text-[#94A3B8]">Día:</span>
              <span className="font-bold text-white">{formatFriendlyDate(selectedDate)}</span>
            </div>

            {/* Selector de Barbero */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-[#D1D5DB] flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#76C81C]" />
                  ¿Con quién te gustaría cortarte?
                </span>
                <span className="text-[#76C81C] font-semibold text-[11px]">3 sillas en simultáneo</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBarberId('any')}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center ${
                    selectedBarberId === 'any'
                      ? 'bg-[#76C81C] text-black border-[#8CE026] shadow-sm'
                      : 'bg-[#12161D] text-[#D1D5DB] border-[#1F2937] hover:bg-[#1A202C]'
                  }`}
                >
                  ⚡ Primer libre
                </button>
                {(config.barbers || []).filter((b) => b.isActive).map((barber) => (
                  <button
                    key={barber.id}
                    type="button"
                    onClick={() => setSelectedBarberId(barber.id)}
                    className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center ${
                      selectedBarberId === barber.id
                        ? 'bg-[#76C81C] text-black border-[#8CE026] shadow-sm'
                        : 'bg-[#12161D] text-[#D1D5DB] border-[#1F2937] hover:bg-[#1A202C]'
                    }`}
                  >
                    💈 {barber.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Grilla de Horarios */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                <span>Horarios Disponibles para esta fecha:</span>
                <span className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#76C81C]" />
                    Libre
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#262F3F]" />
                    Ocupado
                  </span>
                </span>
              </div>

              {isLoadingSlots ? (
                <div className="py-12 text-center text-[#94A3B8]">
                  <div className="inline-block w-8 h-8 border-2 border-[#76C81C] border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-sm">Consultando disponibilidad en vivo...</p>
                </div>
              ) : slots.length === 0 ? (
                <div className="p-8 text-center bg-[#12161D] border border-[#1F2937] rounded-3xl text-[#94A3B8]">
                  <AlertTriangle className="w-8 h-8 text-[#F59E0B] mx-auto mb-2" />
                  <p className="font-semibold text-white">No hay turnos disponibles para esta fecha.</p>
                  <p className="text-xs mt-1">Intenta seleccionando otro día en el calendario superior.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {slots.map((slot) => {
                    const isSelected = selectedSlot?.id === slot.id;

                    // Estado: Disponible
                    if (slot.status === 'available') {
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => handleSelectSlot(slot)}
                          className={`min-h-[48px] p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center ${
                            isSelected
                              ? 'bg-[#76C81C] text-black border-[#8CE026] shadow-lg shadow-[#76C81C]/25 font-bold scale-[1.02]'
                              : 'bg-[rgba(118,200,28,0.08)] border-dashed border-[rgba(118,200,28,0.5)] text-[#8CE026] hover:bg-[#76C81C]/20 hover:border-[#76C81C]'
                          }`}
                        >
                          <span className="text-sm font-extrabold">
                            {minutesToTime12h(slot.startMinutes)}
                          </span>
                          <span className="text-[10px] uppercase font-bold tracking-wider mt-0.5 opacity-90">
                            {selectedBarberId === 'any'
                              ? `${slot.availableBarbersCount} ${slot.availableBarbersCount === 1 ? 'barbero libre' : 'barberos libres'}`
                              : 'Disponible'}
                          </span>
                        </button>
                      );
                    }

                    // Estado: Ocupado (Zero-Leak de datos de otros clientes)
                    if (slot.status === 'occupied' || slot.status === 'blocked') {
                      return (
                        <div
                          key={slot.id}
                          className="min-h-[48px] p-3 rounded-2xl bg-[#131720] border border-[#262F3F] text-[#64748B] flex flex-col items-center justify-center opacity-70 cursor-not-allowed select-none"
                        >
                          <div className="flex items-center gap-1.5 text-xs font-semibold">
                            <Lock className="w-3.5 h-3.5 text-[#64748B]" />
                            <span>{minutesToTime12h(slot.startMinutes)}</span>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#475569]">
                            Ocupado
                          </span>
                        </div>
                      );
                    }

                    // Estado: Insuficiente tiempo
                    if (slot.status === 'insufficient_time') {
                      return (
                        <div
                          key={slot.id}
                          title="No hay suficiente tiempo antes de la siguiente cita o del cierre para este servicio"
                          className="min-h-[48px] p-3 rounded-2xl bg-[#131720]/50 border border-dashed border-[#1F2937] text-[#475569] flex flex-col items-center justify-center cursor-not-allowed select-none"
                        >
                          <span className="text-xs font-semibold line-through">
                            {minutesToTime12h(slot.startMinutes)}
                          </span>
                          <span className="text-[9px] uppercase tracking-tighter text-[#64748B]">
                            Sin tiempo
                          </span>
                        </div>
                      );
                    }

                    // Estado: Pasado
                    return (
                      <div
                        key={slot.id}
                        className="min-h-[48px] p-3 rounded-2xl bg-[#090B0E] border border-[#1F2937] text-[#334155] flex flex-col items-center justify-center cursor-not-allowed select-none"
                      >
                        <span className="text-xs font-semibold line-through">
                          {minutesToTime12h(slot.startMinutes)}
                        </span>
                        <span className="text-[9px] uppercase text-[#334155]">Pasado</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PASO 3: CONFIRMACIÓN Y DATOS DEL CLIENTE */}
        {/* ======================================================== */}
        {currentStep === 3 && selectedSlot && selectedService && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-[#76C81C]" />
                3. Tus Datos para Confirmar
              </h3>
              <button
                onClick={() => setCurrentStep(2)}
                className="text-xs text-[#94A3B8] hover:text-[#76C81C] underline"
              >
                Cambiar horario
              </button>
            </div>

            {/* Resumen Compacto */}
            <div className="bg-[#12161D] border border-[#76C81C]/40 p-4 rounded-2xl flex items-center justify-between shadow-[0_0_15px_rgba(118,200,28,0.1)]">
              <div>
                <p className="text-xs text-[#94A3B8]">Servicio y horario apartado:</p>
                <p className="text-base font-bold text-white">{selectedService.name}</p>
                <p className="text-xs text-[#8CE026] mt-0.5">
                  {formatFriendlyDate(selectedDate)} a las {minutesToTime12h(selectedSlot.startMinutes)}
                </p>
                <p className="text-xs text-[#94A3B8] mt-1 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#76C81C]" />
                  Barbero: <span className="text-white font-semibold">
                    {selectedBarberId === 'any'
                      ? `${selectedSlot.freeBarbers[0]?.name || 'Barbero 1'} (Asignado)`
                      : (config.barbers.find((b) => b.id === selectedBarberId)?.name || 'Barbero')}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <span className="text-xl font-extrabold text-[#76C81C]">
                  ${selectedService.price}
                </span>
                <span className="block text-[10px] text-[#94A3B8]">MXN</span>
              </div>
            </div>

            {/* Formulario */}
            <form onSubmit={handleFinalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#D1D5DB] mb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#76C81C]" />
                  Tu Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Carlos Pérez"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full min-h-[48px] px-4 py-3 bg-[#12161D] border border-[#1F2937] focus:border-[#76C81C] focus:ring-1 focus:ring-[#76C81C] rounded-2xl text-white outline-none text-base placeholder-[#64748B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#D1D5DB] mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#76C81C]" />
                  WhatsApp (10 dígitos) *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="Ej. 5512345678"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full min-h-[48px] px-4 py-3 bg-[#12161D] border border-[#1F2937] focus:border-[#76C81C] focus:ring-1 focus:ring-[#76C81C] rounded-2xl text-white outline-none font-mono text-base placeholder-[#64748B]"
                />
                <p className="text-[11px] text-[#94A3B8] mt-1 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-[#76C81C]" />
                  Para enviarte el recordatorio directo a tu WhatsApp.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#D1D5DB] mb-2">
                  Notas adicionales (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Prefiero máquina al cero en los costados"
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  className="w-full min-h-[48px] px-4 py-3 bg-[#12161D] border border-[#1F2937] focus:border-[#76C81C] rounded-2xl text-white outline-none text-sm placeholder-[#64748B]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[48px] mt-6 py-4 px-6 rounded-2xl font-extrabold text-black bg-[#76C81C] hover:bg-[#8CE026] active:scale-[0.98] transition-all shadow-[0_0_25px_rgba(118,200,28,0.3)] disabled:opacity-50 text-base"
              >
                {isSubmitting ? 'Confirmando Cita Atómicamente...' : 'Confirmar Cita Ahora'}
              </button>
            </form>
          </div>
        )}

      </main>

      {/* Footer Minimalista */}
      <footer className="py-6 border-t border-[#1F2937] text-center text-xs text-[#64748B]">
        <p>© {new Date().getFullYear()} BARBER Y SHOPPING — Todos los derechos reservados.</p>
        <p className="text-[11px] mt-1 text-[#475569]">
          Privacidad Zero-Leak garantizada • Concurrencia Atómica en Tiempo Real
        </p>
      </footer>
    </div>
  );
};
