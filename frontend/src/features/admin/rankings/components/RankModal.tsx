import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Trophy, 
  Crown, 
  Star, 
  Medal, 
  Gem, 
  Zap, 
  Sparkles, 
  Shield, 
  Plus, 
  Trash2, 
  Loader2, 
  DollarSign, 
  Percent, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { InvestmentRank, RankCreateInput, rankingsService } from '../../../../services/rankings';

interface RankModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  rank: InvestmentRank | null;
}

const AVAILABLE_ICONS = [
  { id: 'trophy', label: 'Trofeo', icon: Trophy },
  { id: 'crown', label: 'Corona', icon: Crown },
  { id: 'gem', label: 'Diamante', icon: Gem },
  { id: 'star', label: 'Estrella', icon: Star },
  { id: 'medal', label: 'Medalla', icon: Medal },
  { id: 'shield', label: 'Escudo', icon: Shield },
  { id: 'zap', label: 'Rayo', icon: Zap },
  { id: 'sparkles', label: 'Destello', icon: Sparkles },
];

const PRESET_COLORS = [
  { label: 'Bronce', value: '#CD7F32' },
  { label: 'Plata', value: '#94A3B8' },
  { label: 'Oro', value: '#EAB308' },
  { label: 'Platino', value: '#06B6D4' },
  { label: 'Diamante', value: '#8B5CF6' },
  { label: 'Esmeralda', value: '#10B981' },
  { label: 'Black VIP', value: '#0F172A' },
  { label: 'Rosa Rubí', value: '#EC4899' },
];

export const RankModal: React.FC<RankModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  rank
}) => {
  const [name, setName] = useState('');
  const [minInvestment, setMinInvestment] = useState<number>(0);
  const [maxInvestment, setMaxInvestment] = useState<string>('');
  const [bonusPercentage, setBonusPercentage] = useState<number>(0);
  const [color, setColor] = useState('#EAB308');
  const [icon, setIcon] = useState('trophy');
  const [priorityWithdrawal, setPriorityWithdrawal] = useState(false);
  const [benefits, setBenefits] = useState<string[]>([]);
  const [newBenefit, setNewBenefit] = useState('');
  const [order, setOrder] = useState<number>(1);
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (rank) {
      setName(rank.name);
      setMinInvestment(rank.min_investment || 0);
      setMaxInvestment(rank.max_investment !== null && rank.max_investment !== undefined ? String(rank.max_investment) : '');
      setBonusPercentage(rank.bonus_percentage || 0);
      setColor(rank.color || '#EAB308');
      setIcon(rank.icon || 'trophy');
      setPriorityWithdrawal(Boolean(rank.priority_withdrawal));
      setBenefits(Array.isArray(rank.benefits) ? [...rank.benefits] : []);
      setOrder(rank.order || 1);
      setIsActive(Boolean(rank.is_active));
    } else {
      setName('');
      setMinInvestment(0);
      setMaxInvestment('');
      setBonusPercentage(0);
      setColor('#EAB308');
      setIcon('trophy');
      setPriorityWithdrawal(false);
      setBenefits([
        'Acceso completo a la plataforma y billetera digital',
        'Rendimientos mensuales automáticos'
      ]);
      setOrder(1);
      setIsActive(true);
    }
    setError(null);
    setNewBenefit('');
  }, [rank, isOpen]);

  if (!isOpen) return null;

  const handleAddBenefit = () => {
    if (newBenefit.trim()) {
      setBenefits(prev => [...prev, newBenefit.trim()]);
      setNewBenefit('');
    }
  };

  const handleRemoveBenefit = (idx: number) => {
    setBenefits(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre del rango es requerido.');
      return;
    }
    if (minInvestment < 0) {
      setError('La inversión mínima no puede ser negativa.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload: RankCreateInput = {
        name: name.trim(),
        min_investment: Number(minInvestment),
        max_investment: maxInvestment.trim() ? Number(maxInvestment) : null,
        bonus_percentage: Number(bonusPercentage),
        color,
        icon,
        priority_withdrawal: priorityWithdrawal,
        benefits,
        order: Number(order),
        is_active: isActive
      };

      if (rank) {
        await rankingsService.updateRank(rank.id, payload);
      } else {
        await rankingsService.createRank(payload);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Error guardando rango:', err);
      setError(err.message || 'Error al guardar el rango.');
    } finally {
      setLoading(false);
    }
  };

  const SelectedIconComponent = AVAILABLE_ICONS.find(i => i.id === icon)?.icon || Trophy;

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200" style={{ margin: 0 }}>
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div 
              className="p-2.5 rounded-2xl flex items-center justify-center text-white shadow-md"
              style={{ backgroundColor: color }}
            >
              <SelectedIconComponent className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {rank ? `Editar Rango: ${rank.name}` : 'Crear Nuevo Rango de Inversión'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Configura los requisitos de capital, porcentajes de bono y beneficios del nivel
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200 flex items-center gap-2.5 text-xs font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Live Preview Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-lg border border-slate-700 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full blur-2xl pointer-events-none" style={{ backgroundColor: color }} />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg"
                  style={{ backgroundColor: color }}
                >
                  <SelectedIconComponent className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400">Vista Previa de Insignia</span>
                  <h3 className="text-lg font-black font-montserrat flex items-center gap-2">
                    {name || 'Nombre del Rango'}
                    {bonusPercentage > 0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-white/20 text-white font-mono">
                        +{bonusPercentage}% Bono
                      </span>
                    )}
                  </h3>
                </div>
              </div>

              <span className="text-xs px-3 py-1 rounded-full font-extrabold font-mono border" style={{ borderColor: color, color }}>
                Orden #{order}
              </span>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-300">
              <span>Capital Requerido: <strong className="text-white font-mono font-bold">${Number(minInvestment || 0).toLocaleString('es-CO')} COP</strong></span>
              {priorityWithdrawal && (
                <span className="text-amber-400 font-bold flex items-center gap-1 text-[11px]">
                  <Sparkles className="w-3.5 h-3.5" /> Prioridad en Retiros ACH
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nombre del Rango <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Diamante Black, Oro VIP..."
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs font-bold text-slate-900 transition-all"
              />
            </div>

            {/* Order */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Orden Jerárquico (Nivel)
              </label>
              <input
                type="number"
                min="1"
                required
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs font-mono font-bold text-slate-900 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Min Investment */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Inversión Mínima (COP)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold text-xs">$</span>
                <input
                  type="number"
                  min="0"
                  required
                  value={minInvestment}
                  onChange={(e) => setMinInvestment(Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs font-mono font-bold text-slate-900 transition-all"
                />
              </div>
            </div>

            {/* Max Investment */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Inversión Máxima (Opcional)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold text-xs">$</span>
                <input
                  type="number"
                  min="0"
                  value={maxInvestment}
                  onChange={(e) => setMaxInvestment(e.target.value)}
                  placeholder="Sin límite"
                  className="w-full pl-7 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs font-mono font-bold text-slate-900 transition-all"
                />
              </div>
            </div>

            {/* Bonus Percentage */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Bono Adicional (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="100"
                  value={bonusPercentage}
                  onChange={(e) => setBonusPercentage(Number(e.target.value))}
                  placeholder="0.50"
                  className="w-full pr-7 pl-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs font-mono font-bold text-slate-900 transition-all"
                />
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 font-bold text-xs">%</span>
              </div>
            </div>
          </div>

          {/* Color & Icon Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Color Palette */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Color de Insignia
              </label>
              <div className="flex flex-wrap gap-2 items-center">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={`w-7 h-7 rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-2xs ${
                      color.toLowerCase() === c.value.toLowerCase() ? 'ring-2 ring-slate-900 scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  >
                    {color.toLowerCase() === c.value.toLowerCase() && (
                      <CheckCircle2 className="w-4 h-4 text-white drop-shadow" />
                    )}
                  </button>
                ))}
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-7 h-7 rounded-xl border border-slate-200 cursor-pointer"
                  title="Color personalizado"
                />
              </div>
            </div>

            {/* Icon Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Ícono de Nivel
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {AVAILABLE_ICONS.map(i => {
                  const IconC = i.icon;
                  const isSelected = icon === i.id;
                  return (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => setIcon(i.id)}
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        isSelected 
                          ? 'border-brand-600 bg-brand-50 text-brand-700 font-bold shadow-2xs' 
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <IconC className="w-4 h-4" />
                      <span className="text-[10px] truncate max-w-full">{i.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Priority Withdrawal & Active Switches */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 cursor-pointer hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={priorityWithdrawal}
                onChange={(e) => setPriorityWithdrawal(e.target.checked)}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 block">Prioridad en Retiros ACH</span>
                <span className="text-[11px] text-slate-500 block">Desembolsos con fila prioritaria en tesorería</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 cursor-pointer hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 block">Rango Activo</span>
                <span className="text-[11px] text-slate-500 block">Visible para inversionistas y en el escalafón</span>
              </div>
            </label>
          </div>

          {/* Benefits List Builder */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Beneficios Exclusivos del Rango ({benefits.length})
              </label>
              <span className="text-[11px] text-slate-400">Aparecerán en la tarjeta del inversionista</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newBenefit}
                onChange={(e) => setNewBenefit(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddBenefit();
                  }
                }}
                placeholder="Ej. Asesor financiero asignado 24/7..."
                className="flex-1 px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs text-slate-800"
              />
              <button
                type="button"
                onClick={handleAddBenefit}
                disabled={!newBenefit.trim()}
                className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-xs shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir</span>
              </button>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {benefits.map((b, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50 text-xs text-slate-700 group hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{b}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveBenefit(idx)}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Eliminar beneficio"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {benefits.length === 0 && (
                <p className="text-xs text-slate-400 italic py-2 text-center">No has agregado beneficios aún a este rango.</p>
              )}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-100 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-bold text-xs disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-all font-bold text-xs disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-brand-600/20 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                rank ? 'Guardar Cambios' : 'Crear Rango'
              )}
            </button>
          </div>
        </form>

      </div>
    </div>,
    document.body
  );
};
