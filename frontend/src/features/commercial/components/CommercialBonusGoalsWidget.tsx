import React from 'react';
import { Award, Zap, ShieldCheck, TrendingUp, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { CommercialSummary } from '../../../services/commercial';

interface CommercialBonusGoalsWidgetProps {
  summary?: CommercialSummary;
  dailyClosuresCount?: number;
}

const FLOOR_TIERS = [
  { target: 18000000, bonus: 360000, label: 'Piso 1' },
  { target: 36000000, bonus: 720000, label: 'Piso 2' },
  { target: 54000000, bonus: 1080000, label: 'Piso 3' },
  { target: 79000000, bonus: 1422000, label: 'Piso 4' },
  { target: 100000000, bonus: 1800000, label: 'Piso 5' },
  { target: 140000000, bonus: 2520000, label: 'Piso 6' },
  { target: 170000000, bonus: 3060000, label: 'Piso 7' },
  { target: 200000000, bonus: 3600000, label: 'Piso 8' },
];

export const CommercialBonusGoalsWidget: React.FC<CommercialBonusGoalsWidgetProps> = ({
  summary,
  dailyClosuresCount = 0
}) => {
  const totalVolume = summary?.total_accumulated || 0;
  
  // Encontrar el siguiente piso de ventas alcanzable
  const nextFloor = FLOOR_TIERS.find(t => totalVolume < t.target) || FLOOR_TIERS[FLOOR_TIERS.length - 1];
  const prevFloorTarget = FLOOR_TIERS.filter(t => totalVolume >= t.target).pop()?.target || 0;
  const amountNeededForFloor = Math.max(0, nextFloor.target - totalVolume);

  // Porcentaje del piso actual
  const floorProgressPercent = Math.min(
    100,
    Math.round(((totalVolume - prevFloorTarget) / (nextFloor.target - prevFloorTarget)) * 100)
  );

  // Meta Diaria (5 cierres)
  const dailyTarget = 5;
  const isDailyGoalReached = dailyClosuresCount >= dailyTarget;
  const dailyProgressPercent = Math.min(100, Math.round((dailyClosuresCount / dailyTarget) * 100));

  return (
    <div className="space-y-4 w-full min-w-0">
      
      {/* Banner Destacado Alerta a 4 Cierres */}
      {dailyClosuresCount === 4 && (
        <div className="bg-amber-500 text-white rounded-3xl p-4 sm:p-5 shadow-lg flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-2xl shrink-0">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm sm:text-base font-montserrat">
                🔥 ¡Estás a 1 solo cierre de desbloquear el Bono por Meta Diaria!
              </h4>
              <p className="text-xs text-amber-100">
                Completa tu 5to cierre del día para ganar un +1.5% o +2.0% adicional sobre el total facturado en la jornada.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full min-w-0">
        
        {/* Card 1: Bono por Meta Diaria (5 cierres) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-montserrat">
                  Bono Meta Diaria (5 Cierres)
                </span>
              </div>
              {isDailyGoalReached && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="w-3 h-3" /> Ganado (+1.5%/+2%)
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Incentivo diario al alcanzar 5 cierres sin consanguinidad
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xl font-extrabold text-slate-900 font-mono">
                {dailyClosuresCount} / 5 Cierres
              </span>
              <span className="text-xs font-bold text-amber-600 font-mono">
                {dailyProgressPercent}%
              </span>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-amber-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${dailyProgressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Progreso a Pisos de Venta (Bono por Piso) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-montserrat">
                  Próximo Piso ({nextFloor.label})
                </span>
              </div>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full font-mono">
                +${nextFloor.bonus.toLocaleString('es-CO')} COP
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Bono nominal mensual al cerrar el mes en este escalón
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-baseline text-xs">
              <span className="text-slate-500 font-medium">Facturado: <strong className="text-slate-900 font-mono">${totalVolume.toLocaleString('es-CO')}</strong></span>
              <span className="text-indigo-600 font-bold font-mono">Meta: ${nextFloor.target.toLocaleString('es-CO')}</span>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${floorProgressPercent}%` }}
              />
            </div>

            <div className="text-[11px] text-slate-500 font-medium pt-0.5">
              Faltan <strong className="text-indigo-600 font-mono">${amountNeededForFloor.toLocaleString('es-CO')}</strong> para ganar el bono fijo de <strong className="text-emerald-600 font-mono">${nextFloor.bonus.toLocaleString('es-CO')}</strong>.
            </div>
          </div>
        </div>

        {/* Card 3: Termómetro de Consistencia Trimestral (Bono Bienestar) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-montserrat">
                  Bono Bienestar Trimestral
                </span>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-mono">
                $500.000 COP
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Termómetro de consistencia acumulada de 3 meses
            </p>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1 text-xs">
            <div className="flex justify-between font-medium">
              <span className="text-slate-600">Estado Trimestral:</span>
              <span className="font-bold text-emerald-600">Elegible ✨</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Sostener producción mensual por encima del umbral base para acreditar los $500.000.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
