import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Landmark, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  ShieldCheck,
  Building2,
  Clock
} from 'lucide-react';
import { yointService, YointBank, InitPayinResponse, PayinStatusResponse } from '../../services/yoint';
import { formatCurrency } from '../../utils/format';

interface YointPaymentWidgetProps {
  amount: number;
  payinType: 'WALLET_TOPUP' | 'INVESTMENT_REQUEST';
  investmentRequestId?: number;
  onRequestCreate?: () => Promise<number>;
  userPhone?: string;
  onSuccess: (status: PayinStatusResponse) => void;
  onFailed?: (status: PayinStatusResponse | null, error?: string) => void;
  submitButtonText?: string;
  isSubmittingParent?: boolean;
}

export const YointPaymentWidget: React.FC<YointPaymentWidgetProps> = ({
  amount,
  payinType,
  investmentRequestId,
  onRequestCreate,
  userPhone = '',
  onSuccess,
  onFailed,
  submitButtonText = 'Proceder al Pago en Línea',
  isSubmittingParent = false
}) => {
  const [method, setMethod] = useState<'NEQUI' | 'BOTON_BANCOLOMBIA' | 'PSE'>('NEQUI');
  const [phone, setPhone] = useState(userPhone.replace(/\D/g, '').slice(-10) || '');
  const [selectedBank, setSelectedBank] = useState<string>('1007'); // Default Bancolombia ACH
  const [banks, setBanks] = useState<YointBank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);

  // Estados de proceso de pago
  const [isProcessing, setIsProcessing] = useState(false);
  const [activePayin, setActivePayin] = useState<InitPayinResponse | null>(null);
  const [pollingStatus, setPollingStatus] = useState<string>('PENDING');
  const [pollingError, setPollingError] = useState<string | null>(null);

  // Cargar entidades financieras cuando se seleccione PSE
  useEffect(() => {
    if (method === 'PSE' && banks.length === 0) {
      setLoadingBanks(true);
      yointService.getBanks()
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setBanks(data);
            if (!data.some(b => b.id === selectedBank)) {
              setSelectedBank(data[0].id);
            }
          }
        })
        .catch((err) => console.error("Error cargando bancos Yoint:", err))
        .finally(() => setLoadingBanks(false));
    }
  }, [method]);

  // Polling de verificación de estado mientras activePayin esté en PENDING
  useEffect(() => {
    let intervalId: any = null;

    if (activePayin && pollingStatus === 'PENDING') {
      intervalId = setInterval(async () => {
        try {
          const res = await yointService.getPayinStatus(activePayin.payin_id);
          const currentStatus = res.status.toUpperCase();
          setPollingStatus(currentStatus);

          if (currentStatus === 'SUCCESS' || res.investment_approved) {
            clearInterval(intervalId);
            onSuccess(res);
          } else if (currentStatus === 'FAILED' || currentStatus === 'REJECTED' || currentStatus === 'EXPIRED') {
            clearInterval(intervalId);
            if (onFailed) onFailed(res);
          }
        } catch (e: any) {
          console.warn("Error en polling de Yoint:", e);
        }
      }, 4000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activePayin, pollingStatus]);

  const handleStartPayment = async () => {
    try {
      setIsProcessing(true);
      setPollingError(null);

      let reqId = investmentRequestId;
      if (payinType === 'INVESTMENT_REQUEST' && !reqId) {
        if (!onRequestCreate) {
          throw new Error('No se pudo generar la solicitud de inversión previa al pago.');
        }
        reqId = await onRequestCreate();
      }

      const res = await yointService.initPayin({
        payin_type: payinType,
        amount,
        payment_method: method,
        investment_request_id: reqId,
        phone_nequi: method === 'NEQUI' ? phone : undefined,
        bank_id: method === 'PSE' ? selectedBank : undefined,
        redirect_url: window.location.href
      });

      setActivePayin(res);
      setPollingStatus('PENDING');

      // Si es Botón Bancolombia o PSE y devuelve URL de redirección, abrirla
      if (res.redirect_url) {
        window.open(res.redirect_url, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      console.error("Error iniciando pago Yoint:", err);
      setPollingError(err.message || 'Error al conectar con la pasarela de pagos.');
      if (onFailed) onFailed(null, err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Vista durante o después del pago iniciado
  if (activePayin) {
    return (
      <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {pollingStatus === 'PENDING' && (
          <div className="text-center space-y-4">
            <div className="relative inline-flex items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 shadow-sm">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            </div>

            <div>
              <h4 className="text-base font-bold text-slate-800">Esperando Confirmación del Pago</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {method === 'NEQUI' ? (
                  <>Revisa tu aplicación <strong>Nequi</strong> en el celular y autoriza la notificación push para debitar {formatCurrency(amount)}.</>
                ) : method === 'BOTON_BANCOLOMBIA' ? (
                  <>Completa la transferencia en la ventana abierta de <strong>Bancolombia</strong>.</>
                ) : (
                  <>Completa la transacción en la plataforma segura de <strong>PSE</strong>.</>
                )}
              </p>
            </div>

            {activePayin.redirect_url && (
              <div className="pt-2">
                <a
                  href={activePayin.redirect_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Reabrir Pasarela de Pago</span>
                </a>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
              <Clock className="w-3.5 h-3.5 animate-pulse text-amber-500" />
              <span>Verificando automáticamente con Yoint...</span>
            </div>
          </div>
        )}

        {pollingStatus === 'SUCCESS' && (
          <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2 text-emerald-800">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="font-bold text-base text-emerald-900">¡Pago Confirmado Exitosamente!</h4>
            <p className="text-xs text-emerald-700">
              {payinType === 'INVESTMENT_REQUEST'
                ? 'Tu inversión ha sido aprobada y tu contrato fue activado de inmediato.'
                : 'El saldo ha sido acreditado en tu billetera de forma instantánea.'}
            </p>
          </div>
        )}

        {(pollingStatus === 'FAILED' || pollingStatus === 'REJECTED' || pollingStatus === 'EXPIRED') && (
          <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-3 text-rose-800">
            <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
            <div>
              <h4 className="font-bold text-base text-rose-900">El Pago No Pudo Completarse</h4>
              <p className="text-xs text-rose-700 mt-1">
                La transacción fue rechazada o expiró en la pasarela. No se realizó ningún cobro.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setActivePayin(null);
                setPollingStatus('PENDING');
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              Intentar Nuevamente
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selector de Método de Pago */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Selecciona tu método de pago Yoint</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Opción Nequi */}
          <button
            type="button"
            onClick={() => setMethod('NEQUI')}
            className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
              method === 'NEQUI'
                ? 'border-purple-600 bg-purple-50/50 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs">
                🟣
              </span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                method === 'NEQUI' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                Push App
              </span>
            </div>
            <div>
              <div className="font-extrabold text-xs text-slate-800">Nequi</div>
              <div className="text-[10px] text-slate-400">Débito directo al celular</div>
            </div>
          </button>

          {/* Opción Botón Bancolombia */}
          <button
            type="button"
            onClick={() => setMethod('BOTON_BANCOLOMBIA')}
            className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
              method === 'BOTON_BANCOLOMBIA'
                ? 'border-amber-500 bg-amber-50/50 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 font-bold text-xs">
                🟡
              </span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                method === 'BOTON_BANCOLOMBIA' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                Bancolombia
              </span>
            </div>
            <div>
              <div className="font-extrabold text-xs text-slate-800">Botón Bancolombia</div>
              <div className="text-[10px] text-slate-400">Transferencia oficial rápida</div>
            </div>
          </button>

          {/* Opción PSE */}
          <button
            type="button"
            onClick={() => setMethod('PSE')}
            className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
              method === 'PSE'
                ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                🔵
              </span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                method === 'PSE' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                Cualquier Banco
              </span>
            </div>
            <div>
              <div className="font-extrabold text-xs text-slate-800">PSE</div>
              <div className="text-[10px] text-slate-400">Débito ACH bancario</div>
            </div>
          </button>
        </div>
      </div>

      {/* Parámetros Específicos según Método */}
      <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-4 space-y-3">
        {method === 'NEQUI' && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-purple-600" />
              <span>Número de Teléfono Nequi</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                +57
              </span>
              <input
                type="tel"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="3001234567"
                className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Recibirás una notificación en tu app Nequi para autorizar el cobro por <strong>{formatCurrency(amount)}</strong>.
            </p>
          </div>
        )}

        {method === 'BOTON_BANCOLOMBIA' && (
          <div className="flex items-start gap-2.5 text-xs text-slate-600">
            <Landmark className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-800 block">Redirección a Botón Bancolombia</span>
              <span className="text-[11px] text-slate-500">
                Se abrirá la pasarela segura oficial de Bancolombia para validar tu clave dinámica y completar la transacción por <strong>{formatCurrency(amount)}</strong>.
              </span>
            </div>
          </div>
        )}

        {method === 'PSE' && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Selecciona tu Banco</span>
            </label>
            {loadingBanks ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                <span>Cargando lista oficial de entidades ACH...</span>
              </div>
            ) : (
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
            <p className="text-[11px] text-slate-500">
              Al hacer clic en pagar serás redirigido a la pasarela de PSE para autenticarte con tu banco.
            </p>
          </div>
        )}
      </div>

      {pollingError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{pollingError}</span>
        </div>
      )}

      {/* Botón de Pago Principal */}
      <button
        type="button"
        disabled={isProcessing || isSubmittingParent || (method === 'NEQUI' && phone.length < 10)}
        onClick={handleStartPayment}
        className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Conectando con Yoint Payments...</span>
          </>
        ) : (
          <>
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>{submitButtonText} ({formatCurrency(amount)})</span>
          </>
        )}
      </button>
    </div>
  );
};
