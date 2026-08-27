import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Globe, 
  Key, 
  Copy, 
  Check, 
  AlertTriangle, 
  Loader2, 
  ShieldCheck, 
  Terminal, 
  Sparkles,
  Link2,
  Lock
} from 'lucide-react';
import { ExternalApp, ExternalAppCreateInput, externalAppsService } from '../../../../services/externalApps';

interface ExternalAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  app: ExternalApp | null;
}

export const ExternalAppModal: React.FC<ExternalAppModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  app
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [redirectUrls, setRedirectUrls] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Newly created credentials
  const [createdCredentials, setCreatedCredentials] = useState<{
    clientId: string;
    apiKey: string;
    webhookSecret: string;
  } | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (app) {
        setName(app.name || '');
        setDescription(app.description || '');
        setWebhookUrl(app.webhook_url || '');
        setRedirectUrls(app.redirect_urls || '');
        setIsActive(app.is_active);
      } else {
        setName('');
        setDescription('');
        setWebhookUrl('');
        setRedirectUrls('');
        setIsActive(true);
      }
      setCreatedCredentials(null);
      setError(null);
    }
  }, [isOpen, app]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre de la aplicación es obligatorio.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const payload: ExternalAppCreateInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        webhook_url: webhookUrl.trim() || undefined,
        redirect_urls: redirectUrls.trim() || undefined,
        is_active: isActive
      };

      if (app) {
        await externalAppsService.updateApp(app.id, payload);
        onSaved();
        onClose();
      } else {
        const res = await externalAppsService.createApp(payload);
        setCreatedCredentials({
          clientId: res.client_id,
          apiKey: res.api_key,
          webhookSecret: res.webhook_secret || ''
        });
        onSaved();
      }
    } catch (err: any) {
      console.error('Error saving external app:', err);
      setError(err.message || 'Error al guardar la aplicación externa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4" style={{ margin: 0 }}>
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200 animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-brand-50 border border-brand-100 rounded-2xl text-brand-600 flex items-center justify-center shadow-xs">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-montserrat text-slate-900 tracking-tight">
                {createdCredentials 
                  ? 'Credenciales de Conexión Generadas' 
                  : app 
                    ? 'Editar Aplicación Externa' 
                    : 'Registrar Nueva Aplicación Externa (Gloint Pay)'}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {createdCredentials 
                  ? 'Copia y guarda estas llaves secretas en tu servidor' 
                  : 'Configura el acceso para que apps de terceros puedan procesar cobros'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Credentials Display Step (When newly created) */}
          {createdCredentials ? (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>¡Importante! Guarda tu API Key ahora</span>
                </div>
                <p className="text-amber-800/90 text-[11px]">
                  Por motivos de seguridad, la <strong>API Key Secreta</strong> solo se muestra en este momento y no podrá ser recuperada después.
                </p>
              </div>

              {/* Client ID */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Client ID (Público)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={createdCredentials.clientId}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 font-bold select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(createdCredentials.clientId, 'client_id')}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                    title="Copiar Client ID"
                  >
                    {copiedKey === 'client_id' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* API Key */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-brand-700">
                  API Key Secreta (Servidor a Servidor)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={createdCredentials.apiKey}
                    className="flex-1 px-3.5 py-2.5 bg-brand-50/50 border border-brand-200 rounded-xl font-mono text-xs text-brand-900 font-bold select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(createdCredentials.apiKey, 'api_key')}
                    className="p-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-colors cursor-pointer shadow-xs"
                    title="Copiar API Key"
                  >
                    {copiedKey === 'api_key' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Webhook Secret */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Webhook Secret (Firma HMAC)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={createdCredentials.webhookSecret}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(createdCredentials.webhookSecret, 'webhook_secret')}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                    title="Copiar Webhook Secret"
                  >
                    {copiedKey === 'webhook_secret' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Example Request Snippet */}
              <div className="mt-4 p-3.5 bg-slate-900 rounded-2xl text-slate-200 text-xs font-mono space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-brand-400" /> Ejemplo de integración cURL
                  </span>
                </div>
                <pre className="text-[10px] overflow-x-auto text-emerald-400 py-1">
{`curl -X POST https://api.gloint.com/api/v1/external-pay/payments \\
  -H "X-API-Key: ${createdCredentials.apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "order_reference": "ORD-1001",
    "amount": 50000,
    "description": "Compra en ${name}",
    "redirect_url": "https://tu-comercio.com/gracias"
  }'`}
                </pre>
              </div>
            </div>
          ) : (
            /* Normal Form for Create/Edit */
            <form id="app-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 font-montserrat">
                  Nombre del Comercio o Aplicación *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. LogyPay, Tienda Virtual, POS Bogotá"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 font-montserrat">
                  Descripción o Finalidad
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre qué compras o servicios procesa esta aplicación..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 font-montserrat flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-brand-600" />
                  URL de Webhook (Notificación de Pago)
                </label>
                <input
                  type="url"
                  placeholder="https://tu-servidor.com/api/webhooks/gloint-pay"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
                <span className="text-[10px] text-slate-400 block">
                  Gloint enviará un HTTP POST con la firma de seguridad cada vez que un usuario complete un pago.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 font-montserrat">
                  URLs / Dominios Permitidos de Redirección
                </label>
                <input
                  type="text"
                  placeholder="https://mitienda.com, https://app.mitienda.com"
                  value={redirectUrls}
                  onChange={(e) => setRedirectUrls(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
                <span className="text-[10px] text-slate-400 block">
                  Dominios válidos hacia donde se retornará al usuario al terminar el checkout.
                </span>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="isActiveApp"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
                />
                <label htmlFor="isActiveApp" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Aplicación Activa (Permite recibir y procesar pagos)
                </label>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
          {createdCredentials ? (
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all cursor-pointer shadow-xs"
            >
              Entendido, ya guardé mis credenciales
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="app-form"
                disabled={isSubmitting}
                className="px-6 py-2.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-all shadow-md shadow-brand-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>{app ? 'Actualizar Aplicación' : 'Generar Conexión & API Key'}</span>
                )}
              </button>
            </>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
};
