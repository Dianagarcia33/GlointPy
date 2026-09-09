import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Loader2,
  DollarSign,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  XCircle,
  Eye,
  Check,
  X,
  Copy,
  ExternalLink,
  FileText,
  CreditCard,
  Ban,
  ArrowDownLeft,
  User,
  Calendar,
  Wallet
} from 'lucide-react';
import {
  WalletRecharge,
  getAllRechargesAdmin,
  approveRechargeAdmin,
  rejectRechargeAdmin
} from '../../../../services/wallets';
import { getMediaUrl } from '../../../../services/api';

interface AdminRechargesManagerProps {
  onPendingCountChange?: (count: number) => void;
}

export const AdminRechargesManager: React.FC<AdminRechargesManagerProps> = ({ onPendingCountChange }) => {
  const [recharges, setRecharges] = useState<WalletRecharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modals state
  const [previewReceipt, setPreviewReceipt] = useState<{ url: string; reference?: string; userName?: string } | null>(null);
  const [approvingRecharge, setApprovingRecharge] = useState<WalletRecharge | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  const [rejectingRecharge, setRejectingRecharge] = useState<WalletRecharge | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchRecharges = async () => {
    try {
      setLoading(true);
      const data = await getAllRechargesAdmin(statusFilter, search);
      setRecharges(data || []);

      if (onPendingCountChange) {
        const pending = (data || []).filter(r => r.status === 'pending').length;
        onPendingCountChange(pending);
      }
    } catch (error: any) {
      console.error('Error cargando recargas:', error);
      setToast({
        message: error.message || 'Error al obtener solicitudes de recarga',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecharges();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecharges();
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatCurrency = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(num || 0);
  };

  // Approval handler
  const handleConfirmApproval = async () => {
    if (!approvingRecharge) return;
    try {
      setIsApproving(true);
      const res = await approveRechargeAdmin(approvingRecharge.id, approvalNotes);
      setToast({
        message: res.message || 'Recarga aprobada y saldo acreditado con éxito.',
        type: 'success'
      });
      setApprovingRecharge(null);
      setApprovalNotes('');
      fetchRecharges();
    } catch (error: any) {
      console.error('Error aprobando recarga:', error);
      setToast({
        message: error.message || 'Error al aprobar la recarga',
        type: 'error'
      });
    } finally {
      setIsApproving(false);
    }
  };

  // Rejection handler
  const handleConfirmRejection = async () => {
    if (!rejectingRecharge) return;
    if (!rejectionReason.trim()) {
      setToast({
        message: 'Por favor indica el motivo del rechazo.',
        type: 'error'
      });
      return;
    }
    try {
      setIsRejecting(true);
      const res = await rejectRechargeAdmin(rejectingRecharge.id, rejectionReason.trim());
      setToast({
        message: res.message || 'Solicitud de recarga rechazada.',
        type: 'success'
      });
      setRejectingRecharge(null);
      setRejectionReason('');
      fetchRecharges();
    } catch (error: any) {
      console.error('Error rechazando recarga:', error);
      setToast({
        message: error.message || 'Error al rechazar la recarga',
        type: 'error'
      });
    } finally {
      setIsRejecting(false);
    }
  };

  // Quick stats
  const totalCount = recharges.length;
  const pendingItems = useMemo(() => recharges.filter(r => r.status === 'pending'), [recharges]);
  const approvedItems = useMemo(() => recharges.filter(r => r.status === 'approved'), [recharges]);
  const rejectedItems = useMemo(() => recharges.filter(r => r.status === 'rejected'), [recharges]);

  const pendingAmountTotal = useMemo(
    () => pendingItems.reduce((acc, curr) => acc + (parseFloat(curr.amount as any) || 0), 0),
    [pendingItems]
  );
  const approvedAmountTotal = useMemo(
    () => approvedItems.reduce((acc, curr) => acc + (parseFloat(curr.amount as any) || 0), 0),
    [approvedItems]
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            PENDIENTE
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            APROBADO
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            RECHAZADO
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            <Ban className="w-3.5 h-3.5" />
            CANCELADO
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-slate-50 text-slate-700 border border-slate-200">
            {status.toUpperCase()}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[80] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border ${
            toast.type === 'success'
              ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
              : 'bg-rose-900 text-rose-100 border-rose-700'
          } animate-in slide-in-from-bottom-3 backdrop-blur-md`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Total Recargas
            </span>
            <div className="p-2.5 bg-brand-50 text-brand-600 rounded-2xl border border-brand-100">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-slate-900 font-montserrat tracking-tight">
              {totalCount}
            </p>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Solicitudes registradas
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-widest">
              Monto Pendiente
            </span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-amber-600 font-montserrat tracking-tight">
              {formatCurrency(pendingAmountTotal)}
            </p>
            <p className="text-xs text-slate-500 font-medium mt-1">
              <strong className="font-bold text-amber-700">{pendingItems.length}</strong> {pendingItems.length === 1 ? 'recarga por auditar' : 'recargas por auditar'}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">
              Aprobadas / Acreditadas
            </span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-emerald-600 font-montserrat tracking-tight">
              {approvedItems.length}
            </p>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Recargas exitosas
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Total Acreditado
            </span>
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-slate-900 font-montserrat tracking-tight">
              {formatCurrency(approvedAmountTotal)}
            </p>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Fondos abonados a billeteras
            </p>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          {/* Búsqueda */}
          <form onSubmit={handleSearchSubmit} className="w-full lg:w-96 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por usuario, cédula, correo o ref..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-xs sm:text-sm font-medium"
            />
          </form>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchRecharges}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
              title="Refrescar listado"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
          </div>
        </div>

        {/* Filtro por Estado */}
        <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 sm:p-2 rounded-2xl border border-slate-200/80 text-xs font-bold overflow-x-auto">
          <span className="text-slate-400 px-2 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" /> Estado:
          </span>
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'pending', label: 'Pendientes' },
            { id: 'approved', label: 'Aprobados' },
            { id: 'rejected', label: 'Rechazados' },
            { id: 'cancelled', label: 'Cancelados' }
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStatusFilter(st.id)}
              className={`py-1.5 px-3 rounded-xl transition-all capitalize shrink-0 cursor-pointer text-xs font-bold ${
                statusFilter === st.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              {st.label}
              {st.id === 'pending' && pendingItems.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 bg-amber-500 text-slate-900 rounded-full text-[10px] font-black">
                  {pendingItems.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[11px] tracking-widest">
              <tr>
                <th className="px-6 py-4">Inversionista</th>
                <th className="px-6 py-4">Monto Solicitado</th>
                <th className="px-6 py-4">Método / Referencia</th>
                <th className="px-6 py-4">Comprobante</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Fecha Solicitud</th>
                <th className="px-6 py-4">Auditoría / Notas</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-600 mb-2" />
                    <p className="text-sm font-medium">Cargando solicitudes de recarga...</p>
                  </td>
                </tr>
              ) : recharges.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    <Wallet className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium text-slate-600">No se encontraron solicitudes de recarga</p>
                    <p className="text-xs text-slate-400 mt-1">Ajusta los filtros o espera nuevas solicitudes de inversionistas.</p>
                  </td>
                </tr>
              ) : (
                recharges.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Inversionista */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-sm shrink-0 border border-brand-100">
                          {r.user_name ? r.user_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">{r.user_name}</p>
                          <p className="text-xs text-slate-500 truncate">{r.user_email}</p>
                          {r.user_document && (
                            <span className="text-[11px] text-slate-400 font-mono">
                              C.C. {r.user_document}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Monto */}
                    <td className="px-6 py-4">
                      <span className="font-mono font-black text-emerald-600 text-base">
                        {formatCurrency(r.amount)}
                      </span>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">COP</p>
                    </td>

                    {/* Método y Referencia */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                          <CreditCard className="w-3 h-3 text-slate-500" />
                          {r.payment_method}
                        </span>
                        {r.reference_number ? (
                          <div className="flex items-center gap-1 text-xs text-slate-600 font-mono">
                            <span>Ref: {r.reference_number}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyText(r.reference_number!, `ref_${r.id}`)}
                              className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                              title="Copiar referencia"
                            >
                              {copiedId === `ref_${r.id}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">Sin ref. escrita</p>
                        )}
                      </div>
                    </td>

                    {/* Comprobante */}
                    <td className="px-6 py-4">
                      {r.receipt_url ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewReceipt({
                              url: r.receipt_url,
                              reference: r.reference_number,
                              userName: r.user_name
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Ver Comprobante</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No adjunto</span>
                      )}
                    </td>

                    {/* Estado */}
                    <td className="px-6 py-4">
                      {getStatusBadge(r.status)}
                    </td>

                    {/* Fecha de Solicitud */}
                    <td className="px-6 py-4 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {r.created_at
                            ? new Date(r.created_at).toLocaleDateString('es-CO', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : '-'}
                        </span>
                      </div>
                    </td>

                    {/* Auditoría / Notas */}
                    <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">
                      {r.status === 'approved' && (
                        <div className="space-y-0.5">
                          <p className="font-semibold text-emerald-800">
                            Aprobado por: {r.reviewer_name || 'Admin'}
                          </p>
                          {r.admin_notes && (
                            <p className="text-[11px] text-slate-500 italic truncate" title={r.admin_notes}>
                              "{r.admin_notes}"
                            </p>
                          )}
                        </div>
                      )}
                      {r.status === 'rejected' && (
                        <div className="space-y-0.5">
                          <p className="font-semibold text-rose-800">
                            Rechazado por: {r.reviewer_name || 'Admin'}
                          </p>
                          {r.admin_notes && (
                            <p className="text-[11px] text-rose-600 font-medium truncate" title={r.admin_notes}>
                              Motivo: {r.admin_notes}
                            </p>
                          )}
                        </div>
                      )}
                      {r.status === 'pending' && r.user_notes && (
                        <p className="text-[11px] text-slate-500 italic truncate" title={r.user_notes}>
                          Nota user: "{r.user_notes}"
                        </p>
                      )}
                      {r.status === 'cancelled' && (
                        <span className="text-[11px] text-slate-400 italic">Cancelada por el usuario</span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="px-6 py-4 text-center">
                      {r.status === 'pending' ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setApprovingRecharge(r);
                              setApprovalNotes('');
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                            title="Aprobar recarga y acreditar saldo"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Aprobar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setRejectingRecharge(r);
                              setRejectionReason('');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                            title="Rechazar solicitud con motivo"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Rechazar</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Lightbox Vista Previa Comprobante */}
      {previewReceipt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-montserrat">
                  Comprobante de Transferencia
                </h3>
                <p className="text-xs text-slate-500">
                  {previewReceipt.userName} {previewReceipt.reference ? `• Ref: ${previewReceipt.reference}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={getMediaUrl(previewReceipt.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
                  title="Abrir en pestaña nueva"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewReceipt(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 flex items-center justify-center bg-slate-900/5">
              {previewReceipt.url.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={`${getMediaUrl(previewReceipt.url)}#toolbar=0`}
                  title="Comprobante de Recarga PDF"
                  className="w-full h-[60vh] rounded-2xl border border-slate-200 bg-white"
                />
              ) : (
                <img
                  src={getMediaUrl(previewReceipt.url)}
                  alt="Comprobante Bancario"
                  className="max-h-[60vh] w-auto object-contain rounded-2xl shadow-md border border-slate-200 bg-white"
                />
              )}
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewReceipt(null)}
                className="px-5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirmar Aprobación de Recarga */}
      {approvingRecharge && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="px-6 py-5 border-b border-slate-100 bg-emerald-50/50 flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-2xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-montserrat">
                  Aprobar Recarga de Billetera
                </h3>
                <p className="text-xs text-slate-500">
                  Acreditación de saldo oficial a la billetera del inversionista
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Inversionista:</span>
                  <span className="font-bold text-slate-900">{approvingRecharge.user_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Correo:</span>
                  <span className="font-medium text-slate-700">{approvingRecharge.user_email}</span>
                </div>
                {approvingRecharge.user_document && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Documento:</span>
                    <span className="font-mono text-slate-700">{approvingRecharge.user_document}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Método de pago:</span>
                  <span className="font-medium text-slate-700">{approvingRecharge.payment_method}</span>
                </div>
                {approvingRecharge.reference_number && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Referencia:</span>
                    <span className="font-mono font-bold text-slate-900">{approvingRecharge.reference_number}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                  <span className="text-slate-700 font-bold">Monto a Acreditar:</span>
                  <span className="font-mono font-black text-xl text-emerald-600">
                    {formatCurrency(approvingRecharge.amount)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notas u Observaciones del Administrador (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ej: Transferencia verificada en extracto Bancolombia"
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs font-medium outline-none transition-all"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex gap-2.5 text-xs text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  Al hacer clic en <strong>Aprobar y Acreditar</strong>, el saldo se sumará en tiempo real a la billetera del usuario, se creará el movimiento contable auditado y el usuario recibirá una notificación en la plataforma.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setApprovingRecharge(null)}
                disabled={isApproving}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmApproval}
                disabled={isApproving}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Acreditando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Aprobar y Acreditar Saldo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Rechazar Solicitud de Recarga */}
      {rejectingRecharge && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="px-6 py-5 border-b border-slate-100 bg-rose-50/50 flex items-center gap-3">
              <div className="p-2.5 bg-rose-100 text-rose-700 rounded-2xl">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-montserrat">
                  Rechazar Solicitud de Recarga
                </h3>
                <p className="text-xs text-slate-500">
                  La solicitud no acreditará fondos a la billetera
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-xs space-y-1">
                <p>
                  <strong className="text-slate-700">Inversionista:</strong> {rejectingRecharge.user_name}
                </p>
                <p>
                  <strong className="text-slate-700">Monto:</strong>{' '}
                  <span className="font-mono font-bold text-rose-600">
                    {formatCurrency(rejectingRecharge.amount)}
                  </span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Motivo de Rechazo (Obligatorio para el usuario):
                </label>
                <textarea
                  rows={3}
                  placeholder="Ej: El comprobante no registra en nuestra cuenta bancaria o no coincide el monto..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs font-medium outline-none transition-all resize-none"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Este motivo será enviado por notificación y visible para el inversionista.</span>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejectingRecharge(null)}
                disabled={isRejecting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRejection}
                disabled={isRejecting || !rejectionReason.trim()}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-2xl shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isRejecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Rechazando...</span>
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4" />
                    <span>Confirmar Rechazo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
