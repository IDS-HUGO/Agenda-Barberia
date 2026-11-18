import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Download, Copy, Check, QrCode, Sparkles, ExternalLink } from 'lucide-react';
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

    // Alta resolución para imprimir en espejo o mostrador (800x1000 px a 300 DPI)
    canvas.width = 800;
    canvas.height = 1000;

    img.onload = () => {
      if (!ctx) return;
      // Fondo negro premium
      ctx.fillStyle = '#090B0E';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Borde decorativo verde neón
      ctx.strokeStyle = '#76C81C';
      ctx.lineWidth = 8;
      ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

      // Título oficial
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 44px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BARBER & SHOPPING', canvas.width / 2, 115);

      ctx.fillStyle = '#76C81C';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('AGENDA TU CITA EN VIVO', canvas.width / 2, 160);

      // Marco blanco para lectura óptima de cualquier cámara de celular
      const qrSize = 500;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = 210;

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(qrX - 25, qrY - 25, qrSize + 50, qrSize + 50, 28);
      ctx.fill();

      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

      const finishDownload = () => {
        // Subtítulo inferior
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('Escanea con la cámara de tu celular', canvas.width / 2, 825);

        ctx.fillStyle = '#8CE026';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('Sin descargas • Sin registro • 100% Gratis', canvas.width / 2, 865);

        ctx.fillStyle = '#94A3B8';
        ctx.font = 'bold 15px monospace';
        ctx.fillText(currentUrl, canvas.width / 2, 910);

        // Descargar PNG
        const link = document.createElement('a');
        link.download = 'QR_Oficial_Barber_Y_Shopping.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('¡Código QR permanente descargado en alta resolución!', 'success');
      };

      // Intentar dibujar el logo circular en el centro del QR
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';

      logoImg.onload = () => {
        const logoSize = 100;
        const logoX = (canvas.width - logoSize) / 2;
        const logoY = qrY + (qrSize - logoSize) / 2;

        ctx.save();
        // Círculo blanco de contorno
        ctx.beginPath();
        ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 6, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#76C81C';
        ctx.stroke();

        // Recorte circular del logo
        ctx.beginPath();
        ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
        ctx.restore();

        finishDownload();
      };

      logoImg.onerror = () => {
        finishDownload();
      };

      logoImg.src = '/logo-barber.jpeg';
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
            Código QR estático y permanente. Nunca caduca ni deja de funcionar.
          </p>
        </div>

        {/* QR Preview Box con Logo Central */}
        <div className="p-6 my-4 bg-white rounded-3xl flex items-center justify-center shadow-inner max-w-[260px] mx-auto">
          <QRCodeSVG
            ref={qrRef}
            value={currentUrl}
            size={220}
            level="H"
            includeMargin={false}
            imageSettings={{
              src: '/logo-barber.jpeg',
              height: 48,
              width: 48,
              excavate: true
            }}
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
          Descargar Cartel QR en PNG (Listo para Imprimir)
        </button>

      </div>
    </div>
  );
};
