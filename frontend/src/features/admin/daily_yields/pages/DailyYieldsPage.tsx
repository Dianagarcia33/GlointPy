import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  Calendar as CalendarIcon, 
  RefreshCw, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Users, 
  Wallet, 
  Layers, 
  ShieldCheck, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Filter, 
  Play, 
  Info, 
  Check, 
  X, 
  ExternalLink,
  Coins,
  Cpu,
  ArrowUpRight,
  RotateCcw
} from 'lucide-react';
import { 
  dailyYieldsService, 
  DailyYieldSummary, 
  DailyYieldBatch, 
  DailyYieldMovement 
} from '../../../../services/dailyYields';
import { ConfirmationModal } from '../../../../components/common/ConfirmationModal';
import { formatCurrency, getColombiaToday } from '../../../../utils/format';
import { Can } from '../../../../components/security/Can';

export const DailyYieldsPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(getColombiaToday());
  const [summary, setSummary] = useState<DailyYieldSummary | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState<boolean>(true);

  // Pestaña activa
  const [activeTab, setActiveTab] = useState<'movements' | 'batches' | 'worker'>('movements');

  // Estados de Movimientos
  const [movements, setMovements] = useState<DailyYieldMovement[]>([]);
  const [isMovementsLoading, setIsMovementsLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalAmountSum, setTotalAmountSum] = useState<number>(0);

  // Estados de Lotes
  const [batches, setBatches] = useState<DailyYieldBatch[]>([]);
  const [isBatchesLoading, setIsBatchesLoading] = useState<boolean>(false);
  const [batchPage, setBatchPage] = useState<number>(1);
  const [batchTotalPages, setBatchTotalPages] = useState<number>(1);
  const [batchTotalRecords, setBatchTotalRecords] = useState<number>(0);
  const [selectedBatchDetails, setSelectedBatchDetails] = useState<DailyYieldBatch | null>(null);

  // Modales y Feedback
  const [isTriggerModalOpen, setIsTriggerModalOpen] = useState<boolean>(false);
  const [isTriggering, setIsTriggering] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 1. Cargar Resumen del Día
  const loadSummary = useCallback(async (dateStr: string) => {
    try {
      setIsSummaryLoading(true);
      setError(null);
      const data = await dailyYieldsService.getSummary(dateStr);
      setSummary(data);
    } catch (err: any) {
      console.error('Error cargando resumen de rendimientos:', err);
      setError(err?.message || 'Error al obtener el resumen diario de rendimientos');
    } finally {
      setIsSummaryLoading(false);
    }
  }, []);

  // 2. Cargar Movimientos de Wallets
  const loadMovements = useCallback(async (dateStr: string, pg: number = 1, querySearch: string = '', type: string = '') => {
    try {
      setIsMovementsLoading(true);
      setError(null);
      const data = await dailyYieldsService.getMovements({
        date: dateStr,
        search: querySearch.trim() || undefined,
        type: type || undefined,
        page: pg,
        pageSize: 25
      });
      setMovements(data.items || []);
      setTotalPages(data.total_pages || 1);
      setTotalRecords(data.total || 0);
      setTotalAmountSum(data.total_amount_sum || 0);
    } catch (err: any) {
      console.error('Error cargando movimientos de rendimientos:', err);
      setError(err?.message || 'Error al obtener los movimientos de rendimientos');
    } finally {
      setIsMovementsLoading(false);
    }
  }, []);

  // 3. Cargar Historial de Lotes
  const loadBatches = useCallback(async (pg: number = 1) => {
    try {
      setIsBatchesLoading(true);
      setError(null);
      const data = await dailyYieldsService.getBatches({
        page: pg,
        pageSize: 15
      });
      setBatches(data.items || []);
      setBatchTotalPages(data.total_pages || 1);
      setBatchTotalRecords(data.total || 0);
    } catch (err: any) {
      console.error('Error cargando lotes de rendimientos:', err);
      setError(err?.message || 'Error al obtener los lotes de dispersión');
    } finally {
      setIsBatchesLoading(false);
    }
  }, []);

  // Efecto inicial y al cambiar fecha seleccionada
  useEffect(() => {
    loadSummary(selectedDate);
    if (activeTab === 'movements') {
      loadMovements(selectedDate, 1, search, typeFilter);
      setPage(1);
    }
  }, [selectedDate, loadSummary]);

  // Al cambiar de pestaña
  useEffect(() => {
    if (activeTab === 'movements') {
      loadMovements(selectedDate, page, search, typeFilter);
    } else if (activeTab === 'batches') {
      loadBatches(batchPage);
    }
  }, [activeTab]);

  // Manejo de búsqueda diferida en movimientos
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadMovements(selectedDate, 1, search, typeFilter);
  };

  const handleTypeFilterChange = (newType: string) => {
    setTypeFilter(newType);
    setPage(1);
    loadMovements(selectedDate, 1, search, newType);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      loadMovements(selectedDate, newPage, search, typeFilter);
    }
  };

  const handleBatchPageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= batchTotalPages) {
      setBatchPage(newPage);
      loadBatches(newPage);
    }
  };

  // Disparar dispersión manual del día
  const handleConfirmTrigger = async () => {
    try {
      setIsTriggering(true);
      setError(null);
      const res = await dailyYieldsService.triggerDailyDispersal();
      setSuccess(res.message || 'Dispersión de rendimientos ejecutada exitosamente.');
      setIsTriggerModalOpen(false);
      // Recargar datos
      loadSummary(selectedDate);
      loadMovements(selectedDate, 1, search, typeFilter);
      if (activeTab === 'batches') loadBatches(1);
      setTimeout(() => setSuccess(null), 6000);
    } catch (err: any) {
      setError(err?.message || 'Error al ejecutar la dispersión de rendimientos.');
    } finally {
      setIsTriggering(false);
    }
  };

  // Exportar CSV
  const handleExportCsv = () => {
    const url = dailyYieldsService.getExportCsvUrl({
      date: selectedDate,
      type: typeFilter || undefined
    });
    window.open(url, '_blank');
  };

  const isToday = selectedDate === getColombiaToday();

  return (
    <div className="space-y-6">
      {/* 🧭 ENCABEZADO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight font-montserrat flex items-center gap-2.5">
            <span className="p-2 bg-brand-50 text-brand-600 border border-brand-200 rounded-2xl inline-flex">
              <Coins className="w-6 h-6" />
            </span>
            Seguimiento de Rendimientos Diarios
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitoreo en tiempo real de dispersiones diarias automáticas, lotes y pagos acreditados a wallets
          </p>
        </div>

        {/* Acciones principales */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              loadSummary(selectedDate);
              if (activeTab === 'movements') loadMovements(selectedDate, page, search, typeFilter);
              if (activeTab === 'batches') loadBatches(batchPage);
            }}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-2xl font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-4 h-4 ${isSummaryLoading || isMovementsLoading ? 'animate-spin text-brand-600' : ''}`} />
            <span className="hidden sm:inline">Refrescar</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Exportar CSV</span>
          </button>

          <Can permission="admin.audits.manage">
            <button
              onClick={() => setIsTriggerModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-amber-600 hover:from-brand-700 hover:to-amber-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-brand-500/20 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Ejecutar Dispersión de Hoy</span>
            </button>
          </Can>
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 text-rose-500 hover:text-rose-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="p-1 text-emerald-500 hover:text-emerald-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 📅 BARRA DE SELECCIÓN DE FECHA & RELOJ */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-montserrat flex items-center gap-1.5 mr-1">
            <CalendarIcon className="w-3.5 h-3.5 text-brand-600" />
            Fecha a consultar:
          </span>

          <button
            onClick={() => setSelectedDate(getColombiaToday())}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedDate === getColombiaToday()
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Hoy ({getColombiaToday()})
          </button>

          <button
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - 1);
              const yesterdayStr = d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
              setSelectedDate(yesterdayStr);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedDate !== getColombiaToday() && selectedDate.startsWith('202')
                ? 'bg-brand-50 text-brand-700 border border-brand-200'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Ayer
          </button>

          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-400 font-semibold">Personalizada:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Indicador de Hora Colombia */}
        <div className="flex items-center gap-2 text-xs text-slate-500 self-end md:self-auto bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-100">
          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>Hora Oficial Colombia:</span>
          <span className="font-mono font-bold text-slate-800">
            {summary?.worker_status?.current_colombia_time || 'Calculando...'}
          </span>
        </div>
      </div>

      {/* 📊 KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Estado del Día */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-brand-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-montserrat">
              Estado de Liquidación
            </span>
            <span className="p-2 bg-slate-50 text-slate-600 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            {summary?.is_executed ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-extrabold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Liquidado con Éxito
                </span>
              </div>
            ) : isToday ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-extrabold">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Pendiente de Dispersión
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-full text-xs font-bold">
                  Sin Registro
                </span>
              </div>
            )}
            <p className="text-[11px] text-slate-500 mt-2">
              {summary?.target_batch?.batch_id
                ? `Lote: ${summary.target_batch.batch_id.slice(0, 28)}...`
                : isToday
                ? 'El worker automático liquidará a las 00:00 COT'
                : 'No se encontraron lotes para esta fecha'}
            </p>
          </div>
        </div>

        {/* Card 2: Monto Total Dispersado */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-brand-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-montserrat">
              Total Dispersado ({selectedDate})
            </span>
            <span className="p-2 bg-brand-50 text-brand-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl lg:text-2xl font-black text-slate-900 font-montserrat">
              {formatCurrency(summary?.total_dispersed || 0)}
            </div>
            <div className="flex items-center gap-2 text-[10.5px] text-slate-500 mt-1.5">
              <span className="text-emerald-600 font-bold">
                Rend: {formatCurrency(summary?.total_yields || 0)}
              </span>
              <span>•</span>
              <span className="text-amber-600 font-bold">
                Bonos: {formatCurrency(summary?.total_bonuses || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Usuarios / Inversiones Beneficiadas */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-brand-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-montserrat">
              Beneficiarios Acreditados
            </span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 font-montserrat">
              {summary?.total_users || 0}
              <span className="text-xs font-semibold text-slate-400 ml-1.5">inversionistas</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              En {summary?.total_movements || 0} transferencias a billeteras
            </p>
          </div>
        </div>

        {/* Card 4: Worker en Segundo Plano */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-brand-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-montserrat">
              Worker Automático
            </span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Cpu className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-flex" />
              <span>Activo y Protegido</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Latido continuo cada 60s en America/Bogota (UTC-5) con idempotencia blindada O(1)
            </p>
          </div>
        </div>
      </div>

      {/* 🧭 TABS DE NAVEGACIÓN */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab('movements')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'movements'
              ? 'border-brand-600 text-brand-600 bg-brand-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Movimientos a Wallets ({totalRecords})</span>
        </button>

        <button
          onClick={() => setActiveTab('batches')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'batches'
              ? 'border-brand-600 text-brand-600 bg-brand-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Historial de Lotes Diarios</span>
        </button>

        <button
          onClick={() => setActiveTab('worker')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'worker'
              ? 'border-brand-600 text-brand-600 bg-brand-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Worker & Monitoreo del Motor</span>
        </button>
      </div>

      {/* 📋 CONTENIDO TAB 1: MOVIMIENTOS A WALLETS */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          {/* Barra de Filtros y Búsqueda */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por usuario, cédula, correo o código..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer"
              >
                Buscar
              </button>
            </form>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-2xl border border-slate-200 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[11px] text-slate-400 font-semibold">Tipo:</span>
                <select
                  value={typeFilter}
                  onChange={(e) => handleTypeFilterChange(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="">Todos los tipos</option>
                  <option value="rendimiento_inversion">Rendimiento Ordinario</option>
                  <option value="bono_aceleracion">Bono de Aceleración</option>
                  <option value="reverso_rendimiento">Reverso</option>
                </select>
              </div>

              {totalAmountSum > 0 && (
                <div className="px-3 py-1.5 bg-brand-50 border border-brand-200 rounded-2xl text-xs font-extrabold text-brand-700">
                  Total Filtrado: {formatCurrency(totalAmountSum)}
                </div>
              )}
            </div>
          </div>

          {/* Tabla de Movimientos */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-montserrat text-[10.5px] font-extrabold tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Beneficiario / Usuario</th>
                    <th className="py-3.5 px-4">Inversión / Paquete</th>
                    <th className="py-3.5 px-4">Concepto</th>
                    <th className="py-3.5 px-4 text-right">Monto Pagado</th>
                    <th className="py-3.5 px-4 text-right">Saldo Billetera</th>
                    <th className="py-3.5 px-4">Hora (COT)</th>
                    <th className="py-3.5 px-4 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isMovementsLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-600 mb-2" />
                        <span>Cargando movimientos a wallets...</span>
                      </td>
                    </tr>
                  ) : movements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <div className="p-3 bg-slate-50 rounded-2xl w-fit mx-auto mb-2 text-slate-400">
                          <Coins className="w-6 h-6" />
                        </div>
                        <p className="font-bold text-slate-700 text-xs">No se encontraron movimientos registrados</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Para la fecha {selectedDate} aún no se han registrado dispersiones o no coinciden con los filtros.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    movements.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Usuario */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 font-bold flex items-center justify-center shrink-0 border border-brand-200 text-xs">
                              {m.user_name ? m.user_name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{m.user_name}</div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                                <span>CC: {m.document_id || 'N/A'}</span>
                                {m.user_email && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate max-w-[120px]">{m.user_email}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Inversión */}
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-slate-800">{m.assigned_code}</div>
                          <div className="text-[11px] text-slate-400">{m.package_name}</div>
                        </td>

                        {/* Concepto / Tipo */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-bold ${
                              m.type === 'bono_aceleracion'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : m.type === 'reverso_rendimiento'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {m.type_label}
                          </span>
                          {m.message && (
                            <p className="text-[10px] text-slate-400 truncate max-w-[200px] mt-0.5" title={m.message}>
                              {m.message}
                            </p>
                          )}
                        </td>

                        {/* Monto Pagado */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="font-mono font-black text-slate-900 text-xs">
                            {formatCurrency(m.amount)}
                          </div>
                        </td>

                        {/* Saldo Posterior */}
                        <td className="py-3.5 px-4 text-right">
                          {m.balance_after !== null && m.balance_after !== undefined ? (
                            <div>
                              <div className="font-mono font-bold text-slate-700">
                                {formatCurrency(m.balance_after)}
                              </div>
                              {m.balance_before !== null && m.balance_before !== undefined && (
                                <div className="text-[10px] text-slate-400">
                                  Antes: {formatCurrency(m.balance_before)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono">--</span>
                          )}
                        </td>

                        {/* Hora */}
                        <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          {m.created_at_cot || (m.created_at ? m.created_at.split('T')[1].slice(0, 8) : 'N/A')}
                        </td>

                        {/* Estado */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-extrabold ${
                              m.status === 'COMPLETED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : m.status === 'REVERSED'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                m.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                            />
                            {m.status === 'COMPLETED' ? 'Acreditado' : m.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Mostrando página <strong className="text-slate-800">{page}</strong> de{' '}
                  <strong className="text-slate-800">{totalPages}</strong> ({totalRecords} registros en total)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-slate-700 px-2">{page}</span>
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 📦 CONTENIDO TAB 2: HISTORIAL DE LOTES DIARIOS */}
      {activeTab === 'batches' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-montserrat text-[10.5px] font-extrabold tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Identificador de Lote</th>
                    <th className="py-3.5 px-4">Ciclo de Liquidación</th>
                    <th className="py-3.5 px-4">Tipo Ejecución</th>
                    <th className="py-3.5 px-4 text-center">Inversionistas</th>
                    <th className="py-3.5 px-4 text-center">Transferencias</th>
                    <th className="py-3.5 px-4 text-right">Total Dispersado</th>
                    <th className="py-3.5 px-4">Hora Ejecución (COT)</th>
                    <th className="py-3.5 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isBatchesLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-600 mb-2" />
                        <span>Cargando lotes históricos...</span>
                      </td>
                    </tr>
                  ) : batches.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <p className="font-bold text-slate-700 text-xs">No hay lotes registrados</p>
                      </td>
                    </tr>
                  ) : (
                    batches.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-slate-900 truncate max-w-[220px]" title={b.batch_id}>
                            {b.batch_id}
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-extrabold mt-0.5 ${
                              b.status === 'SUCCESS' ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {b.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700">
                          {b.cycle_start_date} → {b.cycle_end_date}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-bold ${
                              b.is_automatic
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-brand-50 text-brand-700 border border-brand-200'
                            }`}
                          >
                            {b.action_label}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                          {b.total_users_paid}
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                          {b.total_transfers_count}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900">
                          {formatCurrency(b.global_grand_total)}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {b.executed_at_cot || b.created_at?.slice(0, 19).replace('T', ' ')}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setSelectedBatchDetails(b)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-[11px] transition-colors cursor-pointer"
                          >
                            Ver Resumen
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación de Lotes */}
            {batchTotalPages > 1 && (
              <div className="p-4 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Mostrando página <strong className="text-slate-800">{batchPage}</strong> de{' '}
                  <strong className="text-slate-800">{batchTotalPages}</strong> ({batchTotalRecords} lotes)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleBatchPageChange(batchPage - 1)}
                    disabled={batchPage <= 1}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-slate-700 px-2">{batchPage}</span>
                  <button
                    onClick={() => handleBatchPageChange(batchPage + 1)}
                    disabled={batchPage >= batchTotalPages}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ⚙️ CONTENIDO TAB 3: WORKER & MONITOREO DEL MOTOR */}
      {activeTab === 'worker' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-base font-black text-slate-900 font-montserrat flex items-center gap-2">
              <Cpu className="w-5 h-5 text-brand-600" />
              Estado del Motor de Dispersión Automática
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              El motor de rendimientos se ejecuta de forma asíncrona dentro del servidor FastAPI principal mediante
              un worker continuo que audita la hora oficial de Colombia (UTC-5) y procesa los pagos a la medianoche.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-xs text-slate-600 font-semibold">Frecuencia de monitoreo:</span>
                <span className="text-xs font-bold text-slate-900">Latido cada 60 segundos</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-xs text-slate-600 font-semibold">Zona Horaria Oficial:</span>
                <span className="text-xs font-bold text-slate-900">America/Bogota (UTC-5)</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-xs text-slate-600 font-semibold">Hora Programada de Dispersión:</span>
                <span className="text-xs font-bold text-slate-900">00:00:xx COT (Medianoche diaria)</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-xs text-slate-600 font-semibold">Mecanismo de Tolerancia a Fallos:</span>
                <span className="text-xs font-bold text-emerald-700">Catch-up Automático al Reiniciar</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-base font-black text-slate-900 font-montserrat flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Blindaje de Idempotencia & Seguridad Contable
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Cada dispersión está protegida a nivel de base de datos contra dobles pagos. Si el proceso se interrumpe
              o se dispara manualmente en paralelo, el sistema verifica las transacciones existentes en tiempo O(1)
              y omite los contratos ya acreditados.
            </p>

            <div className="space-y-3 pt-2">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900">
                <span className="font-extrabold block mb-1">Protección estricta de Idempotencia O(1):</span>
                Comprueba existencia previa de WalletTransaction por inversión y descripción antes de alterar saldos.
              </div>

              <div className="p-3 bg-brand-50 border border-brand-200 rounded-2xl text-xs text-brand-900">
                <span className="font-extrabold block mb-1">Pista Forense Completa:</span>
                Registra lote en <code>auto_transfer_logs</code> y pistas de auditoría inmutables en <code>audit_logs</code>.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ MODAL DE CONFIRMACIÓN PARA EJECUTAR DISPERSIÓN MANUAL */}
      <ConfirmationModal
        isOpen={isTriggerModalOpen}
        onClose={() => setIsTriggerModalOpen(false)}
        onConfirm={handleConfirmTrigger}
        title="¿Ejecutar Dispersión de Rendimientos de Hoy?"
        variant="warning"
        confirmText={isTriggering ? 'Dispersando...' : 'Sí, Ejecutar Ahora'}
        isLoading={isTriggering}
        description={
          <div className="space-y-2 text-xs text-slate-600">
            <p>
              Estás a punto de disparar el proceso masivo de acreditación de rendimientos para el ciclo de hoy (ayer → hoy).
            </p>
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 font-semibold">
              🔒 <strong>Garantía de Idempotencia:</strong> Si algún contrato ya recibió el pago de este ciclo, será omitido automáticamente sin duplicar saldos en las wallets.
            </div>
          </div>
        }
      />

      {/* 🔍 MODAL DETALLE DE LOTE */}
      {selectedBatchDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand-50 text-brand-600 rounded-2xl">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 font-montserrat text-sm">Detalles del Lote de Dispersión</h3>
                  <p className="text-[11px] text-slate-400 font-mono">{selectedBatchDetails.batch_id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBatchDetails(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400">Ciclo liquidado:</span>
                <span className="font-bold text-slate-800">
                  {selectedBatchDetails.cycle_start_date} al {selectedBatchDetails.cycle_end_date}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400">Tipo de ejecución:</span>
                <span className="font-bold text-slate-800">{selectedBatchDetails.action_label}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400">Hora de ejecución (COT):</span>
                <span className="font-mono text-slate-800">{selectedBatchDetails.executed_at_cot || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400">Inversionistas beneficiados:</span>
                <span className="font-bold text-slate-800">{selectedBatchDetails.total_users_paid} usuarios</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400">Transferencias realizadas:</span>
                <span className="font-bold text-slate-800">{selectedBatchDetails.total_transfers_count} pagos</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400">Omitidas por idempotencia:</span>
                <span className="font-bold text-slate-800">{selectedBatchDetails.skipped_count} contratos</span>
              </div>
              <div className="flex justify-between py-2 bg-slate-50 px-3 rounded-2xl font-black text-slate-900 text-sm">
                <span>Gran Total Dispersado:</span>
                <span className="text-brand-600 font-mono">
                  {formatCurrency(selectedBatchDetails.global_grand_total)}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedBatchDetails(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default DailyYieldsPage;
