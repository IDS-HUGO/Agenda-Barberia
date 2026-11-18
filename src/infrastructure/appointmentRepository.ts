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
  setDoc
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import {
  Appointment,
  AppointmentStatus,
  BlockedSlot,
  ServiceItem,
  ShopConfig,
  DEFAULT_SERVICES,
  DEFAULT_SHOP_CONFIG,
  DEFAULT_BARBERS
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
    super('BarberShoppingDB_v2');
    this.version(1).stores({
      appointments: 'id, folio, date, barberId, startMinutes, endMinutes, status, clientPhone',
      blockedSlots: 'id, date, barberId, startMinutes, endMinutes',
      services: 'id, name, isActive',
      settings: 'key'
    });
  }
}

export const localDB = new LocalBarberDB();

// Canal de difusión en tiempo real entre pestañas para modo local
const syncChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('barber_sync_stream_v2')
  : null;

function notifyLocalChange(date?: string) {
  if (syncChannel) {
    syncChannel.postMessage({ type: 'CHANGE', date });
  }
}

// Inicializar catálogo y configuración por defecto en localDB
export async function seedLocalDatabaseIfNeeded(): Promise<void> {
  try {
    const serviceCount = await localDB.services.count();
    if (serviceCount === 0) {
      await localDB.services.bulkAdd(DEFAULT_SERVICES);
    }

    const shopConfigDoc = await localDB.settings.get('shop_config');
    if (!shopConfigDoc) {
      await localDB.settings.put({ key: 'shop_config', value: DEFAULT_SHOP_CONFIG });
    }
  } catch (err) {
    console.warn('[DB] Error inicializando seed local:', err);
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
          list.sort((a, b) => a.startMinutes - b.startMinutes);
          callback(list);
        },
        (error) => {
          console.error('[Repo] Error en snapshot de appointments:', error);
        }
      );
    }

    // Modo Local
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
   * CERO LEAK DE DATOS: Retorna startMinutes, endMinutes y barberId para saber cuál barbero está ocupado.
   */
  subscribeToPublicOccupiedSlots(
    date: string,
    callback: (occupied: { startMinutes: number; endMinutes: number; barberId: string }[]) => void
  ): () => void {
    if (isFirebaseConfigured && db) {
      const q = query(
        collection(db, 'public_slots'),
        where('date', '==', date),
        where('status', '==', 'occupied')
      );

      return onSnapshot(
        q,
        (snapshot) => {
          const occupiedList: { startMinutes: number; endMinutes: number; barberId: string }[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            occupiedList.push({
              startMinutes: data.startMinutes,
              endMinutes: data.endMinutes,
              barberId: data.barberId || 'barber-1'
            });
          });
          callback(occupiedList);
        },
        (error) => {
          console.error('[Repo] Error en public_slots:', error);
        }
      );
    }

    // Modo Local
    let isSubscribed = true;
    const fetchLocalSlots = async () => {
      try {
        const apps = await localDB.appointments
          .where('date')
          .equals(date)
          .filter((app) => app.status !== 'cancelled')
          .toArray();

        if (isSubscribed) {
          callback(
            apps.map((a) => ({
              startMinutes: a.startMinutes,
              endMinutes: a.endMinutes,
              barberId: a.barberId || 'barber-1'
            }))
          );
        }
      } catch (err) {
        console.warn('Error en fetchLocalSlots:', err);
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
   * Suscripción a horarios bloqueados por los barberos
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

      return onSnapshot(
        q,
        (snapshot) => {
          const blocks: BlockedSlot[] = [];
          snapshot.forEach((docSnap) => {
            blocks.push({ id: docSnap.id, ...docSnap.data() } as BlockedSlot);
          });
          callback(blocks);
        },
        (error) => {
          console.error('[Repo] Error en blocked_slots:', error);
        }
      );
    }

    // Modo Local
    let isSubscribed = true;
    const fetchBlocks = async () => {
      try {
        const blocks = await localDB.blockedSlots
          .where('date')
          .equals(date)
          .toArray();
        if (isSubscribed) {
          callback(blocks);
        }
      } catch (err) {
        console.warn('Error en fetchBlocks:', err);
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
   * Creación de cita con prevención atómica de doble reserva MULTI-BARBERO.
   * Se verifica que el barbero específico no tenga colisión.
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
          type Range = { start: number; end: number; barberId: string; folio: string };
          const ranges: Range[] = lockSnap.exists()
            ? (lockSnap.data().ranges || [])
            : [];

          // Verificar si este barbero en particular ya tiene cita a esta hora
          const collision = ranges.some(
            (r) =>
              r.barberId === fullAppointment.barberId &&
              fullAppointment.startMinutes < r.end &&
              fullAppointment.endMinutes > r.start
          );

          if (collision) {
            throw new Error(
              `El barbero seleccionado acaba de ser reservado en este horario. Por favor selecciona otro barbero o horario disponible.`
            );
          }

          // Registrar el nuevo bloqueo atómico
          ranges.push({
            start: fullAppointment.startMinutes,
            end: fullAppointment.endMinutes,
            barberId: fullAppointment.barberId,
            folio: fullAppointment.folio
          });

          transaction.set(
            lockDocRef,
            { ranges, lastUpdated: new Date().toISOString() },
            { merge: true }
          );

          // Crear la cita completa
          transaction.set(appDocRef, fullAppointment);

          // Crear el slot público protegido
          transaction.set(publicSlotDocRef, {
            appointmentId: id,
            date: fullAppointment.date,
            startMinutes: fullAppointment.startMinutes,
            endMinutes: fullAppointment.endMinutes,
            barberId: fullAppointment.barberId,
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
      const existing = await localDB.appointments
        .where('date')
        .equals(fullAppointment.date)
        .filter(
          (app) =>
            app.status !== 'cancelled' &&
            app.barberId === fullAppointment.barberId &&
            fullAppointment.startMinutes < app.endMinutes &&
            fullAppointment.endMinutes > app.startMinutes
        )
        .toArray();

      if (existing.length > 0) {
        return {
          success: false,
          error: 'Este horario acaba de ser ocupado con ese barbero localmente.'
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
          console.warn('[Repo] Error liberando lock al cancelar:', err);
        }
      }
      return;
    }

    // Local
    await localDB.appointments.update(id, { status });
    notifyLocalChange(date);
  },

  /**
   * Reprograma una cita
   */
  async rescheduleAppointment(
    appointment: Appointment,
    newDate: string,
    newStartMinutes: number,
    newBarberId?: string
  ): Promise<{ success: boolean; error?: string }> {
    const targetBarberId = newBarberId || appointment.barberId;
    const newEndMinutes = newStartMinutes + appointment.durationMinutes;
    const newStartTime = minutesToTime(newStartMinutes);
    const newEndTime = minutesToTime(newEndMinutes);

    if (isFirebaseConfigured && db) {
      try {
        const oldLockRef = doc(db, 'daily_locks', appointment.date);
        const newLockRef = doc(db, 'daily_locks', newDate);
        const appRef = doc(db, 'appointments', appointment.id);
        const publicSlotRef = doc(db, 'public_slots', `slot_${appointment.id}`);

        await runTransaction(db, async (txn) => {
          const newLockSnap = await txn.get(newLockRef);
          type Range = { start: number; end: number; barberId: string; folio: string };
          const ranges: Range[] = newLockSnap.exists()
            ? (newLockSnap.data().ranges || [])
            : [];

          const collision = ranges.some(
            (r) =>
              r.folio !== appointment.folio &&
              r.barberId === targetBarberId &&
              newStartMinutes < r.end &&
              newEndMinutes > r.start
          );

          if (collision) {
            throw new Error('El nuevo horario con ese barbero no está disponible.');
          }

          if (appointment.date !== newDate) {
            const oldLockSnap = await txn.get(oldLockRef);
            if (oldLockSnap.exists()) {
              const oldRanges = (oldLockSnap.data().ranges || []).filter(
                (r: Range) => r.folio !== appointment.folio
              );
              txn.update(oldLockRef, { ranges: oldRanges });
            }
          }

          const filteredRanges = ranges.filter((r) => r.folio !== appointment.folio);
          filteredRanges.push({
            start: newStartMinutes,
            end: newEndMinutes,
            barberId: targetBarberId,
            folio: appointment.folio
          });
          txn.set(newLockRef, { ranges: filteredRanges }, { merge: true });

          txn.update(appRef, {
            date: newDate,
            startMinutes: newStartMinutes,
            endMinutes: newEndMinutes,
            startTime: newStartTime,
            endTime: newEndTime,
            barberId: targetBarberId,
            status: 'confirmed'
          });

          txn.set(publicSlotRef, {
            appointmentId: appointment.id,
            date: newDate,
            startMinutes: newStartMinutes,
            endMinutes: newEndMinutes,
            barberId: targetBarberId,
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
      await localDB.appointments.update(appointment.id, {
        date: newDate,
        startMinutes: newStartMinutes,
        endMinutes: newEndMinutes,
        startTime: newStartTime,
        endTime: newEndTime,
        barberId: targetBarberId,
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
   * Bloqueo de horario por barbero
   */
  async addBlockedSlot(block: Omit<BlockedSlot, 'id'>): Promise<void> {
    const id = `block_${Date.now()}`;
    const fullBlock: BlockedSlot = { ...block, id };

    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'blocked_slots', id), fullBlock);
      await setDoc(doc(db, 'public_slots', `block_${id}`), {
        date: block.date,
        startMinutes: block.startMinutes,
        endMinutes: block.endMinutes,
        barberId: block.barberId || 'all',
        status: 'occupied'
      });
      return;
    }

    await localDB.blockedSlots.add(fullBlock);
    notifyLocalChange(block.date);
  },

  /**
   * Eliminar bloqueo
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
   * Obtiene todas las citas para respaldo histórico
   */
  async getAllAppointments(): Promise<Appointment[]> {
    if (isFirebaseConfigured && db) {
      const snap = await getDocs(collection(db, 'appointments'));
      const list: Appointment[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Appointment));
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return list;
    }

    return await localDB.appointments.toArray();
  },

  /**
   * Importación de citas
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
            barberId: app.barberId || 'barber-1',
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
