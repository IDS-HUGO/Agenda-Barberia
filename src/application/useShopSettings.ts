import { useState, useEffect } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../infrastructure/firebase';
import { localDB, seedLocalDatabaseIfNeeded } from '../infrastructure/appointmentRepository';
import {
  ServiceItem,
  ShopConfig,
  Barber,
  DEFAULT_SERVICES,
  DEFAULT_SHOP_CONFIG,
  DEFAULT_BARBERS
} from '../domain/models';

export function useShopSettings() {
  const [config, setConfig] = useState<ShopConfig>(DEFAULT_SHOP_CONFIG);
  const [services, setServices] = useState<ServiceItem[]>(DEFAULT_SERVICES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubscribeConfig: (() => void) | undefined;
    let unsubscribeServices: (() => void) | undefined;

    const init = async () => {
      if (isFirebaseConfigured && db) {
        const configDocRef = doc(db, 'settings', 'shop_config');
        const servicesDocRef = doc(db, 'settings', 'services');

        unsubscribeConfig = onSnapshot(configDocRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const hasLegacyBarbers = !data.barbers || data.barbers.some(
              (b: Barber) => b.name.toLowerCase().startsWith('barbero')
            );

            let needsBarberRepair = false;
            let resolvedBarbers: Barber[] = (data.barbers && data.barbers.length > 0 && !hasLegacyBarbers)
              ? data.barbers
              : DEFAULT_BARBERS;

            // REPARAR: Rola DEBE estar activo (isActive: true) para que los clientes puedan agendar con él hoy, mañana y siempre
            resolvedBarbers = resolvedBarbers.map((b: Barber) => {
              if (b.name.toLowerCase() === 'rola' && !b.isActive) {
                needsBarberRepair = true;
                return { ...b, isActive: true };
              }
              if ((b.name.toLowerCase() === 'hugo' || b.name.toLowerCase() === 'tristan') && !b.isActive) {
                needsBarberRepair = true;
                return { ...b, isActive: true };
              }
              return b;
            });

            // Asegurar que Jose esté en el equipo oficial y activo
            if (!resolvedBarbers.some((b: Barber) => b.name.toLowerCase() === 'jose')) {
              needsBarberRepair = true;
              resolvedBarbers.push({ id: 'barber-4', name: 'Jose', color: '#EC4899', isActive: true });
            }

            const isLegacy =
              !data.weekdayOpeningMinutes ||
              data.weekdayOpeningMinutes !== 570 ||
              data.weekdayClosingMinutes !== 1140 ||
              !data.sundayOpeningMinutes ||
              data.sundayOpeningMinutes !== 570 ||
              data.sundayClosingMinutes !== 900 ||
              data.slotIntervalMinutes !== 40 ||
              hasLegacyBarbers ||
              needsBarberRepair;

            const resolvedConfig: ShopConfig = {
              ...DEFAULT_SHOP_CONFIG,
              ...data,
              weekdayOpeningMinutes: 570,
              weekdayClosingMinutes: 1140,
              sundayOpeningMinutes: 570,
              sundayClosingMinutes: 900,
              slotIntervalMinutes: 40,
              barbers: resolvedBarbers
            };

            if (isLegacy) {
              setDoc(configDocRef, resolvedConfig, { merge: true }).catch((err) => {
                console.warn('[useShopSettings] No se pudo guardar config migrada en Firestore:', err);
              });
            }
            setConfig(resolvedConfig);
          } else {
            setDoc(configDocRef, DEFAULT_SHOP_CONFIG).catch((err) => {
              console.warn('[useShopSettings] No se pudo inicializar config en Firestore:', err);
            });
            setConfig(DEFAULT_SHOP_CONFIG);
          }
        }, (err) => {
          console.warn('[useShopSettings] Error en snapshot de config, usando DEFAULT_SHOP_CONFIG:', err);
          setConfig(DEFAULT_SHOP_CONFIG);
        });

        unsubscribeServices = onSnapshot(servicesDocRef, (snap) => {
          if (snap.exists() && snap.data().items && snap.data().items.length > 0) {
            const rawItems = snap.data().items as ServiceItem[];
            const hasOfficial6 = rawItems.length === 6 &&
              rawItems.some((it) => it.name.toLowerCase().includes('mascarilla') && it.price === 50) &&
              rawItems.some((it) => (it.name.toLowerCase().includes('niño') || it.name.toLowerCase().includes('nino')) && it.price === 150) &&
              rawItems.some((it) => it.name.toLowerCase().includes('cejas') && it.price === 20) &&
              rawItems.some((it) => it.name.toLowerCase().includes('desvanecido') && it.price === 180) &&
              rawItems.some((it) => it.name.toLowerCase().includes('completo') && it.price === 300);

            const isLegacy = !hasOfficial6;

            if (isLegacy) {
              setServices(DEFAULT_SERVICES);
              setDoc(servicesDocRef, { items: DEFAULT_SERVICES }).catch((err) => {
                console.warn('[useShopSettings] No se pudo migrar DEFAULT_SERVICES en Firestore:', err);
              });
            } else {
              setServices(rawItems);
            }
          } else {
            setServices(DEFAULT_SERVICES);
            setDoc(servicesDocRef, { items: DEFAULT_SERVICES }).catch((err) => {
              console.warn('[useShopSettings] No se pudo inicializar DEFAULT_SERVICES en Firestore:', err);
            });
          }
          setIsLoading(false);
        }, (err) => {
          console.warn('[useShopSettings] Error en snapshot de servicios, usando DEFAULT_SERVICES:', err);
          setServices(DEFAULT_SERVICES);
          setIsLoading(false);
        });

        return;
      }

      // Modo Local con IndexedDB
      await seedLocalDatabaseIfNeeded();
      const localCfg = await localDB.settings.get('shop_config');
      if (localCfg) {
        let localBarbers: Barber[] = (localCfg.value.barbers && !localCfg.value.barbers.some((b: Barber) => b.name.toLowerCase().startsWith('barbero')))
          ? localCfg.value.barbers
          : DEFAULT_BARBERS;

        localBarbers = localBarbers.map((b) => (b.name.toLowerCase() === 'rola' ? { ...b, isActive: true } : b));
        if (!localBarbers.some((b) => b.name.toLowerCase() === 'jose')) {
          localBarbers.push({ id: 'barber-4', name: 'Jose', color: '#EC4899', isActive: true });
        }

        setConfig({
          ...DEFAULT_SHOP_CONFIG,
          ...localCfg.value,
          weekdayOpeningMinutes: 570,
          weekdayClosingMinutes: 1140,
          sundayOpeningMinutes: 570,
          sundayClosingMinutes: 900,
          slotIntervalMinutes: 40,
          barbers: localBarbers
        });
      }
      const localServices = await localDB.services.toArray();
      const hasOfficial6Local = localServices.length === 6 &&
        localServices.some((it) => it.name.toLowerCase().includes('mascarilla') && it.price === 50) &&
        localServices.some((it) => (it.name.toLowerCase().includes('niño') || it.name.toLowerCase().includes('nino')) && it.price === 150) &&
        localServices.some((it) => it.name.toLowerCase().includes('cejas') && it.price === 20) &&
        localServices.some((it) => it.name.toLowerCase().includes('desvanecido') && it.price === 180);

      if (localServices.length > 0 && hasOfficial6Local) {
        setServices(localServices);
      } else {
        await localDB.services.clear();
        await localDB.services.bulkAdd(DEFAULT_SERVICES);
        setServices(DEFAULT_SERVICES);
      }
      setIsLoading(false);
    };

    init();

    return () => {
      if (unsubscribeConfig) unsubscribeConfig();
      if (unsubscribeServices) unsubscribeServices();
    };
  }, []);

  const updateConfig = async (newConfig: Partial<ShopConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);

    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'settings', 'shop_config'), updated, { merge: true });
      return;
    }

    await localDB.settings.put({ key: 'shop_config', value: updated });
  };

  const updateBarbers = async (barbers: Barber[]) => {
    await updateConfig({ barbers });
  };

  const toggleBarberActive = async (barberId: string) => {
    const currentBarbers = config.barbers && config.barbers.length > 0 ? config.barbers : DEFAULT_BARBERS;
    const updated = currentBarbers.map((b) =>
      b.id === barberId ? { ...b, isActive: !b.isActive } : b
    );
    await updateBarbers(updated);
  };

  const addBarber = async (name: string, color?: string) => {
    const currentBarbers = config.barbers && config.barbers.length > 0 ? config.barbers : DEFAULT_BARBERS;
    const colors = ['#76C81C', '#38BDF8', '#F59E0B', '#EC4899', '#A855F7', '#10B981', '#06B6D4'];
    const newColor = color || colors[currentBarbers.length % colors.length];
    const newBarber: Barber = {
      id: `barber-${Date.now()}`,
      name: name.trim(),
      color: newColor,
      isActive: true
    };
    const updated = [...currentBarbers, newBarber];
    await updateBarbers(updated);
  };

  const deleteBarber = async (barberId: string) => {
    const currentBarbers = config.barbers && config.barbers.length > 0 ? config.barbers : DEFAULT_BARBERS;
    const updated = currentBarbers.filter((b) => b.id !== barberId);
    await updateBarbers(updated);
  };

  const saveServices = async (updatedServices: ServiceItem[]) => {
    setServices(updatedServices);

    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'settings', 'services'), { items: updatedServices });
      return;
    }

    await localDB.services.clear();
    await localDB.services.bulkPut(updatedServices);
  };

  const addService = async (service: Omit<ServiceItem, 'id'>) => {
    const newService: ServiceItem = {
      ...service,
      id: `srv_${Date.now()}`
    };
    const updated = [...services, newService];
    await saveServices(updated);
  };

  const updateService = async (id: string, updates: Partial<ServiceItem>) => {
    const updated = services.map((s) => (s.id === id ? { ...s, ...updates } : s));
    await saveServices(updated);
  };

  const deleteService = async (id: string) => {
    const updated = services.filter((s) => s.id !== id);
    await saveServices(updated);
  };

  return {
    config,
    services,
    isLoading,
    updateConfig,
    updateBarbers,
    toggleBarberActive,
    addBarber,
    deleteBarber,
    addService,
    updateService,
    deleteService
  };
}
