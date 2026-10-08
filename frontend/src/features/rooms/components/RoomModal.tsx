import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Loader2, DoorClosed, Users, MapPin, Monitor, Palette } from 'lucide-react';
import { roomsService, MeetingRoom } from '../../../services/rooms';

interface RoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (room: MeetingRoom) => void;
  room?: MeetingRoom | null;
}

const COLOR_PRESETS = [
  { name: 'Esmeralda', hex: '#10b981' },
  { name: 'Azul Gloint', hex: '#2563eb' },
  { name: 'Índigo', hex: '#6366f1' },
  { name: 'Púrpura', hex: '#8b5cf6' },
  { name: 'Ámbar', hex: '#f59e0b' },
  { name: 'Rosa', hex: '#ec4899' },
  { name: 'Cian', hex: '#06b6d4' },
];

export const RoomModal: React.FC<RoomModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  room,
}) => {
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [location, setLocation] = useState('');
  const [equipment, setEquipment] = useState('');
  const [color, setColor] = useState('#10b981');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (room) {
        setName(room.name || '');
        setCapacity(room.capacity || 4);
        setLocation(room.location || '');
        setEquipment(room.equipment || '');
        setColor(room.color || '#10b981');
        setDescription(room.description || '');
        setIsActive(room.is_active ?? true);
      } else {
        setName('');
        setCapacity(4);
        setLocation('');
        setEquipment('');
        setColor('#10b981');
        setDescription('');
        setIsActive(true);
      }
      setError(null);
    }
  }, [isOpen, room]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor ingresa el nombre de la sala.');
      return;
    }
    if (capacity < 1) {
      setError('La capacidad mínima debe ser de al menos 1 persona.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const payload = {
        name: name.trim(),
        capacity: Number(capacity),
        location: location.trim() || undefined,
        equipment: equipment.trim() || undefined,
        color,
        description: description.trim() || undefined,
        is_active: isActive,
      };

      let saved: MeetingRoom;
      if (room) {
        saved = await roomsService.updateRoom(room.id, payload);
      } else {
        saved = await roomsService.createRoom(payload);
      }

      onSaved(saved);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la sala.');
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: color }}
            >
              <DoorClosed className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-montserrat">
                {room ? 'Editar Sala de Reuniones' : 'Nueva Sala de Reuniones'}
              </h2>
              <p className="text-xs text-slate-500">
                {room ? 'Actualiza los datos de la sala' : 'Configura una nueva sala para reservas'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Nombre */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
              Nombre de la Sala *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Sala de Juntas VIP, Sala Innovación"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
          </div>

          {/* Capacidad y Ubicación en 2 columnas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                Capacidad (Personas) *
              </label>
              <input
                type="number"
                min="1"
                max="100"
                required
                value={capacity}
                onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Ubicación
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ej. Piso 2 - Torre A"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
            </div>
          </div>

          {/* Equipamiento */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-slate-400" />
              Equipamiento / Recursos
            </label>
            <input
              type="text"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              placeholder="Ej. TV 65', Tablero acrílico, Aire acondicionado, Conexión HDMI"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
          </div>

          {/* Color identificador */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-montserrat flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-slate-400" />
              Color Identificador
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_PRESETS.map((p) => (
                <button
                  key={p.hex}
                  type="button"
                  onClick={() => setColor(p.hex)}
                  className={`w-7 h-7 rounded-xl flex items-center justify-center transition-transform cursor-pointer ${
                    color === p.hex ? 'scale-115 ring-2 ring-slate-900 ring-offset-2' : 'hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: p.hex }}
                  title={p.name}
                />
              ))}
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
              Descripción Adicional
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notas o lineamientos de uso de la sala..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"
            />
          </div>

          {/* Estado activo/inactivo */}
          <div className="flex items-center gap-3 pt-1">
            <input
              type="checkbox"
              id="room-is-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-brand-600 rounded-md border-slate-300 focus:ring-brand-500 cursor-pointer"
            />
            <label htmlFor="room-is-active" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
              Sala habilitada para reservas
            </label>
          </div>

          {/* Botones de acción */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{room ? 'Guardar Cambios' : 'Crear Sala'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
