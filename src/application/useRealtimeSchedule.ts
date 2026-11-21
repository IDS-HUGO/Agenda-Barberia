import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Appointment,
  BlockedSlot,
  PublicSlot,
  ShopConfig,
  ServiceItem,
  Barber,
  DEFAULT_BARBERS
} from '../domain/models';
import {
  calculateScheduleSlots,
  generateFolio,
  getTodayCanonical,
  minutesToTime,
  getCurrentDayMinutes
} from '../domain/scheduleEngine';
import { AppointmentRepository } from '../infrastructure/appointmentRepository';
import { isFirebaseConfigured } from '../infrastructure/firebase';

/**
 * Sintetizador Web Audio API: Alerta de NUEVA RESERVA WEB (Din-don-dan alegre)
 */
export function playNewBookingChime() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const playTone = (freq: number, start: number, duration: number, gainVal = 0.35) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(gainVal, ctx.currentTime + start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    // Arpegio mayor alegre C5 -> E5 -> G5 -> C6
    playTone(523.25, 0, 0.22, 0.35);
    playTone(659.25, 0.12, 0.22, 0.35);
    playTone(783.99, 0.24, 0.26, 0.4);
    playTone(1046.50, 0.38, 0.55, 0.45);
  } catch {
    // Autoplay policy bypass
  }
}

/**
 * Sintetizador Web Audio API: Alerta de CITA COMENZANDO AHORA (Campana doble)
 */
export function playAppointmentStartChime() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    // Doble campana de aviso de inicio de turno
    playTone(880.0, 0, 0.35);
    playTone(880.0, 0.26, 0.55);
  } catch {
    // Autoplay policy bypass
  }
}

export const playNotificationChime = playNewBookingChime;

/**
 * Hook para la Vista Pública del Cliente (Soporte Multi-Barbero)
 */
export function useClientBooking(config: ShopConfig, defaultService?: ServiceItem) {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayCanonical());
  const [selectedService, setSelectedService] = useState<ServiceItem | undefined>(defaultService);
  const [selectedBarberId, setSelectedBarberId] = useState<string>('any'); // 'any' o id específico
  const [occupiedSlots, setOccupiedSlots] = useState<{ startMinutes: number; endMinutes: number; barberId: string }[]>([]);
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

  // Generar la grilla calculada multi-barbero
  const slots: PublicSlot[] = useMemo(() => {
    const simulatedAppointments: Appointment[] = occupiedSlots.map((s, idx) => ({
      id: `sim_${idx}`,
      folio: '',
      clientName: '',
      clientPhone: '',
      serviceId: '',
      serviceName: 'Ocupado',
      price: 0,
      durationMinutes: s.endMinutes - s.startMinutes,
      barberId: s.barberId,
      barberName: '',
      date: selectedDate,
      startTime: minutesToTime(s.startMinutes),
      endTime: minutesToTime(s.endMinutes),
      startMinutes: s.startMinutes,
      endMinutes: s.endMinutes,
      status: 'confirmed',
      source: 'client_web',
      createdAt: ''
    }));

    const duration = selectedService ? selectedService.durationMinutes : 40;
    const filterBarber = selectedBarberId === 'any' ? undefined : selectedBarberId;

    return calculateScheduleSlots(
      selectedDate,
      config,
      simulatedAppointments,
      blockedSlots,
      duration,
      filterBarber
    );
  }, [selectedDate, config, occupiedSlots, blockedSlots, selectedService, selectedBarberId]);

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

    // Asignación de Barbero:
    // Si eligió 'any', tomar el primer barbero libre en este slot. Si eligió uno en particular, usar ese.
    let assignedBarber: Barber;
    if (selectedBarberId !== 'any') {
      const match = config.barbers.find((b) => b.id === selectedBarberId);
      assignedBarber = match || params.slot.freeBarbers[0] || DEFAULT_BARBERS[0];
    } else {
      assignedBarber = params.slot.freeBarbers[0] || config.barbers[0] || DEFAULT_BARBERS[0];
    }

    const newAppointment: Omit<Appointment, 'id'> = {
      folio,
      clientName: params.clientName.trim(),
      clientPhone: params.clientPhone.replace(/\D/g, ''),
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      price: selectedService.price,
      durationMinutes: duration,
      barberId: assignedBarber.id,
      barberName: assignedBarber.name,
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
    selectedBarberId,
    setSelectedBarberId,
    slots,
    isLoading,
    confirmBooking
  };
}

/**
 * Hook para el Panel de Administración del Barbero (Multi-Barbero)
 */
export function useBarberSchedule(config: ShopConfig) {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayCanonical());
  const [selectedBarberFilter, setSelectedBarberFilterState] = useState<string>(() => {
    return localStorage.getItem('barber_active_profile') || 'all';
  });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('barber_sound_alerts');
    return saved !== null ? saved === 'true' : true;
  });
  const [isLoading, setIsLoading] = useState(true);

  const prevAppointmentsCountRef = useRef<number | null>(null);
  const alertedAppIdsRef = useRef<Set<string>>(new Set());

  const setSelectedBarberFilter = (val: string) => {
    setSelectedBarberFilterState(val);
    localStorage.setItem('barber_active_profile', val);
  };

  useEffect(() => {
    setIsLoading(true);
    prevAppointmentsCountRef.current = null;

    const unsubApp = AppointmentRepository.subscribeToAppointments(
      selectedDate,
      (list) => {
        if (
          prevAppointmentsCountRef.current !== null &&
          list.length > prevAppointmentsCountRef.current
        ) {
          const hasNewWeb = list.some(
            (app) => app.source === 'client_web' && app.status === 'confirmed'
          );
          if (hasNewWeb && soundEnabled) {
            playNewBookingChime();
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

  // Alerta sonora y notificación nativa cuando comienza una cita (con tolerancia)
  useEffect(() => {
    const checkUpcomingAppointment = () => {
      const today = getTodayCanonical();
      if (selectedDate !== today) return;

      const currentMins = getCurrentDayMinutes();

      appointments.forEach((app) => {
        if (app.status !== 'confirmed') return;
        // Si este barbero tiene su teléfono filtrado a sí mismo, solo avisar de las suyas
        if (selectedBarberFilter !== 'all' && app.barberId !== selectedBarberFilter) return;

        // Comienza en este minuto (entre 0 y 2 minutos transcurridos)
        const isStartingNow = currentMins >= app.startMinutes && currentMins <= app.startMinutes + 2;
        if (isStartingNow && !alertedAppIdsRef.current.has(app.id)) {
          alertedAppIdsRef.current.add(app.id);
          if (soundEnabled) {
            playAppointmentStartChime();
          }

          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(`💈 ¡Cita Comenzando - ${app.barberName}!`, {
                body: `Atendiendo a ${app.clientName} (${app.serviceName}). Cuentas con 10 min de tolerancia.`,
                icon: '/logo-barber.jpeg'
              });
            } catch {}
          }
        }
      });
    };

    const interval = setInterval(checkUpcomingAppointment, 20000);
    checkUpcomingAppointment();

    return () => clearInterval(interval);
  }, [appointments, selectedDate, selectedBarberFilter, soundEnabled]);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('barber_sound_alerts', String(next));
      if (next) playNewBookingChime();
      return next;
    });
  };

  const playTestSound = () => {
    playNewBookingChime();
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  // Filtrar citas según el barbero seleccionado en el admin
  const filteredAppointments = useMemo(() => {
    if (selectedBarberFilter === 'all') return appointments;
    return appointments.filter((app) => app.barberId === selectedBarberFilter);
  }, [appointments, selectedBarberFilter]);

  // Grilla combinada
  const slots: PublicSlot[] = useMemo(() => {
    const filterBarber = selectedBarberFilter === 'all' ? undefined : selectedBarberFilter;
    return calculateScheduleSlots(
      selectedDate,
      config,
      appointments,
      blockedSlots,
      40,
      filterBarber
    );
  }, [selectedDate, config, appointments, blockedSlots, selectedBarberFilter]);

  // Estadísticas del día con desglose por barbero
  const stats = useMemo(() => {
    const active = appointments.filter((a) => a.date === selectedDate);
    const confirmed = active.filter((a) => a.status === 'confirmed');
    const completed = active.filter((a) => a.status === 'completed');
    const cancelled = active.filter((a) => a.status === 'cancelled');

    const totalRealRevenue = completed.reduce((sum, a) => sum + a.price, 0);
    const projectedRevenue = active
      .filter((a) => a.status !== 'cancelled')
      .reduce((sum, a) => sum + a.price, 0);

    // Desglose individual de cada barbero
    const barbers = config.barbers || DEFAULT_BARBERS;
    const perBarber: Record<string, { name: string; completedCount: number; revenue: number }> = {};
    barbers.forEach((b) => {
      perBarber[b.id] = { name: b.name, completedCount: 0, revenue: 0 };
    });

    completed.forEach((app) => {
      const bId = app.barberId || 'barber-1';
      if (!perBarber[bId]) {
        perBarber[bId] = { name: app.barberName || 'Barbero', completedCount: 0, revenue: 0 };
      }
      perBarber[bId].completedCount += 1;
      perBarber[bId].revenue += app.price;
    });

    return {
      total: active.length,
      confirmed: confirmed.length,
      completed: completed.length,
      cancelled: cancelled.length,
      totalRealRevenue,
      projectedRevenue,
      perBarber
    };
  }, [appointments, selectedDate, config.barbers]);

  // Acciones
  const markAsCompleted = async (id: string) => {
    await AppointmentRepository.updateAppointmentStatus(id, selectedDate, 'completed');
  };

  const cancelAppointment = async (id: string, folio?: string) => {
    await AppointmentRepository.updateAppointmentStatus(id, selectedDate, 'cancelled', folio);
  };

  const rescheduleAppointment = async (
    appointment: Appointment,
    newDate: string,
    newStartMinutes: number,
    newBarberId?: string,
    newBarberName?: string
  ) => {
    return await AppointmentRepository.rescheduleAppointment(
      appointment,
      newDate,
      newStartMinutes,
      newBarberId,
      newBarberName
    );
  };

  const createWalkIn = async (params: {
    clientName: string;
    clientPhone: string;
    service: ServiceItem;
    barber: Barber;
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
      barberId: params.barber.id,
      barberName: params.barber.name,
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

  const blockSlot = async (
    startMinutes: number,
    durationMinutes: number = 40,
    barberId?: string,
    reason?: string
  ) => {
    await AppointmentRepository.addBlockedSlot({
      date: selectedDate,
      startMinutes,
      endMinutes: startMinutes + durationMinutes,
      barberId,
      reason: reason || 'Bloqueo manual'
    });
  };

  const unblockSlot = async (id: string) => {
    await AppointmentRepository.removeBlockedSlot(id, selectedDate);
  };

  return {
    selectedDate,
    setSelectedDate,
    selectedBarberFilter,
    setSelectedBarberFilter,
    appointments: filteredAppointments,
    allAppointments: appointments,
    blockedSlots,
    slots,
    stats,
    isLoading,
    soundEnabled,
    toggleSound,
    playTestSound,
    markAsCompleted,
    cancelAppointment,
    rescheduleAppointment,
    createWalkIn,
    blockSlot,
    unblockSlot,
    isFirebaseConfigured
  };
}
