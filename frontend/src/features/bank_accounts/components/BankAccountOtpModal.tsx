import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Landmark, Mail, KeyRound, Loader2, AlertCircle, CheckCircle2, ShieldCheck, Trash2 } from 'lucide-react';
import { bankAccountsService, UserBankAccount, DataBank } from '../../../services/bankAccounts';

interface BankAccountOtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'create' | 'edit' | 'delete';
  accountToEdit?: UserBankAccount | null;
}

export const BankAccountOtpModal: React.FC<BankAccountOtpModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  mode,
  accountToEdit
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [banco, setBanco] = useState('');
  const [customBanco, setCustomBanco] = useState('');
  const [tipoCuenta, setTipoCuenta] = useState('Ahorros');
  const [numeroCuenta, setNumeroCuenta] = useState('');
  const [otpCode, setOtpCode] = useState('');
  
  const [officialBanks, setOfficialBanks] = useState<DataBank[]>([]);
  const [isLoadingBanks, setIsLoadingBanks] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBanks = async () => {
      try {
        setIsLoadingBanks(true);
        const list = await bankAccountsService.getBanks();
        setOfficialBanks(list);
      } catch (err) {
        console.error('Error fetching banks list:', err);
      } finally {
        setIsLoadingBanks(false);
      }
    };
    if (isOpen) {
      loadBanks();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && accountToEdit) {
        const found = officialBanks.find(
          b => b.banck.toLowerCase() === accountToEdit.banco.toLowerCase() ||
               b.code_banck === accountToEdit.banco
        );
        if (found) {
          setBanco(found.banck);
          setCustomBanco('');
        } else {
          setBanco(accountToEdit.banco || 'BANCOLOMBIA');
          setCustomBanco('');
        }
        setTipoCuenta(accountToEdit.tipo_cuenta || 'Ahorros');
        setNumeroCuenta(accountToEdit.numero_cuenta || '');
      } else {
        setBanco('BANCOLOMBIA');
        setCustomBanco('');
        setTipoCuenta('Ahorros');
        setNumeroCuenta('');
      }
      setOtpCode('');
      setStep(1);
      setOtpSent(false);
      setError(null);
    }
  }, [isOpen, mode, accountToEdit, officialBanks]);

  if (!isOpen) return null;

  const finalBanco = banco === 'Otro' ? customBanco.trim() : banco;

  const handleSendOtp = async () => {
    if (mode !== 'delete') {
      if (!finalBanco) {
        setError('Por favor selecciona o ingresa el nombre del banco');
        return;
      }
      if (!numeroCuenta.trim()) {
        setError('Por favor ingresa el número de cuenta');
        return;
      }
    }

    setIsSendingOtp(true);
    setError(null);
    try {
      await bankAccountsService.sendOtpCode();
      setOtpSent(true);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Error al enviar el código de verificación por correo');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setError('Por favor ingresa el código de 6 dígitos que fue enviado a tu correo');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (mode === 'create') {
        await bankAccountsService.createBankAccount({
          banco: finalBanco,
          tipo_cuenta: tipoCuenta,
          numero_cuenta: numeroCuenta.trim(),
          code: otpCode.trim()
        });
      } else if (mode === 'edit' && accountToEdit) {
        await bankAccountsService.updateBankAccount(accountToEdit.id, {
          banco: finalBanco,
          tipo_cuenta: tipoCuenta,
          numero_cuenta: numeroCuenta.trim(),
          code: otpCode.trim()
        });
      } else if (mode === 'delete' && accountToEdit) {
        await bankAccountsService.deleteBankAccount(accountToEdit.id, otpCode.trim());
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al procesar la operación bancaria');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalTitles = {
    create: 'Agregar Nueva Cuenta Bancaria',
    edit: 'Editar Cuenta Bancaria',
    delete: 'Eliminar Cuenta Bancaria'
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pt-20 bg-slate-900/50 backdrop-blur-sm" style={{ margin: 0 }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${mode === 'delete' ? 'bg-red-100 text-red-700' : 'bg-brand-100 text-brand-700'}`}>
              {mode === 'delete' ? <Trash2 className="w-5 h-5 text-red-600" /> : <Landmark className="w-5 h-5 text-brand-600" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">{modalTitles[mode]}</h3>
              <p className="text-xs text-slate-500">Bóveda Bancaria Segura • Verificación OTP</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Delete Confirmation Banner */}
          {mode === 'delete' && accountToEdit && step === 1 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
              <span className="text-xs font-bold text-red-800 uppercase tracking-wider block">Confirmación de Eliminación</span>
              <p className="text-xs text-red-700">
                ¿Estás seguro de que deseas eliminar la cuenta <span className="font-bold">{accountToEdit.banco} ({accountToEdit.tipo_cuenta}) #{accountToEdit.numero_cuenta}</span> de tu bóveda bancaria?
              </p>
              <p className="text-[11px] text-red-600 font-medium pt-1">
                * Para autorizar la eliminación, enviaremos un código de verificación a tu correo electrónico.
              </p>
            </div>
          )}

          {/* Step 1: Input Bank Fields */}
          {mode !== 'delete' && step === 1 && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Banco o Entidad Financiera *
                </label>
                <select
                  value={banco}
                  onChange={(e) => setBanco(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
                >
                  {officialBanks.length > 0 ? (
                    officialBanks.map((b) => (
                      <option key={b.id} value={b.banck}>
                        {b.banck} (Cód: {b.code_banck})
                      </option>
                    ))
                  ) : (
                    <option value="BANCOLOMBIA">BANCOLOMBIA (Cód: 1007)</option>
                  )}
                  <option value="Otro">Otro / Otra Entidad</option>
                </select>
              </div>

              {banco === 'Otro' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Escribe el nombre de tu Entidad *
                  </label>
                  <input
                    type="text"
                    value={customBanco}
                    onChange={(e) => setCustomBanco(e.target.value)}
                    placeholder="Ej. Cooperativa Financiera"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tipo de Cuenta *
                </label>
                <select
                  value={tipoCuenta}
                  onChange={(e) => setTipoCuenta(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
                >
                  <option value="Ahorros">Cuenta de Ahorros</option>
                  <option value="Corriente">Cuenta Corriente</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Número de Cuenta *
                </label>
                <input
                  type="text"
                  value={numeroCuenta}
                  onChange={(e) => setNumeroCuenta(e.target.value)}
                  placeholder="Ej. 1234567890"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  required
                />
              </div>

              <div className="bg-brand-50/70 border border-brand-200/80 rounded-xl p-3.5 flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                <p className="text-xs text-brand-900 font-medium leading-relaxed">
                  Por tu seguridad, al hacer clic en <strong>Continuar</strong> enviaremos un código de 6 dígitos a tu correo registrado para confirmar los datos bancarios.
                </p>
              </div>
            </>
          )}

          {/* Step 2: Input OTP Verification Code */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center space-y-2">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                  <Mail className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-emerald-950 text-sm">Código Enviado a tu Correo</h4>
                <p className="text-xs text-emerald-800">
                  Ingresa el código de 6 dígitos que enviamos a tu dirección de correo electrónico institucional.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2 text-center">
                  Código OTP de Verificación (6 Dígitos) *
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full text-center tracking-[0.5em] text-2xl font-mono py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-slate-50"
                  required
                  autoFocus
                />
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">¿No recibiste el código?</span>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isSendingOtp}
                  className="font-bold text-brand-600 hover:underline disabled:opacity-50"
                >
                  {isSendingOtp ? 'Reenviando...' : 'Reenviar Código'}
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSendingOtp || isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>

            {step === 1 ? (
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isSendingOtp || (mode !== 'delete' && (!finalBanco || !numeroCuenta.trim()))}
                className={`px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-2 ${
                  mode === 'delete' ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' : 'bg-brand-600 hover:bg-brand-700 shadow-brand-600/20'
                }`}
              >
                {isSendingOtp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando Código...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Enviar Código a mi Correo
                  </>
                )}
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting || otpCode.length < 6}
                className={`px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-2 ${
                  mode === 'delete' ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmar Operación
                  </>
                )}
              </button>
            )}
          </div>
        </form>

      </div>
    </div>,
    document.body
  );
};
