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
    <div className="w-full md:w-80 bg-slate-900/60 backdrop-blur-md border-r border-slate-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white font-semibold text-lg">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
          <span>Conversaciones</span>
        </div>
        <button
          onClick={onStartNewChat}
          className="p-2 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-lg transition-all flex items-center gap-1 text-xs font-medium shadow-md hover:shadow-indigo-500/20"
          title="Iniciar nuevo chat"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nuevo</span>
        </button>
      </div>

      {/* Buscador */}
      <div className="p-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar chat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/80 text-white text-sm pl-9 pr-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Lista de salas */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50 px-2 space-y-1">
        {filteredRooms.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-sm">
            No tienes chats activos. ¡Haz clic en "Nuevo" para iniciar uno!
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
                    ? 'bg-indigo-600/20 border border-indigo-500/30 text-white'
                    : 'hover:bg-slate-800/40 text-slate-300'
                }`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-bold text-white shadow-sm">
                    {room.name.charAt(0).toUpperCase()}
                  </div>
                  {room.other_participant?.is_online && (
                    <Circle className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500 absolute -bottom-0.5 -right-0.5 ring-2 ring-slate-900 rounded-full" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-white truncate">
                      {room.name}
                    </span>
                    {room.last_message?.created_at && (
                      <span className="text-[10px] text-slate-500">
                        {new Date(room.last_message.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {room.last_message ? room.last_message.content : 'Sin mensajes'}
                  </p>
                </div>

                {/* Badge no leídos */}
                {room.unread_count > 0 && (
                  <span className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
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
