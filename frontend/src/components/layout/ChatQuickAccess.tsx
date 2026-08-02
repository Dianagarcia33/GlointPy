import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, ArrowRight, Loader2, UserCheck, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface ChatQuickAccessProps {
  isDark?: boolean;
}

export const ChatQuickAccess: React.FC<ChatQuickAccessProps> = ({ isDark = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadChatRooms = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const data = await fetchApi('/chat/rooms');
      setRooms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al cargar salas de chat rápidas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      loadChatRooms();
    }
    setIsOpen(!isOpen);
  };

  const handleOpenRoom = (roomId?: number) => {
    setIsOpen(false);
    if (roomId) {
      navigate(`/dashboard/chat?room=${roomId}`);
    } else {
      navigate('/dashboard/chat');
    }
  };

  const totalUnread = rooms.reduce((acc, r) => acc + (r.unread_count || 0), 0);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        title="Acceso Rápido al Chat"
        className={`relative p-2 rounded-full transition-all duration-300 flex items-center justify-center cursor-pointer ${
          isDark
            ? 'text-white/80 hover:text-white hover:bg-white/10'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        <MessageSquare className="w-5 h-5" />

        {/* Indicador o Contador de Mensajes */}
        {totalUnread > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-brand-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-bounce">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        ) : rooms.length > 0 ? (
          <span className="absolute top-1 right-1 flex h-2 w-2">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
          </span>
        ) : null}
      </button>

      {/* Popover Desplegable de Conversaciones Rápidas */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-3 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-brand-400" />
              <span className="font-bold text-sm font-montserrat">Mensajes de Chat</span>
            </div>
            <button
              onClick={() => handleOpenRoom()}
              className="text-xs font-bold text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>Abrir Chat</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Body List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                <span className="text-xs font-medium">Cargando conversaciones...</span>
              </div>
            ) : rooms.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-800">No tienes mensajes recientes</p>
                <p className="text-xs text-slate-400 mt-1">Inicia un chat desde el centro de mensajes.</p>
                <button
                  type="button"
                  onClick={() => handleOpenRoom()}
                  className="mt-4 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  Ir al Chat
                </button>
              </div>
            ) : (
              rooms.map((room) => {
                const displayName = room.other_participant?.name || room.name || `Sala #${room.id}`;
                const isOnline = room.other_participant?.is_online || false;
                const lastMsgText = room.last_message
                  ? (room.last_message.sender_id === user?.id ? `Tú: ${room.last_message.content || 'Archivo adjunto'}` : `${room.last_message.sender_name || 'Mensaje'}: ${room.last_message.content || 'Archivo adjunto'}`)
                  : 'Sin mensajes aún';

                return (
                  <div
                    key={room.id}
                    onClick={() => handleOpenRoom(room.id)}
                    className="p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-3 group"
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-sm shadow-xs group-hover:scale-105 transition-transform">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" title="En línea" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {displayName}
                        </p>
                        {room.last_message?.created_at && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            {new Date(room.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5 font-medium">
                        {lastMsgText}
                      </p>
                    </div>

                    {room.unread_count > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-brand-500 text-white text-[10px] font-bold flex-shrink-0">
                        {room.unread_count}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => handleOpenRoom()}
              className="text-xs font-bold text-slate-700 hover:text-brand-600 transition-colors w-full cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Ver todas las conversaciones</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
