export const formatCurrency = (amount: number, showDecimals: boolean = false) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: showDecimals ? 2 : 0,
        maximumFractionDigits: showDecimals ? 2 : 0
    }).format(amount);
};

export const formatAccountNumber = (accNum: string | number | null | undefined): string => {
    if (accNum === null || accNum === undefined || accNum === '') return 'N/A';
    const str = String(accNum).trim();
    
    // Convertir notación científica (ej: 4,559E+11, 4.559e11, 4.559E+11) a número entero completo
    if (/^[0-9.,]+[eE][+-]?[0-9]+$/.test(str) || str.includes('E+') || str.includes('e+') || str.includes('E-') || str.includes('e-')) {
        try {
            const normalized = str.replace(',', '.');
            const num = Number(normalized);
            if (!isNaN(num)) {
                return BigInt(Math.round(num)).toString();
            }
        } catch {
            // fallback si falla BigInt
        }
    }

    if (str.endsWith('.0')) {
        return str.slice(0, -2);
    }
    
    return str;
};

export const maskAccountNumber = (accNum: string | number | null | undefined): string => {
    if (accNum === null || accNum === undefined || accNum === '') return 'N/A';
    const clean = formatAccountNumber(accNum);
    if (clean.length <= 4) return clean;
    const last4 = clean.slice(-4);
    return `•••• •••• ${last4}`;
};

/**
 * Retorna la fecha calendario actual de Colombia en formato YYYY-MM-DD (America/Bogota, UTC-5).
 * Evita saltar de día a partir de las 19:00 COT como ocurre con toISOString() en UTC.
 */
export const getColombiaToday = (): string => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
};

/**
 * Formatea una fecha o timestamp a formato local colombiano DD/MM/YYYY respetando la zona horaria America/Bogota.
 */
export const formatColombiaDate = (dateStr: string | Date | null | undefined): string => {
    if (!dateStr) return 'N/A';
    let d: Date;
    if (typeof dateStr === 'string') {
        if (!dateStr.includes('Z') && !dateStr.includes('+') && dateStr.includes('T')) {
            d = new Date(dateStr + 'Z');
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [y, m, day] = dateStr.split('-').map(Number);
            return `${String(day).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
        } else {
            d = new Date(dateStr);
        }
    } else {
        d = dateStr;
    }
    
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('es-CO', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' });
};

export const TRANSACTION_TYPE_TRANSLATIONS: Record<string, string> = {
    'yield_payout': 'Pago de Rendimientos',
    'yield payout': 'Pago de Rendimientos',
    'bonus_payout': 'Pago de Bono',
    'bonus payout': 'Pago de Bono',
    'withdrawal_request': 'Solicitud de Retiro',
    'withdrawal request': 'Solicitud de Retiro',
    'withdrawal_refund': 'Reembolso de Retiro',
    'withdrawal refund': 'Reembolso de Retiro',
    'withdrawal_rejection': 'Rechazo de Retiro',
    'withdrawal rejection': 'Rechazo de Retiro',
    'investment_reservation': 'Reserva de Inversión',
    'investment reservation': 'Reserva de Inversión',
    'investment_payment': 'Pago de Inversión',
    'investment payment': 'Pago de Inversión',
    'transfer_received': 'Transferencia Recibida',
    'transfer received': 'Transferencia Recibida',
    'transfer_in': 'Transferencia Recibida',
    'transfer in': 'Transferencia Recibida',
    'transfer_sent': 'Transferencia Enviada',
    'transfer sent': 'Transferencia Enviada',
    'transfer_out': 'Transferencia Enviada',
    'transfer out': 'Transferencia Enviada',
    'yield_payout_reversed': 'Rendimiento Revertido',
    'yield payout reversed': 'Rendimiento Revertido',
    'yield_payout_reversal': 'Reversión de Rendimiento',
    'yield payout reversal': 'Reversión de Rendimiento',
    'admin_adjustment': 'Ajuste Administrativo',
    'admin adjustment': 'Ajuste Administrativo',
    'adjustment': 'Ajuste de Saldo',
    'ingreso': 'Abono / Rendimiento',
    'egreso': 'Débito de Fondos',
    'capital_increase': 'Aumento de Capital',
    'capital increase': 'Aumento de Capital',
    'capital_withdrawal': 'Retiro de Capital',
    'capital withdrawal': 'Retiro de Capital',
    'pending_payout': 'Pago Pendiente',
    'pending payout': 'Pago Pendiente',
};

export const formatTransactionType = (rawType?: string | null): string => {
    if (!rawType) return 'Movimiento';
    const clean = rawType.trim().toLowerCase();
    if (TRANSACTION_TYPE_TRANSLATIONS[clean]) {
        return TRANSACTION_TYPE_TRANSLATIONS[clean];
    }
    return rawType.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};
