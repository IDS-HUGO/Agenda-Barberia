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
            const resolvedBarbers: Barber[] = hasLegacyBarbers ? DEFAULT_BARBERS : data.barbers;

            const isLegacy =
              !data.weekdayOpeningMinutes ||
              data.weekdayOpeningMinutes !== 570 ||
              data.weekdayClosingMinutes !== 1140 ||
              !data.sundayOpeningMinutes ||
              data.sundayOpeningMinutes !== 570 ||
              data.sundayClosingMinutes !== 900 ||
              data.slotIntervalMinutes !== 40 ||
              hasLegacyBarbers;

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
            const isLegacy = rawItems.length !== 4 || rawItems.some(
              (it) =>
                it.id.includes('fade') ||
                it.id.includes('barba-vip') ||
                it.id.includes('combo-alien') ||
                it.id.includes('diseno-ceja') ||
                it.name.toLowerCase().includes('alien') ||
                it.name.toLowerCase().includes('vip') ||
                it.name.toLowerCase().includes('gremas') ||
                it.name.toLowerCase().includes('clásico') ||
                it.name.toLowerCase().includes('clasico') ||
                it.price === 150 ||
                it.price === 120 ||
                it.durationMinutes === 30
            );

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
        setConfig({
          ...DEFAULT_SHOP_CONFIG,
          ...localCfg.value,
          weekdayOpeningMinutes: 570,
          weekdayClosingMinutes: 1140,
          sundayOpeningMinutes: 570,
          sundayClosingMinutes: 900,
          slotIntervalMinutes: 40,
          barbers: (localCfg.value.barbers && !localCfg.value.barbers.some((b: Barber) => b.name.toLowerCase().startsWith('barbero')))
            ? localCfg.value.barbers
            : DEFAULT_BARBERS
        });
      }
      const localServices = await localDB.services.toArray();
      const hasLegacyLocal = localServices.length !== 4 || localServices.some(
        (it) =>
          it.id.includes('fade') ||
          it.id.includes('barba-vip') ||
          it.id.includes('combo-alien') ||
          it.id.includes('diseno-ceja') ||
          it.name.toLowerCase().includes('alien') ||
          it.name.toLowerCase().includes('vip') ||
          it.name.toLowerCase().includes('gremas') ||
          it.name.toLowerCase().includes('clásico') ||
          it.name.toLowerCase().includes('clasico') ||
          it.price === 150 ||
          it.price === 120 ||
          it.durationMinutes === 30
      );
      if (localServices.length > 0 && !hasLegacyLocal) {
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
    addService,
    updateService,
    deleteService
  };
}
