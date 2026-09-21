import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Search, 
  CornerUpRight, 
  Check, 
  Loader2, 
  MessageSquare, 
  User, 
  Users, 
  FileText, 
  ImageIcon,
  Send
} from 'lucide-react';
import { chatService, ChatMessage, ChatRoom, ChatUser } from '../../../services/chatService';
import { getMediaUrl } from '../../../services/api';

interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: ChatMessage | null;
  currentRoomId?: number | null;
  onForwardSuccess?: (forwardedCount: number) => void;
}

export const ForwardMessageModal: React.FC<ForwardMessageModalProps> = ({
  isOpen,
  onClose,
  message,
  currentRoomId,
  onForwardSuccess
}) => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [optionalNote, setOptionalNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      setSearch('');
      setSelectedRoomIds([]);
      setSelectedUserIds([]);
      setOptionalNote('');

      Promise.all([
        chatService.getRooms().catch(() => []),
        chatService.getUsers().catch(() => [])
      ])
        .then(([roomsData, usersData]) => {
          setRooms(roomsData);
          setUsers(usersData);
        })
        .catch((err) => {
          setError(err.message || 'Error al cargar destinatarios');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen || !message) return null;

  const cleanSearch = search.trim().toLowerCase();

  // Filtrar salas
  const filteredRooms = rooms.filter((r) => {
    const name = r.name || r.other_participant?.name || 'Chat';
    return name.toLowerCase().includes(cleanSearch);
  });

  // Filtrar usuarios individuales que no tengan ya una sala directa en filteredRooms
  const directRoomOtherUserIds = new Set(
    rooms
      .filter((r) => r.type === 'direct' && r.other_participant?.id)
      .map((r) => r.other_participant!.id)
  );

  const filteredUsers = users.filter((u) => {
    // Si ya existe una sala directa con este usuario, se muestra en la sección de chats para evitar duplicar
    if (directRoomOtherUserIds.has(u.id)) return false;
    return u.name.toLowerCase().includes(cleanSearch) || u.email.toLowerCase().includes(cleanSearch);
  });

  const toggleRoomSelection = (roomId: number) => {
    setSelectedRoomIds((prev) =>
      prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]
    );
  };

  const toggleUserSelection = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const totalSelected = selectedRoomIds.length + selectedUserIds.length;

  const handleForward = async () => {
    if (totalSelected === 0) {
      setError('Selecciona al menos un chat o contacto para reenviar');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await chatService.forwardMessage(
        message.id,
        selectedRoomIds,
        selectedUserIds,
        optionalNote.trim() || undefined
      );

      // Notificar a toda la app que los chats fueron actualizados
      window.dispatchEvent(new CustomEvent('gloint:chat_updated'));

      if (onForwardSuccess) {
        onForwardSuccess(res.forwarded_count || totalSelected);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al reenviar el mensaje');
    } finally {
      setSubmitting(false);
    }
  };

  const isImg = message.file_type?.startsWith('image/') || 
    (message.file_url && /\.(jpg|jpeg|png|webp|gif)$/i.test(message.file_url));

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 shadow-2xs">
              <CornerUpRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-outfit">Reenviar mensaje</h2>
              <p className="text-xs text-slate-500">Selecciona los destinatarios</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Vista previa del Mensaje a reenviar */}
        <div className="px-6 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center gap-3">
          {isImg && message.file_url ? (
            <img 
              src={getMediaUrl(message.file_url)} 
              alt="Adjunto" 
              className="w-12 h-12 rounded-xl object-cover border border-slate-200 flex-shrink-0"
            />
          ) : message.file_url ? (
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-bold text-brand-700 block font-outfit truncate">
              {message.sender_name}
            </span>
            <p className="text-xs text-slate-700 truncate line-clamp-2 leading-relaxed">
              {message.content || (message.file_name ? `📎 ${message.file_name}` : 'Archivo adjunto')}
            </p>
          </div>
        </div>

        {/* Barra de Búsqueda */}
        <div className="px-6 pt-3 pb-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversación o usuario..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-100/80 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Lista de Destinos */}
        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4 max-h-72">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
              <span className="text-xs">Cargando destinatarios...</span>
            </div>
          ) : (
            <>
              {/* Sección de Chats / Conversaciones */}
              {filteredRooms.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 font-outfit">
                    Conversaciones
                  </h4>
                  <div className="space-y-1">
                    {filteredRooms.map((room) => {
                      const isSelected = selectedRoomIds.includes(room.id);
                      const isCurrent = currentRoomId === room.id;
                      const roomDisplayName = room.name || room.other_participant?.name || 'Chat';
                      const isGroup = room.type === 'group';

                      return (
                        <div
                          key={room.id}
                          onClick={() => toggleRoomSelection(room.id)}
                          className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all border ${
                            isSelected 
                              ? 'bg-brand-50/80 border-brand-300 shadow-2xs' 
                              : 'hover:bg-slate-50 border-transparent hover:border-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative flex-shrink-0">
                              {room.avatar_url ? (
                                <img
                                  src={getMediaUrl(room.avatar_url)}
                                  alt={roomDisplayName}
                                  className="w-9 h-9 rounded-full object-cover border border-slate-200"
                                />
                              ) : (
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                                  isGroup 
                                    ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                                    : 'bg-brand-100 text-brand-700 border border-brand-200'
                                }`}>
                                  {isGroup ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate font-outfit">
                                {roomDisplayName} {isCurrent && <span className="text-[10px] text-slate-400 font-normal">(Este chat)</span>}
                              </p>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {isGroup ? 'Grupo' : 'Chat individual'}
                              </span>
                            </div>
                          </div>

                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                            isSelected 
                              ? 'bg-brand-500 border-brand-500 text-white' 
                              : 'border-slate-300 bg-white'
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sección de Contactos Disponibles (sin chat previo abierto) */}
              {filteredUsers.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 font-outfit">
                    Otros Contactos
                  </h4>
                  <div className="space-y-1">
                    {filteredUsers.map((user) => {
                      const isSelected = selectedUserIds.includes(user.id);

                      return (
                        <div
                          key={user.id}
                          onClick={() => toggleUserSelection(user.id)}
                          className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all border ${
                            isSelected 
                              ? 'bg-brand-50/80 border-brand-300 shadow-2xs' 
                              : 'hover:bg-slate-50 border-transparent hover:border-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                              <User className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate font-outfit">
                                {user.name}
                              </p>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {user.email}
                              </span>
                            </div>
                          </div>

                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                            isSelected 
                              ? 'bg-brand-500 border-brand-500 text-white' 
                              : 'border-slate-300 bg-white'
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {filteredRooms.length === 0 && filteredUsers.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No se encontraron conversaciones ni usuarios coincidentes.
                </div>
              )}
            </>
          )}
        </div>

        {/* Input de Comentario Opcional */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/40">
          <input
            type="text"
            value={optionalNote}
            onChange={(e) => setOptionalNote(e.target.value)}
            placeholder="Añadir un comentario (opcional)..."
            className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 placeholder:text-slate-400 transition-all"
          />
        </div>

        {/* Pie del Modal con Acciones */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="text-xs text-slate-500">
            {totalSelected > 0 ? (
              <span className="font-semibold text-brand-600">
                {totalSelected} {totalSelected === 1 ? 'chat seleccionado' : 'chats seleccionados'}
              </span>
            ) : (
              <span>Elige al menos un destinatario</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleForward}
              disabled={totalSelected === 0 || submitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-brand-500 to-amber-600 hover:from-brand-600 hover:to-amber-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Reenviar {totalSelected > 0 && `(${totalSelected})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
