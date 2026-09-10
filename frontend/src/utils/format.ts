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

/**
 * Parsea una fecha de chat asegurando que los timestamps UTC de MySQL sin sufijo 'Z'
 * sean interpretados correctamente como UTC.
 */
export const parseChatDate = (dateStr?: string | Date | null): Date | null => {
    if (!dateStr) return null;
    let d: Date;
    if (typeof dateStr === 'string') {
        const clean = dateStr.trim();
        if (!clean.includes('Z') && !clean.includes('+') && clean.includes('T')) {
            d = new Date(clean + 'Z');
        } else {
            d = new Date(clean);
        }
    } else {
        d = dateStr;
    }
    return isNaN(d.getTime()) ? null : d;
};

/**
 * Determina si dos fechas corresponden al mismo día del calendario en la zona local del usuario.
 */
export const isSameChatDay = (date1?: string | Date | null, date2?: string | Date | null): boolean => {
    const d1 = parseChatDate(date1);
    const d2 = parseChatDate(date2);
    if (!d1 || !d2) return false;
    return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
    );
};

/**
 * Formatea la hora de un mensaje del chat a la hora local del usuario.
 */
export const formatChatTime = (dateStr?: string | Date | null): string => {
    const d = parseChatDate(dateStr);
    if (!d) return '';
    return d.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Retorna el texto para el separador/divisor de días en el feed del chat
 * (ej. "Hoy", "Ayer", "Miércoles, 9 de septiembre").
 */
export const getChatDayDivider = (dateStr?: string | Date | null): string => {
    const d = parseChatDate(dateStr);
    if (!d) return '';
    const now = new Date();

    if (isSameChatDay(d, now)) {
        return 'Hoy';
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (isSameChatDay(d, yesterday)) {
        return 'Ayer';
    }

    const isCurrentYear = d.getFullYear() === now.getFullYear();
    const formatted = d.toLocaleDateString('es-CO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: isCurrentYear ? undefined : 'numeric'
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

/**
 * Formatea la fecha para la lista de conversaciones y accesos rápidos:
 * - Si es hoy: muestra la hora ("11:44 a. m.")
 * - Si fue ayer: muestra "Ayer"
 * - Si fue en los últimos 6 días: muestra el día ("Lun", "Mar", "Mié", etc.)
 * - Si fue anterior: muestra la fecha en formato corto "DD/MM/YYYY"
 */
export const formatConversationDate = (dateStr?: string | Date | null): string => {
    const d = parseChatDate(dateStr);
    if (!d) return '';
    const now = new Date();

    if (isSameChatDay(d, now)) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (isSameChatDay(d, yesterday)) {
        return 'Ayer';
    }

    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7 && diffDays >= 0) {
        const dayName = d.toLocaleDateString('es-CO', { weekday: 'short' });
        return dayName.charAt(0).toUpperCase() + dayName.slice(1);
    }

    return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/**
 * Formatea la fecha y hora completa para tooltips o descripciones largas.
 */
export const formatChatMessageFullDate = (dateStr?: string | Date | null): string => {
    const d = parseChatDate(dateStr);
    if (!d) return '';
    return d.toLocaleDateString('es-CO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
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
