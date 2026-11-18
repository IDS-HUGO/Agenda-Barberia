import { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../infrastructure/firebase';

const LOCAL_SESSION_KEY = 'barber_admin_local_session';
const DEFAULT_FALLBACK_PIN = import.meta.env.VITE_ADMIN_FALLBACK_PIN || '1234';

export function useBarberAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isPinAuthenticated, setIsPinAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem(LOCAL_SESSION_KEY) === 'true';
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
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
      return { success: false, error: 'Firebase no está configurado todavía.' };
    }
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      return { success: true };
    } catch (err: any) {
      let msg = 'Error al iniciar sesión.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        msg = 'Correo electrónico o contraseña incorrectos.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Demasiados intentos fallidos. Intenta más tarde.';
      }
      return { success: false, error: msg };
    }
  };

  const loginWithPin = (pin: string): { success: boolean; error?: string } => {
    if (pin.trim() === DEFAULT_FALLBACK_PIN.trim()) {
      sessionStorage.setItem(LOCAL_SESSION_KEY, 'true');
      setIsPinAuthenticated(true);
      return { success: true };
    }
    return { success: false, error: 'PIN incorrecto. El PIN por defecto es 1234.' };
  };

  const logout = async () => {
    sessionStorage.removeItem(LOCAL_SESSION_KEY);
    setIsPinAuthenticated(false);
    if (auth && isFirebaseConfigured) {
      try {
        await firebaseSignOut(auth);
      } catch (err) {
        console.warn('Error en signout:', err);
      }
    }
  };

  const isAuthenticated = Boolean(user || isPinAuthenticated);
  const authMode: 'firebase' | 'pin' | 'none' = user ? 'firebase' : isPinAuthenticated ? 'pin' : 'none';

  return {
    isAuthenticated,
    userEmail: user?.email || (isPinAuthenticated ? 'Modo PIN Local' : null),
    authMode,
    isFirebaseConfigured,
    isLoading,
    loginWithEmail,
    loginWithPin,
    logout
  };
}
