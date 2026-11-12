import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Banknote,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  RefreshCw,
  Search,
  UserCheck,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import {
  incomeReportService,
  IncomeBucket,
  IncomeReportResponse,
  IncomeSource,
} from '../../../../services/incomeReport';
import { formatApiDate, formatApiDateTime, formatCurrency, getColombiaToday } from '../../../../utils/format';
import { Can } from '../../../../components/security/Can';

const PAGE_SIZE = 20;

/** Día calendario Colombia desplazado N días respecto a hoy, en formato YYYY-MM-DD. */
const colombiaDayOffset = (days: number): string => {
  const [y, m, d] = getColombiaToday().split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
};

const firstDayOfMonth = (): string => `${getColombiaToday().slice(0, 7)}-01`;

type Preset = { key: string; label: string; range: () => [string, string] };

const PRESETS: Preset[] = [
  { key: 'today', label: 'Hoy', range: () => [getColombiaToday(), getColombiaToday()] },
  { key: 'yesterday', label: 'Ayer', range: () => [colombiaDayOffset(-1), colombiaDayOffset(-1)] },
  { key: 'last7', label: 'Últimos 7 días', range: () => [colombiaDayOffset(-6), getColombiaToday()] },
  { key: 'month', label: 'Este mes', range: () => [firstDayOfMonth(), getColombiaToday()] },
];

const SOURCE_TABS: { value: IncomeSource | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'automatic', label: 'Automáticos (Yoint)' },
  { value: 'manual', label: 'Manuales (administrador)' },
];

const SourceBadge: React.FC<{ source: IncomeSource }> = ({ source }) =>
  source === 'automatic' ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10.5px] font-extrabold whitespace-nowrap">
      <Zap className="w-3 h-3" />
      Automática
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-50 text-brand-700 border border-brand-200 rounded-full text-[10.5px] font-extrabold whitespace-nowrap">
      <UserCheck className="w-3 h-3" />
      Manual
    </span>
  );

const EMPTY_BUCKET: IncomeBucket = { count: 0, amount: 0, wallet_used: 0, external_amount: 0 };

export const IncomeReportPage: React.FC = () => {
  const [startDate, setStartDate] = useState(getColombiaToday());
  const [endDate, setEndDate] = useState(getColombiaToday());
  const [source, setSource] = useState<IncomeSource | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [report, setReport] = useState<IncomeReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await incomeReportService.getReport({
        startDate,
        endDate,
        source,
        search,
        page,
        pageSize: PAGE_SIZE,
      });
      setReport(data);
    } catch (err: any) {
      setError(err?.message || 'No se pudo cargar el informe de ingresos. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, source, search, page]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // La búsqueda se aplica al dejar de escribir, no en cada tecla
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const applyRange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setPage(1);
  };

  const handleStartChange = (value: string) => {
    if (!value) return;
    applyRange(value, value > endDate ? value : endDate);
  };

  const handleEndChange = (value: string) => {
    if (!value) return;
    applyRange(value < startDate ? value : startDate, value);
  };

  const handleExportCsv = () => {
    window.open(incomeReportService.getExportCsvUrl({ startDate, endDate, source, search }), '_blank');
  };

  const activePreset = PRESETS.find((p) => {
    const [s, e] = p.range();
    return s === startDate && e === endDate;
  })?.key;

  const isSingleDay = startDate === endDate;
  const rangeLabel = isSingleDay
    ? formatApiDate(startDate, { day: '2-digit', month: 'long', year: 'numeric' })
    : `${formatApiDate(startDate)} al ${formatApiDate(endDate)}`;

  const total = report?.summary.total ?? EMPTY_BUCKET;
  const automatic = report?.summary.automatic ?? EMPTY_BUCKET;
  const manual = report?.summary.manual ?? EMPTY_BUCKET;
  const automaticShare = total.amount > 0 ? (automatic.amount / total.amount) * 100 : 0;
  const manualShare = total.amount > 0 ? 100 - automaticShare : 0;

  const days = report?.by_day ?? [];
  const maxDayAmount = Math.max(...days.map((d) => d.total_amount), 0);
  const items = report?.items ?? [];
  const totalPages = report?.total_pages ?? 1;

  return (
    <div className="space-y-6">
      {/* ENCABEZADO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight font-montserrat flex items-center gap-2.5">
            <span className="p-2 bg-brand-50 text-brand-600 border border-brand-200 rounded-2xl inline-flex">
              <Banknote className="w-6 h-6" />
            </span>
            Informe de Ingresos
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Dinero que entró por paquetes aprobados, separado entre pagos confirmados por Yoint y pagos validados por un administrador
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={loadReport}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-2xl font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            title="Refrescar informe"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-600' : ''}`} />
            <span className="hidden sm:inline">Refrescar</span>
          </button>

          <Can permission="admin.income_report.export">
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Exportar CSV</span>
            </button>
          </Can>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 text-rose-500 hover:text-rose-700" aria-label="Cerrar aviso">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* FILTRO DE FECHAS */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-montserrat flex items-center gap-1.5 mr-1">
            <CalendarIcon className="w-3.5 h-3.5 text-brand-600" />
            Periodo:
          </span>
          {PRESETS.map((preset) => (
            <button
              key={preset.key}
              onClick={() => applyRange(...preset.range())}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activePreset === preset.key
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-400 font-semibold">Desde:</span>
            <input
              type="date"
              value={startDate}
              max={getColombiaToday()}
              onChange={(e) => handleStartChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            />
          </label>
          <label className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-400 font-semibold">Hasta:</span>
            <input
              type="date"
              value={endDate}
              max={getColombiaToday()}
              onChange={(e) => handleEndChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-brand-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-montserrat">Ingreso total</span>
            <span className="p-2 bg-slate-50 text-slate-600 rounded-xl">
              <Banknote className="w-4 h-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 font-montserrat tabular-nums">{formatCurrency(total.amount)}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {total.count} {total.count === 1 ? 'paquete aprobado' : 'paquetes aprobados'} · {rangeLabel}
          </p>
          {total.wallet_used > 0 && (
            <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-slate-400" />
              {formatCurrency(total.wallet_used)} se pagó con saldo de billetera
            </p>
          )}
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-montserrat">Automáticos · Yoint</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Zap className="w-4 h-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 font-montserrat tabular-nums">{formatCurrency(automatic.amount)}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {automatic.count} {automatic.count === 1 ? 'paquete' : 'paquetes'} · {automaticShare.toFixed(1)}% del ingreso
          </p>
          <p className="text-[11px] text-slate-400 mt-2">Pago en línea confirmado por la pasarela, sin intervención manual</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-brand-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-montserrat">Manuales · Administrador</span>
            <span className="p-2 bg-brand-50 text-brand-600 rounded-xl">
              <UserCheck className="w-4 h-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 font-montserrat tabular-nums">{formatCurrency(manual.amount)}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {manual.count} {manual.count === 1 ? 'paquete' : 'paquetes'} · {manualShare.toFixed(1)}% del ingreso
          </p>
          <p className="text-[11px] text-slate-400 mt-2">Comprobante revisado y aprobado por un administrador</p>
        </div>
      </div>

      {/* INGRESO POR DÍA (solo en rangos) */}
      {!isSingleDay && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-sm font-extrabold text-slate-800 font-montserrat">Ingreso por día</h2>
            <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Automáticos
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-brand-400" /> Manuales
              </span>
            </div>
          </div>

          {maxDayAmount === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No hubo ingresos en este periodo.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto pr-1 space-y-1.5">
              {days.map((day) => (
                <div key={day.date} className="grid grid-cols-[84px_1fr_120px] items-center gap-3 text-xs">
                  <span className="text-slate-500 font-semibold tabular-nums">
                    {formatApiDate(day.date, { weekday: 'short', day: '2-digit', month: 'short' })}
                  </span>
                  <div
                    className="h-4 bg-slate-100 rounded-md overflow-hidden flex"
                    title={`Automáticos: ${formatCurrency(day.automatic_amount)} (${day.automatic_count}) · Manuales: ${formatCurrency(day.manual_amount)} (${day.manual_count})`}
                  >
                    <div className="h-full bg-emerald-500" style={{ width: `${(day.automatic_amount / maxDayAmount) * 100}%` }} />
                    <div className="h-full bg-brand-400" style={{ width: `${(day.manual_amount / maxDayAmount) * 100}%` }} />
                  </div>
                  <span className={`text-right font-bold tabular-nums ${day.total_amount > 0 ? 'text-slate-800' : 'text-slate-300'}`}>
                    {formatCurrency(day.total_amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FILTROS DEL DETALLE */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-montserrat flex items-center gap-1.5 mr-1">
            <Filter className="w-3.5 h-3.5 text-brand-600" />
            Aprobación:
          </span>
          {SOURCE_TABS.map((tab) => (
            <button
              key={tab.value || 'all'}
              onClick={() => {
                setSource(tab.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                source === tab.value ? 'bg-brand-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nombre, documento o referencia"
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-brand-400 focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* TABLA DE DETALLE */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-montserrat text-[10.5px] font-extrabold tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Aprobado (COT)</th>
                <th className="py-3.5 px-4">Inversionista</th>
                <th className="py-3.5 px-4">Concepto</th>
                <th className="py-3.5 px-4 text-right">Ingreso</th>
                <th className="py-3.5 px-4">Medio de pago</th>
                <th className="py-3.5 px-4">Aprobación</th>
                <th className="py-3.5 px-4">Aprobado por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-600 mb-2" />
                    <span>Cargando ingresos...</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="p-3 bg-slate-50 rounded-2xl w-fit mx-auto mb-2 text-slate-400">
                      <Banknote className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-slate-700 text-xs">No hay paquetes aprobados con estos filtros</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Prueba con otro periodo o quita el filtro de aprobación.</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className={`hover:bg-slate-50/60 transition-colors ${isLoading ? 'opacity-60' : ''}`}>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <p className="font-bold text-slate-800">{formatApiDateTime(item.approved_at)}</p>
                      <p className="text-[11px] text-slate-400">Solicitud #{item.id}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800">{item.investor_name || 'Sin nombre'}</p>
                      <p className="text-[11px] text-slate-400">{item.investor_document || item.investor_email || '—'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-700">{item.is_upgrade ? 'Aumento de capital' : 'Inversión nueva'}</p>
                      <p className="text-[11px] text-slate-400">
                        Paquete {formatCurrency(item.package_amount)}
                        {item.contract_id ? ` · Contrato #${item.contract_id}` : ''}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <p className="font-extrabold text-slate-900 tabular-nums">{formatCurrency(item.income_amount)}</p>
                      {item.wallet_used > 0 && (
                        <p className="text-[11px] text-slate-400 tabular-nums">{formatCurrency(item.wallet_used)} con billetera</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-700">{item.payment_method}</p>
                      {item.reference && <p className="text-[11px] text-slate-400 font-mono">{item.reference}</p>}
                    </td>
                    <td className="py-3 px-4">
                      <SourceBadge source={item.source} />
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-semibold">{item.approved_by || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {(report?.total ?? 0) > 0 && (
          <div className="p-4 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
            <span>
              <strong className="text-slate-800">{report?.total}</strong> {report?.total === 1 ? 'registro' : 'registros'} ·{' '}
              <strong className="text-slate-800 tabular-nums">{formatCurrency(report?.filtered_amount ?? 0)}</strong> en el detalle
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page <= 1}
                  aria-label="Página anterior"
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-bold text-slate-700 px-2">
                  {page} de {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages}
                  aria-label="Página siguiente"
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
