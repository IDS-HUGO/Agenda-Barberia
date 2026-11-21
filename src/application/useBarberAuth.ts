import { useState, useEffect, useCallback } from 'react';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence,
  User
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../infrastructure/firebase';

// Políticas de expiración de sesión
const MAX_SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 horas continuas (un turno de trabajo)
const MAX_INACTIVITY_MS = 2 * 60 * 60 * 1000;       // 2 horas de inactividad total

export function useBarberAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Garantizar que localStorage NUNCA almacene datos sensibles ni sesiones
  useEffect(() => {
    try {
      localStorage.clear();
    } catch {
      // Ignorar restricciones de sandboxing
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch {
      // Ignorar
    }

    if (auth && isFirebaseConfigured) {
      try {
        await firebaseSignOut(auth);
      } catch (err) {
        console.warn('[useBarberAuth] Error en signout:', err);
      }
    }
    setUser(null);
  }, []);

  // Monitor de inactividad y tiempo de sesión
  useEffect(() => {
    if (!user) return;

    const checkSessionExpiration = () => {
      const now = Date.now();
      const sessionStart = Number(sessionStorage.getItem('auth_session_start') || 0);
      const lastActivity = Number(sessionStorage.getItem('auth_last_activity') || 0);

      if (sessionStart > 0 && now - sessionStart > MAX_SESSION_DURATION_MS) {
        console.info('[useBarberAuth] Sesión expirada por tiempo máximo transcurrido.');
        logout();
        return;
      }

      if (lastActivity > 0 && now - lastActivity > MAX_INACTIVITY_MS) {
        console.info('[useBarberAuth] Sesión expirada por inactividad.');
        logout();
        return;
      }
    };

    const updateActivity = () => {
      try {
        sessionStorage.setItem('auth_last_activity', String(Date.now()));
      } catch {
        // Ignorar
      }
    };

    window.addEventListener('touchstart', updateActivity, { passive: true });
    window.addEventListener('mousemove', updateActivity, { passive: true });
    window.addEventListener('keydown', updateActivity, { passive: true });

    const interval = setInterval(checkSessionExpiration, 60000); // Chequeo cada minuto

    return () => {
      window.removeEventListener('touchstart', updateActivity);
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      clearInterval(interval);
    };
  }, [user, logout]);

  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      // Forzar persistencia solo en sesión (se destruye al cerrar la pestaña/navegador)
      setPersistence(auth, browserSessionPersistence).catch((err) => {
        console.warn('[useBarberAuth] No se pudo configurar browserSessionPersistence:', err);
      });

      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          const sessionStart = sessionStorage.getItem('auth_session_start');
          if (!sessionStart) {
            sessionStorage.setItem('auth_session_start', String(Date.now()));
            sessionStorage.setItem('auth_last_activity', String(Date.now()));
          }
        }
        setUser(firebaseUser);
        setIsLoading(false);
      });
      return () => unsubscribe();
    } else {
      setIsLoading(false);
    }
  }, []);

  const loginWithEmail = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    if (!isFirebaseConfigured || !auth) {
      return {
        success: false,
        error: 'Firebase no está configurado. Revisa las variables en tu archivo .env'
      };
    }
    try {
      // Cero guardado en localStorage: Persistencia de sesión exclusiva
      await setPersistence(auth, browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email.trim(), pass);

      const now = Date.now();
      sessionStorage.setItem('auth_session_start', String(now));
      sessionStorage.setItem('auth_last_activity', String(now));
      localStorage.clear();

      return { success: true };
    } catch (err: any) {
      let msg = 'Error al iniciar sesión.';
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/user-not-found'
      ) {
        msg = 'Correo electrónico o contraseña incorrectos.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'El formato de correo no es válido.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Demasiados intentos fallidos. Por seguridad, espera unos minutos.';
      } else if (err.code === 'auth/network-request-failed') {
        msg = 'Error de conexión. Verifica tu acceso a internet.';
      }
      return { success: false, error: msg };
    }
  };

  const isAuthenticated = Boolean(user);

  return {
    isAuthenticated,
    userEmail: user?.email || null,
    isFirebaseConfigured,
    isLoading,
    loginWithEmail,
    logout
  };
}
