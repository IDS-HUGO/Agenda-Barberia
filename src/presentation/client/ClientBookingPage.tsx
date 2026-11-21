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
import { addDays, format, getDay } from 'date-fns';
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
  const activeBarbers = (config.barbers || []).filter((b) => b.isActive);
  const activeBarbersCount = activeBarbers.length;

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
    const isSunday = getDay(nextDate) === 0;
    return { canonical, dayName, dayNumber, isSunday };
  });

  // Saber si el día seleccionado es Domingo
  const isSelectedDateSunday = getDay(parseCanonicalDate(selectedDate)) === 0;

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
      <div className="min-h-screen bg-[#090B0E] flex flex-col font-['Plus_Jakarta_Sans']">
        <Header />
        <main className="flex-1 py-8 px-4">
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

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-5 sm:py-8 space-y-6">
        
        {/* Banner Hero Institucional con Horarios */}
        <div className="relative text-center p-5 sm:p-7 rounded-3xl bg-gradient-to-b from-[#12161D] to-[#090B0E] border border-[#1F2937] shadow-xl overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#76C81C]/15 border border-[#76C81C]/35 text-[#8CE026] text-xs font-extrabold tracking-wide uppercase mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Citas al instante en tiempo real
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold text-[#F8FAFC] tracking-tight font-['Space_Grotesk'] leading-tight">
            Reserva tu Estilo en <br className="sm:hidden" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#76C81C] to-[#8CE026]">
              BARBER &amp; SHOPPING
            </span>
          </h2>
          
          <p className="text-xs sm:text-sm text-[#94A3B8] max-w-lg mx-auto mt-2">
            Selecciona tu servicio y aparta tu lugar con confirmación inmediata en pantalla.
          </p>

          {/* Horarios Oficiales Destacados */}
          <div className="mt-4 pt-4 border-t border-[#1F2937]/80 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#090B0E] border border-[#1F2937] text-[#D1D5DB]">
              <Clock className="w-3.5 h-3.5 text-[#76C81C]" />
              <span><strong>Lun a Sáb:</strong> 9:30 AM – 7:00 PM</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#090B0E] border border-[#1F2937] text-[#D1D5DB]">
              <Clock className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span><strong>Domingos:</strong> 9:30 AM – 3:00 PM</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#76C81C]/10 border border-[#76C81C]/30 text-[#8CE026] font-extrabold">
              <span>⚡ {activeBarbersCount} {activeBarbersCount === 1 ? 'Barbero' : 'Barberos'} en paralelo (40 min)</span>
            </div>
          </div>
        </div>

        {/* Indicador de 3 Pasos Lineales */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          <button
            onClick={() => setCurrentStep(1)}
            className={`min-h-[48px] px-2 py-3 rounded-2xl flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold border transition-all ${
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
            className={`min-h-[48px] px-2 py-3 rounded-2xl flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold border transition-all ${
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
            className={`min-h-[48px] px-2 py-3 rounded-2xl flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold border transition-all ${
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
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2 font-['Space_Grotesk']">
                <Scissors className="w-5 h-5 text-[#76C81C]" />
                1. Elige tu Servicio
              </h3>
              <span className="text-xs text-[#94A3B8]">Paso 1 de 3</span>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              {activeServices.map((service) => {
                const isSelected = selectedService?.id === service.id;
                return (
                  <div
                    key={service.id}
                    onClick={() => handleSelectService(service)}
                    className={`cursor-pointer p-4 sm:p-5 rounded-2xl border transition-all relative flex flex-col justify-between active:scale-[0.99] ${
                      isSelected
                        ? 'bg-[#1A202C] border-[#76C81C] shadow-[0_0_20px_rgba(118,200,28,0.2)]'
                        : 'bg-[#12161D] hover:bg-[#161D27] border-[#1F2937] hover:border-[#76C81C]/50'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-extrabold text-base sm:text-lg text-white font-['Space_Grotesk'] leading-snug">
                          {service.name}
                        </h4>
                        <div className="text-right shrink-0">
                          <span className="text-xl sm:text-2xl font-black text-[#76C81C]">
                            ${service.price}
                          </span>
                          <span className="block text-[10px] text-[#94A3B8] uppercase font-bold">MXN</span>
                        </div>
                      </div>
                      <p className="text-xs text-[#94A3B8] mt-2 leading-relaxed">
                        {service.description}
                      </p>
                    </div>

                    <div className="mt-4 sm:mt-5 pt-3 border-t border-[#1F2937] flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg bg-[#090B0E] text-[#D1D5DB] font-semibold border border-[#1F2937]">
                        <Clock className="w-3.5 h-3.5 text-[#76C81C]" />
                        {service.durationMinutes} min
                      </span>

                      <span className={`inline-flex items-center gap-1 font-extrabold px-2.5 sm:px-3 py-1.5 rounded-xl transition-all ${
                        isSelected
                          ? 'bg-[#76C81C] text-black shadow-sm'
                          : 'text-[#8CE026] bg-[#76C81C]/10 hover:bg-[#76C81C]/20'
                      }`}>
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
                <h3 className="text-lg font-extrabold text-white flex items-center gap-2 font-['Space_Grotesk']">
                  <CalendarIcon className="w-5 h-5 text-[#76C81C]" />
                  2. Elige Fecha y Horario
                </h3>
                {selectedService && (
                  <p className="text-xs text-[#8CE026] mt-0.5">
                    Servicio seleccionado: <strong className="text-white">{selectedService.name}</strong> (${selectedService.price} MXN • {selectedService.durationMinutes} min)
                  </p>
                )}
              </div>
              <button
                onClick={() => setCurrentStep(1)}
                className="text-xs text-[#94A3B8] hover:text-[#76C81C] underline font-semibold"
              >
                Cambiar servicio
              </button>
            </div>

            {/* Selector de Días Horizontal */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#D1D5DB] uppercase">Selecciona el día:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedDate(e.target.value);
                      setSelectedSlot(null);
                    }
                  }}
                  className="bg-[#090B0E] border border-[#1F2937] text-white text-base sm:text-xs px-2.5 py-1.5 rounded-xl outline-none"
                />
              </div>

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
                      className={`min-w-[84px] min-h-[58px] p-2 rounded-2xl flex flex-col items-center justify-center border transition-all shrink-0 ${
                        isSelected
                          ? 'bg-[#76C81C] text-black border-[#8CE026] shadow-md font-extrabold'
                          : 'bg-[#12161D] text-[#D1D5DB] border-[#1F2937] hover:bg-[#1A202C]'
                      }`}
                    >
                      <span className="text-xs uppercase font-extrabold">
                        {d.dayName} {d.isSunday ? '☀️' : ''}
                      </span>
                      <span className="text-sm font-bold">{d.dayNumber}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Banner Informativo del Horario del Día Seleccionado */}
            <div className="p-3.5 bg-[#12161D] border border-[#1F2937] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#76C81C]" />
                <span className="font-bold text-white text-sm">
                  {formatFriendlyDate(selectedDate)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[#94A3B8]">
                <Clock className="w-3.5 h-3.5 text-[#76C81C]" />
                <span>
                  {isSelectedDateSunday
                    ? 'Horario Domingo: 9:30 AM a 3:00 PM'
                    : 'Horario Lunes a Sábado: 9:30 AM a 7:00 PM'}
                </span>
              </div>
            </div>

            {/* Selector de Barbero */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-[#D1D5DB] flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#76C81C]" />
                  ¿Con quién te gustaría atenderte?
                </span>
                <span className="text-[#76C81C] font-semibold text-[11px]">{activeBarbersCount} {activeBarbersCount === 1 ? 'silla activa' : 'sillas en simultáneo'}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBarberId('any')}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center ${
                    selectedBarberId === 'any'
                      ? 'bg-[#76C81C] text-black border-[#8CE026] shadow-sm'
                      : 'bg-[#12161D] text-[#D1D5DB] border-[#1F2937] hover:bg-[#1A202C]'
                  }`}
                >
                  ⚡ Cualquiera libre
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

            {/* Grilla de Horarios (40 minutos por slot) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                <span>Horarios Disponibles ({slots.filter(s => s.status === 'available').length} libres):</span>
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
                  <p className="text-sm">Consultando disponibilidad de los 3 barberos...</p>
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
                          className={`min-h-[52px] p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center active:scale-95 ${
                            isSelected
                              ? 'bg-[#76C81C] text-black border-[#8CE026] shadow-lg shadow-[#76C81C]/25 font-bold scale-[1.02]'
                              : 'bg-[rgba(118,200,28,0.08)] border-dashed border-[rgba(118,200,28,0.5)] text-[#8CE026] hover:bg-[#76C81C]/20 hover:border-[#76C81C]'
                          }`}
                        >
                          <span className="text-sm font-black">
                            {minutesToTime12h(slot.startMinutes)}
                          </span>
                          <span className="text-[10px] uppercase font-bold tracking-wider mt-0.5 opacity-90">
                            {selectedBarberId === 'any'
                              ? `${slot.availableBarbersCount} ${slot.availableBarbersCount === 1 ? 'silla libre' : 'sillas libres'}`
                              : 'Disponible'}
                          </span>
                        </button>
                      );
                    }

                    // Estado: Ocupado
                    if (slot.status === 'occupied' || slot.status === 'blocked') {
                      return (
                        <div
                          key={slot.id}
                          className="min-h-[52px] p-2.5 rounded-2xl bg-[#131720] border border-[#262F3F] text-[#64748B] flex flex-col items-center justify-center opacity-70 cursor-not-allowed select-none"
                        >
                          <div className="flex items-center gap-1.5 text-xs font-semibold">
                            <Lock className="w-3.5 h-3.5 text-[#64748B]" />
                            <span>{minutesToTime12h(slot.startMinutes)}</span>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#475569]">
                            Agotado
                          </span>
                        </div>
                      );
                    }

                    // Estado: Insuficiente tiempo
                    if (slot.status === 'insufficient_time') {
                      return (
                        <div
                          key={slot.id}
                          title="No hay suficiente tiempo antes del cierre para este servicio"
                          className="min-h-[52px] p-2.5 rounded-2xl bg-[#131720]/50 border border-dashed border-[#1F2937] text-[#475569] flex flex-col items-center justify-center cursor-not-allowed select-none"
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
                        className="min-h-[52px] p-2.5 rounded-2xl bg-[#090B0E] border border-[#1F2937] text-[#334155] flex flex-col items-center justify-center cursor-not-allowed select-none"
                      >
                        <span className="text-xs font-semibold line-through">
                          {minutesToTime12h(slot.startMinutes)}
                        </span>
                        <span className="text-[9px] uppercase text-[#334155]">Concluido</span>
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
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2 font-['Space_Grotesk']">
                <CheckCircle className="w-5 h-5 text-[#76C81C]" />
                3. Tus Datos para Confirmar
              </h3>
              <button
                onClick={() => setCurrentStep(2)}
                className="text-xs text-[#94A3B8] hover:text-[#76C81C] underline font-semibold"
              >
                Cambiar horario
              </button>
            </div>

            {/* Resumen Compacto */}
            <div className="bg-[#12161D] border border-[#76C81C]/40 p-3.5 sm:p-5 rounded-2xl flex items-center justify-between shadow-[0_0_15px_rgba(118,200,28,0.1)] gap-3">
              <div>
                <p className="text-xs text-[#94A3B8] uppercase font-bold tracking-wider">Cita a Reservar:</p>
                <p className="text-lg font-extrabold text-white font-['Space_Grotesk'] mt-0.5">{selectedService.name}</p>
                <p className="text-xs text-[#8CE026] mt-0.5 font-bold">
                  {formatFriendlyDate(selectedDate)} a las {minutesToTime12h(selectedSlot.startMinutes)} ({selectedService.durationMinutes} min)
                </p>
                <p className="text-xs text-[#94A3B8] mt-1 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#76C81C]" />
                  Barbero Asignado: <span className="text-white font-bold">
                    {selectedBarberId === 'any'
                      ? `${selectedSlot.freeBarbers[0]?.name || 'Barbero de Guardia'}`
                      : (config.barbers.find((b) => b.id === selectedBarberId)?.name || 'Barbero')}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-[#76C81C]">
                  ${selectedService.price}
                </span>
                <span className="block text-[10px] text-[#94A3B8] font-bold">MXN</span>
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
                <p className="text-[11px] text-[#94A3B8] mt-1.5 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-[#76C81C]" />
                  Para enviarte el comprobante y recordatorio directo a tu WhatsApp.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#D1D5DB] mb-2">
                  Notas adicionales (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Prefiero degradado bajo con navaja"
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  className="w-full min-h-[48px] px-4 py-3 bg-[#12161D] border border-[#1F2937] focus:border-[#76C81C] rounded-2xl text-white outline-none text-base sm:text-sm placeholder-[#64748B]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[52px] mt-6 py-4 px-6 rounded-2xl font-black text-black bg-[#76C81C] hover:bg-[#8CE026] active:scale-[0.98] transition-all shadow-[0_0_25px_rgba(118,200,28,0.3)] disabled:opacity-50 text-base flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Confirmando Cita en Tiempo Real...</span>
                  </>
                ) : (
                  <span>Confirmar Cita — ${selectedService.price} MXN</span>
                )}
              </button>
            </form>
          </div>
        )}

      </main>

      {/* Footer Minimalista */}
      <footer className="py-6 border-t border-[#1F2937] text-center text-xs text-[#64748B]">
        <p>© {new Date().getFullYear()} BARBER Y SHOPPING — Todos los derechos reservados.</p>
        <p className="text-[11px] mt-1 text-[#475569]">
          Horarios: Lun-Sáb 9:30 AM - 7:00 PM | Dom 9:30 AM - 3:00 PM • {activeBarbersCount} {activeBarbersCount === 1 ? 'Barbero' : 'Barberos'} en paralelo • Tolerancia 10 min
        </p>
      </footer>
    </div>
  );
};
