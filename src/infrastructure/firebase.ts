import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  initializeFirestore,
  getFirestore,
  persistentLocalCache, 
  persistentMultipleTabManager,
  Firestore 
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

/**
 * Verifica si Firebase tiene credenciales válidas provistas por variables de entorno
 */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  !firebaseConfig.apiKey.includes('TuApiKeyAqui') &&
  !firebaseConfig.apiKey.includes('AIzaSy...')
);

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    
    // Inicialización resiliente con caché persistente y fallback seguro
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });
    } catch {
      // Si ya existía instancia previa (hot-reload o re-render)
      db = getFirestore(app);
    }

    auth = getAuth(app);
  } catch (error) {
    console.warn('[Firebase] Advertencia en inicialización de Firebase:', error);
  }
}

export { app, db, auth };
