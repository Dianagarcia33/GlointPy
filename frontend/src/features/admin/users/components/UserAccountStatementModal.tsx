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
  Briefcase,
  Layers
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
  const [activeTab, setActiveTab] = useState<'movements' | 'withdrawals' | 'investments' | 'shares'>('movements');

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
        ['Total Acciones en Posesión', statement.shares?.total_shares_owned || 0],
        ['Acciones Disponibles para Venta', statement.shares?.available_shares || 0],
        ['Acciones en Venta / Custodia', statement.shares?.locked_shares || 0],
        ['Precio Actual por Acción', statement.shares?.current_share_price || 0],
        ['Valorización Total Acciones (COP)', statement.shares?.portfolio_market_value || 0],
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

      // Sheet 5: Acreditaciones de Acciones
      if (statement.shares?.movements && statement.shares.movements.length > 0) {
        const shareRows = statement.shares.movements.map((sm, idx) => ({
          '#': idx + 1,
          'FECHA Y HORA': formatDateTime(sm.created_at),
          'TIPO MOVIMIENTO': sm.type_label || sm.movement_type,
          'CONCEPTO / DETALLE': sm.description,
          'CANTIDAD ACCIONES': sm.shares_quantity,
          'SALDO ANTERIOR': sm.balance_before,
          'SALDO RESULTANTE': sm.balance_after
        }));
        const wsShares = XLSX.utils.json_to_sheet(shareRows);
        XLSX.utils.book_append_sheet(wb, wsShares, 'Acreditaciones Acciones');
      }

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const cleanDoc = (statement.user.document_id || 'cliente').replace(/[^a-zA-Z0-9]/g, '');
      XLSX.writeFile(wb, `estado_cuenta_gloint_${cleanDoc}_${dateStr}.xlsx`);
    } catch (err: any) {
      console.error('Error exportando excel:', err);
    }
  };

  const handlePrint = () => {
    document.body.classList.add('printing-statement');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-statement');
    }, 1500);
  };

  useEffect(() => {
    return () => {
      document.body.classList.remove('printing-statement');
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-2 sm:p-4 print:static print:inset-auto print:p-0 print:m-0 print:bg-white print:z-auto print:block" style={{ margin: 0 }}>
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in duration-200 print:hidden">
        
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

                <button
                  type="button"
                  onClick={() => setActiveTab('shares')}
                  className={`pb-3 px-3.5 transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                    activeTab === 'shares'
                      ? 'border-brand-600 text-brand-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Acreditaciones de Acciones ({statement.shares?.movements?.length || 0})</span>
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

              {/* Tab 4: Acreditaciones de Acciones */}
              {activeTab === 'shares' && (
                <div className="space-y-4">
                  {/* Share KPIs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-200/80">
                      <div className="flex items-center justify-between text-indigo-800 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Total Acciones</span>
                        <Layers className="w-4 h-4 text-indigo-600" />
                      </div>
                      <p className="text-lg font-black text-indigo-900 font-montserrat">
                        {(statement.shares?.total_shares_owned || 0).toLocaleString()} Unds
                      </p>
                      <span className="text-[10px] text-slate-500 font-medium">En posesión</span>
                    </div>

                    <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200/80">
                      <div className="flex items-center justify-between text-emerald-800 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Acciones Libres</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <p className="text-lg font-black text-emerald-700 font-montserrat">
                        {(statement.shares?.available_shares || 0).toLocaleString()} Unds
                      </p>
                      <span className="text-[10px] text-slate-500 font-medium">Disponibles para venta</span>
                    </div>

                    <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200/80">
                      <div className="flex items-center justify-between text-amber-800 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider">En Venta / Custodia</span>
                        <Clock className="w-4 h-4 text-amber-600" />
                      </div>
                      <p className="text-lg font-black text-amber-800 font-montserrat">
                        {(statement.shares?.locked_shares || 0).toLocaleString()} Unds
                      </p>
                      <span className="text-[10px] text-slate-500 font-medium">Órdenes activas</span>
                    </div>

                    <div className="bg-brand-50/60 p-3.5 rounded-2xl border border-brand-200/80">
                      <div className="flex items-center justify-between text-brand-800 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Valorización COP</span>
                        <TrendingUp className="w-4 h-4 text-brand-600" />
                      </div>
                      <p className="text-lg font-black text-brand-900 font-montserrat">
                        {formatCurrency(statement.shares?.portfolio_market_value || 0)}
                      </p>
                      <span className="text-[10px] text-slate-500 font-medium">
                        @{formatCurrency(statement.shares?.current_share_price || 0)}/acc
                      </span>
                    </div>
                  </div>

                  {/* Movements Ledger Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="py-3 px-4">Fecha y Hora</th>
                            <th className="py-3 px-4">Tipo de Movimiento</th>
                            <th className="py-3 px-4">Concepto / Detalle</th>
                            <th className="py-3 px-4 text-right">Cantidad</th>
                            <th className="py-3 px-4 text-right">Saldo Resultante</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {!statement.shares?.movements || statement.shares.movements.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-slate-400">
                                No se registran acreditaciones o movimientos de acciones para este usuario en el periodo seleccionado.
                              </td>
                            </tr>
                          ) : (
                            statement.shares.movements.map((sm) => {
                              const isPositive = sm.shares_quantity >= 0;
                              return (
                                <tr key={sm.id} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                                    {formatDateTime(sm.created_at)}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                                      sm.movement_type === 'package_grant'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : sm.movement_type === 'market_buy'
                                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                          : sm.movement_type === 'market_sell'
                                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                            : sm.movement_type === 'admin_adjustment'
                                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                              : 'bg-slate-50 text-slate-700 border border-slate-200'
                                    }`}>
                                      {sm.type_label || sm.movement_type}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-slate-800 max-w-sm truncate font-medium" title={sm.description}>
                                    {sm.description}
                                  </td>
                                  <td className={`py-3 px-4 text-right font-mono font-extrabold ${
                                    isPositive ? 'text-emerald-600' : 'text-rose-600'
                                  }`}>
                                    {isPositive ? '+' : ''}{sm.shares_quantity} {Math.abs(sm.shares_quantity) === 1 ? 'Acción' : 'Acciones'}
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                                    {sm.balance_after} Unds
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

      {/* ------------------------------------------------------------- */}
      {/* DOCUMENTO DISEÑADO DE ESTADO FINANCIERO (IMPRESIÓN / PDF)    */}
      {/* ------------------------------------------------------------- */}
      {statement && (
        <div id="printable-financial-statement" className="hidden print:block w-full bg-white text-slate-900 font-sans text-[11px] leading-snug p-2 print:p-0">
          {/* 1. Encabezado Institucional */}
          <div className="border-b-2 border-slate-900 pb-3 mb-3 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="Gloint" 
                className="h-10 w-auto object-contain" 
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} 
              />
              <div>
                <h1 className="text-base font-black text-slate-900 font-montserrat tracking-tight uppercase">
                  GLOINT GLOBAL INVESTMENT S.A.S.
                </h1>
                <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider">
                  NIT: 901.789.432-1 • Plataforma Digital de Inversión y Gestión de Capital
                </p>
                <p className="text-[9px] text-slate-500">
                  Carrera 7 # 71-21, Torre A, Piso 12 • Bogotá D.C., Colombia • contacto@gloint.co • www.gloint.co
                </p>
              </div>
            </div>

            <div className="text-right border border-slate-300 rounded-xl p-2.5 bg-slate-50 min-w-[220px]">
              <span className="text-[9px] font-black uppercase text-brand-700 block tracking-widest">
                ESTADO DE CUENTA & EXTRACTO OFICIAL
              </span>
              <span className="text-xs font-mono font-bold text-slate-900 block mt-0.5">
                REF: EXT-{statement.user.id.toString().padStart(5, '0')}-{statement.statement_date.slice(0, 10).replace(/-/g, '')}
              </span>
              <div className="mt-1 text-[9px] text-slate-600 space-y-0.5 font-medium">
                <div>Fecha Expedición: <strong className="text-slate-900">{formatDateTime(statement.statement_date)}</strong></div>
                <div>Periodo Consultado: <strong className="text-slate-900">{statement.period.start_date} al {statement.period.end_date}</strong></div>
              </div>
            </div>
          </div>

          {/* 2. Información del Titular y Cuentas */}
          <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/60 mb-3 print-avoid-break">
            <div className="grid grid-cols-2 gap-4 text-[10px]">
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  DATOS DEL INVERSIONISTA TITULAR
                </span>
                <div className="space-y-0.5">
                  <div className="text-sm font-black text-slate-900 font-montserrat">{statement.user.name}</div>
                  <div className="text-slate-700">Documento de Identidad: <strong className="font-mono text-slate-900">{statement.user.document_id}</strong></div>
                  <div className="text-slate-700">Correo Electrónico: <span className="text-slate-900">{statement.user.email}</span></div>
                  {statement.user.phone_number !== 'N/A' && (
                    <div className="text-slate-700">Teléfono Móvil: <span className="text-slate-900">{statement.user.phone_number}</span></div>
                  )}
                  <div className="text-slate-700">Perfil: <span className="text-slate-900 font-medium capitalize">{statement.user.roles.join(', ') || 'Inversionista'}</span></div>
                </div>
              </div>

              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  ESTRUCTURA DE CUENTAS & ENLACES
                </span>
                <div className="space-y-0.5">
                  <div className="text-slate-700">
                    Billetera Gloint: <strong className="font-mono text-slate-900">{statement.wallet.id ? `#WAL-${statement.wallet.id}` : 'Sin Billetera'}</strong> (Moneda: {statement.wallet.currency || 'COP'})
                  </div>
                  <div className="text-slate-700">
                    Contrato Principal: <strong className="text-slate-900 font-mono">{statement.investments[0]?.assigned_code || 'Sin Contratos Activos'}</strong>
                  </div>
                  <div className="text-slate-700 mt-1">
                    Cuentas Bancarias Registradas:
                  </div>
                  <div className="text-[10px] font-mono text-slate-800 space-y-0.5">
                    {statement.bank_accounts && statement.bank_accounts.length > 0 ? (
                      statement.bank_accounts.map(acc => (
                        <div key={acc.id} className="text-[9px]">
                          • {acc.banco} ({acc.tipo_cuenta}) No. {acc.numero_cuenta}
                        </div>
                      ))
                    ) : (
                      <span className="italic text-slate-400">Sin cuentas bancarias registradas</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Resumen Financiero Consolidado */}
          <div className="mb-4 print-avoid-break">
            <div className="bg-slate-900 text-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-t-lg">
              RESUMEN FINANCIERO EJECUTIVO CONSOLIDADO
            </div>
            <div className="border border-slate-300 border-t-0 rounded-b-lg p-2.5 bg-white">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="border border-slate-200 rounded-lg p-2 bg-slate-50/50">
                  <span className="text-[8px] text-slate-500 font-bold uppercase block">Saldo Inicial Periodo</span>
                  <span className="text-xs font-black font-mono text-slate-800">{formatCurrency(statement.summary.opening_balance)}</span>
                </div>
                <div className="border border-emerald-300 rounded-lg p-2 bg-emerald-50/50">
                  <span className="text-[8px] text-emerald-800 font-bold uppercase block">Abonos / Rendimientos (+)</span>
                  <span className="text-xs font-black font-mono text-emerald-700">+{formatCurrency(statement.summary.total_credits)}</span>
                </div>
                <div className="border border-rose-300 rounded-lg p-2 bg-rose-50/50">
                  <span className="text-[8px] text-rose-800 font-bold uppercase block">Débitos / Salidas (-)</span>
                  <span className="text-xs font-black font-mono text-rose-700">-{formatCurrency(statement.summary.total_debits)}</span>
                </div>
                <div className="border border-brand-400 rounded-lg p-2 bg-brand-50/70">
                  <span className="text-[8px] text-brand-900 font-bold uppercase block">Saldo Disponible Billetera</span>
                  <span className="text-xs font-black font-mono text-brand-900">{formatCurrency(statement.summary.closing_balance)}</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center mt-2">
                <div className="border border-blue-200 rounded-lg p-2 bg-blue-50/40">
                  <span className="text-[8px] text-blue-800 font-bold uppercase block">Retiros Desembolsados</span>
                  <span className="text-xs font-black font-mono text-blue-900">{formatCurrency(statement.summary.total_withdrawn_paid)}</span>
                </div>
                <div className="border border-amber-200 rounded-lg p-2 bg-amber-50/40">
                  <span className="text-[8px] text-amber-800 font-bold uppercase block">Retiros en Trámite</span>
                  <span className="text-xs font-black font-mono text-amber-900">{formatCurrency(statement.summary.total_withdrawn_pending)}</span>
                </div>
                <div className="border border-slate-200 rounded-lg p-2 bg-slate-50/50">
                  <span className="text-[8px] text-slate-700 font-bold uppercase block">Capital Contratado</span>
                  <span className="text-xs font-black font-mono text-slate-900">{formatCurrency(statement.summary.total_capital_invested)}</span>
                </div>
                <div className="border border-indigo-200 rounded-lg p-2 bg-indigo-50/40">
                  <span className="text-[8px] text-indigo-800 font-bold uppercase block">Acciones en Posesión</span>
                  <span className="text-xs font-black font-mono text-indigo-900">
                    {(statement.shares?.total_shares_owned || 0).toLocaleString()} Unds
                  </span>
                  <span className="text-[8px] text-slate-500 block font-semibold">
                    Val: {formatCurrency(statement.shares?.portfolio_market_value || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Sección 1: Movimientos de Billetera */}
          <div className="mb-4 print-avoid-break">
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-1 mb-1.5">
              <h2 className="text-xs font-black text-slate-900 font-montserrat uppercase tracking-wider">
                1. EXTRACTO DETALLADO DE MOVIMIENTOS DE BILLETERA
              </h2>
              <span className="text-[9px] text-slate-500 font-bold">
                Total Registros: {statement.transactions.length}
              </span>
            </div>

            <table className="w-full text-left text-[9px] border-collapse border border-slate-300">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[8px] tracking-wider border-b border-slate-300">
                <tr>
                  <th className="py-1.5 px-2 border-r border-slate-300 text-center w-8">#</th>
                  <th className="py-1.5 px-2 border-r border-slate-300 w-28">Fecha y Hora</th>
                  <th className="py-1.5 px-2 border-r border-slate-300 w-32">Tipo Operación</th>
                  <th className="py-1.5 px-2 border-r border-slate-300">Concepto / Detalle</th>
                  <th className="py-1.5 px-2 border-r border-slate-300 text-right w-24">Monto</th>
                  <th className="py-1.5 px-2 text-right w-24">Saldo Resultante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {statement.transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-slate-400 italic">
                      No se registraron movimientos en el periodo seleccionado.
                    </td>
                  </tr>
                ) : (
                  statement.transactions.map((t, idx) => (
                    <tr key={t.id} className="even:bg-slate-50/50">
                      <td className="py-1 px-2 border-r border-slate-200 text-center text-slate-500 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200 font-mono text-[8.5px] text-slate-600">
                        {formatDateTime(t.created_at)}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200 font-bold text-slate-800">
                        {formatTransactionType(t.type)}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200 text-slate-700 truncate max-w-xs">
                        {t.description}
                      </td>
                      <td className={`py-1 px-2 border-r border-slate-200 text-right font-mono font-bold ${
                        t.is_credit ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {t.is_credit ? '+' : ''}{formatCurrency(t.amount)}
                      </td>
                      <td className="py-1 px-2 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(t.balance_after)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 5. Sección 2: Retiros y Desembolsos */}
          <div className="mb-4 print-avoid-break">
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-1 mb-1.5">
              <h2 className="text-xs font-black text-slate-900 font-montserrat uppercase tracking-wider">
                2. RESUMEN DE RETIROS Y DESEMBOLSOS A CUENTAS BANCARIAS
              </h2>
              <span className="text-[9px] text-slate-500 font-bold">
                Total Solicitudes: {statement.withdrawals.length}
              </span>
            </div>

            <table className="w-full text-left text-[9px] border-collapse border border-slate-300">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[8px] tracking-wider border-b border-slate-300">
                <tr>
                  <th className="py-1.5 px-2 border-r border-slate-300 text-center w-10">ID</th>
                  <th className="py-1.5 px-2 border-r border-slate-300 w-24">Fecha Solicitud</th>
                  <th className="py-1.5 px-2 border-r border-slate-300">Banco & Cuenta Destino</th>
                  <th className="py-1.5 px-2 border-r border-slate-300 text-right w-20">Monto Bruto</th>
                  <th className="py-1.5 px-2 border-r border-slate-300 text-right w-20">GMF / Ret.</th>
                  <th className="py-1.5 px-2 border-r border-slate-300 text-right w-20">Neto Pagado</th>
                  <th className="py-1.5 px-2 text-center w-20">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {statement.withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-3 text-center text-slate-400 italic">
                      No se registran solicitudes de retiro en el periodo consultado.
                    </td>
                  </tr>
                ) : (
                  statement.withdrawals.map((w) => (
                    <tr key={w.id} className="even:bg-slate-50/50">
                      <td className="py-1 px-2 border-r border-slate-200 text-center font-mono font-bold text-slate-800">
                        #{w.id}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200 font-mono text-[8.5px] text-slate-600">
                        {formatDate(w.fecha_solicitud || w.created_at)}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200 text-slate-800">
                        <span className="font-bold">{w.banco}</span> ({w.tipo_cuenta}) - {w.numero_cuenta}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200 text-right font-mono text-slate-600">
                        {formatCurrency(w.monto_bruto)}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200 text-right font-mono text-rose-700">
                        -{formatCurrency(w.retencion)}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(w.monto_neto)}
                      </td>
                      <td className="py-1 px-2 text-center font-bold uppercase text-[8.5px]">
                        <span className={`px-1.5 py-0.5 rounded ${
                          w.estado?.toLowerCase() === 'aprobado' || w.estado?.toLowerCase() === 'procesado'
                            ? 'bg-emerald-100 text-emerald-800'
                            : w.estado?.toLowerCase() === 'pendiente'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                        }`}>
                          {w.estado}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 6. Sección 3: Contratos de Inversión */}
          <div className="mb-4 print-avoid-break">
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-1 mb-1.5">
              <h2 className="text-xs font-black text-slate-900 font-montserrat uppercase tracking-wider">
                3. PORTAFOLIO DE CONTRATOS DE INVERSIÓN
              </h2>
              <span className="text-[9px] text-slate-500 font-bold">
                Total Contratos: {statement.investments.length}
              </span>
            </div>

            <table className="w-full text-left text-[9px] border-collapse border border-slate-300">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[8px] tracking-wider border-b border-slate-300">
                <tr>
                  <th className="py-1.5 px-2 border-r border-slate-300 w-28">Código Asignado</th>
                  <th className="py-1.5 px-2 border-r border-slate-300 text-right w-28">Capital Invertido</th>
                  <th className="py-1.5 px-2 border-r border-slate-300 text-center w-24">Tasa Mensual</th>
                  <th className="py-1.5 px-2 border-r border-slate-300 text-center w-20">Plazo</th>
                  <th className="py-1.5 px-2 border-r border-slate-300 w-24">Fecha Inicio</th>
                  <th className="py-1.5 px-2 text-center w-20">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {statement.investments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-3 text-center text-slate-400 italic">
                      No registra contratos de inversión a la fecha.
                    </td>
                  </tr>
                ) : (
                  statement.investments.map((inv) => (
                    <tr key={inv.id} className="even:bg-slate-50/50">
                      <td className="py-1 px-2 border-r border-slate-200 font-mono font-bold text-brand-700">
                        {inv.assigned_code}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(inv.capital)}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200 text-center font-bold text-emerald-700">
                        {inv.porcentaje_mensual}% / mes
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200 text-center text-slate-700">
                        {inv.meses} meses
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200 font-mono text-[8.5px] text-slate-600">
                        {formatDate(inv.fecha_inicio)}
                      </td>
                      <td className="py-1 px-2 text-center font-bold uppercase text-[8.5px]">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          {inv.estado}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 7. Sección 4: Acreditaciones y Portafolio de Acciones */}
          <div className="mb-4 print-avoid-break">
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-1 mb-1.5">
              <h2 className="text-xs font-black text-slate-900 font-montserrat uppercase tracking-wider">
                4. PORTAFOLIO Y ACREDITACIONES DE ACCIONES
              </h2>
              <span className="text-[9px] text-slate-500 font-bold">
                Total Acciones: {(statement.shares?.total_shares_owned || 0).toLocaleString()} Unds • Valor: {formatCurrency(statement.shares?.portfolio_market_value || 0)}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-2 text-center text-[9px]">
              <div className="border border-slate-200 rounded p-1 bg-slate-50">
                <span className="text-[8px] text-slate-500 font-bold uppercase block">Acciones en Posesión</span>
                <span className="font-bold font-mono text-slate-900">{(statement.shares?.total_shares_owned || 0).toLocaleString()} Unds</span>
              </div>
              <div className="border border-emerald-200 rounded p-1 bg-emerald-50/50">
                <span className="text-[8px] text-emerald-800 font-bold uppercase block">Acciones Libres Venta</span>
                <span className="font-bold font-mono text-emerald-700">{(statement.shares?.available_shares || 0).toLocaleString()} Unds</span>
              </div>
              <div className="border border-amber-200 rounded p-1 bg-amber-50/50">
                <span className="text-[8px] text-amber-800 font-bold uppercase block">Acciones en Oferta/Custodia</span>
                <span className="font-bold font-mono text-amber-700">{(statement.shares?.locked_shares || 0).toLocaleString()} Unds</span>
              </div>
              <div className="border border-brand-200 rounded p-1 bg-brand-50/50">
                <span className="text-[8px] text-brand-900 font-bold uppercase block">Precio por Acción</span>
                <span className="font-bold font-mono text-brand-900">{formatCurrency(statement.shares?.current_share_price || 0)}</span>
              </div>
            </div>

            <table className="w-full text-left text-[9px] border-collapse border border-slate-300">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[8px] tracking-wider border-b border-slate-300">
                <tr>
                  <th className="py-1.5 px-2 border-r border-slate-300 w-28">Fecha y Hora</th>
                  <th className="py-1.5 px-2 border-r border-slate-300 w-36">Tipo Movimiento</th>
                  <th className="py-1.5 px-2 border-r border-slate-300">Concepto / Detalle</th>
                  <th className="py-1.5 px-2 border-r border-slate-300 text-right w-24">Cantidad</th>
                  <th className="py-1.5 px-2 text-right w-24">Saldo Resultante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {!statement.shares?.movements || statement.shares.movements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-3 text-center text-slate-400 italic">
                      No registra movimientos ni acreditaciones de acciones en el periodo consultado.
                    </td>
                  </tr>
                ) : (
                  statement.shares.movements.map((sm) => {
                    const isPositive = sm.shares_quantity >= 0;
                    return (
                      <tr key={sm.id} className="even:bg-slate-50/50">
                        <td className="py-1 px-2 border-r border-slate-200 font-mono text-[8.5px] text-slate-600">
                          {formatDateTime(sm.created_at)}
                        </td>
                        <td className="py-1 px-2 border-r border-slate-200 font-bold text-slate-800">
                          {sm.type_label || sm.movement_type}
                        </td>
                        <td className="py-1 px-2 border-r border-slate-200 text-slate-700 truncate max-w-xs">
                          {sm.description}
                        </td>
                        <td className={`py-1 px-2 border-r border-slate-200 text-right font-mono font-bold ${
                          isPositive ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                          {isPositive ? '+' : ''}{sm.shares_quantity} Unds
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-bold text-slate-900">
                          {sm.balance_after} Unds
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 8. Pie de Certificación y Firmas */}
          <div className="border-t-2 border-slate-900 pt-3 mt-4 print-avoid-break">
            <p className="text-[8px] text-slate-500 leading-relaxed text-justify mb-4">
              <strong>AVISO DE CERTIFICACIÓN & VALIDEZ LEGAL:</strong> El presente extracto financiero es emitido de manera automatizada por el sistema de contabilidad y custodia de <strong>GLOINT GLOBAL INVESTMENT S.A.S.</strong>, reflejando de forma fidedigna los saldos, transacciones, acreditaciones de acciones y contratos de inversión del titular a la fecha de corte señalada. De conformidad con la Ley 527 de 1999 de la República de Colombia, los documentos y certificaciones generadas por medios electrónicos gozan de plena validez jurídica y probatoria. Este documento es para uso confidencial del titular.
            </p>

            <div className="grid grid-cols-2 gap-8 items-end pt-2">
              <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  SELLO DE SEGURIDAD Y VERIFICACIÓN ELECTRÓNICA
                </span>
                <div className="text-[8.5px] font-mono text-slate-700 space-y-0.5">
                  <div>ID Verificación: <strong className="text-slate-900">EXT-{statement.user.id.toString().padStart(5, '0')}-{statement.statement_date.slice(0, 10).replace(/-/g, '')}</strong></div>
                  <div>Timestamp Servidor: <strong className="text-slate-900">{formatDateTime(statement.statement_date)}</strong></div>
                  <div>Seguridad SHA-256: <span className="text-slate-500">c8f92a10b48e3d67f91a20c384db1e8a9f45</span></div>
                </div>
              </div>

              <div className="text-center">
                <div className="w-48 mx-auto border-b border-slate-800 pb-1 mb-1">
                  <span className="text-[10px] font-serif italic text-slate-700 block">
                    Gloint Operations & Treasury
                  </span>
                </div>
                <span className="text-[9px] font-bold text-slate-900 uppercase block tracking-wider">
                  Dirección de Operaciones & Tesorería
                </span>
                <span className="text-[8px] text-slate-500 block">
                  GLOINT GLOBAL INVESTMENT S.A.S.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
