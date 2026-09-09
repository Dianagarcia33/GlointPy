import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Send, 
  Circle, 
  ShieldAlert, 
  Check, 
  CheckCheck, 
  ArrowLeft, 
  Paperclip, 
  FileText, 
  Download, 
  X, 
  Loader2, 
  ExternalLink,
  Reply,
  Users,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatWebSocket } from '../hooks/useChatWebSocket';
import { chatService, ChatRoom, ChatMessage } from '../../../services/chatService';
import { getMediaUrl } from '../../../services/api';
import { formatChatTime } from '../../../utils/format';

interface ChatWindowProps {
  room: ChatRoom | null;
  currentUserId: number;
  canSend: boolean;
  onBack?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ room, currentUserId, canSend, onBack }) => {
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeImageModal, setActiveImageModal] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { messages, typingUsers, isConnected, error, sendMessage, sendTypingStatus } = useChatWebSocket(room ? room.id : null);

  const initialLoadRef = useRef<boolean>(true);
  const currentRoomIdRef = useRef<number | null>(null);

  // Resetear flag de carga inicial y respuesta al cambiar de sala
  useEffect(() => {
    if (room?.id !== currentRoomIdRef.current) {
      currentRoomIdRef.current = room ? room.id : null;
      initialLoadRef.current = true;
      setReplyingTo(null);
      setShowMembersModal(false);
      setInputText('');
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  }, [room?.id]);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Auto-scroll al final del chat
  useEffect(() => {
    if (!messagesEndRef.current) return;
    if (initialLoadRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
      initialLoadRef.current = false;
    } else {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, typingUsers]);

  // Manejar cambio de texto para el indicador "escribiendo..."
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    if (val.trim().length > 0) {
      sendTypingStatus(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingStatus(false);
      }, 2500);
    } else {
      sendTypingStatus(false);
    }
  };

  // Manejar selección de archivo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStartReply = (msg: ChatMessage) => {
    setReplyingTo(msg);
    textInputRef.current?.focus();
  };

  const scrollToMessage = (msgId: number) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-brand-500', 'ring-offset-2', 'rounded-2xl');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-brand-500', 'ring-offset-2', 'rounded-2xl');
      }, 2000);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedFile) || !canSend || !room) return;

    sendTypingStatus(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    const replyId = replyingTo?.id || null;

    if (selectedFile) {
      try {
        setUploading(true);
        await chatService.uploadFile(room.id, selectedFile, inputText, replyId);
        setInputText('');
        handleClearFile();
        setReplyingTo(null);
      } catch (err: any) {
        alert(err.message || 'Error al subir archivo');
      } finally {
        setUploading(false);
      }
    } else {
      sendMessage(inputText, replyId);
      setInputText('');
      setReplyingTo(null);
    }
  };

  const isImageFile = (type?: string | null, url?: string | null) => {
    if (type?.startsWith('image/')) return true;
    if (url) {
      const cleanUrl = url.toLowerCase();
      return cleanUrl.endsWith('.png') || cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg') || cleanUrl.endsWith('.gif') || cleanUrl.endsWith('.webp');
    }
    return false;
  };

  if (!room) {
    return (
      <div className="flex-1 bg-slate-50/50 flex flex-col items-center justify-center p-6 text-center text-slate-500">
        <div className="w-16 h-16 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center mb-4 text-brand-500 shadow-sm">
          <Send className="w-8 h-8 opacity-90" />
        </div>
        <h3 className="text-slate-900 font-bold font-outfit text-lg">Selecciona un chat</h3>
        <p className="text-sm max-w-sm mt-1 text-slate-500">
          Elige una conversación del panel izquierdo o inicia un nuevo chat individual o grupal.
        </p>
      </div>
    );
  }

  const isGroup = room.type === 'group';
  const participantsCount = room.participants_count || room.participants?.length || 0;

  return (
    <div className="flex-1 bg-slate-50/30 flex flex-col h-full overflow-hidden relative">
      {/* Room Header */}
      <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
              title="Volver a la lista"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* Avatar (individual vs grupo) */}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm font-outfit ${
            isGroup
              ? 'bg-gradient-to-tr from-brand-600 via-amber-500 to-emerald-500'
              : 'bg-gradient-to-tr from-brand-500 to-amber-400'
          }`}>
            {isGroup ? <Users className="w-5 h-5" /> : room.name.charAt(0).toUpperCase()}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-slate-900 font-bold font-outfit text-base leading-tight">{room.name}</h3>
              {isGroup && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                  Grupo
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-1.5 mt-0.5">
              {typingUsers.length > 0 ? (
                <div className="flex items-center gap-1.5 text-xs text-brand-600 font-medium animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
                  <span>
                    {typingUsers.length === 1 
                      ? `${typingUsers[0]} está escribiendo...` 
                      : `${typingUsers.slice(0, 2).join(', ')} están escribiendo...`}
                  </span>
                </div>
              ) : (
                <>
                  <Circle className={`w-2.5 h-2.5 ${isConnected ? 'text-emerald-500 fill-emerald-500' : 'text-slate-400 fill-slate-400'}`} />
                  <span className="text-xs text-slate-500">
                    {isConnected 
                      ? (isGroup ? `${participantsCount} miembros · En tiempo real` : 'Conectado en tiempo real') 
                      : 'Conectando...'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Acciones de Cabecera (info de grupo) */}
        {isGroup && room.participants && room.participants.length > 0 && (
          <button
            onClick={() => setShowMembersModal(true)}
            className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-xl border border-slate-200/80 transition-all flex items-center gap-1.5 text-xs font-medium"
            title="Ver participantes del grupo"
          >
            <Info className="w-4 h-4" />
            <span className="hidden sm:inline">Miembros ({participantsCount})</span>
          </button>
        )}
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
            const hasFile = Boolean(msg.file_url);
            const isImg = isImageFile(msg.file_type, msg.file_url);
            const fullFileUrl = msg.file_url ? getMediaUrl(msg.file_url) : '';

            return (
              <motion.div
                key={msg.id}
                id={`msg-${msg.id}`}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={`group flex flex-col ${isMe ? 'items-end' : 'items-start'} transition-all duration-300`}
              >
                <div className={`relative flex items-center gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Contenedor del Mensaje */}
                  <div
                    className={`max-w-[85%] md:max-w-[70%] p-3.5 rounded-2xl text-sm transition-all ${
                      isMe
                        ? 'bg-gradient-to-r from-brand-500 to-amber-600 text-white rounded-br-none shadow-sm shadow-brand-500/10'
                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none shadow-xs'
                    }`}
                  >
                    {/* Cita/Respuesta del mensaje previo */}
                    {msg.reply_to && (
                      <div
                        onClick={() => scrollToMessage(msg.reply_to!.id)}
                        className={`mb-2.5 p-2 rounded-xl border-l-4 text-xs cursor-pointer transition-all ${
                          isMe
                            ? 'bg-black/20 border-white/90 text-white/95 hover:bg-black/30'
                            : 'bg-slate-100 border-brand-500 text-slate-700 hover:bg-slate-200/70'
                        }`}
                        title="Haz clic para ver el mensaje citado"
                      >
                        <div className="flex items-center gap-1 font-bold text-[11px] mb-0.5">
                          <Reply className="w-3 h-3 rotate-180 opacity-80" />
                          <span className={isMe ? 'text-white' : 'text-brand-700 font-outfit'}>
                            {msg.reply_to.sender_name}
                          </span>
                        </div>
                        <p className="line-clamp-1 italic text-[11px] opacity-90">
                          {msg.reply_to.content || (msg.reply_to.file_name ? `📎 ${msg.reply_to.file_name}` : 'Archivo adjunto')}
                        </p>
                      </div>
                    )}

                    {/* Nombre del autor si no soy yo */}
                    {!isMe && (
                      <span className="text-[11px] font-bold font-outfit text-brand-600 block mb-1">
                        {msg.sender_name}
                      </span>
                    )}

                    {/* Renderizado de Archivo / Imagen Adjunta */}
                    {hasFile && (
                      <div className="mb-2">
                        {isImg ? (
                          <div className="relative group/img overflow-hidden rounded-xl border border-black/10 max-w-sm bg-slate-900/5">
                            <img
                              src={fullFileUrl}
                              alt={msg.file_name || 'Imagen adjunta'}
                              className="max-h-60 w-full object-cover rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                              onClick={() => setActiveImageModal(fullFileUrl)}
                            />
                            <a
                              href={fullFileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute top-2 right-2 p-1.5 bg-slate-900/70 hover:bg-slate-900 text-white rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity backdrop-blur-xs"
                              title="Abrir imagen completa"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ) : (
                          <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                            isMe ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}>
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`p-2 rounded-lg ${isMe ? 'bg-white/20 text-white' : 'bg-brand-50 text-brand-600 border border-brand-100'}`}>
                                <FileText className="w-5 h-5 flex-shrink-0" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold truncate leading-tight font-outfit">{msg.file_name || 'Archivo adjunto'}</p>
                                <span className={`text-[10px] ${isMe ? 'text-amber-100' : 'text-slate-400'}`}>Documento</span>
                              </div>
                            </div>
                            <a
                              href={fullFileUrl}
                              download={msg.file_name || 'adjunto'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`p-2 rounded-lg transition-all flex items-center justify-center flex-shrink-0 ${
                                isMe 
                                  ? 'bg-white/20 hover:bg-white/30 text-white' 
                                  : 'bg-white hover:bg-brand-50 text-brand-600 border border-slate-200 shadow-xs'
                              }`}
                              title="Descargar archivo"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Texto del mensaje */}
                    {msg.content && (
                      <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                    )}

                    <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isMe ? 'text-amber-100' : 'text-slate-400'}`}>
                      <span>{formatChatTime(msg.created_at)}</span>
                      {isMe && (
                        msg.is_read ? <CheckCheck className="w-3.5 h-3.5 text-amber-200" /> : <Check className="w-3.5 h-3.5 opacity-80" />
                      )}
                    </div>
                  </div>

                  {/* Botón de Respuesta al pasar el cursor */}
                  {canSend && (
                    <button
                      type="button"
                      onClick={() => handleStartReply(msg)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-400 hover:text-brand-600 hover:bg-white bg-white/80 rounded-full shadow-xs border border-slate-200/80 flex-shrink-0 active:scale-95"
                      title="Responder a este mensaje"
                    >
                      <Reply className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Indicador de que alguien está escribiendo al final del chat */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-xs border border-slate-200/60 rounded-full w-fit text-xs text-slate-500 shadow-2xs animate-fade-in">
            <div className="flex gap-1 items-center">
              <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="font-medium text-slate-600 font-outfit">
              {typingUsers.length === 1
                ? `${typingUsers[0]} está escribiendo...`
                : `${typingUsers.slice(0, 2).join(', ')}${typingUsers.length > 2 ? ` y ${typingUsers.length - 2} más` : ''} están escribiendo...`}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Banner de Cita/Respuesta activo antes de enviar */}
      {replyingTo && (
        <div className="px-4 py-2.5 bg-brand-50/90 border-t border-brand-200 flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-brand-500 text-white flex-shrink-0 shadow-2xs">
              <Reply className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-brand-950 truncate font-outfit">
                Respondiendo a <span className="text-brand-700">{replyingTo.sender_name}</span>
              </p>
              <p className="text-[11px] text-slate-600 truncate">
                {replyingTo.content || (replyingTo.file_name ? `📎 ${replyingTo.file_name}` : 'Archivo adjunto')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-brand-100 rounded-lg transition-all"
            title="Cancelar respuesta"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bar de Vista Previa de Archivo seleccionado antes de enviar */}
      {selectedFile && (
        <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3 min-w-0">
            {filePreview ? (
              <img src={filePreview} alt="Vista previa" className="w-10 h-10 object-cover rounded-lg border border-slate-300" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate font-outfit">{selectedFile.name}</p>
              <p className="text-[10px] text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearFile}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-all"
            title="Quitar adjunto"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input Box */}
      <div className="p-3.5 bg-white border-t border-slate-200">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          {/* Input oculto para adjuntos */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          />

          <button
            type="button"
            disabled={!canSend || !isConnected || uploading}
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-slate-500 hover:text-brand-600 hover:bg-brand-50 disabled:opacity-40 rounded-xl transition-all font-medium flex items-center justify-center border border-transparent hover:border-brand-200"
            title="Adjuntar archivo o imagen"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <input
            ref={textInputRef}
            type="text"
            placeholder={canSend ? (replyingTo ? `Escribe una respuesta a ${replyingTo.sender_name}...` : "Escribe un mensaje o adjunta un archivo...") : "Sin permiso para enviar mensajes"}
            disabled={!canSend || !isConnected || uploading}
            value={inputText}
            onChange={handleInputChange}
            className="flex-1 bg-slate-50 text-slate-900 text-sm px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all placeholder:text-slate-400 disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={!canSend || (!inputText.trim() && !selectedFile) || !isConnected || uploading}
            className="p-3 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl transition-all font-medium flex items-center justify-center shadow-sm shadow-brand-500/20 active:scale-95 min-w-[44px]"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>

      {/* Modal Visor de Imagen Completa */}
      {activeImageModal && createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150" 
          style={{ margin: 0 }}
          onClick={() => setActiveImageModal(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img src={activeImageModal} alt="Vista completa" className="max-h-[85vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/10" />
            <button
              onClick={() => setActiveImageModal(null)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-full transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Modal / Panel de Miembros del Grupo */}
      {showMembersModal && isGroup && createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150" 
          style={{ margin: 0 }}
          onClick={() => setShowMembersModal(false)}
        >
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-600" />
                <h3 className="text-slate-900 font-bold font-outfit text-base">Miembros del Grupo</h3>
              </div>
              <button
                onClick={() => setShowMembersModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto p-4 space-y-2">
              {room.participants?.map((participant) => (
                <div key={participant.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center font-bold text-brand-600 text-sm font-outfit">
                      {participant.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-slate-900 text-sm font-semibold font-outfit">
                        {participant.name} {participant.id === currentUserId && <span className="text-xs text-brand-600 font-normal">(Tú)</span>}
                      </h4>
                      <p className="text-xs text-slate-500">{participant.email}</p>
                    </div>
                  </div>
                  {participant.is_online ? (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                      <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" /> En línea
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">Desconectado</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

