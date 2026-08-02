import React, { useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { usePermissions } from '../../../hooks/usePermissions';
import { useAuthStore } from '../../../store/authStore';
import { chatService, ChatRoom } from '../../../services/chatService';
import { ConversationList } from '../components/ConversationList';
import { ChatWindow } from '../components/ChatWindow';
import { NewChatModal } from '../components/NewChatModal';

export const ChatPage: React.FC = () => {
  const { hasPermission } = usePermissions();
  const user = useAuthStore((state) => state.user);

  const canViewChat = hasPermission('chat:view');
  const canSendChat = hasPermission('chat:send');

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Cargar salas al entrar
  const fetchRooms = async () => {
    if (!canViewChat) return;
    try {
      setLoading(true);
      const data = await chatService.getRooms();
      setRooms(data);

      const params = new URLSearchParams(window.location.search);
      const targetRoom = params.get('room');
      if (targetRoom) {
        const roomId = parseInt(targetRoom, 10);
        if (!isNaN(roomId) && data.some(r => r.id === roomId)) {
          setSelectedRoomId(roomId);
          return;
        }
      }

      if (data.length > 0 && !selectedRoomId) {
        setSelectedRoomId(data[0].id);
      }
    } catch (err) {
      console.error('Error al cargar salas de chat:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRoom = (roomId: number) => {
    setSelectedRoomId(roomId);
    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, unread_count: 0 } : r))
    );
    chatService.markAsRead(roomId).catch(() => {});
  };

  useEffect(() => {
    fetchRooms();
  }, [canViewChat, window.location.search]);

  const handleStartDirectChat = async (targetUserId: number) => {
    try {
      const res = await chatService.getOrCreateDirectRoom(targetUserId);
      await fetchRooms();
      setSelectedRoomId(res.room_id);
    } catch (err: any) {
      alert(err.message || 'Error al iniciar conversación');
    }
  };

  // Si el usuario no posee el permiso PBAC `chat:view`
  if (!canViewChat) {
    return (
      <div className="h-[calc(100vh-14.5rem)] flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 p-8 rounded-2xl max-w-md text-center shadow-lg">
          <div className="w-14 h-14 bg-rose-50 border border-rose-200 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-slate-900 font-bold font-outfit text-xl mb-2">Acceso Restringido</h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            No posees el permiso requerido (<code className="text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded font-mono text-xs">chat:view</code>) para utilizar el módulo de Chat en tiempo real. Por favor, solicita acceso al administrador de la plataforma.
          </p>
        </div>
      </div>
    );
  }

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) || null;

  return (
    <div className="w-full h-full flex rounded-2xl border border-slate-200/80 overflow-hidden bg-white shadow-xs">
      {/* Panel de Lista de Conversaciones */}
      <div className={`w-full md:w-96 flex-shrink-0 ${selectedRoomId ? 'hidden md:flex' : 'flex'} h-full`}>
        <ConversationList
          rooms={rooms}
          selectedRoomId={selectedRoomId}
          onSelectRoom={(id) => handleSelectRoom(id)}
          onStartNewChat={() => setIsModalOpen(true)}
          currentUserId={user?.id}
        />
      </div>

      {/* Ventana Principal de Chat */}
      <div className={`flex-1 ${selectedRoomId ? 'flex' : 'hidden md:flex'} flex-col h-full overflow-hidden`}>
        <ChatWindow
          room={selectedRoom}
          currentUserId={user?.id || 0}
          canSend={canSendChat}
          onBack={() => setSelectedRoomId(null)}
        />
      </div>

      {/* Modal para iniciar chat */}
      <NewChatModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectUser={handleStartDirectChat}
      />
    </div>
  );
};

export default ChatPage;
