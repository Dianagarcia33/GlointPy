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
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
          <h3 className="text-slate-900 font-bold font-outfit text-lg">Iniciar conversación</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Buscador */}
        <div className="p-4 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 text-slate-900 text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* User list */}
        <div className="max-h-72 overflow-y-auto px-4 pb-4 space-y-1">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Cargando usuarios elegibles...</div>
          ) : error ? (
            <div className="p-4 text-center text-rose-500 text-xs">{error}</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">No se encontraron usuarios.</div>
          ) : (
            filteredUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  onSelectUser(u.id);
                  onClose();
                }}
                className="w-full text-left p-3 rounded-xl hover:bg-slate-100/80 transition-all flex items-center justify-between group border border-transparent hover:border-slate-200/60"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center font-bold text-brand-600 text-sm font-outfit shadow-xs">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-slate-900 text-sm font-semibold font-outfit group-hover:text-brand-600 transition-colors">
                      {u.name}
                    </h4>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </div>
                </div>
                {u.is_online && (
                  <div className="flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full font-medium">
                    <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />
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
