import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Download, 
  Printer, 
  Calendar, 
  Filter, 
  Loader2, 
  Wallet, 
  Building2, 
  ArrowDownToLine, 
  TrendingUp, 
  FileSpreadsheet, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Receipt,
  User as UserIcon,
  ShieldCheck,
  CreditCard,
  Briefcase
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { usersService, UserAccountStatement } from '../../../../services/users';
import { formatTransactionType } from '../../../../utils/format';

interface UserAccountStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  userName: string;
}

export const UserAccountStatementModal: React.FC<UserAccountStatementModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName
}) => {
  const [statement, setStatement] = useState<UserAccountStatement | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Date filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'movements' | 'withdrawals' | 'investments'>('movements');

  const fetchStatement = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await usersService.getUserStatement(userId, startDate || undefined, endDate || undefined);
      setStatement(data);
    } catch (err: any) {
      console.error('Error fetching statement:', err);
      setError(err.message || 'Error al cargar el estado de cuenta.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && userId) {
      fetchStatement();
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const formatCurrency = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(num || 0);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('es-CO', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('es-CO', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleExportExcel = () => {
    if (!statement) return;
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Resumen General
      const summaryData = [
        ['GLOINT - ESTADO DE CUENTA & EXTRACTO FINANCIERO'],
        ['Fecha de Expedición', formatDateTime(statement.statement_date)],
        ['Periodo Consultado', `${statement.period.start_date} a ${statement.period.end_date}`],
        [],
        ['INFORMACIÓN DEL TITULAR'],
        ['Nombre Completo', statement.user.name],
        ['Documento de Identidad', statement.user.document_id],
        ['Email', statement.user.email],
        ['Teléfono', statement.user.phone_number],
        ['Billetera ID', statement.wallet.id ? `#${statement.wallet.id}` : 'Sin Billetera'],
        ['Saldo Actual', statement.wallet.balance],
        [],
        ['RESUMEN FINANCIERO'],
        ['Saldo Inicial Periodo', statement.summary.opening_balance],
        ['Total Abonos / Ingresos (+)', statement.summary.total_credits],
        ['Total Débitos / Salidas (-)', statement.summary.total_debits],
        ['Saldo Final Periodo', statement.summary.closing_balance],
        ['Total Retiros Pagados', statement.summary.total_withdrawn_paid],
        ['Total Retiros Pendientes', statement.summary.total_withdrawn_pending],
        ['Total Capital Invertido', statement.summary.total_capital_invested],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen General');

      // Sheet 2: Movimientos de Billetera
      const txRows = statement.transactions.map((t, idx) => ({
        '#': idx + 1,
        'FECHA Y HORA': formatDateTime(t.created_at),
        'TIPO DE MOVIMIENTO': formatTransactionType(t.type),
        'CONCEPTO / DESCRIPCIÓN': t.description,
        'MONTO': t.amount,
        'TIPO': t.is_credit ? 'CRÉDITO (+)' : 'DÉBITO (-)',
        'SALDO RESULTANTE': t.balance_after
      }));
      const wsTx = XLSX.utils.json_to_sheet(txRows);
      XLSX.utils.book_append_sheet(wb, wsTx, 'Movimientos Billetera');

      // Sheet 3: Retiros y Desembolsos
      const wRows = statement.withdrawals.map((w, idx) => ({
        '# ID': w.id,
        'FECHA SOLICITUD': formatDate(w.fecha_solicitud || w.created_at),
        'FECHA APROBACIÓN': formatDate(w.fecha_aprobacion),
        'TIPO RETIRO': w.tipo,
        'BANCO DESTINO': w.banco,
        'TIPO CUENTA': w.tipo_cuenta,
        'NÚMERO CUENTA': w.numero_cuenta,
        'MONTO BRUTO': w.monto_bruto,
        'RETENCIÓN / 4x1000': w.retencion,
        'MONTO NETO PAGADO': w.monto_neto,
        'ESTADO': w.estado
      }));
      const wsW = XLSX.utils.json_to_sheet(wRows);
      XLSX.utils.book_append_sheet(wb, wsW, 'Extracto de Retiros');

      // Sheet 4: Contratos de Inversión
      const invRows = statement.investments.map(i => ({
        'ID CONTRATO': i.id,
        'CÓDIGO ASIGNADO': i.assigned_code,
        'CAPITAL INVERTIDO': i.capital,
        'TASA MENSUAL (%)': `${i.porcentaje_mensual}%`,
        'PLAZO (MESES)': `${i.meses} meses`,
        'FECHA INICIO': formatDate(i.fecha_inicio),
        'ESTADO': i.estado,
        'OBSERVACIONES': i.observaciones
      }));
      const wsInv = XLSX.utils.json_to_sheet(invRows);
      XLSX.utils.book_append_sheet(wb, wsInv, 'Contratos Inversión');

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const cleanDoc = (statement.user.document_id || 'cliente').replace(/[^a-zA-Z0-9]/g, '');
      XLSX.writeFile(wb, `estado_cuenta_gloint_${cleanDoc}_${dateStr}.xlsx`);
    } catch (err: any) {
      console.error('Error exportando excel:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-2 sm:p-4" style={{ margin: 0 }}>
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in duration-200">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-100 text-brand-700 rounded-2xl">
              <Receipt className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Estado de Cuenta & Extracto Financiero</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase bg-brand-50 text-brand-700 border border-brand-200">
                  Gloint
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Consolidado bancario de saldos, movimientos de billetera, retiros y contratos
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || !statement}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200 hidden sm:flex items-center gap-1.5 text-xs font-bold"
              title="Imprimir o Guardar PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir PDF</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={loading || !statement}
              className="p-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors cursor-pointer border border-emerald-200 hidden sm:flex items-center gap-1.5 text-xs font-bold"
              title="Exportar a Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar Excel</span>
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Date Filter & Period Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-slate-500 font-bold uppercase text-[11px] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-brand-600" />
              Periodo:
            </span>
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-400 text-[10px] uppercase font-bold">Desde:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs text-slate-700 font-semibold focus:outline-none cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-400 text-[10px] uppercase font-bold">Hasta:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs text-slate-700 font-semibold focus:outline-none cursor-pointer"
              />
            </div>
            <button
              type="button"
              onClick={fetchStatement}
              disabled={loading}
              className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Filter className="w-3.5 h-3.5" />}
              <span>Filtrar</span>
            </button>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="px-2 py-1 text-slate-500 hover:text-slate-800 font-bold underline cursor-pointer"
              >
                Ver Todo
              </button>
            )}
          </div>

          {statement && (
            <div className="text-slate-500 font-mono text-[11px]">
              Expedido: <strong className="text-slate-800">{formatDateTime(statement.statement_date)}</strong>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto" />
              <p className="mt-3 text-slate-600 font-bold text-sm">Generando estado de cuenta consolidado...</p>
              <p className="text-xs text-slate-400">Calculando libro mayor de transacciones, retiros y saldo de billetera</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200 flex items-center gap-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          ) : statement ? (
            <>
              {/* Client Info Banner */}
              <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-md border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 bg-brand-500/20 border border-brand-500/30 rounded-2xl flex items-center justify-center text-brand-400 font-bold">
                    <UserIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-brand-400 tracking-wider">Inversionista Titular</span>
                      {statement.investments[0]?.assigned_code && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-brand-500/30 text-amber-300 font-mono font-bold border border-brand-500/40">
                          {statement.investments[0].assigned_code}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-extrabold text-white font-montserrat">{statement.user.name}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-0.5">
                      <span>Doc: <strong className="text-white font-mono">{statement.user.document_id}</strong></span>
                      <span>• Email: <strong className="text-white">{statement.user.email}</strong></span>
                      {statement.user.phone_number !== 'N/A' && <span>• Tel: <strong className="text-white">{statement.user.phone_number}</strong></span>}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block font-medium">Cuentas Bancarias Registradas:</span>
                  <div className="mt-1 flex flex-col gap-1 items-end">
                    {statement.bank_accounts.length > 0 ? (
                      statement.bank_accounts.map(acc => (
                        <span key={acc.id} className="text-xs px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 font-mono">
                          {acc.banco} ({acc.tipo_cuenta}) - {acc.numero_cuenta}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500 italic">Sin cuenta bancaria vinculada</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Financial KPIs Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="bg-brand-50/60 p-4 rounded-2xl border border-brand-200/80">
                  <div className="flex items-center justify-between text-brand-800 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Saldo en Billetera</span>
                    <Wallet className="w-4 h-4 text-brand-600" />
                  </div>
                  <p className="text-xl font-black text-brand-900 font-montserrat">
                    {formatCurrency(statement.summary.closing_balance)}
                  </p>
                  <span className="text-[10px] text-slate-500 font-medium">Disponible para retiro</span>
                </div>

                <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/80">
                  <div className="flex items-center justify-between text-emerald-800 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Abonos / Rendimientos</span>
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-xl font-black text-emerald-700 font-montserrat">
                    +{formatCurrency(statement.summary.total_credits)}
                  </p>
                  <span className="text-[10px] text-slate-500 font-medium">Generado en el periodo</span>
                </div>

                <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200/80">
                  <div className="flex items-center justify-between text-blue-800 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Retiros Pagados</span>
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-xl font-black text-blue-700 font-montserrat">
                    {formatCurrency(statement.summary.total_withdrawn_paid)}
                  </p>
                  <span className="text-[10px] text-slate-500 font-medium">Desembolsados a banco</span>
                </div>

                <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80">
                  <div className="flex items-center justify-between text-amber-800 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Capital Contratado</span>
                    <Briefcase className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-xl font-black text-amber-800 font-montserrat">
                    {formatCurrency(statement.summary.total_capital_invested)}
                  </p>
                  <span className="text-[10px] text-slate-500 font-medium">{statement.investments.length} contratos activos</span>
                </div>
              </div>

              {/* Tabs Navigation */}
              <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('movements')}
                  className={`pb-3 px-3.5 transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                    activeTab === 'movements'
                      ? 'border-brand-600 text-brand-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                  <span>Extracto de Movimientos ({statement.transactions.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('withdrawals')}
                  className={`pb-3 px-3.5 transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                    activeTab === 'withdrawals'
                      ? 'border-brand-600 text-brand-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ArrowDownToLine className="w-4 h-4" />
                  <span>Resumen de Retiros & Pagos ({statement.withdrawals.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('investments')}
                  className={`pb-3 px-3.5 transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                    activeTab === 'investments'
                      ? 'border-brand-600 text-brand-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  <span>Contratos de Inversión ({statement.investments.length})</span>
                </button>
              </div>

              {/* Tab 1: Movimientos de Billetera */}
              {activeTab === 'movements' && (
                <div className="space-y-3">
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="py-3 px-4">Fecha y Hora</th>
                            <th className="py-3 px-4">Tipo</th>
                            <th className="py-3 px-4">Concepto / Motivo</th>
                            <th className="py-3 px-4 text-right">Monto</th>
                            <th className="py-3 px-4 text-right">Saldo Resultante</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {statement.transactions.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-slate-400">
                                No se registraron movimientos de billetera en el periodo seleccionado.
                              </td>
                            </tr>
                          ) : (
                            statement.transactions.map((t) => (
                              <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                                  {formatDateTime(t.created_at)}
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                                    t.is_credit 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}>
                                    {formatTransactionType(t.type)}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-slate-800 max-w-xs truncate font-medium" title={t.description}>
                                  {t.description}
                                </td>
                                <td className={`py-3 px-4 text-right font-mono font-extrabold ${
                                  t.is_credit ? 'text-emerald-600' : 'text-rose-600'
                                }`}>
                                  {t.is_credit ? '+' : ''}{formatCurrency(t.amount)}
                                </td>
                                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                                  {formatCurrency(t.balance_after)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Resumen de Retiros */}
              {activeTab === 'withdrawals' && (
                <div className="space-y-3">
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="py-3 px-4 text-center">ID</th>
                            <th className="py-3 px-4">Fecha Solicitud</th>
                            <th className="py-3 px-4">Tipo</th>
                            <th className="py-3 px-4">Banco & Cuenta</th>
                            <th className="py-3 px-4 text-right">Monto Bruto</th>
                            <th className="py-3 px-4 text-right">Neto a Pagar</th>
                            <th className="py-3 px-4 text-center">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {statement.withdrawals.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-slate-400">
                                No se encontraron solicitudes de retiro en el periodo seleccionado.
                              </td>
                            </tr>
                          ) : (
                            statement.withdrawals.map((w) => {
                              const st = (w.estado || '').toLowerCase();
                              return (
                                <tr key={w.id} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="py-3 px-4 text-center font-mono font-extrabold text-slate-900">
                                    #{w.id}
                                  </td>
                                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                                    {formatDateTime(w.fecha_solicitud || w.created_at)}
                                  </td>
                                  <td className="py-3 px-4 capitalize font-bold text-slate-800">
                                    {w.tipo}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="font-bold text-slate-800 block text-[11px]">{w.banco}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">{w.tipo_cuenta} - {w.numero_cuenta}</span>
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono text-slate-500">
                                    {formatCurrency(w.monto_bruto)}
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900">
                                    {formatCurrency(w.monto_neto)}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                      st === 'aprobado' || st === 'procesado'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : st === 'pendiente'
                                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                                    }`}>
                                      {w.estado}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Contratos de Inversión */}
              {activeTab === 'investments' && (
                <div className="space-y-3">
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="py-3 px-4">Código Asignado</th>
                            <th className="py-3 px-4 text-right">Capital Invertido</th>
                            <th className="py-3 px-4 text-center">Tasa Mensual</th>
                            <th className="py-3 px-4 text-center">Plazo</th>
                            <th className="py-3 px-4">Fecha Inicio</th>
                            <th className="py-3 px-4 text-center">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {statement.investments.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-400">
                                No se encontraron contratos de inversión para este usuario.
                              </td>
                            </tr>
                          ) : (
                            statement.investments.map((inv) => (
                              <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-3 px-4 font-mono font-extrabold text-brand-600">
                                  {inv.assigned_code}
                                </td>
                                <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900">
                                  {formatCurrency(inv.capital)}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md font-bold border border-emerald-200">
                                    {inv.porcentaje_mensual}% / mes
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center font-bold text-slate-700">
                                  {inv.meses} meses
                                </td>
                                <td className="py-3 px-4 text-slate-600 font-mono">
                                  {formatDate(inv.fecha_inicio)}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                                    {inv.estado}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={loading || !statement}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Descargar Excel</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || !statement}
              className="px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-brand-600/20 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Extracto</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
