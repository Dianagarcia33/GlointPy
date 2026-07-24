import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Plus, Zap, TrendingUp, DollarSign, Users, Award, ShieldAlert, CheckCircle2, AlertCircle, Download, Trash2, Filter, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { commercialService, CommercialSummary, AdminCommercialSummary, LeaderboardResponse, CommercialSale, CommercialUserOption } from '../../../services/commercial';
import { RegisterCommercialSaleModal } from '../components/RegisterCommercialSaleModal';

export const CommercialDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.is_superuser === true || 
    user?.permissions?.includes('admin.commercial.manage') === true || 
    user?.permissions?.includes('admin.roles.manage') === true;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filtros del Administrador
  const [selectedCommercialId, setSelectedCommercialId] = useState<string>('');
  const [selectedSaleType, setSelectedSaleType] = useState<string>('');

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Queries para Asesor Comercial
  const { data: summary, refetch: refetchSummary } = useQuery<CommercialSummary>({
    queryKey: ['my_commercial_summary'],
    queryFn: () => commercialService.getMySummary(),
    enabled: !isAdmin
  });

  // Queries para Administrador
  const { data: adminSummary, refetch: refetchAdminSummary } = useQuery<AdminCommercialSummary>({
    queryKey: ['admin_commercial_summary'],
    queryFn: () => commercialService.getAdminSummary(),
    enabled: isAdmin
  });

  const { data: allSales, isLoading: isLoadingAllSales, refetch: refetchAllSales } = useQuery<CommercialSale[]>({
    queryKey: ['all_commercial_sales', selectedCommercialId, selectedSaleType],
    queryFn: () => commercialService.getAllSales({
      commercial_id: selectedCommercialId ? Number(selectedCommercialId) : undefined,
      sale_type: selectedSaleType || undefined
    }),
    enabled: isAdmin
  });

  const { data: commercialUsers } = useQuery<CommercialUserOption[]>({
    queryKey: ['commercial_users_list'],
    queryFn: () => commercialService.getCommercialUsers(),
    enabled: isAdmin
  });

  // Shared Query: Leaderboard
  const { data: leaderboardData, isLoading: isLoadingLeaderboard, refetch: refetchLeaderboard } = useQuery<LeaderboardResponse>({
    queryKey: ['commercial_leaderboard'],
    queryFn: () => commercialService.getLeaderboard()
  });

  const handleSuccess = () => {
    showToast('¡Venta registrada y adjudicada exitosamente!', 'success');
    if (isAdmin) {
      refetchAdminSummary();
      refetchAllSales();
    } else {
      refetchSummary();
    }
    refetchLeaderboard();
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
    if (!allSales || allSales.length === 0) return;
    const headers = ['ID Venta', 'Asesor Comercial', 'Documento Cliente', 'Nombre Cliente', 'Tipo Venta', 'Monto Paquete (COP)', 'Comision %', 'Monto Comision (COP)', 'Fecha Venta'];
    const rows = allSales.map(s => [
      s.id,
      `"${s.commercial_name || ''}"`,
      `"${s.client_document}"`,
      `"${s.client_name || ''}"`,
      s.sale_type,
      s.amount,
      (s.commission_rate * 100).toFixed(2) + '%',
      s.commission_amount,
      s.sale_date
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reporte_Comercial_Gloint_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const directAccum = summary?.direct_accumulated || 0;
  const threshold = summary?.threshold_36m || 36000000;
  const remaining = summary?.remaining_for_36m || 0;
  const progressPercent = Math.min(100, Math.round((directAccum / threshold) * 100));

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      
      {/* Header Ejecutivo Principal (Estilo Dashboard / Resto de Módulos) */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 space-y-2">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight font-montserrat">
            {isAdmin ? 'Panel de Control Comercial' : 'Panel Comercial & Ranking'}
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            {isAdmin 
              ? 'Supervisión global de facturación, auditoría de comisiones y adjudicación al equipo comercial' 
              : 'Gestión de ventas, partición marginal del 3.5% y comisiones en tiempo real'}
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 shrink-0">
          {isAdmin && (
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all text-xs font-bold border border-white/10 backdrop-blur-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-brand-500 text-white rounded-2xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/30 text-sm font-bold cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            {isAdmin ? 'Adjudicar Venta' : 'Registrar Venta'}
          </button>
        </div>
      </div>

      {/* VISTA ADMINISTRADOR */}
      {isAdmin ? (
        <>
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
                <span className="text-xs text-slate-400 font-medium">Mes en Curso</span>
              </div>

              {isLoadingLeaderboard ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-14 bg-slate-100 rounded-2xl animate-pulse" />)}
                </div>
              ) : !leaderboardData?.leaderboard?.length ? (
                <p className="text-center text-xs text-slate-400 py-8">No hay registros en el ranking este mes.</p>
              ) : (
                <div className="space-y-2.5">
                  {leaderboardData.leaderboard.map((entry) => (
                    <div
                      key={entry.commercial_id}
                      className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          entry.rank === 1 ? 'bg-amber-400 text-amber-950' :
                          entry.rank === 2 ? 'bg-slate-300 text-slate-800' :
                          entry.rank === 3 ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                          #{entry.rank}
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block">{entry.commercial_name}</span>
                          <span className="text-[11px] text-slate-400">{entry.total_closures} cierres</span>
                        </div>
                      </div>

                      <span className="font-extrabold text-slate-800 text-sm font-montserrat">
                        ${entry.total_volume.toLocaleString('es-CO')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* General Sales Audit Table (2 cols) */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-5 h-5 text-brand-600" />
                  <h2 className="font-bold text-slate-900 text-base font-montserrat">Auditoría General de Ventas Adjudicadas</h2>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                  <select
                    value={selectedCommercialId}
                    onChange={(e) => setSelectedCommercialId(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value="">Todos los Asesores</option>
                    {commercialUsers?.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>

                  <select
                    value={selectedSaleType}
                    onChange={(e) => setSelectedSaleType(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
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
                            <button
                              onClick={() => handleDeleteSale(s.id)}
                              title="Anular Venta Comercial"
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
              <span className="text-[11px] text-emerald-700 font-medium">Calculadas del mes en curso</span>
            </div>
          </div>

          {/* Main Grid: Leaderboard & Recent Sales */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Ranking / Leaderboard */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <h2 className="font-bold text-slate-900 text-base font-montserrat">Ranking de Ventas (Leaderboard)</h2>
                </div>
                <span className="text-xs text-slate-400 font-medium">Mes en Curso</span>
              </div>

              {isLoadingLeaderboard ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}
                </div>
              ) : !leaderboardData?.leaderboard?.length ? (
                <p className="text-center text-xs text-slate-400 py-8">Aún no hay registros en el ranking de ventas de este mes.</p>
              ) : (
                <div className="space-y-3">
                  {leaderboardData.leaderboard.map((entry) => (
                    <div
                      key={entry.commercial_id}
                      className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                        entry.is_me
                          ? 'bg-brand-50/70 border-brand-300 ring-2 ring-brand-500/20'
                          : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/60'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                          entry.rank === 1 ? 'bg-amber-400 text-amber-950 shadow-sm' :
                          entry.rank === 2 ? 'bg-slate-300 text-slate-800' :
                          entry.rank === 3 ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                          #{entry.rank}
                        </div>

                        <div>
                          <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            <span>{entry.commercial_name}</span>
                            {entry.is_me && <span className="text-[10px] bg-brand-500 text-white px-2 py-0.5 rounded-full font-extrabold uppercase">Tú</span>}
                          </div>
                          <span className="text-xs text-slate-500 font-medium">
                            {entry.total_closures} {entry.total_closures === 1 ? 'cierre' : 'cierres'} este mes
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-extrabold text-slate-800 text-base block">
                          ${entry.total_volume.toLocaleString('es-CO')} COP
                        </span>
                        {entry.is_me && entry.next_target_amount > 0 && (
                          <span className="text-[11px] font-bold text-emerald-700 block mt-0.5">
                            🎯 Faltan ${entry.next_target_amount.toLocaleString('es-CO')} COP para alcanzar el puesto #{entry.rank - 1}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Historial Reciente */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h2 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-3">Mis Últimas Ventas</h2>
              
              {!summary?.recent_sales?.length ? (
                <p className="text-center text-xs text-slate-400 py-8">No has registrado ventas este mes.</p>
              ) : (
                <div className="space-y-3">
                  {summary.recent_sales.map((s) => (
                    <div key={s.id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800">Doc: {s.client_document}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          s.sale_type === 'referido' ? 'bg-amber-100 text-amber-800' : 'bg-brand-100 text-brand-800'
                        }`}>
                          {s.sale_type.replace('_', ' ')}
                        </span>
                      </div>
                      {s.client_name && <p className="text-slate-500 font-medium text-[11px]">{s.client_name}</p>}
                      <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 font-medium">
                        <span className="text-slate-600">Venta: ${s.amount.toLocaleString('es-CO')}</span>
                        <span className="font-bold text-emerald-700">+${s.commission_amount.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </>
      )}

      {/* Modal para Registrar / Adjudicar Venta */}
      <RegisterCommercialSaleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
        currentAccumulatedDirect={directAccum}
        isAdmin={isAdmin}
      />

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
