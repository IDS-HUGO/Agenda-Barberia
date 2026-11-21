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
  FileJson,
  FileText,
  UserCheck
} from 'lucide-react';
import { Barber, ServiceItem, ShopConfig } from '../../domain/models';
import { minutesToTime12h, timeToMinutes, minutesToTime } from '../../domain/scheduleEngine';
import {
  exportAppointmentsToCsv,
  exportAppointmentsToJson,
  exportAppointmentsToPdf,
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
  onUpdateBarbers?: (barbers: Barber[]) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  services,
  onUpdateConfig,
  onAddService,
  onUpdateService,
  onDeleteService,
  onUpdateBarbers
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'general' | 'barbers' | 'services' | 'backups'>('general');

  // Form states for general config
  const [openingTime, setOpeningTime] = useState(minutesToTime(config.weekdayOpeningMinutes ?? 570));
  const [closingTime, setClosingTime] = useState(minutesToTime(config.weekdayClosingMinutes ?? 1140));
  const [sundayOpeningTime, setSundayOpeningTime] = useState(minutesToTime(config.sundayOpeningMinutes ?? 570));
  const [sundayClosingTime, setSundayClosingTime] = useState(minutesToTime(config.sundayClosingMinutes ?? 900));
  const [slotInterval, setSlotInterval] = useState(config.slotIntervalMinutes ?? 40);
  const [shopPhone, setShopPhone] = useState(config.shopPhone);
  const [shopAddress, setShopAddress] = useState(config.shopAddress);

  // Form states for barbers
  const [barberList, setBarberList] = useState<Barber[]>(config.barbers || []);
  const [newBarberName, setNewBarberName] = useState('');

  // Sync barber list & general settings if config changes
  React.useEffect(() => {
    if (config) {
      if (config.barbers) {
        setBarberList(config.barbers);
      }
      setOpeningTime(minutesToTime(config.weekdayOpeningMinutes ?? 570));
      setClosingTime(minutesToTime(config.weekdayClosingMinutes ?? 1140));
      setSundayOpeningTime(minutesToTime(config.sundayOpeningMinutes ?? 570));
      setSundayClosingTime(minutesToTime(config.sundayClosingMinutes ?? 900));
      setSlotInterval(config.slotIntervalMinutes ?? 40);
      setShopPhone(config.shopPhone || '');
      setShopAddress(config.shopAddress || '');
    }
  }, [config]);

  // New service form state
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState(180);
  const [newServiceDuration, setNewServiceDuration] = useState(40);
  const [newServiceDesc, setNewServiceDesc] = useState('');

  if (!isOpen) return null;

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    const openMins = timeToMinutes(openingTime);
    const closeMins = timeToMinutes(closingTime);
    const sunOpenMins = timeToMinutes(sundayOpeningTime);
    const sunCloseMins = timeToMinutes(sundayClosingTime);

    if (openMins >= closeMins) {
      showToast('La hora de apertura (Lun-Sáb) debe ser anterior a la de cierre.', 'error');
      return;
    }
    if (sunOpenMins >= sunCloseMins) {
      showToast('La hora de apertura del domingo debe ser anterior a la de cierre.', 'error');
      return;
    }

    await onUpdateConfig({
      weekdayOpeningMinutes: openMins,
      weekdayClosingMinutes: closeMins,
      sundayOpeningMinutes: sunOpenMins,
      sundayClosingMinutes: sunCloseMins,
      slotIntervalMinutes: Number(slotInterval),
      shopPhone: shopPhone.replace(/\D/g, ''),
      shopAddress
    });

    showToast('Horarios y configuración guardados.', 'success');
  };

  const handleBarberNameChange = (id: string, newName: string) => {
    setBarberList((prev) =>
      prev.map((b) => (b.id === id ? { ...b, name: newName } : b))
    );
  };

  const handleToggleBarberActive = (id: string) => {
    setBarberList((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isActive: !b.isActive } : b))
    );
  };

  const handleAddBarber = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBarberName.trim()) {
      showToast('Escribe el nombre del nuevo barbero.', 'error');
      return;
    }
    const colors = ['#76C81C', '#38BDF8', '#F59E0B', '#EC4899', '#A855F7', '#10B981'];
    const newBarber: Barber = {
      id: `barber-${Date.now()}`,
      name: newBarberName.trim(),
      color: colors[barberList.length % colors.length],
      isActive: true
    };
    setBarberList((prev) => [...prev, newBarber]);
    setNewBarberName('');
    showToast(`Barbero ${newBarber.name} agregado. Recuerda hacer clic en "Guardar Cambios".`, 'info');
  };

  const handleDeleteBarber = (id: string) => {
    if (barberList.length <= 1) {
      showToast('Debe existir al menos un barbero.', 'error');
      return;
    }
    setBarberList((prev) => prev.filter((b) => b.id !== id));
  };

  const handleSaveBarbers = async () => {
    if (onUpdateBarbers) {
      await onUpdateBarbers(barberList);
    } else {
      await onUpdateConfig({ barbers: barberList });
    }
    showToast('Equipo de barberos guardado exitosamente.', 'success');
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

  const handleExportPdf = async () => {
    const all = await AppointmentRepository.getAllAppointments();
    exportAppointmentsToPdf(all, 'Historial Completo de Citas');
    showToast('Reporte PDF generado.', 'success');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#12161D] border border-[#1F2937] rounded-3xl p-4 sm:p-7 max-h-[90dvh] overflow-y-auto shadow-2xl">
        
        {/* Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#1A202C] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div className="pb-3 border-b border-[#1F2937] pr-8 sm:pr-0">
          <h3 className="text-lg sm:text-xl font-black text-white font-['Space_Grotesk'] flex items-center gap-2">
            <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-[#76C81C]" />
            Ajustes de la Barbería
          </h3>
          <p className="text-xs text-[#94A3B8] mt-1">
            Personaliza horarios, equipo de barberos, servicios y respaldos.
          </p>
        </div>

        {/* Tabs Responsivos (2x2 en mobile, 4 en desktop) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 bg-[#090B0E] p-1.5 rounded-2xl my-4 sm:my-5 border border-[#1F2937]">
          <button
            onClick={() => setActiveTab('general')}
            className={`min-h-[44px] py-2 px-2 rounded-xl text-xs font-bold text-center transition-all ${
              activeTab === 'general' ? 'bg-[#1A202C] text-[#8CE026] shadow-sm' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Horarios
          </button>
          <button
            onClick={() => setActiveTab('barbers')}
            className={`min-h-[44px] py-2 px-2 rounded-xl text-xs font-bold text-center transition-all ${
              activeTab === 'barbers' ? 'bg-[#1A202C] text-[#8CE026] shadow-sm' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Barberos ({barberList.length})
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`min-h-[44px] py-2 px-2 rounded-xl text-xs font-bold text-center transition-all ${
              activeTab === 'services' ? 'bg-[#1A202C] text-[#8CE026] shadow-sm' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Servicios ({services.length})
          </button>
          <button
            onClick={() => setActiveTab('backups')}
            className={`min-h-[44px] py-2 px-2 rounded-xl text-xs font-bold text-center transition-all ${
              activeTab === 'backups' ? 'bg-[#1A202C] text-[#8CE026] shadow-sm' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Respaldos
          </button>
        </div>

        {/* ===================== TAB 1: HORARIOS Y NEGOCIO ===================== */}
        {activeTab === 'general' && (
          <form onSubmit={handleSaveGeneral} className="space-y-4">
            
            {/* Horario Lunes a Sábado */}
            <div className="p-3.5 bg-[#090B0E] border border-[#1F2937] rounded-2xl space-y-3">
              <span className="text-xs font-bold text-[#8CE026] uppercase tracking-wider block">
                Horario Lunes a Sábado (09:30 AM - 07:00 PM)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#D1D5DB] mb-1">
                    Apertura
                  </label>
                  <input
                    type="time"
                    required
                    value={openingTime}
                    onChange={(e) => setOpeningTime(e.target.value)}
                    className="w-full min-h-[48px] px-3.5 py-2.5 bg-[#12161D] border border-[#1F2937] focus:border-[#76C81C] rounded-2xl text-white outline-none text-base sm:text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#D1D5DB] mb-1">
                    Cierre
                  </label>
                  <input
                    type="time"
                    required
                    value={closingTime}
                    onChange={(e) => setClosingTime(e.target.value)}
                    className="w-full min-h-[48px] px-3.5 py-2.5 bg-[#12161D] border border-[#1F2937] focus:border-[#76C81C] rounded-2xl text-white outline-none text-base sm:text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Horario Domingo */}
            <div className="p-3.5 bg-[#090B0E] border border-[#1F2937] rounded-2xl space-y-3">
              <span className="text-xs font-bold text-[#F59E0B] uppercase tracking-wider block">
                Horario Domingos (09:30 AM - 03:00 PM)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#D1D5DB] mb-1">
                    Apertura Domingo
                  </label>
                  <input
                    type="time"
                    required
                    value={sundayOpeningTime}
                    onChange={(e) => setSundayOpeningTime(e.target.value)}
                    className="w-full min-h-[48px] px-3.5 py-2.5 bg-[#12161D] border border-[#1F2937] focus:border-[#76C81C] rounded-2xl text-white outline-none text-base sm:text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#D1D5DB] mb-1">
                    Cierre Domingo
                  </label>
                  <input
                    type="time"
                    required
                    value={sundayClosingTime}
                    onChange={(e) => setSundayClosingTime(e.target.value)}
                    className="w-full min-h-[48px] px-3.5 py-2.5 bg-[#12161D] border border-[#1F2937] focus:border-[#76C81C] rounded-2xl text-white outline-none text-base sm:text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-[#D1D5DB] mb-1.5">
                  Intervalo de Cita (40 min por corte)
                </label>
                <select
                  value={slotInterval}
                  onChange={(e) => setSlotInterval(Number(e.target.value))}
                  className="w-full min-h-[48px] px-3.5 py-2.5 bg-[#090B0E] border border-[#1F2937] focus:border-[#76C81C] rounded-2xl text-white outline-none text-base sm:text-xs"
                >
                  <option value={30}>30 minutos</option>
                  <option value={40}>40 minutos (Recomendado oficial)</option>
                  <option value={45}>45 minutos</option>
                  <option value={60}>60 minutos (1 hora)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#D1D5DB] mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-[#76C81C]" />
                  WhatsApp Notificaciones
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={shopPhone}
                  onChange={(e) => setShopPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="5512345678"
                  className="w-full min-h-[48px] px-3.5 py-2.5 bg-[#090B0E] border border-[#1F2937] focus:border-[#76C81C] rounded-2xl text-white outline-none font-mono text-base sm:text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[#D1D5DB] mb-1.5">
                Dirección del Local
              </label>
              <input
                type="text"
                value={shopAddress}
                onChange={(e) => setShopAddress(e.target.value)}
                placeholder="Plaza Shopping - Local #5"
                className="w-full min-h-[48px] px-3.5 py-2.5 bg-[#090B0E] border border-[#1F2937] focus:border-[#76C81C] rounded-2xl text-white outline-none text-base sm:text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[48px] flex items-center justify-center gap-2 py-3 px-6 rounded-2xl font-bold text-black bg-[#76C81C] hover:bg-[#8CE026] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(118,200,28,0.25)] text-sm"
            >
              <Save className="w-4 h-4" />
              Guardar Horarios y Ajustes
            </button>
          </form>
        )}

        {/* ===================== TAB 2: EQUIPO DE BARBEROS ===================== */}
        {activeTab === 'barbers' && (
          <div className="space-y-4">
            <p className="text-xs text-[#94A3B8]">
              Configura los barberos de la tienda. Puedes activar o desactivar a un barbero para marcar si trabaja o descansa hoy, o agregar nuevos integrantes al equipo.
            </p>

            <div className="space-y-3">
              {barberList.map((barber, index) => (
                <div
                  key={barber.id}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    barber.isActive
                      ? 'bg-[#090B0E] border-[#76C81C]/40'
                      : 'bg-[#0E1218] border-[#1F2937] opacity-75'
                  }`}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 border"
                      style={{
                        backgroundColor: `${barber.color || '#76C81C'}20`,
                        borderColor: barber.color || '#76C81C',
                        color: barber.color || '#76C81C'
                      }}
                    >
                      {index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          type="text"
                          value={barber.name}
                          onChange={(e) => handleBarberNameChange(barber.id, e.target.value)}
                          className="w-full max-w-[200px] px-3 py-1.5 bg-[#12161D] border border-[#1F2937] focus:border-[#76C81C] rounded-xl text-white text-base sm:text-xs font-bold outline-none"
                        />
                      </div>
                      <span className="text-[10px] text-[#94A3B8]">
                        {barber.isActive ? '🟢 Trabajando hoy (recibe citas)' : '⚪ En descanso hoy (oculto)'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleBarberActive(barber.id)}
                      className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        barber.isActive
                          ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40 hover:bg-[#10B981]/30'
                          : 'bg-amber-950/40 text-amber-400 border border-amber-900/40 hover:bg-amber-950/60'
                      }`}
                    >
                      {barber.isActive ? 'Activo' : 'Descanso'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteBarber(barber.id)}
                      className="p-2.5 text-gray-500 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-colors"
                      title="Eliminar barbero"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Formulario Agregar Barbero */}
            <form onSubmit={handleAddBarber} className="p-3 bg-[#090B0E] border border-[#1F2937] rounded-2xl flex items-center gap-2">
              <input
                type="text"
                placeholder="Nombre de nuevo barbero (ej. Jose)..."
                value={newBarberName}
                onChange={(e) => setNewBarberName(e.target.value)}
                className="flex-1 min-h-[48px] px-3.5 py-2.5 bg-[#12161D] border border-[#1F2937] focus:border-[#76C81C] rounded-2xl text-white outline-none text-base sm:text-xs"
              />
              <button
                type="submit"
                className="min-h-[48px] px-4 py-2.5 bg-[#1A202C] hover:bg-[#262F3F] text-[#8CE026] border border-[#76C81C]/40 rounded-2xl text-xs font-bold transition-all shrink-0 active:scale-95"
              >
                + Agregar
              </button>
            </form>

            <button
              type="button"
              onClick={handleSaveBarbers}
              className="w-full min-h-[48px] flex items-center justify-center gap-2 py-3 px-6 rounded-2xl font-bold text-black bg-[#76C81C] hover:bg-[#8CE026] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(118,200,28,0.25)] text-sm"
            >
              <UserCheck className="w-4 h-4" />
              Guardar Cambios de Barberos
            </button>
          </div>
        )}

        {/* ===================== TAB 3: CATÁLOGO DE SERVICIOS ===================== */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Servicios del Negocio
              </h4>
              <div className="space-y-2">
                {services.map((srv) => (
                  <div
                    key={srv.id}
                    className="p-3.5 bg-[#090B0E] border border-[#1F2937] rounded-2xl flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white">{srv.name}</span>
                        <span className="text-xs font-extrabold text-[#76C81C]">
                          ${srv.price} MXN
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#12161D] text-[#94A3B8] border border-[#1F2937]">
                          {srv.durationMinutes} min
                        </span>
                      </div>
                      {srv.description && (
                        <p className="text-xs text-[#94A3B8] mt-0.5">{srv.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onUpdateService(srv.id, { isActive: !srv.isActive })}
                        className={`min-h-[36px] px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          srv.isActive
                            ? 'bg-[#101E19] text-[#10B981] border-[#10B981]'
                            : 'bg-[#2A1215] text-[#EF4444] border-[#EF4444]'
                        }`}
                      >
                        {srv.isActive ? 'Activo' : 'Oculto'}
                      </button>

                      <button
                        onClick={() => onDeleteService(srv.id)}
                        className="min-h-[36px] p-2 text-gray-400 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-colors"
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
                    placeholder="Nombre (ej. Barba Express)"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    className="w-full min-h-[48px] px-3.5 py-2.5 bg-[#12161D] border border-[#1F2937] focus:border-[#76C81C] rounded-2xl text-white outline-none text-base sm:text-xs"
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
                    className="w-full min-h-[48px] px-3.5 py-2.5 bg-[#12161D] border border-[#1F2937] focus:border-[#76C81C] rounded-2xl text-white outline-none text-base sm:text-xs"
                  />
                </div>
                <div>
                  <select
                    value={newServiceDuration}
                    onChange={(e) => setNewServiceDuration(Number(e.target.value))}
                    className="w-full min-h-[48px] px-3.5 py-2.5 bg-[#12161D] border border-[#1F2937] focus:border-[#76C81C] rounded-2xl text-white outline-none text-base sm:text-xs"
                  >
                    <option value={20}>20 minutos</option>
                    <option value={30}>30 minutos</option>
                    <option value={40}>40 minutos</option>
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
                  className="w-full min-h-[48px] px-3.5 py-2.5 bg-[#12161D] border border-[#1F2937] focus:border-[#76C81C] rounded-2xl text-white outline-none text-base sm:text-xs"
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

        {/* ===================== TAB 4: RESPALDOS Y DATOS ===================== */}
        {activeTab === 'backups' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#090B0E] border border-[#1F2937] rounded-2xl">
              <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                <Download className="w-4 h-4 text-[#76C81C]" />
                Exportar y Respaldar Agenda
              </h4>
              <p className="text-xs text-[#94A3B8] mb-4">
                En caso de cualquier problema de conexión o para contabilidad física, puedes generar reportes oficiales en PDF o descargar copias offline.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="min-h-[48px] flex items-center justify-center gap-2 px-3 py-3 bg-[#1A202C] hover:bg-[#262F3F] border border-[#76C81C]/40 text-[#8CE026] rounded-2xl text-xs font-bold transition-all"
                >
                  <FileText className="w-4 h-4 text-[#76C81C]" />
                  Exportar PDF / Imprimir
                </button>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="min-h-[48px] flex items-center justify-center gap-2 px-3 py-3 bg-[#1A202C] hover:bg-[#262F3F] border border-[#1F2937] text-white rounded-2xl text-xs font-bold transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#10B981]" />
                  Descargar CSV (Excel)
                </button>

                <button
                  type="button"
                  onClick={handleExportJson}
                  className="min-h-[48px] flex items-center justify-center gap-2 px-3 py-3 bg-[#1A202C] hover:bg-[#262F3F] border border-[#1F2937] text-white rounded-2xl text-xs font-bold transition-all"
                >
                  <FileJson className="w-4 h-4 text-[#8CE026]" />
                  Copia JSON Completa
                </button>
              </div>
            </div>

            <div className="p-4 bg-[#090B0E] border border-[#1F2937] rounded-2xl">
              <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                <Upload className="w-4 h-4 text-[#76C81C]" />
                Restaurar o Importar Respaldo JSON
              </h4>
              <p className="text-xs text-[#94A3B8] mb-3">
                Restaura todas las citas a partir de un archivo JSON descargado previamente.
              </p>

              <label className="min-h-[48px] cursor-pointer flex items-center justify-center gap-2 px-4 py-3 bg-[#12161D] hover:bg-[#1A202C] border border-dashed border-[#76C81C]/50 text-[#8CE026] rounded-2xl text-xs font-bold transition-all">
                <Upload className="w-4 h-4" />
                <span>Seleccionar Archivo JSON de Respaldo</span>
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
