import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Calendar, Volume2, VolumeX, LogOut } from 'lucide-react';

interface HeaderProps {
  isAdmin?: boolean;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onLogout?: () => void;
  userEmail?: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  isAdmin = false,
  soundEnabled,
  onToggleSound,
  onLogout,
  userEmail
}) => {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 bg-[#090B0E]/95 backdrop-blur-md border-b border-[#1F2937] transition-all safe-pt">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
        
        {/* Brand & Logo */}
        <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group shrink min-w-0">
          <div className="relative shrink-0">
            <img
              src="/logo-barber.jpeg"
              alt="Logo BARBER Y SHOPPING"
              className="w-9 h-9 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-[#76C81C] shadow-[0_0_12px_rgba(118,200,28,0.35)] group-hover:scale-105 transition-transform"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-[#76C81C] border-2 border-[#090B0E] rounded-full animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-lg font-extrabold tracking-wide sm:tracking-wider text-[#F8FAFC] font-['Space_Grotesk'] truncate">
                BARBER <span className="text-[#76C81C]">&amp;</span> SHOPPING
              </h1>
            </div>
            <p className="text-[10px] sm:text-xs text-[#94A3B8] font-medium flex items-center gap-1.5 truncate">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#10B981] shrink-0" />
              <span className="truncate">
                {isAdmin ? (userEmail ? `Admin: ${userEmail}` : 'Panel Barbero') : 'Citas en Tiempo Real'}
              </span>
            </p>
          </div>
        </Link>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isAdmin ? (
            <>
              {onToggleSound !== undefined && (
                <button
                  onClick={onToggleSound}
                  title={soundEnabled ? 'Silenciar alertas' : 'Activar alertas de sonido'}
                  className={`p-2 sm:p-2.5 rounded-xl border transition-all ${
                    soundEnabled
                      ? 'bg-[#101E19] border-[#10B981] text-[#76C81C]'
                      : 'bg-[#12161D] border-[#1F2937] text-[#94A3B8]'
                  }`}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
              )}

              <Link
                to="/"
                title="Ver vista pública de clientes"
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-semibold rounded-xl bg-[#12161D] hover:bg-[#1A202C] border border-[#1F2937] text-[#D1D5DB] transition-all"
              >
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#76C81C]" />
                <span className="hidden md:inline">Ver como Cliente</span>
                <span className="md:hidden">Público</span>
              </Link>

              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Cerrar sesión"
                  className="p-2 sm:p-2.5 rounded-xl bg-[#12161D] hover:bg-red-950/40 border border-[#1F2937] hover:border-red-500/50 text-[#94A3B8] hover:text-red-400 transition-all"
                >
                  <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}
            </>
          ) : (
            <Link
              to="/admin"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#12161D] hover:bg-[#1A202C] border border-[#1F2937] text-[#D1D5DB] hover:text-white transition-all shadow-sm"
            >
              <ShieldCheck className="w-4 h-4 text-[#76C81C]" />
              <span className="hidden sm:inline">Acceso Barbero</span>
              <span className="sm:hidden">Admin</span>
            </Link>
          )}
        </div>

      </div>
    </header>
  );
};
