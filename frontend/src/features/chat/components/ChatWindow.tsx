import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Circle, 
  ShieldAlert, 
  Check, 
  CheckCheck, 
  ArrowLeft, 
  Paperclip, 
  FileText, 
  FileSpreadsheet,
  FileArchive,
  FileCode,
  Download, 
  X, 
  Loader2,
  Image as ImageIcon,
  ExternalLink,
  Trash2,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatWebSocket } from '../hooks/useChatWebSocket';
import { chatService, ChatRoom, ChatMessage } from '../../../services/chatService';
import { getMediaUrl } from '../../../services/api';

interface ChatWindowProps {
  room: ChatRoom | null;
  currentUserId: number;
  canSend: boolean;
  onBack?: () => void;
}

export const formatFileSize = (bytes: number): string => {
  if (!bytes || isNaN(bytes) || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const getFileMeta = (fileName?: string | null, fileType?: string | null) => {
  const name = (fileName || '').toLowerCase();
  const type = (fileType || '').toLowerCase();

  // 1. Imagen
  if (type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/.test(name)) {
    return {
      isImage: true,
      label: 'Imagen',
      badgeBg: 'bg-indigo-50 border-indigo-200 text-indigo-700',
      icon: ImageIcon
    };
  }

  // 2. Excel / Hoja de Cálculo
  if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv') || /\.(xlsx|xls|csv|tsv|ods)$/.test(name)) {
    return {
      isImage: false,
      label: 'Hoja de Cálculo / Excel',
      badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      icon: FileSpreadsheet
    };
  }

  // 3. PDF
  if (type.includes('pdf') || /\.pdf$/.test(name)) {
    return {
      isImage: false,
      label: 'Documento PDF',
      badgeBg: 'bg-rose-50 border-rose-200 text-rose-700',
      icon: FileText
    };
  }

  // 4. Word / Documento
  if (type.includes('word') || type.includes('document') || /\.(docx|doc|rtf|odt)$/.test(name)) {
    return {
      isImage: false,
      label: 'Documento Word',
      badgeBg: 'bg-blue-50 border-blue-200 text-blue-700',
      icon: FileText
    };
  }

  // 5. Archivos Comprimidos
  if (type.includes('zip') || type.includes('tar') || type.includes('rar') || type.includes('7z') || /\.(zip|rar|7z|tar|gz)$/.test(name)) {
    return {
      isImage: false,
      label: 'Archivo Comprimido',
      badgeBg: 'bg-amber-50 border-amber-200 text-amber-700',
      icon: FileArchive
    };
  }

  // 6. Código / Texto plano
  if (type.includes('json') || type.includes('xml') || type.includes('sql') || type.includes('text') || /\.(txt|json|xml|sql|js|ts|py|html|css|log)$/.test(name)) {
    return {
      isImage: false,
      label: 'Archivo de Texto / Código',
      badgeBg: 'bg-purple-50 border-purple-200 text-purple-700',
      icon: FileCode
    };
  }

  // 7. Genérico
  return {
    isImage: false,
    label: 'Archivo Adjunto',
    badgeBg: 'bg-slate-100 border-slate-200 text-slate-700',
    icon: FileText
  };
};

export const ChatWindow: React.FC<ChatWindowProps> = ({ room, currentUserId, canSend, onBack }) => {
  const [inputText, setInputText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [activeImageModal, setActiveImageModal] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, isConnected, error, sendMessage } = useChatWebSocket(room ? room.id : null);

  const initialLoadRef = useRef<boolean>(true);
  const currentRoomIdRef = useRef<number | null>(null);

  // Resetear flag de carga inicial cuando cambia la sala
  useEffect(() => {
    if (room?.id !== currentRoomIdRef.current) {
      currentRoomIdRef.current = room ? room.id : null;
      initialLoadRef.current = true;
      setSelectedFiles([]);
    }
  }, [room?.id]);

  // Auto-scroll al final del chat
  useEffect(() => {
    if (!messagesEndRef.current) return;
    if (initialLoadRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
      initialLoadRef.current = false;
    } else {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Manejar selección de múltiples archivos de cualquier formato
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    setSelectedFiles(prev => [...prev, ...newFiles]);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearAllFiles = () => {
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && selectedFiles.length === 0) || !canSend || !room || uploading) return;

    if (selectedFiles.length > 0) {
      try {
        setUploading(true);
        if (selectedFiles.length === 1) {
          await chatService.uploadFile(room.id, selectedFiles[0], inputText.trim());
        } else {
          await chatService.uploadFiles(room.id, selectedFiles, inputText.trim());
        }
        setInputText('');
        handleClearAllFiles();
      } catch (err: any) {
        alert(err.message || 'Error al subir archivo(s)');
      } finally {
        setUploading(false);
      }
    } else {
      sendMessage(inputText.trim());
      setInputText('');
    }
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
    <div className="flex-1 bg-slate-50/30 flex flex-col h-full overflow-hidden relative">
      {/* Room Header */}
      <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
              title="Volver a la lista"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
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
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40 custom-scrollbar">
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
            const fileMeta = getFileMeta(msg.file_name, msg.file_type);
            const fullFileUrl = msg.file_url ? getMediaUrl(msg.file_url) : '';
            const IconComponent = fileMeta.icon;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] md:max-w-[75%] p-3.5 rounded-2xl text-sm ${
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

                  {/* Renderizado de Archivo / Imagen Adjunta */}
                  {hasFile && (
                    <div className="mb-2">
                      {fileMeta.isImage ? (
                        <div className="relative group overflow-hidden rounded-xl border border-black/10 max-w-sm bg-slate-900/5">
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
                            className="absolute top-2 right-2 p-1.5 bg-slate-900/70 hover:bg-slate-900 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs"
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
                            <div className={`p-2.5 rounded-xl border flex-shrink-0 ${
                              isMe ? 'bg-white/20 border-white/30 text-white' : fileMeta.badgeBg
                            }`}>
                              <IconComponent className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate leading-tight font-outfit">
                                {msg.file_name || 'Archivo adjunto'}
                              </p>
                              <span className={`text-[10px] uppercase font-bold tracking-wider ${isMe ? 'text-amber-100' : 'text-slate-400'}`}>
                                {fileMeta.label}
                              </span>
                            </div>
                          </div>
                          <a
                            href={fullFileUrl}
                            download={msg.file_name || 'adjunto'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`p-2 rounded-xl transition-all flex items-center justify-center flex-shrink-0 cursor-pointer ${
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

      {/* Bar de Vista Previa de Múltiples Archivos seleccionados antes de enviar */}
      {selectedFiles.length > 0 && (
        <div className="px-4 py-2.5 bg-slate-100/90 border-t border-slate-200 space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
              {selectedFiles.length} {selectedFiles.length === 1 ? 'archivo adjunto seleccionado' : 'archivos adjuntos seleccionados'}:
            </span>
            <button
              type="button"
              onClick={handleClearAllFiles}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Quitar todos
            </button>
          </div>

          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
            {selectedFiles.map((file, idx) => {
              const meta = getFileMeta(file.name, file.type);
              const IconComp = meta.icon;
              return (
                <div 
                  key={idx} 
                  className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs max-w-xs"
                >
                  <div className={`p-1 rounded-lg border ${meta.badgeBg}`}>
                    <IconComp className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate font-outfit max-w-[140px]">{file.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(idx)}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                    title="Quitar este archivo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Input Box */}
      <div className="p-3.5 bg-white border-t border-slate-200">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          {/* Input oculto para adjuntos (permite múltiples archivos de cualquier formato) */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            multiple
            accept="*/*"
          />

          <button
            type="button"
            disabled={!canSend || !isConnected || uploading}
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-slate-500 hover:text-brand-600 hover:bg-brand-50 disabled:opacity-40 rounded-xl transition-all font-medium flex items-center justify-center border border-transparent hover:border-brand-200 cursor-pointer"
            title="Adjuntar múltiples archivos (PDF, Excel, Word, imágenes, etc.)"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <input
            type="text"
            placeholder={canSend ? (selectedFiles.length > 0 ? "Añade un mensaje para los adjuntos (opcional)..." : "Escribe un mensaje o adjunta archivos...") : "Sin permiso para enviar mensajes"}
            disabled={!canSend || !isConnected || uploading}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-slate-50 text-slate-900 text-sm px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all placeholder:text-slate-400 disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={!canSend || (!inputText.trim() && selectedFiles.length === 0) || !isConnected || uploading}
            className="p-3 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl transition-all font-medium flex items-center justify-center shadow-sm shadow-brand-500/20 active:scale-95 min-w-[44px] cursor-pointer"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>

      {/* Modal Visor de Imagen Completa */}
      {activeImageModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setActiveImageModal(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img src={activeImageModal} alt="Vista completa" className="max-h-[85vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/10" />
            <button
              onClick={() => setActiveImageModal(null)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-full transition-all cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

