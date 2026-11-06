// Nombres legibles de los tipos internos de movimientos de billetera (H-168)
const WALLET_TX_LABELS: Record<string, string> = {
  ingreso: 'Ingreso',
  egreso: 'Egreso',
  yield: 'Abono de rendimientos',
  yield_payout: 'Abono de rendimientos',
  yield_payout_reversal: 'Reversión de rendimiento',
  yield_payout_reversed: 'Rendimiento revertido',
  reverso_rendimiento: 'Reverso de rendimiento',
  bonus_payout: 'Pago de bono',
  withdrawal_request: 'Solicitud de retiro',
  withdrawal_refund: 'Reembolso de retiro',
  withdrawal_rejection: 'Rechazo de retiro',
  investment_payment: 'Pago de inversión',
  investment_reservation: 'Reserva de inversión',
  transfer_in: 'Transferencia recibida',
  transfer_received: 'Transferencia recibida',
  transfer_out: 'Transferencia enviada',
  transfer_sent: 'Transferencia enviada',
  admin_adjustment: 'Ajuste administrativo',
  adjustment: 'Ajuste de saldo',
  refund: 'Reembolso',
  wallet_recharge: 'Recarga de billetera',
  capital_withdrawal: 'Retiro de capital',
  capital_increase: 'Aumento de capital',
  share_sale: 'Venta de acciones',
  share_purchase: 'Compra de acciones',
  share_purchase_hold: 'Reserva para compra de acciones',
  share_hold_refund: 'Reembolso de reserva de acciones',
  external_payment: 'Pago externo',
  debit: 'Débito',
};

export const walletTxLabel = (type?: string | null): string => {
  const key = (type || '').trim().toLowerCase().replace(/\s+/g, '_');
  if (WALLET_TX_LABELS[key]) return WALLET_TX_LABELS[key];
  const words = (type || 'Movimiento').replace(/[_-]+/g, ' ').trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

// Separa una etiqueta inicial como "[REVERTIDA MASIVO]" del resto de la descripción
export const splitTxDescription = (description?: string | null): { tag: string | null; text: string } => {
  const match = (description || '').match(/^\s*\[([^\]]+)\]\s*(.*)$/s);
  return match ? { tag: match[1], text: match[2] } : { tag: null, text: description || '' };
};
