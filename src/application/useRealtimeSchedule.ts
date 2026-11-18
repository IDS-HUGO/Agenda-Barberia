import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Appointment,
  BlockedSlot,
  PublicSlot,
  ShopConfig,
  ServiceItem,
  AppointmentStatus
} from '../domain/models';
import {
  calculateScheduleSlots,
  generateFolio,
  getTodayCanonical,
  minutesToTime
} from '../domain/scheduleEngine';
import { AppointmentRepository } from '../infrastructure/appointmentRepository';
import { isFirebaseConfigured } from '../infrastructure/firebase';

/**
 * Sintetizador Web Audio API para alerta sonora cuando entra una nueva reserva.
 * 100% independiente de archivos externos MP3.
 */
export function playNotificationChime() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const playTone = (freq: number, delay: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      gain.gain.setValueAtTime(0.001, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + delay + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration);
    };

    // Tono futurista de dos notas ascendentes (Re5 -> La5)
    playTone(587.33, 0, 0.2);
    playTone(880.0, 0.14, 0.35);
  } catch {
    // Si la política de autoplay bloquea el audio, continúa sin fallar
  }
}

/**
 * Hook para la Vista Pública del Cliente
 */
export function useClientBooking(config: ShopConfig, defaultService?: ServiceItem) {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayCanonical());
  const [selectedService, setSelectedService] = useState<ServiceItem | undefined>(defaultService);
  const [occupiedSlots, setOccupiedSlots] = useState<{ startMinutes: number; endMinutes: number }[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Suscribirse a slots ocupados del día
  useEffect(() => {
    setIsLoading(true);
    const unsubOccupied = AppointmentRepository.subscribeToPublicOccupiedSlots(
      selectedDate,
      (list) => {
        setOccupiedSlots(list);
        setIsLoading(false);
      }
    );

    const unsubBlocked = AppointmentRepository.subscribeToBlockedSlots(
      selectedDate,
      (list) => {
        setBlockedSlots(list);
      }
    );

    return () => {
      unsubOccupied();
      unsubBlocked();
    };
  }, [selectedDate]);

  // Generar la grilla calculada
  const slots: PublicSlot[] = useMemo(() => {
    // Convertir occupiedSlots a appointments simulados para el cálculo matemático
    const simulatedAppointments: Appointment[] = occupiedSlots.map((s, idx) => ({
      id: `sim_${idx}`,
      folio: '',
      clientName: '',
      clientPhone: '',
      serviceId: '',
      serviceName: 'Ocupado',
      price: 0,
      durationMinutes: s.endMinutes - s.startMinutes,
      date: selectedDate,
      startTime: minutesToTime(s.startMinutes),
      endTime: minutesToTime(s.endMinutes),
      startMinutes: s.startMinutes,
      endMinutes: s.endMinutes,
      status: 'confirmed',
      source: 'client_web',
      createdAt: ''
    }));

    const duration = selectedService ? selectedService.durationMinutes : 30;
    return calculateScheduleSlots(
      selectedDate,
      config,
      simulatedAppointments,
      blockedSlots,
      duration
    );
  }, [selectedDate, config, occupiedSlots, blockedSlots, selectedService]);

  const confirmBooking = async (params: {
    clientName: string;
    clientPhone: string;
    slot: PublicSlot;
    notes?: string;
  }): Promise<{ success: boolean; appointment?: Appointment; error?: string }> => {
    if (!selectedService) {
      return { success: false, error: 'Por favor selecciona un servicio.' };
    }

    const folio = generateFolio();
    const duration = selectedService.durationMinutes;
    const startMinutes = params.slot.startMinutes;
    const endMinutes = startMinutes + duration;
    const startTime = minutesToTime(startMinutes);
    const endTime = minutesToTime(endMinutes);

    const newAppointment: Omit<Appointment, 'id'> = {
      folio,
      clientName: params.clientName.trim(),
      clientPhone: params.clientPhone.replace(/\D/g, ''),
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      price: selectedService.price,
      durationMinutes: duration,
      date: selectedDate,
      startTime,
      endTime,
      startMinutes,
      endMinutes,
      status: 'confirmed',
      source: 'client_web',
      notes: params.notes?.trim() || '',
      createdAt: new Date().toISOString()
    };

    return await AppointmentRepository.createAppointmentAtomic(newAppointment);
  };

  return {
    selectedDate,
    setSelectedDate,
    selectedService,
    setSelectedService,
    slots,
    isLoading,
    confirmBooking
  };
}

/**
 * Hook para el Panel de Administración del Barbero
 */
export function useBarberSchedule(config: ShopConfig) {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayCanonical());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('barber_sound_alerts');
    return saved !== null ? saved === 'true' : true;
  });
  const [isLoading, setIsLoading] = useState(true);

  // Rastrear citas previas para detectar nuevas y reproducir alerta
  const prevAppointmentsCountRef = useRef<number | null>(null);

  useEffect(() => {
    setIsLoading(true);
    prevAppointmentsCountRef.current = null;

    const unsubApp = AppointmentRepository.subscribeToAppointments(
      selectedDate,
      (list) => {
        // Alerta sonora si entra una nueva reserva web
        if (
          prevAppointmentsCountRef.current !== null &&
          list.length > prevAppointmentsCountRef.current
        ) {
          const hasNewWeb = list.some(
            (app) => app.source === 'client_web' && app.status === 'confirmed'
          );
          if (hasNewWeb && soundEnabled) {
            playNotificationChime();
          }
        }
        prevAppointmentsCountRef.current = list.length;
        setAppointments(list);
        setIsLoading(false);
      }
    );

    const unsubBlock = AppointmentRepository.subscribeToBlockedSlots(
      selectedDate,
      (list) => {
        setBlockedSlots(list);
      }
    );

    return () => {
      unsubApp();
      unsubBlock();
    };
  }, [selectedDate, soundEnabled]);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('barber_sound_alerts', String(next));
      if (next) playNotificationChime();
      return next;
    });
  };

  // Grilla combinada para el tablero del barbero
  const slots: PublicSlot[] = useMemo(() => {
    return calculateScheduleSlots(
      selectedDate,
      config,
      appointments,
      blockedSlots,
      30
    );
  }, [selectedDate, config, appointments, blockedSlots]);

  // Estadísticas del día
  const stats = useMemo(() => {
    const active = appointments.filter((a) => a.date === selectedDate);
    const confirmed = active.filter((a) => a.status === 'confirmed');
    const completed = active.filter((a) => a.status === 'completed');
    const cancelled = active.filter((a) => a.status === 'cancelled');

    // Los ingresos del día son citas completadas + confirmadas estimadas
    const totalRealRevenue = completed.reduce((sum, a) => sum + a.price, 0);
    const projectedRevenue = active
      .filter((a) => a.status !== 'cancelled')
      .reduce((sum, a) => sum + a.price, 0);

    return {
      total: active.length,
      confirmed: confirmed.length,
      completed: completed.length,
      cancelled: cancelled.length,
      totalRealRevenue,
      projectedRevenue
    };
  }, [appointments, selectedDate]);

  // Acciones
  const markAsCompleted = async (id: string) => {
    await AppointmentRepository.updateAppointmentStatus(id, selectedDate, 'completed');
  };

  const cancelAppointment = async (id: string) => {
    await AppointmentRepository.updateAppointmentStatus(id, selectedDate, 'cancelled');
  };

  const rescheduleAppointment = async (
    appointment: Appointment,
    newDate: string,
    newStartMinutes: number
  ) => {
    return await AppointmentRepository.rescheduleAppointment(
      appointment,
      newDate,
      newStartMinutes
    );
  };

  const createWalkIn = async (params: {
    clientName: string;
    clientPhone: string;
    service: ServiceItem;
    startMinutes: number;
    notes?: string;
  }): Promise<{ success: boolean; appointment?: Appointment; error?: string }> => {
    const folio = generateFolio();
    const duration = params.service.durationMinutes;
    const endMinutes = params.startMinutes + duration;

    const newApp: Omit<Appointment, 'id'> = {
      folio,
      clientName: params.clientName.trim(),
      clientPhone: params.clientPhone.replace(/\D/g, '') || '0000000000',
      serviceId: params.service.id,
      serviceName: params.service.name,
      price: params.service.price,
      durationMinutes: duration,
      date: selectedDate,
      startTime: minutesToTime(params.startMinutes),
      endTime: minutesToTime(endMinutes),
      startMinutes: params.startMinutes,
      endMinutes,
      status: 'confirmed',
      source: 'barber_manual',
      notes: params.notes?.trim() || '',
      createdAt: new Date().toISOString()
    };

    return await AppointmentRepository.createAppointmentAtomic(newApp);
  };

  const blockSlot = async (startMinutes: number, durationMinutes: number = 30, reason?: string) => {
    await AppointmentRepository.addBlockedSlot({
      date: selectedDate,
      startMinutes,
      endMinutes: startMinutes + durationMinutes,
      reason: reason || 'Bloqueo manual'
    });
  };

  const unblockSlot = async (id: string) => {
    await AppointmentRepository.removeBlockedSlot(id, selectedDate);
  };

  return {
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
    unblockSlot,
    isFirebaseConfigured
  };
}
