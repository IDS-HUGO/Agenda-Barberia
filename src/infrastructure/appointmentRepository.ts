import Dexie, { Table } from 'dexie';
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  onSnapshot,
  runTransaction,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import {
  Appointment,
  AppointmentStatus,
  BlockedSlot,
  PublicSlot,
  ServiceItem,
  ShopConfig,
  DEFAULT_SERVICES,
  DEFAULT_SHOP_CONFIG
} from '../domain/models';
import { minutesToTime } from '../domain/scheduleEngine';

// ==========================================
// 1. BASE DE DATOS LOCAL OFFLINE (INDEXEDDB)
// ==========================================
export class LocalBarberDB extends Dexie {
  appointments!: Table<Appointment, string>;
  blockedSlots!: Table<BlockedSlot, string>;
  services!: Table<ServiceItem, string>;
  settings!: Table<{ key: string; value: any }, string>;

  constructor() {
    super('BarberShoppingDB');
    this.version(1).stores({
      appointments: 'id, folio, date, startMinutes, endMinutes, status, clientPhone',
      blockedSlots: 'id, date, startMinutes, endMinutes',
      services: 'id, name, isActive',
      settings: 'key'
    });
  }
}

export const localDB = new LocalBarberDB();

// Canal de difusión en tiempo real entre pestañas para modo local
const syncChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('barber_sync_stream')
  : null;

function notifyLocalChange(date?: string) {
  if (syncChannel) {
    syncChannel.postMessage({ type: 'CHANGE', date });
  }
}

// Inicializar catálogo y configuración por defecto en localDB si está vacío
export async function seedLocalDatabaseIfNeeded(): Promise<void> {
  const serviceCount = await localDB.services.count();
  if (serviceCount === 0) {
    await localDB.services.bulkAdd(DEFAULT_SERVICES);
  }

  const shopConfigDoc = await localDB.settings.get('shop_config');
  if (!shopConfigDoc) {
    await localDB.settings.put({ key: 'shop_config', value: DEFAULT_SHOP_CONFIG });
  }
}

// ==========================================
// 2. REPOSITORIO DE CITAS Y DISPONIBILIDAD
// ==========================================

export const AppointmentRepository = {
  /**
   * Suscripción en tiempo real a las citas de un día específico (Uso Barbero).
   */
  subscribeToAppointments(
    date: string,
    callback: (appointments: Appointment[]) => void
  ): () => void {
    if (isFirebaseConfigured && db) {
      const q = query(
        collection(db, 'appointments'),
        where('date', '==', date)
      );

      return onSnapshot(
        q,
        (snapshot) => {
          const list: Appointment[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() } as Appointment);
          });
          // Ordenar por hora de inicio ascendente
          list.sort((a, b) => a.startMinutes - b.startMinutes);
          callback(list);
        },
        (error) => {
          console.error('[Repo] Error en snapshot de appointments:', error);
        }
      );
    }

    // Modo Local (IndexedDB con polling reactivo + BroadcastChannel)
    let isSubscribed = true;

    const fetchLocal = async () => {
      try {
        const results = await localDB.appointments
          .where('date')
          .equals(date)
          .toArray();
        if (isSubscribed) {
          results.sort((a, b) => a.startMinutes - b.startMinutes);
          callback(results);
        }
      } catch (err) {
        console.warn('Error leyendo local appointments:', err);
      }
    };

    fetchLocal();

    const handleMessage = (evt: MessageEvent) => {
      if (!evt.data || evt.data.date === date || !evt.data.date) {
        fetchLocal();
      }
    };

    if (syncChannel) {
      syncChannel.addEventListener('message', handleMessage);
    }

    // Intervalo de seguridad para modo local
    const interval = setInterval(fetchLocal, 1500);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
      if (syncChannel) {
        syncChannel.removeEventListener('message', handleMessage);
      }
    };
  },

  /**
   * Suscripción en tiempo real a los slots públicos para la vista del cliente.
   * CERO LEAK DE DATOS: Solo retorna startMinutes, endMinutes y status ocupado.
   */
  subscribeToPublicOccupiedSlots(
    date: string,
    callback: (occupied: { startMinutes: number; endMinutes: number }[]) => void
  ): () => void {
    if (isFirebaseConfigured && db) {
      const q = query(
        collection(db, 'public_slots'),
        where('date', '==', date),
        where('status', '==', 'occupied')
      );

      return onSnapshot(q, (snapshot) => {
        const occupiedList: { startMinutes: number; endMinutes: number }[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          occupiedList.push({
            startMinutes: data.startMinutes,
            endMinutes: data.endMinutes
          });
        });
        callback(occupiedList);
      });
    }

    // Modo Local
    let isSubscribed = true;
    const fetchLocalSlots = async () => {
      const apps = await localDB.appointments
        .where('date')
        .equals(date)
        .filter((app) => app.status !== 'cancelled')
        .toArray();

      if (isSubscribed) {
        callback(
          apps.map((a) => ({
            startMinutes: a.startMinutes,
            endMinutes: a.endMinutes
          }))
        );
      }
    };

    fetchLocalSlots();

    const handleMessage = (evt: MessageEvent) => {
      if (!evt.data || evt.data.date === date || !evt.data.date) {
        fetchLocalSlots();
      }
    };

    if (syncChannel) {
      syncChannel.addEventListener('message', handleMessage);
    }

    const interval = setInterval(fetchLocalSlots, 1500);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
      if (syncChannel) {
        syncChannel.removeEventListener('message', handleMessage);
      }
    };
  },

  /**
   * Suscripción a horarios bloqueados por el barbero
   */
  subscribeToBlockedSlots(
    date: string,
    callback: (blocks: BlockedSlot[]) => void
  ): () => void {
    if (isFirebaseConfigured && db) {
      const q = query(
        collection(db, 'blocked_slots'),
        where('date', '==', date)
      );

      return onSnapshot(q, (snapshot) => {
        const blocks: BlockedSlot[] = [];
        snapshot.forEach((docSnap) => {
          blocks.push({ id: docSnap.id, ...docSnap.data() } as BlockedSlot);
        });
        callback(blocks);
      });
    }

    // Modo Local
    let isSubscribed = true;
    const fetchBlocks = async () => {
      const blocks = await localDB.blockedSlots
        .where('date')
        .equals(date)
        .toArray();
      if (isSubscribed) {
        callback(blocks);
      }
    };

    fetchBlocks();

    const handleMessage = () => fetchBlocks();
    if (syncChannel) syncChannel.addEventListener('message', handleMessage);
    const interval = setInterval(fetchBlocks, 2000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
      if (syncChannel) syncChannel.removeEventListener('message', handleMessage);
    };
  },

  /**
   * Creación de cita con prevención atómica de doble reserva.
   * En Firebase: Utiliza runTransaction sobre `daily_locks/{date}`.
   * En Local: Validación atómica sobre Dexie.
   */
  async createAppointmentAtomic(
    newApp: Omit<Appointment, 'id'>
  ): Promise<{ success: boolean; appointment?: Appointment; error?: string }> {
    const id = `app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullAppointment: Appointment = {
      ...newApp,
      id
    };

    if (isFirebaseConfigured && db) {
      try {
        const lockDocRef = doc(db, 'daily_locks', fullAppointment.date);
        const appDocRef = doc(db, 'appointments', id);
        const publicSlotDocRef = doc(db, 'public_slots', `slot_${id}`);

        await runTransaction(db, async (transaction) => {
          const lockSnap = await transaction.get(lockDocRef);
          type Range = { start: number; end: number; folio: string };
          const ranges: Range[] = lockSnap.exists()
            ? (lockSnap.data().ranges || [])
            : [];

          // Verificar si el horario choca con una reserva confirmada
          const collision = ranges.some(
            (r) =>
              fullAppointment.startMinutes < r.end &&
              fullAppointment.endMinutes > r.start
          );

          if (collision) {
            throw new Error(
              'Este horario acaba de ser reservado por otro cliente. Por favor elige otro horario disponible.'
            );
          }

          // Registrar el nuevo bloqueo atómico
          ranges.push({
            start: fullAppointment.startMinutes,
            end: fullAppointment.endMinutes,
            folio: fullAppointment.folio
          });

          transaction.set(
            lockDocRef,
            { ranges, lastUpdated: new Date().toISOString() },
            { merge: true }
          );

          // Crear la cita privada completa para el barbero
          transaction.set(appDocRef, fullAppointment);

          // Crear el slot público protegido (sin datos del cliente)
          transaction.set(publicSlotDocRef, {
            appointmentId: id,
            date: fullAppointment.date,
            startMinutes: fullAppointment.startMinutes,
            endMinutes: fullAppointment.endMinutes,
            status: 'occupied'
          });
        });

        return { success: true, appointment: fullAppointment };
      } catch (err: any) {
        console.error('[Repo] Error en transacción atómica de Firebase:', err);
        return {
          success: false,
          error: err.message || 'Error al confirmar la reserva.'
        };
      }
    }

    // Modo Local Dexie
    try {
      // Verificar colisión local
      const existing = await localDB.appointments
        .where('date')
        .equals(fullAppointment.date)
        .filter((app) => app.status !== 'cancelled')
        .toArray();

      const collision = existing.some(
        (app) =>
          fullAppointment.startMinutes < app.endMinutes &&
          fullAppointment.endMinutes > app.startMinutes
      );

      if (collision) {
        return {
          success: false,
          error: 'Este horario acaba de ser reservado localmente.'
        };
      }

      await localDB.appointments.add(fullAppointment);
      notifyLocalChange(fullAppointment.date);
      return { success: true, appointment: fullAppointment };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error guardando localmente.' };
    }
  },

  /**
   * Actualiza el estado de una cita (Completada, Cancelada, etc.)
   */
  async updateAppointmentStatus(
    id: string,
    date: string,
    status: AppointmentStatus,
    folio?: string
  ): Promise<void> {
    if (isFirebaseConfigured && db) {
      const appRef = doc(db, 'appointments', id);
      await updateDoc(appRef, { status });

      // Si se cancela, liberar el slot público y el lock diario
      if (status === 'cancelled') {
        const publicSlotRef = doc(db, 'public_slots', `slot_${id}`);
        try {
          await deleteDoc(publicSlotRef);
        } catch {
          // Ignorar si no existe
        }

        const lockDocRef = doc(db, 'daily_locks', date);
        try {
          await runTransaction(db, async (txn) => {
            const lockSnap = await txn.get(lockDocRef);
            if (lockSnap.exists()) {
              const ranges = (lockSnap.data().ranges || []).filter(
                (r: any) => (folio ? r.folio !== folio : true) && r.folio !== id && r.id !== id
              );
              txn.update(lockDocRef, { ranges });
            }
          });
        } catch (err) {
          console.warn('[Repo] Error liberando daily_locks al cancelar:', err);
        }
      }
      return;
    }

    // Local
    await localDB.appointments.update(id, { status });
    notifyLocalChange(date);
  },

  /**
   * Reprograma una cita a una nueva fecha y hora
   */
  async rescheduleAppointment(
    appointment: Appointment,
    newDate: string,
    newStartMinutes: number
  ): Promise<{ success: boolean; error?: string }> {
    const newEndMinutes = newStartMinutes + appointment.durationMinutes;
    const newStartTime = minutesToTime(newStartMinutes);
    const newEndTime = minutesToTime(newEndMinutes);

    // Cancelar la anterior y crear la nueva o actualizar
    if (isFirebaseConfigured && db) {
      try {
        const oldLockRef = doc(db, 'daily_locks', appointment.date);
        const newLockRef = doc(db, 'daily_locks', newDate);
        const appRef = doc(db, 'appointments', appointment.id);
        const publicSlotRef = doc(db, 'public_slots', `slot_${appointment.id}`);

        await runTransaction(db, async (txn) => {
          // 1. Verificar colisión en nueva fecha
          const newLockSnap = await txn.get(newLockRef);
          type Range = { start: number; end: number; folio: string };
          const ranges: Range[] = newLockSnap.exists()
            ? (newLockSnap.data().ranges || [])
            : [];

          const collision = ranges.some(
            (r) =>
              r.folio !== appointment.folio &&
              newStartMinutes < r.end &&
              newEndMinutes > r.start
          );

          if (collision) {
            throw new Error('El nuevo horario seleccionado no está disponible.');
          }

          // 2. Si la fecha cambió, limpiar en lock anterior
          if (appointment.date !== newDate) {
            const oldLockSnap = await txn.get(oldLockRef);
            if (oldLockSnap.exists()) {
              const oldRanges = (oldLockSnap.data().ranges || []).filter(
                (r: Range) => r.folio !== appointment.folio
              );
              txn.update(oldLockRef, { ranges: oldRanges });
            }
          }

          // 3. Agregar nuevo lock
          const filteredRanges = ranges.filter((r) => r.folio !== appointment.folio);
          filteredRanges.push({
            start: newStartMinutes,
            end: newEndMinutes,
            folio: appointment.folio
          });
          txn.set(newLockRef, { ranges: filteredRanges }, { merge: true });

          // 4. Actualizar cita
          txn.update(appRef, {
            date: newDate,
            startMinutes: newStartMinutes,
            endMinutes: newEndMinutes,
            startTime: newStartTime,
            endTime: newEndTime,
            status: 'confirmed'
          });

          // 5. Actualizar public slot
          txn.set(publicSlotRef, {
            appointmentId: appointment.id,
            date: newDate,
            startMinutes: newStartMinutes,
            endMinutes: newEndMinutes,
            status: 'occupied'
          });
        });

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    // Local
    try {
      const existing = await localDB.appointments
        .where('date')
        .equals(newDate)
        .filter((app) => app.id !== appointment.id && app.status !== 'cancelled')
        .toArray();

      const collision = existing.some(
        (app) => newStartMinutes < app.endMinutes && newEndMinutes > app.startMinutes
      );

      if (collision) {
        return { success: false, error: 'Horario ocupado.' };
      }

      await localDB.appointments.update(appointment.id, {
        date: newDate,
        startMinutes: newStartMinutes,
        endMinutes: newEndMinutes,
        startTime: newStartTime,
        endTime: newEndTime,
        status: 'confirmed'
      });

      notifyLocalChange(appointment.date);
      if (appointment.date !== newDate) notifyLocalChange(newDate);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Bloqueo de horario específico por el barbero (ej. hora de comida)
   */
  async addBlockedSlot(block: Omit<BlockedSlot, 'id'>): Promise<void> {
    const id = `block_${Date.now()}`;
    const fullBlock: BlockedSlot = { ...block, id };

    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'blocked_slots', id), fullBlock);
      // Agregar a public_slots
      await setDoc(doc(db, 'public_slots', `block_${id}`), {
        date: block.date,
        startMinutes: block.startMinutes,
        endMinutes: block.endMinutes,
        status: 'occupied'
      });
      return;
    }

    await localDB.blockedSlots.add(fullBlock);
    notifyLocalChange(block.date);
  },

  /**
   * Eliminar bloqueo de horario
   */
  async removeBlockedSlot(id: string, date: string): Promise<void> {
    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, 'blocked_slots', id));
      await deleteDoc(doc(db, 'public_slots', `block_${id}`));
      return;
    }

    await localDB.blockedSlots.delete(id);
    notifyLocalChange(date);
  },

  /**
   * Obtiene todas las citas para respaldo o métricas históricas
   */
  async getAllAppointments(): Promise<Appointment[]> {
    if (isFirebaseConfigured && db) {
      const snap = await getDocs(collection(db, 'appointments'));
      const list: Appointment[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Appointment));
      return list;
    }

    return await localDB.appointments.toArray();
  },

  /**
   * Restaura o importa citas desde respaldo
   */
  async importAppointments(appointments: Appointment[]): Promise<number> {
    let count = 0;
    if (isFirebaseConfigured && db) {
      for (const app of appointments) {
        await setDoc(doc(db, 'appointments', app.id), app);
        if (app.status !== 'cancelled') {
          await setDoc(doc(db, 'public_slots', `slot_${app.id}`), {
            appointmentId: app.id,
            date: app.date,
            startMinutes: app.startMinutes,
            endMinutes: app.endMinutes,
            status: 'occupied'
          });
        }
        count++;
      }
      return count;
    }

    await localDB.appointments.bulkPut(appointments);
    notifyLocalChange();
    return appointments.length;
  }
};
