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
