import { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../infrastructure/firebase';

export function useBarberAuth() {
  const [user, setUser] = useState<User | null>(null);
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
      return {
        success: false,
        error: 'Firebase no está configurado. Revisa las variables en tu archivo .env'
      };
    }
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
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

  const logout = async () => {
    if (auth && isFirebaseConfigured) {
      try {
        await firebaseSignOut(auth);
      } catch (err) {
        console.warn('Error en signout:', err);
      }
    }
    setUser(null);
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
