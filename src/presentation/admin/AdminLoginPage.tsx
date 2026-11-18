import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useBarberAuth } from '../../application/useBarberAuth';
import { useToast } from '../shared/ToastProvider';

export const AdminLoginPage: React.FC = () => {
  const { loginWithEmail, isFirebaseConfigured } = useBarberAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  return (
    <div className="min-h-screen bg-[#090B0E] flex flex-col items-center justify-center p-4 font-['Plus_Jakarta_Sans'] relative overflow-hidden safe-pb">
      
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
        <div className="text-center pb-5 sm:pb-6 border-b border-[#1F2937]">
          <div className="relative inline-block mb-3">
            <img
              src="/logo-barber.jpeg"
              alt="BARBER Y SHOPPING"
              className="w-20 h-20 rounded-full object-cover border-2 border-[#76C81C] shadow-[0_0_20px_rgba(118,200,28,0.4)] mx-auto"
            />
            <span className="absolute bottom-1 right-1 w-4 h-4 bg-[#76C81C] border-2 border-[#12161D] rounded-full animate-pulse" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-[#F8FAFC] font-['Space_Grotesk'] tracking-wide">
            BARBER <span className="text-[#76C81C]">&amp;</span> SHOPPING
          </h2>
          <p className="text-xs text-[#94A3B8] mt-1 font-medium flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#76C81C]" />
            Acceso Privado para el Barbero
          </p>
        </div>

        {/* Formulario Seguro Firebase Auth */}
        <form onSubmit={handleEmailSubmit} className="space-y-4 mt-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#D1D5DB] mb-2 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#76C81C]" />
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@barberyshopping.com"
              className="w-full min-h-[48px] px-4 py-3 bg-[#090B0E] border border-[#1F2937] focus:border-[#76C81C] rounded-2xl text-white outline-none text-base sm:text-sm placeholder-[#64748B] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#D1D5DB] mb-2 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-[#76C81C]" />
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full min-h-[48px] px-4 py-3 pr-12 bg-[#090B0E] border border-[#1F2937] focus:border-[#76C81C] rounded-2xl text-white outline-none text-base sm:text-sm placeholder-[#64748B] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[48px] mt-4 py-3 px-6 rounded-2xl font-bold text-black bg-[#76C81C] hover:bg-[#8CE026] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(118,200,28,0.25)] disabled:opacity-50 text-sm flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Verificando credenciales...</span>
              </>
            ) : (
              'Ingresar al Panel'
            )}
          </button>
        </form>

        <p className="text-[11px] text-[#64748B] text-center mt-6">
          Protegido con Firebase Authentication &amp; Cifrado SSL
        </p>

      </div>
    </div>
  );
};
