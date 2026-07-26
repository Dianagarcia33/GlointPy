import React, { useState, useEffect } from 'react';
import { X, Search, User, Circle } from 'lucide-react';
import { chatService, ChatUser } from '../../../services/chatService';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (userId: number) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose, onSelectUser }) => {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      chatService.getUsers()
        .then((data) => {
          setUsers(data);
          setError(null);
        })
        .catch((err: any) => {
          setError(err.message || 'Error al cargar usuarios');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-white font-semibold text-lg">Iniciar nuevo chat</h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Buscador */}
        <div className="p-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-800 text-white text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* User list */}
        <div className="max-h-72 overflow-y-auto px-4 pb-4 space-y-1">
          {loading ? (
            <div className="p-6 text-center text-slate-500 text-sm">Cargando usuarios...</div>
          ) : error ? (
            <div className="p-4 text-center text-rose-400 text-sm">{error}</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-sm">No se encontraron usuarios.</div>
          ) : (
            filteredUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  onSelectUser(u.id);
                  onClose();
                }}
                className="w-full text-left p-3 rounded-xl hover:bg-slate-800/80 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-300 text-sm">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-white text-sm font-medium group-hover:text-indigo-400 transition-colors">
                      {u.name}
                    </h4>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </div>
                </div>
                {u.is_online && (
                  <div className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <Circle className="w-2 h-2 fill-emerald-400" />
                    <span>En línea</span>
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
