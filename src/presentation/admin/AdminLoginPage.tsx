import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, KeyRound, Sparkles, AlertCircle, ArrowLeft } from 'lucide-react';
import { useBarberAuth } from '../../application/useBarberAuth';
import { useToast } from '../shared/ToastProvider';

export const AdminLoginPage: React.FC = () => {
  const { loginWithEmail, loginWithPin, isFirebaseConfigured } = useBarberAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'firebase' | 'pin'>(
    isFirebaseConfigured ? 'firebase' : 'pin'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const res = await loginWithEmail(email, password);
    setIsLoading(false);
    if (res.success) {
      showToast('¡Bienvenido de vuelta, Barbero!', 'success');
      navigate('/admin');
    } else {
      showToast(res.error || 'Credenciales inválidas.', 'error');
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = loginWithPin(pin);
    if (res.success) {
      showToast('Acceso correcto vía PIN local.', 'success');
      navigate('/admin');
    } else {
      showToast(res.error || 'PIN incorrecto.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#090B0E] flex flex-col items-center justify-center p-4 font-['Plus_Jakarta_Sans'] relative overflow-hidden">
      
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#76C81C]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Botón Volver */}
      <div className="w-full max-w-md mb-4 flex justify-between items-center">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-[#76C81C] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a la vista de clientes
        </button>
      </div>

      {/* Tarjeta de Login */}
      <div className="w-full max-w-md bg-[#12161D] border border-[#1F2937] rounded-3xl p-5 sm:p-8 shadow-[0_0_35px_rgba(0,0,0,0.8)] relative z-10">
        
        {/* Logo oficial y título */}
        <div className="text-center pb-6 border-b border-[#1F2937]">
          <div className="relative inline-block mb-3">
            <img
              src="/logo-barber.jpeg"
              alt="BARBER Y SHOPPING"
              className="w-20 h-20 rounded-full object-cover border-2 border-[#76C81C] shadow-[0_0_20px_rgba(118,200,28,0.4)] mx-auto"
            />
            <span className="absolute bottom-1 right-1 w-4 h-4 bg-[#76C81C] border-2 border-[#12161D] rounded-full animate-pulse" />
          </div>

          <h2 className="text-2xl font-black text-[#F8FAFC] font-['Space_Grotesk'] tracking-wide">
            BARBER <span className="text-[#76C81C]">&amp;</span> SHOPPING
          </h2>
          <p className="text-xs text-[#94A3B8] mt-1 font-medium">
            Panel de Control y Agenda en Tiempo Real
          </p>
        </div>

        {/* Tabs de Autenticación */}
        <div className="grid grid-cols-2 gap-1 bg-[#090B0E] p-1 rounded-2xl my-6 border border-[#1F2937]">
          {isFirebaseConfigured && (
            <button
              onClick={() => setActiveTab('firebase')}
              className={`min-h-[44px] py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'firebase'
                  ? 'bg-[#1A202C] text-[#8CE026] shadow-sm'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Firebase Auth
            </button>
          )}

          <button
            onClick={() => setActiveTab('pin')}
            className={`min-h-[44px] py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'pin' || !isFirebaseConfigured
                ? 'bg-[#1A202C] text-[#8CE026] shadow-sm'
                : 'text-[#94A3B8] hover:text-white'
            } ${!isFirebaseConfigured ? 'col-span-2' : ''}`}
          >
            PIN Rápido Local {isFirebaseConfigured ? '' : '(Modo Activo)'}
          </button>
        </div>

        {/* Formulario Firebase */}
        {activeTab === 'firebase' && isFirebaseConfigured && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#D1D5DB] mb-2 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#76C81C]" />
                Correo de Barbero
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@barberyshopping.com"
                className="w-full min-h-[48px] px-4 py-3 bg-[#090B0E] border border-[#1F2937] focus:border-[#76C81C] rounded-2xl text-white outline-none text-sm placeholder-[#64748B]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#D1D5DB] mb-2 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-[#76C81C]" />
                Contraseña
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full min-h-[48px] px-4 py-3 bg-[#090B0E] border border-[#1F2937] focus:border-[#76C81C] rounded-2xl text-white outline-none text-sm placeholder-[#64748B]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[48px] mt-2 py-3 px-6 rounded-2xl font-bold text-black bg-[#76C81C] hover:bg-[#8CE026] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(118,200,28,0.25)] disabled:opacity-50 text-sm"
            >
              {isLoading ? 'Iniciando sesión...' : 'Entrar al Tablero'}
            </button>
          </form>
        )}

        {/* Formulario PIN */}
        {(activeTab === 'pin' || !isFirebaseConfigured) && (
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#D1D5DB] mb-2 flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5 text-[#76C81C]" />
                PIN de Acceso (Por defecto: 1234)
              </label>
              <input
                type="password"
                required
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="1234"
                className="w-full min-h-[48px] px-4 py-3 bg-[#090B0E] border border-[#1F2937] focus:border-[#76C81C] rounded-2xl text-white outline-none text-center font-mono text-xl tracking-widest placeholder-[#64748B]"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[48px] mt-2 py-3 px-6 rounded-2xl font-bold text-black bg-[#76C81C] hover:bg-[#8CE026] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(118,200,28,0.25)] text-sm"
            >
              Ingresar con PIN
            </button>
          </form>
        )}

        {!isFirebaseConfigured && (
          <div className="mt-6 p-3 bg-[#1A202C]/60 border border-[#1F2937] rounded-2xl text-[11px] text-[#94A3B8] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
            <span>
              Operando en modo de prueba local (IndexedDB). Para conectar Firebase Firestore y sincronizar entre dispositivos celulares en la nube, revisa el archivo <strong className="text-white">.env.example</strong>.
            </span>
          </div>
        )}

      </div>
    </div>
  );
};
