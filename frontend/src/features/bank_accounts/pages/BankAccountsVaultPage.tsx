import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { 
  Landmark, 
  Plus, 
  Edit2, 
  Trash2, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  CreditCard, 
  RefreshCw,
  Building2
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { formatAccountNumber } from '../../../utils/format';
import { bankAccountsService, UserBankAccount } from '../../../services/bankAccounts';
import { BankAccountOtpModal } from '../components/BankAccountOtpModal';
import { useAuthStore } from '../../../store/authStore';

export const BankAccountsVaultPage: React.FC = () => {
  const { user } = useAuthStore();
  const hasBankPerm = user?.is_superuser === true || user?.permissions?.includes('bank_accounts:manage') === true;

  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'delete'>('create');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<UserBankAccount | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  if (!hasBankPerm && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const { data: accounts = [], isLoading, refetch } = useQuery({
    queryKey: ['my_bank_accounts'],
    queryFn: () => bankAccountsService.getMyBankAccounts()
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
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
    <div className="w-full max-w-7xl mx-auto min-w-0 pb-20 space-y-6 animate-in fade-in duration-300">
      
      {/* 🏛️ 1. Encabezado de Página (Estándar Soporte en Tickets) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight font-montserrat flex items-center gap-2.5">
            <span className="p-2 bg-brand-50 text-brand-600 border border-brand-200 rounded-2xl inline-flex shadow-xs">
              <Landmark className="w-6 h-6" />
            </span>
            Bóveda Bancaria
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Administra de forma segura tus cuentas bancarias para el cobro de rendimientos y desembolso de retiros
          </p>
        </div>

        {/* Acciones del Header */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-amber-600 hover:from-brand-700 hover:to-amber-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-brand-500/20 transition-all cursor-pointer font-montserrat"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Cuenta Bancaria</span>
          </button>

          <button
            onClick={() => refetch()}
            className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 📢 2. Aviso Informativo de Seguridad OTP (Sin banners oscuros pesados) */}
      <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-start gap-3 text-xs text-emerald-950">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold text-slate-900 font-montserrat">Protección de Bóveda Bancaria con Verificación OTP:</span> Para garantizar la seguridad total de tus fondos, cualquier adición, edición o retiro de cuenta bancaria requiere una confirmación mediante código de seguridad OTP de un solo uso que remitimos a tu correo electrónico registrado.
        </div>
      </div>

      {/* 📊 3. Cuadrícula de Métricas KPI (4-Stat Cards exactas al Mercado de Acciones) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Cuentas Registradas */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Cuentas Registradas</span>
            <Landmark className="w-4 h-4 text-brand-600" />
          </div>
          <span className="text-2xl font-black text-slate-900 font-mono block">
            {accounts.length}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block">
            {accounts.length === 1 ? '1 cuenta habilitada' : `${accounts.length} cuentas habilitadas`}
          </span>
        </div>

        {/* Card 2: Entidades Bancarias */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Entidades Bancarias</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-2xl font-black text-slate-900 font-mono block">
            {new Set(accounts.map(a => a.banco)).size}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block">
            Bancos distintos asociados
          </span>
        </div>

        {/* Card 3: Nivel de Seguridad */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nivel de Seguridad</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-emerald-600 font-mono block">
            OTP 2FA
          </span>
          <span className="text-[11px] text-slate-500 font-medium block">
            Protección criptográfica activa
          </span>
        </div>

        {/* Card 4: Destino Operativo */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Destino Operativo</span>
            <CreditCard className="w-4 h-4 text-purple-600" />
          </div>
          <span className="text-xl font-black text-slate-900 font-montserrat block truncate">
            {accounts.length > 0 ? accounts[0].banco : 'Por configurar'}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block">
            {accounts.length > 0 ? `${accounts[0].tipo_cuenta}` : 'Sin cuenta activa'}
          </span>
        </div>

      </div>

      {/* 📦 4. Listado de Cuentas Bancarias */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-montserrat">
            Cuentas Registradas en Bóveda ({accounts.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-48 bg-slate-100 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          /* Estado Vacío Estandarizado */
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3 shadow-xs">
            <div className="w-14 h-14 rounded-3xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
              <CreditCard className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800 font-montserrat">
              Sin cuentas bancarias registradas
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
              Agrega tu primera cuenta bancaria para recibir tus liquidaciones de rendimientos y procesar retiros de saldo con total seguridad.
            </p>
            <button
              onClick={handleCreate}
              className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl text-xs font-bold transition-all shadow-sm shadow-brand-500/20 inline-flex items-center gap-2 cursor-pointer font-montserrat mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Cuenta Ahora</span>
            </button>
          </div>
        ) : (
          /* Cuadrícula de Cuentas Registradas */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition-all space-y-5 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center border border-brand-200/80 shrink-0">
                        <Building2 className="w-5 h-5 text-brand-600" />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 font-montserrat text-base">
                          {acc.banco}
                        </h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-600 border border-slate-200 mt-1">
                          {acc.tipo_cuenta}
                        </span>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 font-montserrat">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Activa
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Número de Cuenta:</span>
                    <span className="font-mono font-black text-slate-900 text-lg tracking-wider block">
                      {formatAccountNumber(acc.numero_cuenta)}
                    </span>
                  </div>
                </div>

                {/* Acciones de la Tarjeta */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleEdit(acc)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all border border-slate-200 hover:border-brand-200 cursor-pointer font-montserrat"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() => handleDelete(acc)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all border border-rose-200 hover:border-rose-300 cursor-pointer font-montserrat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal OTP de Seguridad */}
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

      {/* Notificación Toast Estandarizada */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[60] flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border ${
            toast.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : 'bg-rose-50 border-rose-200 text-rose-900'
          } animate-in slide-in-from-bottom-2 text-xs font-bold`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};
