import React, { useState, useEffect } from 'react';
import { 
  X, 
  Wallet as WalletIcon, 
  UploadCloud, 
  Copy, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  CreditCard,
  Building2,
  Zap,
  ArrowRight
} from 'lucide-react';
import { CreditInstallment, payCreditInstallment } from '../../../services/credits';
import { getMyWallet } from '../../../services/wallets';
import { YointPaymentWidget } from '../../../components/payments/YointPaymentWidget';

interface PayInstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  installment: CreditInstallment;
  creditId: number;
}

const GLOINT_BANK_INFO = {
  bank: 'Bancolombia S.A.',
  accountType: 'Cuenta de Ahorros',
  accountNumber: '67400002873',
  holder: 'GLOINT INTERNATIONAL PARTNERS SAS',
  nit: '901702380'
};

export const PayInstallmentModal: React.FC<PayInstallmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  installment,
  creditId
}) => {
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [useWallet, setUseWallet] = useState(false);
  const [walletAmount, setWalletAmount] = useState<number>(0);
  
  // Método para el excedente
  const [paymentTab, setPaymentTab] = useState<'TRANSFER' | 'YOINT'>('TRANSFER');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Saldo faltante de la cuota
  const remainingNeeded = Math.max(0, installment.total_amount - installment.paid_amount);

  useEffect(() => {
    if (isOpen) {
      getMyWallet()
        .then(res => {
          const bal = typeof res.balance === 'string' ? parseFloat(res.balance) : res.balance;
          setWalletBalance(bal || 0);
          if (bal && bal > 0) {
            setUseWallet(true);
            setWalletAmount(Math.min(bal, remainingNeeded));
          } else {
            setUseWallet(false);
            setWalletAmount(0);
          }
        })
        .catch(err => console.warn('Error cargando billetera:', err));
    } else {
      setSuccess(false);
      setError(null);
      setReceiptFile(null);
      setPaymentReference('');
      setNotes('');
    }
  }, [isOpen, remainingNeeded]);

  if (!isOpen) return null;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const actualWalletApplied = useWallet ? Math.min(walletAmount, walletBalance, remainingNeeded) : 0;
  const pendingExternalAmount = Math.max(0, remainingNeeded - actualWalletApplied);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (actualWalletApplied > walletBalance) {
      setError('El saldo a utilizar supera tu balance disponible en billetera.');
      return;
    }

    if (pendingExternalAmount > 0 && !receiptFile) {
      setError('Es obligatorio adjuntar el comprobante de transferencia bancaria por el saldo restante.');
      return;
    }

    try {
      setLoading(true);
      await payCreditInstallment(installment.id, {
        use_wallet_amount: actualWalletApplied,
        payment_method: actualWalletApplied > 0 && pendingExternalAmount > 0 ? 'MIXED' : (actualWalletApplied > 0 ? 'WALLET' : 'MANUAL_TRANSFER'),
        payment_reference: paymentReference.trim() || undefined,
        notes: notes.trim() || undefined,
        receipt: receiptFile
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Error al procesar el pago de la cuota.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-montserrat">
              Pagar Cuota #{installment.installment_number}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Crédito #{creditId} • Vencimiento: {new Date(installment.due_date).toLocaleDateString('es-CO')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6">

          {/* Desglose de la cuota */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between shadow-md">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Total de la Cuota</span>
              <span className="text-xl font-black font-montserrat">
                ${installment.total_amount.toLocaleString('es-CO')} COP
              </span>
              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                <span>Capital: ${installment.principal_amount.toLocaleString('es-CO')}</span>
                <span>•</span>
                <span>Interés: ${installment.interest_amount.toLocaleString('es-CO')}</span>
              </div>
            </div>

            {installment.paid_amount > 0 && (
              <div className="text-right">
                <span className="text-[10px] text-emerald-400 block font-bold uppercase tracking-wider">Ya Abonado</span>
                <span className="text-sm font-bold text-emerald-300">
                  ${installment.paid_amount.toLocaleString('es-CO')}
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h4 className="text-base font-bold text-slate-900 font-montserrat">¡Pago Registrado Exitosamente!</h4>
              <p className="text-xs text-slate-600">
                {pendingExternalAmount === 0 
                  ? 'Tu cuota ha quedado 100% liquidada con tu saldo de billetera.'
                  : 'Hemos recibido tu abono y comprobante. El equipo administrativo validará la transferencia.'}
              </p>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Opción 1: Aplicar Billetera */}
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useWallet}
                      onChange={(e) => {
                        setUseWallet(e.target.checked);
                        if (e.target.checked) {
                          setWalletAmount(Math.min(walletBalance, remainingNeeded));
                        }
                      }}
                      className="w-4 h-4 text-amber-500 border-slate-300 rounded focus:ring-amber-400 cursor-pointer"
                    />
                    <div className="flex items-center gap-2">
                      <WalletIcon className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-bold text-slate-900 font-montserrat">
                        Usar Saldo de Billetera
                      </span>
                    </div>
                  </label>

                  <span className="text-xs font-semibold text-slate-600">
                    Disponible: <strong className="text-slate-900">${walletBalance.toLocaleString('es-CO')}</strong>
                  </span>
                </div>

                {useWallet && (
                  <div className="pt-2 border-t border-amber-500/10 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Monto a debitar de Wallet:</span>
                      <button
                        type="button"
                        onClick={() => setWalletAmount(Math.min(walletBalance, remainingNeeded))}
                        className="text-[11px] font-bold text-amber-600 hover:text-amber-700 underline cursor-pointer"
                      >
                        Usar máximo (${Math.min(walletBalance, remainingNeeded).toLocaleString('es-CO')})
                      </button>
                    </div>

                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs font-bold">$</span>
                      <input
                        type="number"
                        min={0}
                        max={Math.min(walletBalance, remainingNeeded)}
                        value={walletAmount}
                        onChange={(e) => setWalletAmount(Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Saldo Restante a Transferir */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Saldo Restante a Cubrir:</span>
                <span className="font-extrabold text-sm text-slate-900 font-montserrat">
                  ${pendingExternalAmount.toLocaleString('es-CO')} COP
                </span>
              </div>

              {/* Si queda saldo restante, mostrar opciones de pago */}
              {pendingExternalAmount > 0 && (
                <div className="space-y-4">
                  
                  {/* Selector de pestaña: Transferencia vs Yoint */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setPaymentTab('TRANSFER')}
                      className={`py-2 rounded-xl text-xs font-bold font-montserrat transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        paymentTab === 'TRANSFER'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      Transferencia Bancaria
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentTab('YOINT')}
                      className={`py-2 rounded-xl text-xs font-bold font-montserrat transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        paymentTab === 'YOINT'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      Pago en Línea (PSE / Bancolombia)
                    </button>
                  </div>

                  {paymentTab === 'TRANSFER' ? (
                    <div className="space-y-4">
                      
                      {/* Datos Bancarios de Gloint */}
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                        <div className="flex items-center justify-between font-bold text-slate-900 font-montserrat pb-1 border-b border-slate-200">
                          <span>{GLOINT_BANK_INFO.bank}</span>
                          <span className="text-[11px] text-amber-600 font-normal">{GLOINT_BANK_INFO.accountType}</span>
                        </div>
                        
                        <div className="flex items-center justify-between text-slate-600">
                          <span>N° de Cuenta: <strong className="text-slate-900 font-mono">{GLOINT_BANK_INFO.accountNumber}</strong></span>
                          <button
                            type="button"
                            onClick={() => handleCopy(GLOINT_BANK_INFO.accountNumber, 'acc')}
                            className="p-1 rounded-md text-amber-600 hover:bg-amber-100/50"
                          >
                            {copiedField === 'acc' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-slate-600">
                          <span>Titular: <strong className="text-slate-900">{GLOINT_BANK_INFO.holder}</strong></span>
                          <span className="text-[11px] text-slate-500 font-mono">NIT: {GLOINT_BANK_INFO.nit}</span>
                        </div>
                      </div>

                      {/* Referencia bancaria */}
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          N° Comprobante / Referencia de Transferencia
                        </label>
                        <input
                          type="text"
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          placeholder="Ej. CUS-1029384 o Ref Bancaria"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 font-medium font-mono"
                        />
                      </div>

                      {/* Subir Comprobante */}
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Adjuntar Comprobante Bancario (JPG, PNG o PDF) <span className="text-rose-500">*</span>
                        </label>
                        <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 hover:border-amber-400 bg-slate-50 hover:bg-amber-50/20 rounded-2xl cursor-pointer transition-colors">
                          <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                          <span className="text-xs font-semibold text-slate-700">
                            {receiptFile ? receiptFile.name : 'Haz clic para seleccionar comprobante'}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">Máximo 10MB</span>
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,.pdf"
                            onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                            className="hidden"
                          />
                        </label>
                      </div>

                    </div>
                  ) : (
                    /* Pestaña Yoint Pasarela */
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
                      <p className="text-xs text-slate-600">
                        Paga en línea los <strong>${pendingExternalAmount.toLocaleString('es-CO')} COP</strong> restantes utilizando PSE, Transferencia Bancolombia o Débito Bre-B.
                      </p>
                      
                      <YointPaymentWidget
                        payinType="CREDIT_INSTALLMENT"
                        amount={pendingExternalAmount}
                        submitButtonText="Pagar en Línea (PSE / Bancolombia)"
                        onSuccess={() => {
                          onSuccess();
                          onClose();
                        }}
                      />
                    </div>
                  )}

                </div>
              )}

              {/* Botón de Enviar cuando es Wallet o Transferencia */}
              {(pendingExternalAmount === 0 || paymentTab === 'TRANSFER') && (
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs font-montserrat uppercase tracking-wider transition-all shadow-md shadow-amber-500/25 active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Procesando Pago...</span>
                    </>
                  ) : (
                    <>
                      <span>{pendingExternalAmount === 0 ? 'Pagar Cuota con Billetera' : 'Confirmar y Enviar Comprobante'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}

            </form>
          )}

        </div>

      </div>
    </div>
  );
};
