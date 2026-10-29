import React, { useState } from 'react';
import { MessageSquare, UserPlus, Search, Circle, Users } from 'lucide-react';
import { ChatRoom, ChatUser } from '../../../services/chatService';
import { getMediaUrl } from '../../../services/api';
import { formatConversationDate } from '../../../utils/format';
import { Skeleton, SkeletonRegion } from '../../../components/common/Skeleton';

interface ConversationListProps {
  rooms: ChatRoom[];
  selectedRoomId: number | null;
  onSelectRoom: (roomId: number) => void;
  onStartNewChat: () => void;
  canStartNewChat?: boolean;
  currentUserId?: number;
  loading?: boolean;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  rooms,
  selectedRoomId,
  onSelectRoom,
  onStartNewChat,
  canStartNewChat = true,
  loading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRooms = rooms.filter((room) =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full h-full bg-slate-50/70 border-r border-slate-200/80 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200/80 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-900 font-bold font-outfit text-base">
          <MessageSquare className="w-5 h-5 text-brand-500" />
          <span>Conversaciones</span>
        </div>
        <button
          onClick={onStartNewChat}
          disabled={!canStartNewChat}
          className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold shadow-sm shadow-brand-500/20 active:scale-95"
          title={canStartNewChat ? 'Iniciar nuevo chat o grupo' : 'Tu rol solo permite leer conversaciones'}
        >
          <UserPlus className="w-4 h-4" />
          <span>Nuevo</span>
        </button>
      </div>

      {!canStartNewChat && (
        <p className="px-4 py-2 text-[11px] text-slate-500 bg-slate-100/70 border-b border-slate-200/60">
          Tu rol solo permite leer conversaciones; no puedes iniciar chats ni enviar mensajes.
        </p>
      )}

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
        {loading && rooms.length === 0 ? (
          <SkeletonRegion label="Cargando conversaciones…" className="space-y-1">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-3 rounded-xl flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className={`h-3.5 ${i % 2 ? 'w-2/3' : 'w-1/2'}`} />
                  <Skeleton className="h-3 w-1/3 bg-slate-100" />
                </div>
              </div>
            ))}
          </SkeletonRegion>
        ) : filteredRooms.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs leading-relaxed">
            No tienes chats activos.<br />¡Haz clic en <span className="font-semibold text-brand-600 font-outfit">"Nuevo"</span> para iniciar uno!
          </div>
        ) : (
          filteredRooms.map((room) => {
            const isSelected = room.id === selectedRoomId;
            const isGroup = room.type === 'group';

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
                  {room.avatar_url ? (
                    <img
                      src={getMediaUrl(room.avatar_url)}
                      alt={room.name}
                      className="w-10 h-10 rounded-full object-cover shadow-sm border border-slate-200/80"
                    />
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm font-outfit text-sm ${
                      isGroup
                        ? 'bg-gradient-to-tr from-brand-600 via-amber-500 to-emerald-500'
                        : 'bg-gradient-to-tr from-brand-500 to-amber-400'
                    }`}>
                      {isGroup ? <Users className="w-5 h-5" /> : room.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {!isGroup && room.other_participant?.is_online && (
                    <Circle className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500 absolute -bottom-0.5 -right-0.5 ring-2 ring-white rounded-full" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`text-sm truncate ${isSelected ? 'text-brand-950 font-semibold' : 'text-slate-900 font-medium'}`}>
                        {room.name}
                      </span>
                      {isGroup && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-brand-50 text-brand-700 border border-brand-200/80 flex-shrink-0">
                          Grupo
                        </span>
                      )}
                    </div>
                    {room.last_message?.created_at && (
                      <span className="text-[10px] text-slate-400 ml-1 flex-shrink-0">
                        {formatConversationDate(room.last_message.created_at)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {room.last_message ? (
                      isGroup && room.last_message.sender_name ? (
                        <span>
                          <span className="font-medium text-slate-600">{room.last_message.sender_name}: </span>
                          {room.last_message.content || '📎 Archivo adjunto'}
                        </span>
                      ) : (
                        room.last_message.content || '📎 Archivo adjunto'
                      )
                    ) : (
                      'Sin mensajes aún'
                    )}
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
