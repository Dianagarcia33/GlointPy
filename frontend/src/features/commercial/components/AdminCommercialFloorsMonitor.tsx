import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Award, Trophy, Users, DollarSign, TrendingUp, Search, Filter, ShieldCheck, Zap, Layers, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { commercialService, CommercialFloorsMonitoringResponse, CommercialFloorMonitoringItem } from '../../../services/commercial';

const FLOOR_LEVELS = [
  { level: 1, label: 'Piso 1', target: 18000000, bonus: 360000, color: 'from-amber-500 to-amber-600' },
  { level: 2, label: 'Piso 2', target: 36000000, bonus: 720000, color: 'from-emerald-500 to-emerald-600' },
  { level: 3, label: 'Piso 3', target: 54000000, bonus: 1080000, color: 'from-cyan-500 to-blue-600' },
  { level: 4, label: 'Piso 4', target: 79000000, bonus: 1422000, color: 'from-blue-600 to-indigo-600' },
  { level: 5, label: 'Piso 5', target: 100000000, bonus: 1800000, color: 'from-indigo-600 to-purple-600' },
  { level: 6, label: 'Piso 6', target: 140000000, bonus: 2520000, color: 'from-purple-600 to-pink-600' },
  { level: 7, label: 'Piso 7', target: 170000000, bonus: 3060000, color: 'from-pink-600 to-rose-600' },
  { level: 8, label: 'Piso 8', target: 200000000, bonus: 3600000, color: 'from-rose-600 to-red-600' },
];

export const AdminCommercialFloorsMonitor: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'achieved' | 'in_progress' | 'no_sales'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const { data, isLoading, refetch } = useQuery<CommercialFloorsMonitoringResponse>({
    queryKey: ['commercial_floors_monitoring'],
    queryFn: () => commercialService.getFloorsMonitoring()
  });

  const summary = data?.summary;
  const items = data?.items || [];

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.commercial_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.document_id && item.document_id.includes(searchTerm));

    if (!matchesSearch) return false;

    if (statusFilter === 'achieved') return item.current_floor !== null && item.current_floor !== undefined;
    if (statusFilter === 'in_progress') return (item.current_floor === null || item.current_floor === undefined) && item.monthly_volume > 0;
    if (statusFilter === 'no_sales') return item.monthly_volume === 0;

    return true;
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-slate-100 rounded-3xl"></div>
          ))}
        </div>
        <div className="h-64 bg-slate-50 rounded-3xl border border-slate-200"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0">
      
      {/* Cards de Resumen KPI Ejecutivo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Facturación Total del Equipo */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md space-y-2 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
            Facturación Equipo (Mes)
          </span>
          <span className="text-2xl font-extrabold text-white block tracking-tight font-montserrat">
            ${(summary?.total_monthly_volume || 0).toLocaleString('es-CO')} COP
          </span>
          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            Consolidado global de directivos
          </span>
        </div>

        {/* Card 2: Directivos con Piso Alcanzado */}
        <div className="bg-emerald-50/90 border border-emerald-200 rounded-3xl p-6 shadow-xs space-y-2">
          <span className="text-xs text-emerald-800 font-bold uppercase tracking-wider block font-montserrat">
            Directivos en Piso
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-700 block tracking-tight font-montserrat">
              {summary?.directivos_con_piso || 0} / {summary?.total_directivos || 0}
            </span>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded-full font-mono">
              {summary?.total_directivos ? Math.round((summary.directivos_con_piso / summary.total_directivos) * 100) : 0}%
            </span>
          </div>
          <span className="text-[11px] text-emerald-700 font-medium">Han superado al menos Piso 1 ($18M)</span>
        </div>

        {/* Card 3: Bonos por Piso Proyectados */}
        <div className="bg-amber-50/80 border border-amber-200 rounded-3xl p-6 shadow-xs space-y-2">
          <span className="text-xs text-amber-900 font-bold uppercase tracking-wider block font-montserrat">
            Bonos por Piso Proyectados
          </span>
          <span className="text-2xl font-extrabold text-amber-900 block tracking-tight font-montserrat">
            ${(summary?.projected_floor_bonuses_total || 0).toLocaleString('es-CO')} COP
          </span>
          <span className="text-[11px] text-amber-800 font-medium">Incentivos mensuales a desembolsar</span>
        </div>

        {/* Card 4: Promedio por Directivo */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-2">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
            Promedio por Directivo
          </span>
          <span className="text-2xl font-extrabold text-brand-700 block tracking-tight font-montserrat">
            ${(summary?.average_volume_per_directivo || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })} COP
          </span>
          <span className="text-[11px] text-slate-500 font-medium">Volumen medio del equipo activo</span>
        </div>
      </div>

      {/* Escala de Pisos Informativa (Badge Bar) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-montserrat">
              Escala de Metas por Pisos Mensuales
            </h4>
          </div>
          <span className="text-[11px] font-medium text-slate-400">
            Suma producción absoluta (Contratos + Reinversiones + Referidos)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {FLOOR_LEVELS.map(f => (
            <div key={f.level} className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5 text-center space-y-0.5 hover:border-slate-300 transition-colors">
              <span className="text-[11px] font-bold text-slate-900 block font-montserrat">{f.label}</span>
              <span className="text-[10px] text-slate-500 font-mono block">${(f.target / 1000000).toFixed(0)}M COP</span>
              <span className="text-[10px] font-bold text-emerald-600 font-mono block">+${(f.bonus / 1000).toFixed(0)}k</span>
            </div>
          ))}
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Buscador */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o cédula..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium"
          />
        </div>

        {/* Filtros de Estado */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Todos ({items.length})
            </button>
            <button
              onClick={() => setStatusFilter('achieved')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'achieved' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              En Piso ({items.filter(i => i.current_floor !== null).length})
            </button>
            <button
              onClick={() => setStatusFilter('in_progress')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'in_progress' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              En Progreso
            </button>
            <button
              onClick={() => setStatusFilter('no_sales')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'no_sales' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sin Ventas
            </button>
          </div>

          {/* Toggle Vista Grid / Table */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
              title="Vista en Tarjetas"
            >
              <Layers className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
              title="Vista en Tabla Auditoría"
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* RESULTADOS EN VISTA GRID */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => {
            const hasFloor = item.current_floor !== null && item.current_floor !== undefined;
            const nextFloor = item.next_floor;

            return (
              <div
                key={item.commercial_id}
                className={`bg-white rounded-3xl border transition-all p-6 shadow-xs flex flex-col justify-between space-y-4 ${
                  hasFloor 
                    ? 'border-emerald-200 hover:border-emerald-400 hover:shadow-md' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Header Directivo */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="font-extrabold text-slate-900 text-sm truncate font-montserrat">
                        {item.commercial_name}
                      </h4>
                      <p className="text-xs text-slate-400 truncate">{item.email}</p>
                    </div>

                    {/* Badge de Piso Actual */}
                    {hasFloor ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm font-montserrat shrink-0">
                        <Trophy className="w-3.5 h-3.5 text-amber-300" />
                        {item.current_floor?.label}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 font-montserrat shrink-0">
                        Sin Piso ($0-$18M)
                      </span>
                    )}
                  </div>

                  {/* Facturación y Bono Actual */}
                  <div className="bg-slate-50 rounded-2xl p-3.5 flex items-center justify-between gap-2 border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
                        Facturación Mes
                      </span>
                      <span className="text-lg font-extrabold text-slate-900 font-mono">
                        ${item.monthly_volume.toLocaleString('es-CO')}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
                        Bono por Piso
                      </span>
                      {hasFloor ? (
                        <span className="text-base font-extrabold text-emerald-600 font-mono">
                          +${item.current_floor?.bonus_amount.toLocaleString('es-CO')}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-400 font-mono">$0 COP</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Seccion de Progreso al Proximo Piso */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  {nextFloor ? (
                    <>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-semibold flex items-center gap-1 font-montserrat">
                          <Award className="w-3.5 h-3.5 text-indigo-600" />
                          Próximo: <strong className="text-indigo-700">{nextFloor.label} ({`$${(nextFloor.target / 1000000).toFixed(0)}M`})</strong>
                        </span>
                        <span className="text-indigo-600 font-bold font-mono">
                          {item.progress_percent}%
                        </span>
                      </div>

                      {/* Bar */}
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${item.progress_percent}%` }}
                        />
                      </div>

                      <div className="text-[11px] text-slate-500 font-medium">
                        Faltan <strong className="text-indigo-600 font-mono">${item.amount_needed_next_floor.toLocaleString('es-CO')}</strong> para desbloquear <strong className="text-emerald-600 font-mono">+${nextFloor.bonus_amount.toLocaleString('es-CO')}</strong>.
                      </div>
                    </>
                  ) : (
                    <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-1">
                      <div className="text-xs font-bold text-emerald-900 flex items-center justify-center gap-1 font-montserrat">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ¡Piso Máximo Alcanzado (Piso 8)!
                      </div>
                      <p className="text-[10px] text-emerald-700 font-medium">
                        Facturación superior a $200M COP. Bono otorgado de +$3.600.000 COP.
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer Cierres */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  <span>Cierres Mes: <strong className="text-slate-800 font-mono">{item.monthly_closures}</strong></span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    item.today_closures >= 5 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    Hoy: {item.today_closures}/5 Cierres
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RESULTADOS EN VISTA TABLA AUDITORIA */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Directivo / Asesor</th>
                  <th className="py-3 px-4 text-right">Facturación Mes ($)</th>
                  <th className="py-3 px-4 text-center">Piso Alcanzado</th>
                  <th className="py-3 px-4 text-right">Bono Proyectado ($)</th>
                  <th className="py-3 px-4 text-center">Progreso al Sig. Piso</th>
                  <th className="py-3 px-4 text-right">Monto Faltante ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredItems.map(item => {
                  const hasFloor = item.current_floor !== null && item.current_floor !== undefined;
                  return (
                    <tr key={item.commercial_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        <div>{item.commercial_name}</div>
                        <div className="text-[10px] font-normal text-slate-400">{item.email}</div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        ${item.monthly_volume.toLocaleString('es-CO')}
                      </td>

                      <td className="py-3.5 px-4 text-center font-montserrat">
                        {hasFloor ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <Trophy className="w-3 h-3 text-amber-500" />
                            {item.current_floor?.label}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Sin piso</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        {hasFloor ? (
                          <span className="text-emerald-600">+${item.current_floor?.bonus_amount.toLocaleString('es-CO')}</span>
                        ) : (
                          <span className="text-slate-400">$0</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${item.progress_percent}%` }} />
                          </div>
                          <span className="text-[10px] font-bold font-mono text-indigo-600">{item.progress_percent}%</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-700">
                        {item.next_floor ? `$${item.amount_needed_next_floor.toLocaleString('es-CO')}` : 'Alcanzado Máximo'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredItems.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
          <h4 className="font-bold text-slate-700 text-sm">No se encontraron directivos</h4>
          <p className="text-xs text-slate-400">Intenta cambiar los términos de búsqueda o ajustar el filtro de estado.</p>
        </div>
      )}
    </div>
  );
};
