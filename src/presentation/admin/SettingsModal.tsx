import React, { useState } from 'react';
import {
  X,
  Settings,
  Clock,
  Calendar,
  Phone,
  Scissors,
  Plus,
  Trash2,
  Download,
  Upload,
  Save,
  CheckCircle2,
  FileSpreadsheet,
  FileJson
} from 'lucide-react';
import { ServiceItem, ShopConfig } from '../../domain/models';
import { minutesToTime12h, timeToMinutes, minutesToTime } from '../../domain/scheduleEngine';
import {
  exportAppointmentsToCsv,
  exportAppointmentsToJson,
  readBackupJsonFile
} from '../../infrastructure/backupService';
import { AppointmentRepository } from '../../infrastructure/appointmentRepository';
import { useToast } from '../shared/ToastProvider';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ShopConfig;
  services: ServiceItem[];
  onUpdateConfig: (newConfig: Partial<ShopConfig>) => Promise<void>;
  onAddService: (service: Omit<ServiceItem, 'id'>) => Promise<void>;
  onUpdateService: (id: string, updates: Partial<ServiceItem>) => Promise<void>;
  onDeleteService: (id: string) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  services,
  onUpdateConfig,
  onAddService,
  onUpdateService,
  onDeleteService
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'general' | 'services' | 'backups'>('general');

  // Form states for config
  const [openingTime, setOpeningTime] = useState(minutesToTime(config.openingMinutes));
  const [closingTime, setClosingTime] = useState(minutesToTime(config.closingMinutes));
  const [slotInterval, setSlotInterval] = useState(config.slotIntervalMinutes);
  const [shopPhone, setShopPhone] = useState(config.shopPhone);
  const [shopAddress, setShopAddress] = useState(config.shopAddress);

  // New service form state
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState(150);
  const [newServiceDuration, setNewServiceDuration] = useState(30);
  const [newServiceDesc, setNewServiceDesc] = useState('');

  if (!isOpen) return null;

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    const openMins = timeToMinutes(openingTime);
    const closeMins = timeToMinutes(closingTime);

    if (openMins >= closeMins) {
      showToast('La hora de apertura debe ser anterior a la de cierre.', 'error');
      return;
    }

    await onUpdateConfig({
      openingMinutes: openMins,
      closingMinutes: closeMins,
      slotIntervalMinutes: Number(slotInterval),
      shopPhone: shopPhone.replace(/\D/g, ''),
      shopAddress
    });

    showToast('Configuración guardada.', 'success');
  };

  const handleAddServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) {
      showToast('Ingresa el nombre del servicio.', 'error');
      return;
    }

    await onAddService({
      name: newServiceName.trim(),
      price: Number(newServicePrice),
      durationMinutes: Number(newServiceDuration),
      description: newServiceDesc.trim(),
      isActive: true
    });

    setNewServiceName('');
    setNewServiceDesc('');
    showToast('Nuevo servicio agregado al catálogo.', 'success');
  };

  const handleExportJson = async () => {
    const all = await AppointmentRepository.getAllAppointments();
    exportAppointmentsToJson(all);
    showToast('Respaldo JSON descargado.', 'success');
  };

  const handleExportCsv = async () => {
    const all = await AppointmentRepository.getAllAppointments();
    exportAppointmentsToCsv(all);
    showToast('Citas exportadas a CSV (Excel).', 'success');
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const appointments = await readBackupJsonFile(file);
      const count = await AppointmentRepository.importAppointments(appointments);
      showToast(`¡Se importaron exitosamente ${count} citas!`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#12161D] border border-[#1F2937] rounded-3xl p-4 sm:p-8 max-h-[90vh] overflow-y-auto shadow-2xl">
        
        {/* Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#1A202C] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div className="pb-4 border-b border-[#1F2937] pr-8 sm:pr-0">
          <h3 className="text-xl font-black text-white font-['Space_Grotesk'] flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#76C81C]" />
            Ajustes de la Barbería
          </h3>
          <p className="text-xs text-[#94A3B8] mt-1">
            Personaliza horarios de atención, catálogo de precios y copias de seguridad.
          </p>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 bg-[#090B0E] p-1.5 rounded-2xl my-5 border border-[#1F2937]">
          <button
            onClick={() => setActiveTab('general')}
            className={`min-h-[44px] py-2 px-1 rounded-xl text-[11px] sm:text-xs font-bold text-center transition-all ${
              activeTab === 'general' ? 'bg-[#1A202C] text-[#8CE026] shadow-sm' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Horarios &amp; Info
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`min-h-[44px] py-2 px-1 rounded-xl text-[11px] sm:text-xs font-bold text-center transition-all ${
              activeTab === 'services' ? 'bg-[#1A202C] text-[#8CE026] shadow-sm' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Servicios ({services.length})
          </button>
          <button
            onClick={() => setActiveTab('backups')}
            className={`min-h-[44px] py-2 px-1 rounded-xl text-[11px] sm:text-xs font-bold text-center transition-all ${
              activeTab === 'backups' ? 'bg-[#1A202C] text-[#8CE026] shadow-sm' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Respaldos
          </button>
        </div>

        {/* ===================== TAB 1: HORARIOS Y NEGOCIO ===================== */}
        {activeTab === 'general' && (
          <form onSubmit={handleSaveGeneral} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#D1D5DB] mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#76C81C]" />
                  Hora de Apertura
                </label>
                <input
                  type="time"
                  required
                  value={openingTime}
                  onChange={(e) => setOpeningTime(e.target.value)}
                  className="w-full min-h-[48px] px-4 py-3 bg-[#090B0E] border border-[#1F2937] focus:border-[#76C81C] rounded-2xl text-white outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#D1D5DB] mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#76C81C]" />
                  Hora de Cierre
                </label>
                <input
                  type="time"
                  required
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  className="w-full min-h-[48px] px-4 py-3 bg-[#090B0E] border border-[#1F2937] focus:border-[#76C81C] rounded-2xl text-white outline-none text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#D1D5DB] mb-1.5">
                  Intervalo de Grilla (Minutos)
                </label>
                <select
                  value={slotInterval}
                  onChange={(e) => setSlotInterval(Number(e.target.value))}
                  className="w-full min-h-[48px] px-4 py-3 bg-[#090B0E] border border-[#1F2937] focus:border-[#76C81C] rounded-2xl text-white outline-none text-sm"
                >
                  <option value={15}>15 minutos</option>
                  <option value={20}>20 minutos</option>
                  <option value={30}>30 minutos (Recomendado)</option>
                  <option value={45}>45 minutos</option>
                  <option value={60}>60 minutos (1 hora)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#D1D5DB] mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-[#76C81C]" />
                  WhatsApp de Barbería (10 dígitos)
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={shopPhone}
                  onChange={(e) => setShopPhone(e.target.value)}
                  placeholder="5512345678"
                  className="w-full min-h-[48px] px-4 py-3 bg-[#090B0E] border border-[#1F2937] focus:border-[#76C81C] rounded-2xl text-white outline-none font-mono text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[#D1D5DB] mb-1.5">
                Dirección / Ubicación
              </label>
              <input
                type="text"
                value={shopAddress}
                onChange={(e) => setShopAddress(e.target.value)}
                placeholder="Plaza Shopping - Pasillo Central #12"
                className="w-full min-h-[48px] px-4 py-3 bg-[#090B0E] border border-[#1F2937] focus:border-[#76C81C] rounded-2xl text-white outline-none text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[48px] flex items-center justify-center gap-2 py-3 px-6 rounded-2xl font-bold text-black bg-[#76C81C] hover:bg-[#8CE026] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(118,200,28,0.25)] text-sm"
            >
              <Save className="w-4 h-4" />
              Guardar Cambios de Horario
            </button>
          </form>
        )}

        {/* ===================== TAB 2: CATÁLOGO DE SERVICIOS ===================== */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            {/* Lista actual de servicios */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Servicios Disponibles
              </h4>
              <div className="space-y-2">
                {services.map((srv) => (
                  <div
                    key={srv.id}
                    className="p-3.5 bg-[#090B0E] border border-[#1F2937] rounded-2xl flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{srv.name}</span>
                        <span className="text-xs font-extrabold text-[#76C81C]">
                          ${srv.price} MXN
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#12161D] text-[#94A3B8] border border-[#1F2937]">
                          {srv.durationMinutes} min
                        </span>
                      </div>
                      <p className="text-xs text-[#94A3B8] mt-0.5">{srv.description}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onUpdateService(srv.id, { isActive: !srv.isActive })}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          srv.isActive
                            ? 'bg-[#101E19] text-[#10B981] border-[#10B981]'
                            : 'bg-[#2A1215] text-[#EF4444] border-[#EF4444]'
                        }`}
                      >
                        {srv.isActive ? 'Activo' : 'Oculto'}
                      </button>

                      <button
                        onClick={() => onDeleteService(srv.id)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-colors"
                        title="Eliminar servicio"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Agregar nuevo servicio */}
            <form onSubmit={handleAddServiceSubmit} className="p-4 bg-[#090B0E] border border-[#1F2937] rounded-2xl space-y-3">
              <h4 className="text-sm font-bold text-[#8CE026] flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                Agregar Nuevo Servicio
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-1">
                  <input
                    type="text"
                    required
                    placeholder="Nombre (ej. Fade + Ceja)"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 bg-[#12161D] border border-[#1F2937] focus:border-[#76C81C] rounded-xl text-white outline-none text-xs"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="Precio MXN"
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(Number(e.target.value))}
                    className="w-full min-h-[44px] px-3 py-2 bg-[#12161D] border border-[#1F2937] focus:border-[#76C81C] rounded-xl text-white outline-none text-xs"
                  />
                </div>
                <div>
                  <select
                    value={newServiceDuration}
                    onChange={(e) => setNewServiceDuration(Number(e.target.value))}
                    className="w-full min-h-[44px] px-3 py-2 bg-[#12161D] border border-[#1F2937] focus:border-[#76C81C] rounded-xl text-white outline-none text-xs"
                  >
                    <option value={15}>15 minutos</option>
                    <option value={30}>30 minutos</option>
                    <option value={45}>45 minutos</option>
                    <option value={60}>60 minutos (1h)</option>
                    <option value={90}>90 minutos (1.5h)</option>
                  </select>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Descripción corta del servicio..."
                  value={newServiceDesc}
                  onChange={(e) => setNewServiceDesc(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 bg-[#12161D] border border-[#1F2937] focus:border-[#76C81C] rounded-xl text-white outline-none text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full min-h-[44px] py-2 px-4 rounded-xl font-bold text-black bg-[#76C81C] hover:bg-[#8CE026] text-xs transition-all"
              >
                + Guardar Servicio en Catálogo
              </button>
            </form>
          </div>
        )}

        {/* ===================== TAB 3: RESPALDOS Y DATOS ===================== */}
        {activeTab === 'backups' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#090B0E] border border-[#1F2937] rounded-2xl">
              <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                <Download className="w-4 h-4 text-[#76C81C]" />
                Exportar Datos de la Barbería
              </h4>
              <p className="text-xs text-[#94A3B8] mb-4">
                Descarga una copia completa de tus citas para tu contabilidad o respaldo de emergencia.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="min-h-[48px] flex items-center justify-center gap-2 px-4 py-3 bg-[#1A202C] hover:bg-[#262F3F] border border-[#1F2937] text-white rounded-2xl text-xs font-bold transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#10B981]" />
                  Descargar Planilla CSV (Excel)
                </button>

                <button
                  type="button"
                  onClick={handleExportJson}
                  className="min-h-[48px] flex items-center justify-center gap-2 px-4 py-3 bg-[#1A202C] hover:bg-[#262F3F] border border-[#1F2937] text-white rounded-2xl text-xs font-bold transition-all"
                >
                  <FileJson className="w-4 h-4 text-[#8CE026]" />
                  Descargar Copia JSON Completa
                </button>
              </div>
            </div>

            <div className="p-4 bg-[#090B0E] border border-[#1F2937] rounded-2xl">
              <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                <Upload className="w-4 h-4 text-[#76C81C]" />
                Restaurar o Importar Respaldo JSON
              </h4>
              <p className="text-xs text-[#94A3B8] mb-3">
                Selecciona un archivo JSON generado previamente para restaurar citas.
              </p>

              <label className="min-h-[48px] cursor-pointer flex items-center justify-center gap-2 px-4 py-3 bg-[#12161D] hover:bg-[#1A202C] border border-dashed border-[#76C81C]/50 text-[#8CE026] rounded-2xl text-xs font-bold transition-all">
                <Upload className="w-4 h-4" />
                <span>Seleccionar Archivo JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJson}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
