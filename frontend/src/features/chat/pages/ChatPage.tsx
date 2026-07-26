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
      if (data.length > 0 && !selectedRoomId) {
        setSelectedRoomId(data[0].id);
      }
    } catch (err) {
      console.error('Error al cargar salas de chat:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [canViewChat]);

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
      <div className="h-[calc(100vh-5rem)] flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md text-center shadow-xl">
          <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-white font-bold text-xl mb-2">Acceso Restringido</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            No posees el permiso requerido (<code className="text-indigo-400">chat:view</code>) para utilizar el módulo de Chat en tiempo real. Por favor, solicita acceso al administrador de la plataforma.
          </p>
        </div>
      </div>
    );
  }

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) || null;

  return (
    <div className="h-[calc(100vh-5rem)] flex rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/60 shadow-2xl">
      <ConversationList
        rooms={rooms}
        selectedRoomId={selectedRoomId}
        onSelectRoom={(id) => setSelectedRoomId(id)}
        onStartNewChat={() => setIsModalOpen(true)}
        currentUserId={user?.id}
      />

      <ChatWindow
        room={selectedRoom}
        currentUserId={user?.id || 0}
        canSend={canSendChat}
      />

      <NewChatModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectUser={handleStartDirectChat}
      />
    </div>
  );
};

export default ChatPage;
