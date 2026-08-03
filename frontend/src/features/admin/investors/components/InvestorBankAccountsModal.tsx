import React, { useState } from 'react';
import { Landmark, CreditCard, Copy, Check, X } from 'lucide-react';
import { formatAccountNumber } from '../../../../utils/format';

interface BankAccount {
  id: number;
  banco: string;
  tipo_cuenta: string;
  numero_cuenta: string;
  is_active?: boolean;
  created_at?: string;
}

interface InvestorBankAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userEmail?: string;
  documentId?: string;
  bankAccounts: BankAccount[];
}

export const InvestorBankAccountsModal: React.FC<InvestorBankAccountsModalProps> = ({
  isOpen,
  onClose,
  userName,
  userEmail,
  documentId,
  bankAccounts
}) => {
  const [copiedId, setCopiedId] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleCopy = (id: number, text: string) => {
    const formatted = formatAccountNumber(text);
    navigator.clipboard.writeText(formatted);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Modal Executive Header */}
        <div className="bg-slate-900 text-white p-6 sm:p-7 relative overflow-hidden shrink-0">
          <div className="absolute right-0 top-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          
          <div className="flex justify-between items-start relative z-10">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-emerald-400 backdrop-blur-xs">
                <Landmark className="w-3.5 h-3.5" /> Bóveda de Cuentas Bancarias
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold font-montserrat tracking-tight">
                Cuentas de {userName}
              </h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300">
                {documentId && <span>Doc: <strong className="text-white font-mono">{documentId}</strong></span>}
                {userEmail && <span>• {userEmail}</span>}
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {bankAccounts && bankAccounts.length > 0 ? (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
                <span>Cuentas Vinculadas ({bankAccounts.length})</span>
                <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Verificadas para Retiro
                </span>
              </div>

              {bankAccounts.map((acc) => {
                const formattedNum = formatAccountNumber(acc.numero_cuenta);
                return (
                  <div 
                    key={acc.id} 
                    className="bg-white border border-slate-200 hover:border-brand-300 rounded-2xl p-4 shadow-xs transition-all relative overflow-hidden group"
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-500" />
                    
                    <div className="flex items-start justify-between gap-3 pl-2">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-base font-montserrat uppercase">
                            {acc.banco}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                            {acc.tipo_cuenta}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 font-medium">Número:</span>
                          <span className="font-mono text-base font-bold text-slate-800 tracking-wider">
                            {formattedNum}
                          </span>
                          
                          <button
                            onClick={() => handleCopy(acc.id, acc.numero_cuenta)}
                            className="p-1 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Copiar número de cuenta"
                          >
                            {copiedId === acc.id ? (
                              <Check className="w-4 h-4 text-emerald-600 animate-in zoom-in" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                          acc.is_active !== false 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {acc.is_active !== false ? 'Activa' : 'Inactiva'}
                        </span>
                        
                        {acc.created_at && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            Reg: {new Date(acc.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 px-4 text-center space-y-3 bg-slate-50 rounded-2xl border border-slate-200/80 border-dashed">
              <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                <CreditCard className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-800 font-montserrat">Sin Cuentas Registradas</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Este inversionista aún no ha registrado cuentas bancarias para retiro de fondos en el sistema.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs font-montserrat"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
