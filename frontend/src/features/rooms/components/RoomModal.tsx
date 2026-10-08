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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-200/80 ring-1 ring-white w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm ring-2 ring-white"
              style={{ backgroundColor: color }}
            >
              <DoorClosed className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 font-montserrat tracking-tight">
                {room ? 'Editar Sala de Reuniones' : 'Nueva Sala de Reuniones'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {room ? 'Actualiza los datos del espacio corporativo' : 'Configura un nuevo espacio disponible para reservas'}
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
            <div className="p-3.5 bg-rose-50/90 backdrop-blur-xs border border-rose-200/80 rounded-2xl text-rose-800 text-xs font-semibold flex items-start gap-2 shadow-2xs animate-in fade-in">
              <span>{error}</span>
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
              className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-200/90 rounded-2xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-2xs"
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
                className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-200/90 rounded-2xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-2xs"
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
                className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-200/90 rounded-2xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-2xs"
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
              placeholder="Ej. Pantalla 65', Tablero acrílico, Sistema videoconferencia"
              className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-200/90 rounded-2xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-2xs"
            />
          </div>

          {/* Color identificador */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-montserrat flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-slate-400" />
              Color Identificador
            </label>
            <div className="flex items-center gap-2.5 flex-wrap">
              {COLOR_PRESETS.map((p) => (
                <button
                  key={p.hex}
                  type="button"
                  onClick={() => setColor(p.hex)}
                  className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    color === p.hex ? 'scale-115 ring-2 ring-slate-900 ring-offset-2 shadow-sm' : 'hover:scale-105 opacity-80 hover:opacity-100'
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
              Descripción Adicional <span className="text-slate-400 font-normal lowercase">(opcional)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Lineamientos de uso, reservas recurrentes, etc."
              className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-200/90 rounded-2xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none shadow-2xs"
            />
          </div>

          {/* Estado activo/inactivo */}
          <div className="flex items-center gap-3 pt-1">
            <input
              type="checkbox"
              id="room-is-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-amber-600 rounded-md border-slate-300 focus:ring-amber-500 cursor-pointer"
            />
            <label htmlFor="room-is-active" className="text-xs font-bold text-slate-700 cursor-pointer select-none font-montserrat">
              Sala habilitada para reservas
            </label>
          </div>

          {/* Botones de acción */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-2xl transition-all cursor-pointer font-montserrat"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 rounded-2xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 active:scale-95 disabled:opacity-50 font-montserrat uppercase tracking-wider ring-1 ring-inset ring-white/30"
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
