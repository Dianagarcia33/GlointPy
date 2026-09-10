import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, User, Circle, Users, MessageSquare, Check, Loader2 } from 'lucide-react';
import { chatService, ChatUser } from '../../../services/chatService';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (userId: number) => void;
  onCreateGroup?: (name: string, participantIds: number[]) => Promise<void>;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  onSelectUser,
  onCreateGroup
}) => {
  const [activeTab, setActiveTab] = useState<'direct' | 'group'>('direct');
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [search, setSearch] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [submittingGroup, setSubmittingGroup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      setGroupName('');
      setSelectedUserIds([]);
      setSearch('');
      setActiveTab('direct');

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

  const toggleUserSelection = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setError('Por favor ingresa un nombre para el grupo');
      return;
    }
    if (selectedUserIds.length === 0) {
      setError('Selecciona al menos un participante para el grupo');
      return;
    }
    if (!onCreateGroup) return;

    try {
      setSubmittingGroup(true);
      setError(null);
      await onCreateGroup(groupName.trim(), selectedUserIds);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al crear el grupo');
    } finally {
      setSubmittingGroup(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      style={{ margin: 0 }}
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
          <div>
            <h3 className="text-slate-900 font-bold font-outfit text-lg">Nueva Conversación</h3>
            <p className="text-xs text-slate-500">Inicia un chat directo o crea una sala grupal</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/40 px-4 pt-2 gap-2">
          <button
            type="button"
            onClick={() => { setActiveTab('direct'); setError(null); }}
            className={`pb-2.5 px-3 text-xs font-semibold font-outfit flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'direct'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat Directo</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('group'); setError(null); }}
            className={`pb-2.5 px-3 text-xs font-semibold font-outfit flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'group'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Nuevo Grupo</span>
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* TAB 1: Chat Directo */}
        {activeTab === 'direct' && (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Buscador */}
            <div className="p-4 bg-white border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar usuario por nombre o correo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Lista de usuarios */}
            <div className="overflow-y-auto p-4 space-y-1 flex-1">
              {loading ? (
                <div className="p-8 text-center text-slate-400 text-xs">Cargando usuarios elegibles...</div>
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
        )}

        {/* TAB 2: Nuevo Grupo */}
        {activeTab === 'group' && (
          <form onSubmit={handleCreateGroupSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="p-4 space-y-3 border-b border-slate-100 bg-white">
              <div>
                <label className="block text-xs font-semibold text-slate-700 font-outfit mb-1">
                  Nombre del Grupo *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Comité de Inversión, Equipo Gloint..."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all placeholder:text-slate-400"
                  required
                />
              </div>

              {/* Usuarios seleccionados pills */}
              {selectedUserIds.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 font-outfit mb-1">
                    Participantes seleccionados ({selectedUserIds.length})
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    {selectedUserIds.map((id) => {
                      const u = users.find((item) => item.id === id);
                      if (!u) return null;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-brand-200 text-brand-700 rounded-lg text-xs font-medium shadow-2xs"
                        >
                          <span>{u.name}</span>
                          <button
                            type="button"
                            onClick={() => toggleUserSelection(id)}
                            className="hover:text-rose-600 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Buscador de participantes */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrar miembros para agregar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Lista seleccionable */}
            <div className="overflow-y-auto p-4 space-y-1 flex-1">
              {loading ? (
                <div className="p-8 text-center text-slate-400 text-xs">Cargando usuarios...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">No se encontraron usuarios.</div>
              ) : (
                filteredUsers.map((u) => {
                  const isChecked = selectedUserIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleUserSelection(u.id)}
                      className={`w-full p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between border ${
                        isChecked
                          ? 'bg-brand-50/70 border-brand-300'
                          : 'hover:bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs font-outfit shadow-2xs ${
                          isChecked ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-900 font-outfit">{u.name}</p>
                          <p className="text-[11px] text-slate-500">{u.email}</p>
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        isChecked ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submittingGroup || !groupName.trim() || selectedUserIds.length === 0}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-2 shadow-sm shadow-brand-500/20 active:scale-95"
              >
                {submittingGroup ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creando grupo...</span>
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    <span>Crear Grupo ({selectedUserIds.length})</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};

