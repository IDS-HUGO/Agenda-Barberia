import React, { useState } from 'react';
import {
  CheckCircle2,
  MessageCircle,
  Copy,
  Check,
  Calendar,
  Clock,
  Scissors,
  User,
  Phone,
  MapPin,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { Appointment, ShopConfig } from '../../domain/models';
import { formatFriendlyDate, minutesToTime12h } from '../../domain/scheduleEngine';
import { buildClientConfirmationWhatsAppUrl } from '../../infrastructure/whatsappService';
import { useToast } from '../shared/ToastProvider';

interface BookingReceiptProps {
  appointment: Appointment;
  shopConfig: ShopConfig;
  onNewBooking: () => void;
  onCancelBooking?: (id: string, date: string, folio: string) => Promise<boolean>;
}

export const BookingReceipt: React.FC<BookingReceiptProps> = ({
  appointment,
  shopConfig,
  onNewBooking,
  onCancelBooking
}) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isCancelled, setIsCancelled] = useState(appointment.status === 'cancelled');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const copyFolio = () => {
    navigator.clipboard.writeText(appointment.folio);
    setCopied(true);
    showToast('¡Folio copiado al portapapeles!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancelClick = async () => {
    if (!onCancelBooking) return;
    setIsCancelling(true);
    const success = await onCancelBooking(appointment.id, appointment.date, appointment.folio);
    setIsCancelling(false);
    if (success) {
      setIsCancelled(true);
      setShowCancelModal(false);
    }
  };

  const whatsappUrl = buildClientConfirmationWhatsAppUrl(
    appointment,
    shopConfig.shopPhone
  );

  return (
    <div className="max-w-lg mx-auto p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-300">
      
      {/* Tarjeta de Comprobante Estilo Ticket Alienígena */}
      <div className={`relative bg-[#12161D] border-2 rounded-3xl p-5 sm:p-8 shadow-[0_0_35px_rgba(0,0,0,0.8)] overflow-hidden transition-all ${
        isCancelled ? 'border-red-900/50 opacity-90' : 'border-[#76C81C]/40'
      }`}>
        
        {/* Glow de fondo */}
        <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
          isCancelled ? 'bg-red-900/10' : 'bg-[#76C81C]/10'
        }`} />

        {/* Cabecera del Comprobante */}
        <div className="text-center pb-6 border-b border-[#1F2937]">
          <div className={`inline-flex p-3 rounded-full mb-3 border ${
            isCancelled
              ? 'bg-red-950/60 border-red-500/50 text-red-400'
              : 'bg-[#101E19] border-[#10B981] text-[#10B981]'
          }`}>
            {isCancelled ? <XCircle className="w-10 h-10" /> : <CheckCircle2 className="w-10 h-10" />}
          </div>

          <h2 className="text-2xl font-extrabold text-[#F8FAFC] font-['Space_Grotesk'] tracking-tight">
            {isCancelled ? 'CITA CANCELADA' : '¡CITA CONFIRMADA!'}
          </h2>
          <p className="text-sm text-[#94A3B8] mt-1">
            {isCancelled ? (
              <span className="text-red-400 font-semibold">Esta cita ha sido cancelada y el horario fue liberado.</span>
            ) : (
              <>Tu lugar en <span className="text-[#76C81C] font-semibold">BARBER Y SHOPPING</span> ha quedado reservado.</>
            )}
          </p>

          {/* Folio Destacado */}
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#090B0E] border border-[#1F2937] rounded-2xl">
            <span className="text-xs text-[#94A3B8] font-bold uppercase tracking-wider">Folio:</span>
            <span className={`text-base font-mono font-black tracking-wider ${
              isCancelled ? 'text-gray-400 line-through' : 'text-[#8CE026]'
            }`}>
              {appointment.folio}
            </span>
            <button
              onClick={copyFolio}
              className="p-1 hover:text-[#76C81C] text-gray-400 transition-colors"
              title="Copiar folio"
            >
              {copied ? <Check className="w-4 h-4 text-[#10B981]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Detalles de la Reserva */}
        <div className="py-6 space-y-4 border-b border-[#1F2937]">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#94A3B8] flex items-center gap-2">
              <User className="w-4 h-4 text-[#76C81C]" />
              Cliente
            </span>
            <span className="font-semibold text-white">{appointment.clientName}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-[#94A3B8] flex items-center gap-2">
              <Scissors className="w-4 h-4 text-[#76C81C]" />
              Barbero Asignado
            </span>
            <span className="font-extrabold text-[#76C81C]">
              {appointment.barberName || 'Barbero 1'}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-[#94A3B8] flex items-center gap-2">
              <Scissors className="w-4 h-4 text-[#76C81C]" />
              Servicio
            </span>
            <span className="font-semibold text-white text-right">
              {appointment.serviceName}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-[#94A3B8] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#76C81C]" />
              Fecha
            </span>
            <span className="font-semibold text-white">
              {formatFriendlyDate(appointment.date)}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-[#94A3B8] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#76C81C]" />
              Horario
            </span>
            <span className={`font-bold ${isCancelled ? 'text-gray-400 line-through' : 'text-[#8CE026]'}`}>
              {minutesToTime12h(appointment.startMinutes)} ({appointment.startTime} hrs)
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-[#94A3B8] flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#76C81C]" />
              WhatsApp Registrado
            </span>
            <span className="font-mono text-white">{appointment.clientPhone}</span>
          </div>

          {shopConfig.shopAddress && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#94A3B8] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#76C81C]" />
                Ubicación
              </span>
              <span className="text-white text-right text-xs max-w-[200px]">
                {shopConfig.shopAddress}
              </span>
            </div>
          )}

          {/* Precio Total */}
          <div className="pt-2 flex items-center justify-between bg-[#090B0E]/60 p-3.5 rounded-2xl border border-[#1F2937]">
            <span className="text-sm font-bold text-[#D1D5DB]">Total:</span>
            <span className={`text-xl font-extrabold ${isCancelled ? 'text-gray-400 line-through' : 'text-[#76C81C]'}`}>
              ${appointment.price} MXN
            </span>
          </div>
        </div>

        {/* Botones de Acción (Fitts' Law min-h-[48px]) */}
        <div className="pt-6 space-y-3">
          {!isCancelled && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[48px] flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-black bg-[#25D366] hover:bg-[#22bf5b] transition-all shadow-lg shadow-[#25D366]/20 active:scale-[0.98]"
            >
              <MessageCircle className="w-5 h-5 fill-current" />
              Enviar Confirmación por WhatsApp
            </a>
          )}

          <button
            onClick={onNewBooking}
            className={`w-full min-h-[48px] flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${
              isCancelled
                ? 'bg-[#76C81C] hover:bg-[#8CE026] text-black shadow-lg shadow-[#76C81C]/20'
                : 'text-[#D1D5DB] bg-[#1A202C] hover:bg-[#262F3F] border border-[#1F2937]'
            }`}
          >
            {isCancelled ? 'Agendar nueva cita' : 'Agendar otra cita'}
          </button>

          {/* Botón para Cancelar Cita (Solo visible si la cita está confirmada) */}
          {!isCancelled && onCancelBooking && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="w-full min-h-[48px] flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-red-400 hover:text-red-300 bg-[#2A1215]/50 hover:bg-[#2A1215] border border-red-900/40 transition-all text-xs"
            >
              <XCircle className="w-4 h-4 shrink-0" />
              Cancelar esta Cita
            </button>
          )}
        </div>

      </div>

      <p className="text-center text-xs text-[#94A3B8] mt-4">
        Guarda tu folio para cualquier aclaración o modificación con tu barbero.
      </p>

      {/* Modal de Confirmación de Cancelación para el Cliente */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#12161D] border border-red-900/60 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="inline-flex p-3 rounded-2xl bg-red-950/60 border border-red-900/50 text-red-400 mb-1">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
              ¿Deseas cancelar tu cita?
            </h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Tu horario quedará disponible de inmediato para que otra persona pueda agendarlo.
            </p>

            <div className="space-y-2 pt-2">
              <button
                disabled={isCancelling}
                onClick={handleCancelClick}
                className="w-full min-h-[48px] py-3 px-4 rounded-2xl bg-[#DC2626] hover:bg-[#EF4444] text-white font-bold text-xs shadow-lg shadow-red-950/50 transition-all flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                <span>{isCancelling ? 'Cancelando...' : 'Sí, Cancelar mi Cita'}</span>
              </button>
              <button
                disabled={isCancelling}
                onClick={() => setShowCancelModal(false)}
                className="w-full min-h-[48px] py-3 px-4 rounded-2xl bg-[#1A202C] hover:bg-[#262F3F] text-[#D1D5DB] font-bold text-xs transition-all"
              >
                No, Mantener mi Cita
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
