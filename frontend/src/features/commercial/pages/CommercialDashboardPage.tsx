import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Plus, Zap, TrendingUp, DollarSign, Users, Award, ShieldAlert, CheckCircle2, AlertCircle, Download, Trash2, Filter, ShieldCheck, UserCheck, FileCheck, CreditCard } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { commercialService, CommercialSummary, AdminCommercialSummary, LeaderboardResponse, CommercialSale, CommercialUserOption, CommissionSettlement } from '../../../services/commercial';
import { RegisterCommercialSaleModal } from '../components/RegisterCommercialSaleModal';
import { SettleCommissionsModal } from '../components/SettleCommissionsModal';
import { CommercialBonusGoalsWidget } from '../components/CommercialBonusGoalsWidget';
import { AdminCommercialBonusesTable } from '../components/AdminCommercialBonusesTable';
import { AdminCommercialFloorsMonitor } from '../components/AdminCommercialFloorsMonitor';
import { Can } from '../../../components/security/Can';
import { getColombiaToday } from '../../../utils/format';

export const CommercialDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const isCommercialAdmin = user?.is_superuser === true || 
    user?.permissions?.includes('admin.commercial.manage') === true;

  const [adminTab, setAdminTab] = useState<'overview' | 'floors'>('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [selectedCommercialForSettle, setSelectedCommercialForSettle] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filtros del Administrador
  const [selectedCommercialId, setSelectedCommercialId] = useState<string>('');
  const [selectedSaleType, setSelectedSaleType] = useState<string>('');
  const [assignedPage, setAssignedPage] = useState(1);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Queries para Asesor Comercial
  const { data: summary, refetch: refetchSummary } = useQuery<CommercialSummary>({
    queryKey: ['my_commercial_summary'],
    queryFn: () => commercialService.getMySummary(),
    enabled: !isCommercialAdmin
  });

  // Queries para Administrador
  const { data: adminSummary, refetch: refetchAdminSummary } = useQuery<AdminCommercialSummary>({
    queryKey: ['admin_commercial_summary'],
    queryFn: () => commercialService.getAdminSummary(),
    enabled: isCommercialAdmin
  });

  const { data: allSales, isLoading: isLoadingAllSales, refetch: refetchAllSales } = useQuery<CommercialSale[]>({
    queryKey: ['all_commercial_sales', selectedCommercialId, selectedSaleType],
    queryFn: () => commercialService.getAllSales({
      commercial_id: selectedCommercialId ? Number(selectedCommercialId) : undefined,
      sale_type: selectedSaleType || undefined
    }),
    enabled: isCommercialAdmin
  });

  const { data: commercialUsers } = useQuery<CommercialUserOption[]>({
    queryKey: ['commercial_users_list'],
    queryFn: () => commercialService.getCommercialUsers(),
    enabled: isCommercialAdmin
  });

  // Historial de Liquidaciones
  const { data: settlements, refetch: refetchSettlements } = useQuery<CommissionSettlement[]>({
    queryKey: ['commercial_settlements'],
    queryFn: () => commercialService.getSettlements()
  });

  // Shared Query: Leaderboard
  const { data: leaderboardData, isLoading: isLoadingLeaderboard, refetch: refetchLeaderboard } = useQuery<LeaderboardResponse>({
    queryKey: ['commercial_leaderboard'],
    queryFn: () => commercialService.getLeaderboard()
  });

  // Query: Solicitudes de Inversión de Inversionistas Asignados al Directivo
  const { data: assignedInvestmentsData, isLoading: loadingAssignedInvestments } = useQuery({
    queryKey: ['my_assigned_investments'],
    queryFn: () => commercialService.getMyAssignedInvestments()
  });

  const handleSuccess = () => {
    showToast('¡Venta registrada y adjudicada exitosamente!', 'success');
    if (isCommercialAdmin) {
      refetchAdminSummary();
      refetchAllSales();
    } else {
      refetchSummary();
    }
    refetchLeaderboard();
  };

  const handleSettleSuccess = () => {
    showToast('¡Comisiones liquidadas y comprobante registrado correctamente!', 'success');
    refetchAdminSummary();
    refetchAllSales();
    refetchSettlements();
    if (!isCommercialAdmin) refetchSummary();
  };

  const handleDeleteSale = async (saleId: number) => {
    if (!window.confirm('¿Estás seguro de anular esta venta comercial? Esta acción no se puede deshacer.')) return;
    try {
      await commercialService.deleteSale(saleId);
      showToast('Venta comercial anulada correctamente', 'success');
      refetchAdminSummary();
      refetchAllSales();
      refetchLeaderboard();
    } catch (err: any) {
      showToast(err.message || 'Error al anular la venta', 'error');
    }
  };

  const exportToCSV = () => {
    if (!allSales || allSales.length === 0) {
      showToast('No hay ventas disponibles para exportar', 'error');
      return;
    }

    const headers = ['ID', 'Comercial', 'Cédula Cliente', 'Nombre Cliente', 'Tipo Venta', 'Monto ($)', 'Tasa (%)', 'Comisión ($)', 'Fecha Venta'];
    const rows = allSales.map(s => [
      s.id,
      `"${s.commercial_name}"`,
      `"${s.client_document}"`,
      `"${s.client_name}"`,
      s.sale_type,
      s.amount,
      (s.commission_rate * 100).toFixed(1),
      s.commission_amount,
      s.sale_date
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_ventas_comerciales_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const canSettle = user?.is_superuser === true || 
    user?.permissions?.includes('admin.commercial.manage') === true || 
    user?.permissions?.includes('admin.commissions.settle') === true;
  const canCreateSaleOrAdjudicate = user?.is_superuser === true || 
    user?.permissions?.includes('admin.commercial.manage') === true || 
    user?.permissions?.includes('commercial:view') === true;

  // Cálculo para Asesor Comercial (Individual)
  const directAccum = summary?.direct_accumulated || 0;
  const threshold = summary?.threshold_36m || 36000000;
  const remaining = summary?.remaining_for_36m || 0;
  const progressPercent = Math.min(100, Math.round((directAccum / threshold) * 100));

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      
      {/* Header Ejecutivo Principal */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 space-y-2">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight font-montserrat">
            {isCommercialAdmin ? 'Panel de Control Comercial' : 'Panel Comercial & Comisiones'}
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            {isCommercialAdmin 
              ? 'Supervisión global de facturación, auditoría de comisiones, liquidaciones y adjudicación' 
              : 'Gestión de ventas, partición marginal del 3.5% y comisiones en tiempo real'}
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
          {canSettle && (
            <button
              onClick={() => setIsSettleModalOpen(true)}
              className="flex items-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl transition-all text-xs font-bold shadow-lg shadow-emerald-600/20 cursor-pointer"
            >
              <DollarSign className="w-4 h-4" />
              Liquidar Comisiones
            </button>
          )}

          {isCommercialAdmin && (
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all text-xs font-bold border border-white/10 backdrop-blur-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
          )}

          {canCreateSaleOrAdjudicate && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-brand-500 text-white rounded-2xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/30 text-sm font-bold cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              {isCommercialAdmin ? 'Adjudicar Venta' : 'Registrar Venta'}
            </button>
          )}
        </div>
      </div>

      {/* VISTA ADMINISTRADOR / DIRECTIVO */}
      {isCommercialAdmin ? (
        <>
          {/* Selector de Pestañas Ejecutivo (Admin) */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl w-fit border border-slate-200/80 font-montserrat">
            <button
              onClick={() => setAdminTab('overview')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                adminTab === 'overview'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Auditoría & Comisiones
            </button>

            <Can permission="admin.commercial.manage">
              <button
                onClick={() => setAdminTab('floors')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  adminTab === 'floors'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/20'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Trophy className="w-4 h-4 text-amber-300" />
                Monitoreo de Pisos por Directivo
              </button>
            </Can>
          </div>

          {adminTab === 'floors' ? (
            <AdminCommercialFloorsMonitor />
          ) : (
            <>
              {/* Widget de Metas y Bonos en Curso */}
              <CommercialBonusGoalsWidget
                summary={summary}
                dailyClosuresCount={summary?.today_closures ?? (summary?.recent_sales?.filter((s: any) => s.sale_date === getColombiaToday()).length || 0)}
              />

          {/* Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-2">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block font-montserrat">Ventas Empresa (Mes)</span>
              <span className="text-2xl font-extrabold text-slate-900 block tracking-tight font-montserrat">
                ${(adminSummary?.global_sales || 0).toLocaleString('es-CO')}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Facturación acumulada del equipo</span>
            </div>

            <div className="bg-emerald-50/80 border border-emerald-200 rounded-3xl p-6 shadow-xs space-y-2">
              <span className="text-xs text-emerald-800 font-bold uppercase tracking-wider block font-montserrat">Comisiones Totales</span>
              <span className="text-2xl font-extrabold text-emerald-700 block tracking-tight font-montserrat">
                ${(adminSummary?.global_commissions || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
              </span>
              <span className="text-[11px] text-emerald-700 font-medium">Consolidado a liquidar</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-2">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block font-montserrat">Cierres Adjudicados</span>
              <span className="text-2xl font-extrabold text-brand-700 block tracking-tight font-montserrat">
                {adminSummary?.total_closures || 0}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Transacciones comerciales</span>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-6 shadow-xs space-y-2">
              <span className="text-xs text-amber-900 font-bold uppercase tracking-wider block font-montserrat">Líder del Mes</span>
              <span className="text-xl font-extrabold text-amber-950 block truncate font-montserrat">
                {adminSummary?.leader_name || 'Sin ventas'}
              </span>
              <span className="text-[11px] text-amber-800 font-medium">Puesto #1 del Ranking</span>
            </div>
          </div>

          {/* Main Grid: Leaderboard & Audit Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Leaderboard (1 col) */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <h2 className="font-bold text-slate-900 text-base font-montserrat">Ranking del Equipo</h2>
                </div>
              </div>

              {isLoadingLeaderboard ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-14 bg-slate-100 rounded-2xl animate-pulse" />)}
                </div>
              ) : !leaderboardData?.leaderboard?.length ? (
                <p className="text-center text-xs text-slate-400 py-8">No hay ventas en el mes actual.</p>
              ) : (
                <div className="space-y-2.5">
                  {leaderboardData.leaderboard.map((entry) => (
                    <div
                      key={entry.commercial_id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        entry.rank === 1
                          ? 'bg-amber-50/60 border-amber-200 shadow-xs'
                          : 'bg-white border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs font-mono shrink-0 ${
                          entry.rank === 1 ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          #{entry.rank}
                        </span>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 text-xs block truncate font-montserrat">{entry.commercial_name}</span>
                          <span className="text-[10px] text-slate-400">{entry.total_closures} cierres</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-bold text-emerald-700 text-xs block font-mono">
                          ${(entry.total_volume || 0).toLocaleString('es-CO')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Audit Table (2 cols) */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-brand-600" />
                  <h2 className="font-bold text-slate-900 text-base font-montserrat">Auditoría de Ventas Comerciales</h2>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedCommercialId}
                    onChange={(e) => setSelectedCommercialId(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value="">Todos los Asesores</option>
                    {commercialUsers?.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>

                  <select
                    value={selectedSaleType}
                    onChange={(e) => setSelectedSaleType(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value="">Todos los Tipos</option>
                    <option value="contrato_nuevo">Contrato Nuevo</option>
                    <option value="reinversion">Reinversión</option>
                    <option value="referido">Referido</option>
                  </select>
                </div>
              </div>

              {isLoadingAllSales ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}
                </div>
              ) : !allSales?.length ? (
                <p className="text-center text-xs text-slate-400 py-12">No hay ventas registradas con los filtros seleccionados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/60 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-3">Asesor</th>
                        <th className="py-2.5 px-3">Cliente / Doc</th>
                        <th className="py-2.5 px-3">Tipo</th>
                        <th className="py-2.5 px-3 text-right">Paquete ($)</th>
                        <th className="py-2.5 px-3 text-right">Comisión</th>
                        <th className="py-2.5 px-3 text-center">Estado</th>
                        <th className="py-2.5 px-3 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {allSales.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-800 block">{s.commercial_name}</span>
                            <span className="text-[10px] text-slate-400">{s.sale_date}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-700 block">{s.client_document}</span>
                            {s.client_name && <span className="text-[10px] text-slate-400">{s.client_name}</span>}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              s.sale_type === 'referido' ? 'bg-amber-100 text-amber-800' : 'bg-brand-100 text-brand-800'
                            }`}>
                              {s.sale_type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                            ${s.amount.toLocaleString('es-CO')}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="font-mono font-bold text-emerald-700 block">
                              +${s.commission_amount.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                            </span>
                            <span className="text-[10px] text-slate-400">({(s.commission_rate * 100).toFixed(1)}%)</span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              s.status === 'liquidado' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {s.status || 'pendiente'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => handleDeleteSale(s.id)}
                              title="Anular Venta Comercial"
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* Tabla de Auditoría y Liquidación de Bonos del Equipo */}
          <AdminCommercialBonusesTable
            onSettleAdvisor={(cId) => {
              setSelectedCommercialForSettle(cId);
              setIsSettleModalOpen(true);
            }}
            canSettle={canSettle}
          />
            </>
          )}
        </>
      ) : (

        /* VISTA ASESOR COMERCIAL (INDIVIDUAL) */
        <>
          {/* Alerta Estratégica de Proximidad a los $36M */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white font-montserrat">Progreso de Tramo Marginal ($36.000.000)</h3>
                  <p className="text-xs text-slate-300">
                    {summary?.has_reached_36m ? (
                      <span className="text-emerald-400 font-bold">¡Felicidades! Has superado los $36.000.000. Todas tus ventas directas cotizan al 3.5%.</span>
                    ) : (
                      <span>Te faltan <strong className="text-emerald-400 font-bold">${remaining.toLocaleString('es-CO')}</strong> en ventas directas para desbloquear la comisión al 3.5%.</span>
                    )}
                  </p>
                </div>
              </div>

              <span className="px-3.5 py-1 bg-white/10 rounded-full text-xs font-bold text-emerald-400 border border-white/10 backdrop-blur-sm">
                Tasa Actual: {(summary?.current_rate ? summary.current_rate * 100 : 3.0).toFixed(1)}%
              </span>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs text-slate-400 font-medium">
                <span>Acumulado Directo: ${directAccum.toLocaleString('es-CO')}</span>
                <span>Meta Piso 2: ${threshold.toLocaleString('es-CO')}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-brand-500 to-emerald-400 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Widget de Metas y Bonos en Curso */}
          <CommercialBonusGoalsWidget
            summary={summary}
            dailyClosuresCount={summary?.today_closures ?? 0}
          />

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-2">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block font-montserrat">Ventas Directas</span>
              <span className="text-2xl font-extrabold text-slate-800 block tracking-tight font-montserrat">
                ${directAccum.toLocaleString('es-CO')}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Contratos Nuevos + Reinversiones</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-2">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block font-montserrat">Ventas Referidos</span>
              <span className="text-2xl font-extrabold text-amber-800 block tracking-tight font-montserrat">
                ${(summary?.referral_accumulated || 0).toLocaleString('es-CO')}
              </span>
              <span className="text-[11px] text-amber-700 font-medium">Tasa fija del 1.8%</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-2">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block font-montserrat">Ventas Totales Mes</span>
              <span className="text-2xl font-extrabold text-brand-700 block tracking-tight font-montserrat">
                ${(summary?.total_accumulated || 0).toLocaleString('es-CO')}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Consolidado general</span>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-6 shadow-xs space-y-2">
              <span className="text-xs text-emerald-800 font-bold uppercase tracking-wider block font-montserrat">Comisiones Ganadas</span>
              <span className="text-2xl font-extrabold text-emerald-700 block tracking-tight font-montserrat">
                +${(summary?.total_commissions || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
              </span>
              <span className="text-[11px] text-emerald-700 font-medium">Acumulado a liquidar</span>
            </div>
          </div>

          {/* Main Grid: Leaderboard & Recent Sales */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Ranking / Leaderboard */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <h2 className="font-bold text-slate-900 text-base font-montserrat">Ranking de Ventas</h2>
                </div>
                <span className="text-xs text-slate-400 font-medium">Mes en Curso</span>
              </div>

              {isLoadingLeaderboard ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}
                </div>
              ) : !leaderboardData?.leaderboard?.length ? (
                <p className="text-center text-xs text-slate-400 py-8">No hay registros aún.</p>
              ) : (
                <div className="space-y-2">
                  {leaderboardData.leaderboard.map((entry) => (
                    <div
                      key={entry.commercial_id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        entry.is_me
                          ? 'bg-brand-50/70 border-brand-200 shadow-xs'
                          : 'bg-white border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs font-mono shrink-0 ${
                          entry.rank === 1 ? 'bg-amber-500 text-white' : entry.is_me ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          #{entry.rank}
                        </span>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 text-xs block truncate font-montserrat">
                            {entry.commercial_name} {entry.is_me && '(Tú)'}
                          </span>
                          <span className="text-[10px] text-slate-400">{entry.total_closures} cierres</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-bold text-emerald-700 text-xs block font-mono">
                          ${(entry.total_volume || 0).toLocaleString('es-CO')}
                        </span>
                        {entry.is_me && entry.next_target_amount > 0 && (
                          <span className="text-[10px] text-brand-600 font-medium block">
                            Faltan ${entry.next_target_amount.toLocaleString('es-CO')} para subir
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mis Últimas Ventas */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <h2 className="font-bold text-slate-900 text-base font-montserrat">Mis Últimos Cierres</h2>
                <span className="text-xs text-slate-400 font-medium">Recientes</span>
              </div>

              {!summary?.recent_sales?.length ? (
                <p className="text-center text-xs text-slate-400 py-8">No has registrado ventas en este período.</p>
              ) : (
                <div className="space-y-3">
                  {summary.recent_sales.map((sale) => (
                    <div key={sale.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800 font-mono">{sale.client_document}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          sale.sale_type === 'referido' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {sale.sale_type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline text-xs pt-1 border-t border-slate-200/50">
                        <span className="text-slate-500 font-mono">${(sale.amount || 0).toLocaleString('es-CO')}</span>
                        <span className="font-bold text-emerald-700 font-mono">
                          +${(sale.commission_amount || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </>
      )}

      {/* Solicitudes de Inversión de Mis Inversionistas Asignados (Protegido con Permiso PBAC) */}
      <Can permissions={["director.dashboard.view", "commercial:view"]}>
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <UserCheck className="w-5 h-5 text-brand-600" />
              <div>
                <h2 className="font-bold text-slate-900 text-base font-montserrat">
                  Solicitudes de Inversión de Mis Inversionistas Asignados
                </h2>
                <p className="text-xs text-slate-400">
                  Inversionistas que se registraron en Gloint y te seleccionaron como su Directivo de Inversiones
                </p>
              </div>
            </div>
            {assignedInvestmentsData?.total !== undefined && (
              <span className="px-3 py-1 bg-brand-50 text-brand-700 font-bold text-xs rounded-full border border-brand-200">
                {assignedInvestmentsData.total} Inversionista(s)
              </span>
            )}
          </div>

          {loadingAssignedInvestments ? (
            <div className="text-center py-8 text-xs text-slate-400">Cargando solicitudes asignadas...</div>
          ) : !assignedInvestmentsData?.assigned_investments || assignedInvestmentsData.assigned_investments.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No tienes solicitudes de inversión de inversionistas asignados aún.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Inversionista</th>
                      <th className="py-3 px-4">Contacto / Documento</th>
                      <th className="py-3 px-4">Paquete de Inversión</th>
                      <th className="py-3 px-4 text-right">Monto ($)</th>
                      <th className="py-3 px-4 text-center">Estado</th>
                      <th className="py-3 px-4">Fecha Solicitud</th>
                      <th className="py-3 px-4 text-center">Comprobante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {assignedInvestmentsData.assigned_investments
                      .slice((assignedPage - 1) * 5, assignedPage * 5)
                      .map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {item.investor_name}
                        </td>
                        <td className="py-3.5 px-4 space-y-0.5">
                          <p className="font-semibold text-slate-800">{item.investor_email}</p>
                          <p className="text-[10px] text-slate-400">Doc: {item.investor_document} | Tel: {item.investor_phone}</p>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          {item.paquete_nombre}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-700 font-mono">
                          ${(item.monto || 0).toLocaleString('es-CO')}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                            item.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : item.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                          }`}>
                            {item.status === 'approved'
                              ? 'APROBADO'
                              : item.status === 'rejected'
                              ? 'RECHAZADO'
                              : 'PENDIENTE'}
                          </span>
                          {item.status === 'rejected' && item.rejection_reason && (
                            <p className="text-[10px] text-rose-500 font-normal truncate max-w-[120px] mx-auto mt-0.5" title={item.rejection_reason}>
                              {item.rejection_reason}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString('es-CO') : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {item.comprobante_path ? (
                            <a
                              href={item.comprobante_path.startsWith('/') ? item.comprobante_path : `/api/v1/${item.comprobante_path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-800 underline"
                            >
                              <span>Ver</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Sin archivo</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Controles de Paginación */}
              {assignedInvestmentsData.assigned_investments.length > 5 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 text-xs">
                  <div className="text-slate-500 font-medium">
                    Mostrando <strong className="text-slate-800">{((assignedPage - 1) * 5) + 1}</strong> - <strong className="text-slate-800">{Math.min(assignedPage * 5, assignedInvestmentsData.assigned_investments.length)}</strong> de <strong className="text-slate-800">{assignedInvestmentsData.assigned_investments.length}</strong> solicitudes
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAssignedPage(p => Math.max(1, p - 1))}
                      disabled={assignedPage === 1}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      Anterior
                    </button>
                    <span className="font-semibold text-slate-700 px-2 font-mono">
                      Página {assignedPage} de {Math.ceil(assignedInvestmentsData.assigned_investments.length / 5)}
                    </span>
                    <button
                      onClick={() => setAssignedPage(p => Math.min(Math.ceil(assignedInvestmentsData.assigned_investments.length / 5), p + 1))}
                      disabled={assignedPage >= Math.ceil(assignedInvestmentsData.assigned_investments.length / 5)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Can>

      {/* Historial de Liquidaciones Registradas */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <FileCheck className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="font-bold text-slate-900 text-base font-montserrat">Historial de Liquidaciones Registradas</h2>
              <p className="text-xs text-slate-400">Registro de comprobantes bancarios y comisiones liquidadas</p>
            </div>
          </div>
        </div>

        {!settlements || settlements.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No se han registrado liquidaciones de comisiones todavía.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Fecha Liquidación</th>
                  <th className="py-3 px-4">Asesor Beneficiario</th>
                  <th className="py-3 px-4 text-center">Cierres Liquidados</th>
                  <th className="py-3 px-4 text-right">Monto Liquidado ($)</th>
                  <th className="py-3 px-4">Comprobante / Referencia</th>
                  <th className="py-3 px-4">Liquida / Aprueba</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {settlements.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono">
                      {st.created_at ? new Date(st.created_at).toLocaleDateString('es-CO') : 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 font-montserrat">
                      {st.commercial_name}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold">
                      {st.sales_count} cierres
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                      ${(st.total_amount || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-3 px-4">
                      {st.reference_code ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-mono font-bold text-[11px] border border-slate-200">
                          <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                          {st.reference_code}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Sin referencia</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {st.settled_by_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para Registrar Venta Comercial */}
      <RegisterCommercialSaleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
        currentAccumulatedDirect={directAccum}
        isAdmin={isCommercialAdmin}
        showAsesorSelect={isCommercialAdmin}
      />

      {/* Modal para Liquidar Comisiones */}
      {canSettle && (
        <SettleCommissionsModal
          isOpen={isSettleModalOpen}
          onClose={() => setIsSettleModalOpen(false)}
          onSuccess={handleSettleSuccess}
          commercialUsers={commercialUsers || []}
          sales={allSales || []}
          initialCommercialId={selectedCommercialForSettle}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
};
