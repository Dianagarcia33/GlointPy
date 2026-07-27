import React, { useState } from 'react';
import { MessageSquare, UserPlus, Search, Circle } from 'lucide-react';
import { ChatRoom, ChatUser } from '../../../services/chatService';

interface ConversationListProps {
  rooms: ChatRoom[];
  selectedRoomId: number | null;
  onSelectRoom: (roomId: number) => void;
  onStartNewChat: () => void;
  currentUserId?: number;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  rooms,
  selectedRoomId,
  onSelectRoom,
  onStartNewChat
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRooms = rooms.filter((room) =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full md:w-80 bg-slate-50/70 border-r border-slate-200/80 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200/80 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-900 font-bold font-outfit text-base">
          <MessageSquare className="w-5 h-5 text-brand-500" />
          <span>Conversaciones</span>
        </div>
        <button
          onClick={onStartNewChat}
          className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold shadow-sm shadow-brand-500/20 active:scale-95"
          title="Iniciar nuevo chat"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nuevo</span>
        </button>
      </div>

      {/* Buscador */}
      <div className="p-3 bg-white/50 border-b border-slate-200/60">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar conversación..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white text-slate-900 text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Lista de salas */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredRooms.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs leading-relaxed">
            No tienes chats activos.<br />¡Haz clic en <span className="font-semibold text-brand-600 font-outfit">"Nuevo"</span> para iniciar uno!
          </div>
        ) : (
          filteredRooms.map((room) => {
            const isSelected = room.id === selectedRoomId;
            return (
              <button
                key={room.id}
                onClick={() => onSelectRoom(room.id)}
                className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${
                  isSelected
                    ? 'bg-brand-500/10 border border-brand-200 text-slate-900 shadow-sm font-semibold'
                    : 'hover:bg-slate-200/60 text-slate-700 border border-transparent'
                }`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-500 to-amber-400 flex items-center justify-center font-bold text-white shadow-sm font-outfit text-sm">
                    {room.name.charAt(0).toUpperCase()}
                  </div>
                  {room.other_participant?.is_online && (
                    <Circle className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500 absolute -bottom-0.5 -right-0.5 ring-2 ring-white rounded-full" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm truncate ${isSelected ? 'text-brand-950 font-semibold' : 'text-slate-900 font-medium'}`}>
                      {room.name}
                    </span>
                    {room.last_message?.created_at && (
                      <span className="text-[10px] text-slate-400 ml-1">
                        {new Date(room.last_message.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {room.last_message ? room.last_message.content : 'Sin mensajes aún'}
                  </p>
                </div>

                {/* Badge no leídos */}
                {room.unread_count > 0 && (
                  <span className="bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 shadow-sm">
                    {room.unread_count}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
