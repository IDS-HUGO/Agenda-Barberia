import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Download, Copy, Check, QrCode, Sparkles } from 'lucide-react';
import { useToast } from '../shared/ToastProvider';

interface QrShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QrShareModal: React.FC<QrShareModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<SVGSVGElement | null>(null);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : 'https://barberyshopping.com/';

  const copyUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    showToast('Enlace copiado al portapapeles', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQrPng = () => {
    const svg = qrRef.current;
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    // Alta resolución para imprimir en espejo de barbería (800x1000)
    canvas.width = 800;
    canvas.height = 1000;

    img.onload = () => {
      if (!ctx) return;
      // Fondo negro espacial
      ctx.fillStyle = '#090B0E';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Borde decorativo alien
      ctx.strokeStyle = '#76C81C';
      ctx.lineWidth = 8;
      ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

      // Título
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 44px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BARBER & SHOPPING', canvas.width / 2, 120);

      ctx.fillStyle = '#76C81C';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText('AGENDA TU CITA EN VIVO', canvas.width / 2, 170);

      // Dibujar QR con padding blanco para lectura óptima de cámaras
      const qrSize = 520;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = 230;

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40, 24);
      ctx.fill();

      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

      // Subtítulo inferior
      ctx.fillStyle = '#D1D5DB';
      ctx.font = '22px sans-serif';
      ctx.fillText('Escanea con la cámara de tu celular', canvas.width / 2, 850);
      ctx.fillStyle = '#94A3B8';
      ctx.font = '18px sans-serif';
      ctx.fillText('Sin descargas • Sin registro • 100% Gratis', canvas.width / 2, 890);

      // Descargar
      const link = document.createElement('a');
      link.download = 'QR_Oficial_Barber_Y_Shopping.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('¡Código QR descargado en alta resolución!', 'success');
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#12161D] border border-[#76C81C]/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_40px_rgba(118,200,28,0.2)]">
        
        {/* Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#1A202C] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div className="text-center pb-4">
          <div className="inline-flex p-3 rounded-2xl bg-[#76C81C]/10 border border-[#76C81C]/30 text-[#8CE026] mb-3">
            <QrCode className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-extrabold text-white font-['Space_Grotesk']">
            Código QR Oficial de la Barbería
          </h3>
          <p className="text-xs text-[#94A3B8] mt-1">
            Imprímelo y pégalo en el espejo para que tus clientes agenden desde su teléfono.
          </p>
        </div>

        {/* QR Preview Box */}
        <div className="p-6 my-4 bg-white rounded-3xl flex items-center justify-center shadow-inner max-w-[260px] mx-auto">
          <QRCodeSVG
            ref={qrRef}
            value={currentUrl}
            size={220}
            level="H"
            includeMargin={false}
          />
        </div>

        {/* Enlace y botón copiar */}
        <div className="flex items-center gap-2 p-2.5 bg-[#090B0E] border border-[#1F2937] rounded-2xl mb-6">
          <input
            type="text"
            readOnly
            value={currentUrl}
            className="w-full bg-transparent text-xs text-[#D1D5DB] outline-none font-mono px-2"
          />
          <button
            onClick={copyUrl}
            className="p-2 bg-[#1A202C] hover:bg-[#262F3F] text-white rounded-xl transition-colors shrink-0"
            title="Copiar URL"
          >
            {copied ? <Check className="w-4 h-4 text-[#10B981]" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Botón Descargar PNG */}
        <button
          onClick={downloadQrPng}
          className="w-full min-h-[48px] flex items-center justify-center gap-2 py-3 px-6 rounded-2xl font-bold text-black bg-[#76C81C] hover:bg-[#8CE026] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(118,200,28,0.25)] text-sm"
        >
          <Download className="w-5 h-5" />
          Descargar QR en PNG (Listo para Imprimir)
        </button>

      </div>
    </div>
  );
};
