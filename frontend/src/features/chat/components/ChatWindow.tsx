import React, { useState, useRef, useEffect } from 'react';
import { Send, Circle, ShieldAlert, Check, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatWebSocket } from '../hooks/useChatWebSocket';
import { ChatRoom } from '../../../services/chatService';

interface ChatWindowProps {
  room: ChatRoom | null;
  currentUserId: number;
  canSend: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ room, currentUserId, canSend }) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, isConnected, error, sendMessage } = useChatWebSocket(room ? room.id : null);

  // Auto-scroll al final del chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !canSend) return;
    sendMessage(inputText);
    setInputText('');
  };

  if (!room) {
    return (
      <div className="flex-1 bg-slate-50/50 flex flex-col items-center justify-center p-6 text-center text-slate-500">
        <div className="w-16 h-16 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center mb-4 text-brand-500 shadow-sm">
          <Send className="w-8 h-8 opacity-90" />
        </div>
        <h3 className="text-slate-900 font-bold font-outfit text-lg">Selecciona un chat</h3>
        <p className="text-sm max-w-sm mt-1 text-slate-500">
          Elige una conversación del panel izquierdo o inicia un nuevo chat con un miembro de la plataforma.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50/30 flex flex-col h-full overflow-hidden">
      {/* Room Header */}
      <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-500 to-amber-400 flex items-center justify-center font-bold text-white shadow-sm font-outfit">
            {room.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-slate-900 font-bold font-outfit text-base leading-tight">{room.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Circle className={`w-2.5 h-2.5 ${isConnected ? 'text-emerald-500 fill-emerald-500' : 'text-slate-400 fill-slate-400'}`} />
              <span className="text-xs text-slate-500">
                {isConnected ? 'Conectado en tiempo real' : 'Conectando...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] md:max-w-[65%] p-3.5 rounded-2xl text-sm ${
                    isMe
                      ? 'bg-gradient-to-r from-brand-500 to-amber-600 text-white rounded-br-none shadow-sm shadow-brand-500/10'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none shadow-xs'
                  }`}
                >
                  {!isMe && (
                    <span className="text-[11px] font-bold font-outfit text-brand-600 block mb-1">
                      {msg.sender_name}
                    </span>
                  )}
                  <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                  <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isMe ? 'text-amber-100' : 'text-slate-400'}`}>
                    <span>
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {isMe && (
                      msg.is_read ? <CheckCheck className="w-3.5 h-3.5 text-amber-200" /> : <Check className="w-3.5 h-3.5 opacity-80" />
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-3.5 bg-white border-t border-slate-200">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="text"
            placeholder={canSend ? "Escribe un mensaje..." : "Sin permiso para enviar mensajes"}
            disabled={!canSend || !isConnected}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-slate-50 text-slate-900 text-sm px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all placeholder:text-slate-400 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!canSend || !inputText.trim() || !isConnected}
            className="p-3 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl transition-all font-medium flex items-center justify-center shadow-sm shadow-brand-500/20 active:scale-95"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
