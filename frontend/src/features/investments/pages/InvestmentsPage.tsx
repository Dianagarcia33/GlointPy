import React, { useEffect, useState } from 'react';
import { investmentsService, AdminInvestment } from '../../../services/investments';
import { Briefcase, Loader2, AlertCircle, User, Calendar, DollarSign, Mail, Search } from 'lucide-react';

export const InvestmentsPage = () => {
    const [investments, setInvestments] = useState<AdminInvestment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showOnlyWithCapitalWithdrawals, setShowOnlyWithCapitalWithdrawals] = useState(false);
    const [showOnlyNegativeBalances, setShowOnlyNegativeBalances] = useState(false);
    const [showOnlyWithBonuses, setShowOnlyWithBonuses] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'default' | 'asc' | 'desc'>('default');
    const [isLeveling, setIsLeveling] = useState<number | null>(null);
    const [isLevelingMassive, setIsLevelingMassive] = useState(false);

    useEffect(() => {
        const fetchInvestments = async () => {
            try {
                setIsLoading(true);
                const data = await investmentsService.getAllInvestments();
                setInvestments(data);
            } catch (err: any) {
                setError(err.message || 'Error al cargar las inversiones');
            } finally {
                setIsLoading(false);
            }
        };

        fetchInvestments();
    }, []);

    // 1. Agrupar por user_id
    const groupedInvestments = investments.reduce((acc, inv) => {
        const userId = inv.user_id;
        if (!acc[userId]) {
            acc[userId] = [];
        }
        acc[userId].push(inv);
        return acc;
    }, {} as Record<number, AdminInvestment[]>);

    // 2. Filtrar a nivel de usuario
    const filteredGroupedInvestments = Object.entries(groupedInvestments).filter(([userId, userInvs]) => {
        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            const matchesSearch = userInvs.some(inv => 
                (inv.nombre_completo && inv.nombre_completo.toLowerCase().includes(query)) ||
                (inv.codigo_asignado && inv.codigo_asignado.toLowerCase().includes(query)) ||
                (inv.correo_electronico && inv.correo_electronico.toLowerCase().includes(query))
            );
            if (!matchesSearch) return false;
        }

        if (showOnlyNegativeBalances) {
            const saldoTotalUsuario = userInvs.reduce((acc, inv) => acc + (inv.saldo_a_migrar || 0), 0);
            if (saldoTotalUsuario >= 0) return false;
        }

        if (showOnlyWithBonuses) {
            const hasBonuses = userInvs.some(inv => inv.total_bonos && inv.total_bonos > 0);
            if (!hasBonuses) return false;
        }

        if (showOnlyWithCapitalWithdrawals) {
            const hasCapitalWithdrawals = userInvs.some(inv => {
                const initialCapitalStr = inv.paquete_nombre;
                if (!initialCapitalStr) return false;
                const initialCapital = parseFloat(initialCapitalStr);
                if (isNaN(initialCapital)) return false;
                return inv.capital_actual !== undefined && inv.capital_actual < initialCapital;
            });
            if (!hasCapitalWithdrawals) return false;
        }
        
        return true;
    }).reduce((acc, [userId, userInvs]) => {
        acc[Number(userId)] = userInvs;
        return acc;
    }, {} as Record<number, AdminInvestment[]>);

    // 3. Ordenar a nivel de usuario
    const sortedGroupedInvestments = Object.entries(filteredGroupedInvestments).sort((a, b) => {
        if (sortOrder === 'default') return 0;
        
        const saldoA = a[1].reduce((acc, inv) => acc + (inv.saldo_a_migrar || 0), 0);
        const saldoB = b[1].reduce((acc, inv) => acc + (inv.saldo_a_migrar || 0), 0);
        
        if (sortOrder === 'asc') return saldoA - saldoB;
        if (sortOrder === 'desc') return saldoB - saldoA;
        return 0;
    });

    const handleNivelar = async (userId: number, saldoAuditado: number) => {
        if (!window.confirm(`¿Seguro que deseas nivelar la wallet de este usuario insertando un ajuste oficial para que quede en ${formatCOP(saldoAuditado)}?`)) return;
        
        setIsLeveling(userId);
        try {
            await investmentsService.nivelarWallet(userId, saldoAuditado);
            // Refetch to update the UI
            const data = await investmentsService.getAllInvestments();
            setInvestments(data);
            alert('Wallet nivelada correctamente y registrada en el historial.');
        } catch (err: any) {
            alert('Error al nivelar: ' + (err.response?.data?.detail || err.message));
        } finally {
            setIsLeveling(null);
        }
    };

    const handleNivelarMasivo = async () => {
        const usersToLevel = sortedGroupedInvestments.map(([userId, userInvs]) => {
            const userFirstInv = userInvs[0];
            const saldoTotalUsuario = userInvs.reduce((acc, inv) => acc + (inv.saldo_a_migrar || 0), 0);
            const saldoWalletActual = userFirstInv.wallet_balance_actual || 0;
            const faltante = saldoTotalUsuario - saldoWalletActual;
            return { user_id: Number(userId), saldo_auditado: saldoTotalUsuario, faltante };
        }).filter(u => Math.abs(u.faltante) > 0.01);

        if (usersToLevel.length === 0) {
            alert('No hay usuarios con faltantes en esta vista filtrada.');
            return;
        }

        if (!window.confirm(`¿Estás completamente seguro de nivelar a ${usersToLevel.length} usuarios de un solo golpe?\nSe inyectará un registro automático a cada uno ajustando su saldo al Auditado.`)) return;

        setIsLevelingMassive(true);
        try {
            await investmentsService.nivelarWalletsMasivo(usersToLevel.map(u => ({ user_id: u.user_id, saldo_auditado: u.saldo_auditado })));
            const data = await investmentsService.getAllInvestments();
            setInvestments(data);
            alert(`¡Se nivelaron ${usersToLevel.length} wallets exitosamente y quedó el historial guardado!`);
        } catch (err: any) {
            alert('Error en nivelación masiva: ' + (err.response?.data?.detail || err.message));
        } finally {
            setIsLevelingMassive(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-8 flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <div className="bg-red-50 text-red-500 p-4 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                </div>
            </div>
        );
    }

    const formatCOP = (value: number | undefined) => {
        if (value === undefined || value === null) return '$0';
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 10
        }).format(value);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-100 rounded-lg">
                        <Briefcase className="w-6 h-6 text-brand-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Auditoría de Inversiones</h1>
                        <p className="text-slate-500 text-sm">Listado global agrupado por usuario (Fase 1)</p>
                    </div>
                </div>
                <button
                    onClick={handleNivelarMasivo}
                    disabled={isLevelingMassive}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-400 text-white text-sm font-bold rounded-xl shadow-sm transition-all flex items-center gap-2"
                >
                    {isLevelingMassive ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Nivelar Faltantes Masivamente
                </button>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="relative w-full sm:max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por nombre, correo o código..."
                        className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 sm:text-sm shadow-sm transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <label className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors">
                        <input 
                            type="checkbox" 
                            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4"
                            checked={showOnlyWithCapitalWithdrawals}
                            onChange={(e) => setShowOnlyWithCapitalWithdrawals(e.target.checked)}
                        />
                        <span className="text-sm font-medium text-slate-700">Retiros de capital</span>
                    </label>
                    <label className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-yellow-200 shadow-sm cursor-pointer hover:bg-yellow-50 transition-colors">
                        <input 
                            type="checkbox" 
                            className="rounded border-yellow-300 text-yellow-600 focus:ring-yellow-500 w-4 h-4"
                            checked={showOnlyWithBonuses}
                            onChange={(e) => setShowOnlyWithBonuses(e.target.checked)}
                        />
                        <span className="text-sm font-medium text-yellow-700">Con bonos</span>
                    </label>
                    <label className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-red-200 shadow-sm cursor-pointer hover:bg-red-50 transition-colors">
                        <input 
                            type="checkbox" 
                            className="rounded border-red-300 text-red-600 focus:ring-red-500 w-4 h-4"
                            checked={showOnlyNegativeBalances}
                            onChange={(e) => setShowOnlyNegativeBalances(e.target.checked)}
                        />
                        <span className="text-sm font-medium text-red-700">Saldo negativo</span>
                    </label>
                    <select 
                        className="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm text-sm font-medium text-slate-700 outline-none focus:border-brand-500 cursor-pointer"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as any)}
                    >
                        <option value="default">Orden por defecto</option>
                        <option value="desc">Saldo: Mayor a Menor</option>
                        <option value="asc">Saldo: Menor a Mayor</option>
                    </select>
                </div>
            </div>

            {sortedGroupedInvestments.map(([userId, userInvestments]) => {
                const userFirstInv = userInvestments[0];
                const userName = userFirstInv.nombre_completo || 'Usuario Desconocido';
                const userEmail = userFirstInv.correo_electronico || 'Sin correo';
                
                // Calcular totales del usuario
                const totalProducidoUsuario = userInvestments.reduce((acc, inv) => acc + (inv.rendimiento_producido_hasta_ayer || 0), 0);
                const totalBonosUsuario = userInvestments.reduce((acc, inv) => acc + (inv.total_bonos || 0), 0);
                const totalBaseUsuario = totalProducidoUsuario - totalBonosUsuario;
                const totalCapitalDevueltoUsuario = userInvestments.reduce((acc, inv) => acc + (inv.capital_devuelto || 0), 0);
                const totalRetiradoUsuario = userInvestments.reduce((acc, inv) => acc + (inv.total_retiros_rendimiento || 0), 0);
                const saldoTotalUsuario = userInvestments.reduce((acc, inv) => acc + (inv.saldo_a_migrar || 0), 0);
                const saldoWalletActual = userFirstInv.wallet_balance_actual || 0;
                const faltanteUsuario = saldoTotalUsuario - saldoWalletActual;
                const totalBrutoCalculado = totalProducidoUsuario + totalCapitalDevueltoUsuario;

                return (
                    <div key={userId} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center flex-wrap gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <User className="w-5 h-5 text-brand-500" />
                                    {userName}
                                </h2>
                                <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                                    <Mail className="w-4 h-4" />
                                    {userEmail}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Total Base</span>
                                    <span className="text-slate-700 font-bold text-base">+{formatCOP(totalBaseUsuario)}</span>
                                </div>
                                {totalBonosUsuario > 0 && (
                                    <>
                                        <div className="w-px bg-slate-200 hidden sm:block"></div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-bold text-yellow-600">Total Bonos</span>
                                            <span className="text-yellow-600 font-bold text-base">+{formatCOP(totalBonosUsuario)}</span>
                                        </div>
                                    </>
                                )}
                                {totalCapitalDevueltoUsuario > 0 && (
                                    <>
                                        <div className="w-px bg-slate-200 hidden sm:block"></div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-bold text-blue-600">Cap. Devuelto</span>
                                            <span className="text-blue-600 font-bold text-base">+{formatCOP(totalCapitalDevueltoUsuario)}</span>
                                        </div>
                                    </>
                                )}
                                <div className="w-px bg-slate-200 hidden sm:block"></div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-bold text-slate-500">Total Bruto</span>
                                    <span className="text-green-600 font-bold text-base">+{formatCOP(totalBrutoCalculado)}</span>
                                </div>
                                <div className="w-px bg-slate-200 hidden sm:block"></div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Total Retirado</span>
                                    <span className="text-red-500 font-bold text-base">-{formatCOP(totalRetiradoUsuario)}</span>
                                </div>
                                <div className="w-px bg-slate-200 hidden sm:block"></div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Saldo Final Auditado</span>
                                    <span className="font-bold text-base text-slate-900">
                                        {formatCOP(saldoTotalUsuario)}
                                    </span>
                                </div>
                                <div className="w-px bg-slate-200 hidden sm:block"></div>
                                <div className="flex flex-col bg-slate-100 px-2 py-1 rounded">
                                    <span className="text-[10px] uppercase font-bold text-slate-500">Saldo Wallet Viejo</span>
                                    <span className="font-bold text-base text-slate-600">
                                        {formatCOP(saldoWalletActual)}
                                    </span>
                                </div>
                                <div className="w-px bg-slate-200 hidden sm:block"></div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-bold text-brand-600">Faltante a Nivelar</span>
                                    <span className={`font-bold text-base ${faltanteUsuario > 0 ? 'text-green-600' : faltanteUsuario < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                                        {faltanteUsuario > 0 ? '+' : ''}{formatCOP(faltanteUsuario)}
                                    </span>
                                </div>
                                {Math.abs(faltanteUsuario) > 0.01 && (
                                    <div className="flex items-center ml-2">
                                        <button 
                                            onClick={() => handleNivelar(Number(userId), saldoTotalUsuario)}
                                            disabled={isLeveling === Number(userId)}
                                            className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-400 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1"
                                        >
                                            {isLeveling === Number(userId) ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                            Ajustar Wallet
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Código</th>
                                        <th className="px-6 py-3 font-medium">Capital</th>
                                        <th className="px-6 py-3 font-medium">Rend. Diario (Calc)</th>
                                        <th className="px-6 py-3 font-medium">Producido (Hasta Ayer)</th>
                                        <th className="px-6 py-3 font-medium">Balance / Saldo a Migrar</th>
                                        <th className="px-6 py-3 font-medium">Fechas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {userInvestments.map((inv) => (
                                        <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-700">
                                                {inv.codigo_asignado || `INV-${inv.id}`}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-800">
                                                    {isNaN(parseFloat(inv.paquete_nombre || '')) ? (inv.paquete_nombre || 'Desconocido') : formatCOP(parseFloat(inv.paquete_nombre!))}
                                                </div>
                                                {(inv.capital_actual !== undefined && !isNaN(parseFloat(inv.paquete_nombre || '')) && inv.capital_actual < parseFloat(inv.paquete_nombre!)) && (
                                                    <div className="text-xs text-red-600 font-bold mt-1">
                                                        Capital Actual: {formatCOP(inv.capital_actual)}
                                                    </div>
                                                )}
                                                <div className="text-xs text-slate-400 mt-0.5">
                                                    {inv.periodo_porcentaje !== undefined && inv.periodo_porcentaje !== null 
                                                        ? `${inv.periodo_porcentaje}% - ${inv.periodo_meses} Meses (${inv.periodo_dias} Días)` 
                                                        : 'Periodo Desconocido'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-slate-700 font-medium">
                                                    {formatCOP(inv.rendimiento_diario_calculado)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-green-600 font-bold">
                                                        {formatCOP(inv.rendimiento_producido_hasta_ayer)}
                                                    </span>
                                                    <span className="text-xs text-slate-500 mt-0.5">
                                                        {inv.dias_generando || 0} días transcurridos
                                                    </span>
                                                    {inv.tramos_desglose && inv.tramos_desglose.length > 0 && (
                                                        <div className="mt-2 space-y-1.5 min-w-[180px]">
                                                            {inv.tramos_desglose.map((tramo, idx) => (
                                                                <div key={idx} className="text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-100 shadow-sm">
                                                                    <div className="flex justify-between items-center mb-1 border-b border-slate-200 pb-1">
                                                                        <span className="font-medium text-slate-700">Tramo {idx + 1} <span className="text-slate-400 font-normal">({tramo.dias}d)</span></span>
                                                                        <span className="text-brand-600 font-medium">{String(tramo.fecha_inicio).split('T')[0]} - {String(tramo.fecha_fin).split('T')[0]}</span>
                                                                    </div>
                                                                    <div className="space-y-0.5">
                                                                        <div className="flex justify-between items-center">
                                                                            <span className="text-slate-500">Capital Base:</span>
                                                                            <span className="text-slate-700 font-medium">{formatCOP(tramo.capital_base)}</span>
                                                                        </div>
                                                                        <div className="flex justify-between items-center">
                                                                            <span className="text-slate-500">Rend. Diario:</span>
                                                                            <span className="text-slate-700 font-medium">{formatCOP(tramo.rendimiento_diario)}/día</span>
                                                                        </div>
                                                                        <div className="flex justify-between items-center border-t border-slate-100 pt-0.5 mt-0.5">
                                                                            <span className="text-slate-500 font-medium">Producido:</span>
                                                                            <span className="text-green-600 font-bold">+{formatCOP(tramo.producido)}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    
                                                    {/* Mostrar Bonos de Aceleración si existen */}
                                                    {inv.detalles_bonos && inv.detalles_bonos.length > 0 && (
                                                        <div className="mt-2 space-y-1.5 min-w-[180px]">
                                                            <div className="text-[10px] text-slate-500 bg-yellow-50 p-1.5 rounded border border-yellow-100 shadow-sm">
                                                                <div className="flex justify-between items-center mb-1 border-b border-yellow-200 pb-1">
                                                                    <span className="font-medium text-yellow-800">Bonos Aceleración</span>
                                                                    <span className="text-yellow-600 font-bold">+{formatCOP(inv.total_bonos)}</span>
                                                                </div>
                                                                <div className="space-y-0.5">
                                                                    {inv.detalles_bonos.map((bono, idx) => (
                                                                        <div key={idx} className="flex justify-between items-center border-b border-yellow-100 last:border-0 pb-0.5 last:pb-0">
                                                                            <span>{String(bono.fecha).split('T')[0]} <span className="opacity-50 text-yellow-700">(-{bono.dias_reducidos}d)</span></span>
                                                                            <span className="text-yellow-700 font-medium">+{formatCOP(bono.monto)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col space-y-1">
                                                    <div className="flex flex-col border-b border-slate-200 pb-1.5 mb-1">
                                                        <div className="flex justify-between items-center text-[10px] text-slate-400">
                                                            <span>Rendimiento Base:</span>
                                                            <span>+{formatCOP((inv.rendimiento_producido_hasta_ayer || 0) - (inv.total_bonos || 0))}</span>
                                                        </div>
                                                        {inv.total_bonos ? (
                                                            <div className="flex justify-between items-center text-[10px] text-yellow-600">
                                                                <span>Total Bonos:</span>
                                                                <span>+{formatCOP(inv.total_bonos)}</span>
                                                            </div>
                                                        ) : null}
                                                        {inv.capital_devuelto && inv.capital_devuelto > 0 ? (
                                                            <div className="flex justify-between items-center text-[10px] text-blue-600">
                                                                <span>Capital Devuelto (Finalizado):</span>
                                                                <span>+{formatCOP(inv.capital_devuelto)}</span>
                                                            </div>
                                                        ) : null}
                                                        <div className="flex justify-between items-center text-xs mt-1">
                                                            <span className="text-slate-500">Total Bruto del Contrato:</span>
                                                            <span className="text-green-600 font-bold">+{formatCOP((inv.rendimiento_producido_hasta_ayer || 0) + (inv.capital_devuelto || 0))}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col border-b border-slate-200 pb-1.5 space-y-1">
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-slate-500">Retirado:</span>
                                                            <span className="text-red-500 font-medium">-{formatCOP(inv.total_retiros_rendimiento)}</span>
                                                        </div>
                                                        {inv.detalles_retiros_rendimiento && inv.detalles_retiros_rendimiento.length > 0 && (
                                                            <div className="pl-2 space-y-0.5 border-l-2 border-slate-100 mt-1">
                                                                {inv.detalles_retiros_rendimiento.map((ret, i) => (
                                                                    <div key={i} className="flex justify-between items-center text-[10px] text-slate-400">
                                                                        <span>{String(ret.fecha).split('T')[0]} <span className="opacity-50">(#{ret.id})</span></span>
                                                                        <span className="font-medium text-red-400">-{formatCOP(ret.monto)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex justify-between items-center pt-1">
                                                        <span className="text-slate-700 font-medium text-sm">Saldo Real:</span>
                                                        <span className={`font-bold text-sm ${inv.saldo_a_migrar !== undefined && inv.saldo_a_migrar < 0 ? 'text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100' : 'text-slate-900'}`}>
                                                            {formatCOP(inv.saldo_a_migrar)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <Calendar className="w-3 h-3" />
                                                    {inv.fecha_ingreso ? String(inv.fecha_ingreso).split('T')[0] : 'N/A'} 
                                                    {' - '} 
                                                    {inv.fecha_finalizacion ? String(inv.fecha_finalizacion).split('T')[0] : 'N/A'}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}

            {investments.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                    <p className="text-slate-500">No hay inversiones registradas en el sistema.</p>
                </div>
            )}
        </div>
    );
};
