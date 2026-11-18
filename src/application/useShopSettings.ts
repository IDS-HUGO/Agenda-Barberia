import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../infrastructure/firebase';
import { localDB, seedLocalDatabaseIfNeeded } from '../infrastructure/appointmentRepository';
import { ServiceItem, ShopConfig, DEFAULT_SERVICES, DEFAULT_SHOP_CONFIG } from '../domain/models';

export function useShopSettings() {
  const [config, setConfig] = useState<ShopConfig>(DEFAULT_SHOP_CONFIG);
  const [services, setServices] = useState<ServiceItem[]>(DEFAULT_SERVICES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubscribeConfig: (() => void) | undefined;
    let unsubscribeServices: (() => void) | undefined;

    const init = async () => {
      if (isFirebaseConfigured && db) {
        // Suscripción en Firestore
        const configDocRef = doc(db, 'settings', 'shop_config');
        const servicesDocRef = doc(db, 'settings', 'services');

        unsubscribeConfig = onSnapshot(configDocRef, (snap) => {
          if (snap.exists()) {
            setConfig(snap.data() as ShopConfig);
          } else {
            // Inicializar en Firestore
            setDoc(configDocRef, DEFAULT_SHOP_CONFIG);
            setConfig(DEFAULT_SHOP_CONFIG);
          }
        });

        unsubscribeServices = onSnapshot(servicesDocRef, (snap) => {
          if (snap.exists() && snap.data().items) {
            setServices(snap.data().items as ServiceItem[]);
          } else {
            setDoc(servicesDocRef, { items: DEFAULT_SERVICES });
            setServices(DEFAULT_SERVICES);
          }
          setIsLoading(false);
        });

        return;
      }

      // Modo Local con IndexedDB
      await seedLocalDatabaseIfNeeded();
      const localCfg = await localDB.settings.get('shop_config');
      if (localCfg) {
        setConfig(localCfg.value);
      }
      const localServices = await localDB.services.toArray();
      if (localServices.length > 0) {
        setServices(localServices);
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
    addService,
    updateService,
    deleteService
  };
}
