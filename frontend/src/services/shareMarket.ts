import { fetchApi } from './api';

export interface SharePortfolio {
    total_shares_owned: number;
    shares_available_for_sale: number;
    shares_listed_active: number;
    shares_locked_in_escrow: number;
    current_share_price: number;
    portfolio_market_value: number;
    sales_window_open: boolean;
    sales_window_message?: string;
}

export interface SharePriceHistory {
    id: number;
    previous_price: number;
    new_price: number;
    change_percentage: number;
    justification_notes: string;
    admin_id?: number;
    admin_name?: string;
    created_at: string;
}

export interface ShareListing {
    id: number;
    seller_id: number;
    seller_name: string;
    seller_email?: string;
    shares_total: number;
    shares_available: number;
    shares_locked: number;
    price_per_share: number;
    total_value: number;
    status: string;
    created_at: string;
    is_mine: boolean;
}

export interface ShareTradeOrder {
    id: number;
    listing_id?: number;
    issuance_id?: number;
    seller_id?: number;
    seller_name?: string;
    buyer_id: number;
    buyer_name?: string;
    buyer_email?: string;
    buyer_phone?: string;
    buyer_document?: string;
    shares_quantity: number;
    price_per_share: number;
    total_amount: number;
    wallet_amount_used: number;
    surplus_amount: number;
    receipt_url?: string;
    payment_method: string;
    status: 'completed' | 'pending_admin_approval' | 'rejected' | 'cancelled';
    admin_notes?: string;
    approved_by?: number;
    approver_name?: string;
    approved_at?: string;
    created_at: string;
}

export interface ShareIssuance {
    id: number;
    title: string;
    description?: string;
    total_shares_issued: number;
    available_shares: number;
    price_per_share: number;
    is_active: boolean;
    created_by?: number;
    creator_name?: string;
    created_at: string;
}

export const shareMarketService = {
    // Inversionista
    getPortfolio: () => fetchApi<SharePortfolio>('/shares-market/portfolio'),
    getPriceHistory: () => fetchApi<SharePriceHistory[]>('/shares-market/price-history'),
    getListings: () => fetchApi<ShareListing[]>('/shares-market/listings'),
    createListing: (sharesQuantity: number, pricePerShare: number) =>
        fetchApi<ShareListing>('/shares-market/listings', {
            method: 'POST',
            body: JSON.stringify({
                shares_quantity: sharesQuantity,
                price_per_share: pricePerShare
            })
        }),
    cancelListing: (listingId: number) =>
        fetchApi<{ message: string }>(`/shares-market/listings/${listingId}`, {
            method: 'DELETE'
        }),
    buySharesInstant: (listingId: number, sharesQuantity: number) => {
        const formData = new FormData();
        formData.append('listing_id', listingId.toString());
        formData.append('shares_quantity', sharesQuantity.toString());
        return fetchApi<ShareTradeOrder>('/shares-market/buy-instant', {
            method: 'POST',
            body: formData
        });
    },
    buySharesSurplus: (listingId: number, sharesQuantity: number, walletAmountUsed: number, surplusAmount: number, receiptFile: File) => {
        const formData = new FormData();
        formData.append('listing_id', listingId.toString());
        formData.append('shares_quantity', sharesQuantity.toString());
        formData.append('wallet_amount_used', walletAmountUsed.toString());
        formData.append('surplus_amount', surplusAmount.toString());
        formData.append('receipt', receiptFile);
        return fetchApi<ShareTradeOrder>('/shares-market/buy-surplus', {
            method: 'POST',
            body: formData
        });
    },
    getMyOrders: () => fetchApi<ShareTradeOrder[]>('/shares-market/my-orders'),

    // Administrador
    updateOfficialPrice: (newPrice: number, justificationNotes: string) =>
        fetchApi<SharePriceHistory>('/shares-market/admin/price', {
            method: 'POST',
            body: JSON.stringify({
                new_price: newPrice,
                justification_notes: justificationNotes
            })
        }),
    getPendingOrders: () => fetchApi<ShareTradeOrder[]>('/shares-market/admin/pending-orders'),
    decideTradeOrder: (orderId: number, action: 'approve' | 'reject', notes?: string) =>
        fetchApi<ShareTradeOrder>(`/shares-market/admin/orders/${orderId}/decide`, {
            method: 'POST',
            body: JSON.stringify({ action, notes })
        }),
    getAllAdminOrders: () => fetchApi<ShareTradeOrder[]>('/shares-market/admin/all-orders'),
    createIssuance: (data: { title: string; description?: string; total_shares_issued: number; price_per_share: number }) =>
        fetchApi<ShareIssuance>('/shares-market/admin/issuances', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
    getIssuances: () => fetchApi<ShareIssuance[]>('/shares-market/admin/issuances')
};
