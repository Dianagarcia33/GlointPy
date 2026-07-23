import React, { useState } from 'react';
import { Landmark, Plus, Edit2, Trash2, ShieldCheck, CheckCircle2, AlertCircle, CreditCard, Lock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { bankAccountsService, UserBankAccount } from '../../../services/bankAccounts';
import { BankAccountOtpModal } from '../components/BankAccountOtpModal';

export const BankAccountsVaultPage: React.FC = () => {
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'delete'>('create');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<UserBankAccount | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { data: accounts = [], isLoading, refetch } = useQuery({
    queryKey: ['my_bank_accounts'],
    queryFn: () => bankAccountsService.getMyBankAccounts()
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreate = () => {
    setModalMode('create');
    setSelectedAccount(null);
    setIsModalOpen(true);
  };

  const handleEdit = (account: UserBankAccount) => {
    setModalMode('edit');
    setSelectedAccount(account);
    setIsModalOpen(true);
  };

  const handleDelete = (account: UserBankAccount) => {
    setModalMode('delete');
    setSelectedAccount(account);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-100 text-brand-700 rounded-2xl">
            <Landmark className="w-7 h-7 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Bóveda Bancaria</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Administra tus cuentas bancarias para el cobro de rendimientos y retiros
            </p>
          </div>
        </div>

        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all shadow-md shadow-brand-600/20 text-sm font-semibold cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Agregar Cuenta Bancaria
        </button>
      </div>

      {/* Security Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-brand-950 text-white rounded-2xl p-6 shadow-md flex items-start gap-4 border border-slate-800">
        <div className="p-2.5 bg-white/10 rounded-xl text-brand-400 shrink-0">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-sm text-white">Seguridad de la Bóveda Bancaria (Protección OTP)</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Para garantizar la máxima protección de tus fondos, cualquier modificación, adición o eliminación de cuenta bancaria requiere una **Verificación por Código OTP** que enviamos a tu correo registrado.
          </p>
        </div>
      </div>

      {/* Accounts Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-800 uppercase tracking-wider text-xs">
          Cuentas Registradas ({accounts.length})
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-40 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-700">Sin cuentas bancarias registradas</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Agrega tu primera cuenta bancaria para recibir tus rendimientos y procesar tus retiros de forma automática.
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="mt-2 flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 text-xs font-semibold transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Registrar Cuenta Ahora
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center font-bold text-lg border border-slate-200/60 shrink-0">
                      🏦
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">{acc.banco}</h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 mt-0.5">
                        {acc.tipo_cuenta}
                      </span>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Activa
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] text-slate-400 font-medium block">Número de Cuenta:</span>
                  <span className="font-mono font-bold text-slate-800 text-lg tracking-wider">
                    {acc.numero_cuenta}
                  </span>
                </div>

                {/* Card Actions */}
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleEdit(acc)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors border border-slate-200 hover:border-brand-200"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(acc)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-200 hover:border-red-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* OTP Modal */}
      <BankAccountOtpModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          showToast(
            modalMode === 'create'
              ? 'Cuenta bancaria agregada a tu bóveda exitosamente'
              : modalMode === 'edit'
              ? 'Cuenta bancaria actualizada exitosamente'
              : 'Cuenta bancaria eliminada de tu bóveda exitosamente',
            'success'
          );
          refetch();
        }}
        mode={modalMode}
        accountToEdit={selectedAccount}
      />

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border ${
            toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
          } animate-in slide-in-from-bottom-2`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
};
