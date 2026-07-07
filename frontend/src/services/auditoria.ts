import { fetchApi } from './api';

export interface InversionDetail {
    id: number;
    codigo_asignado: string;
    monto: number;
    nombre_paquete: string;
    nombre_periodo: string;
    meses_periodo: number;
    dias_periodo: number;
    estado: string;
    created_at: string;
    fecha_ingreso?: string;
    fecha_finalizacion?: string;
    referido_por?: string;
    nombre_completo?: string;
    documento?: string;
    tipo_documento?: string;
    correo_electronico?: string;
    numero_celular?: string;
    ciudad?: string;
    tusdatos_status?: string;
    acciones_otorgadas?: number;
    rendimiento_aprobado_mensual?: number;
    rentabilidad_contrato?: number;
    rendimiento_total_contrato?: number;
    total_contrato?: number;
    liquidacion_diaria_capital?: number;
    liquidacion_diaria_rendimiento?: number;
    valor_total_acciones?: number;
    porcentaje_participacion_accionista?: number;
    ganancia_simulada?: number;
}

export interface BankAccountDetail {
    id: number;
    banco: string;
    tipo_cuenta: string;
    numero_cuenta: string;
    is_primary: boolean;
}

export interface RetiroDetail {
    id: number;
    investor_id?: number;
    user_id: number;
    origen: string;
    tipo: string;
    monto: number;
    impuesto: number;
    monto_neto: number;
    fecha_solicitud: string;
    fecha_retiro?: string;
    estado: string;
    metodo_pago?: string;
    banco?: string;
    tipo_cuenta?: string;
    numero_cuenta?: string;
    observaciones?: string;
    motivo_rechazo?: string;
    aprobado_por?: number;
    fecha_aprobacion?: string;
    procesado_por?: number;
    fecha_procesamiento?: string;
    comprobante_pago?: string;
}

export interface RequestDetail {
    id: number;
    user_id: number;
    investor_id?: number;
    paquete_inversion_id: number;
    prospecto_id?: number;
    monto: number;
    comprobante_path?: string;
    status: string;
    rejection_reason?: string;
    reviewed_at?: string;
    reviewed_by?: number;
    extra_data?: any;
    created_at?: string;
    updated_at?: string;
    deleted_at?: string;
}

export interface AccelerationDetail {
    id: number;
    original_days: number;
    acceleration_percentage: number;
    days_to_reduce: number;
    new_duration: number;
    applied: number;
    created_at: string;
}

export interface HistoryDetail {
    id: number;
    fecha_inicio: string;
    fecha_fin: string;
    dias_contrato: number;
    total_contrato: number;
    tasa_interes: string;
    acciones_otorgadas: number;
    rentabilidad_contrato: number;
    rendimiento_total_generado: number;
}

export interface RespaldoInvestment {
    user_id: string | number;
    user_name: string;
    user_email: string;
    inversiones: InversionDetail[];
    retiros: RetiroDetail[];
    requests: RequestDetail[];
    accelerations: AccelerationDetail[];
    histories: HistoryDetail[];
    bank_accounts: BankAccountDetail[];
}

export const auditoriaService = {
    getRespaldoInversiones: async (): Promise<RespaldoInvestment[]> => {
        return fetchApi('/auditoria/respaldo');
    },
    getRealInversiones: async (): Promise<RespaldoInvestment[]> => {
        return fetchApi('/auditoria/reales');
    },
    migrateBatch: async (userIds: number[], manualWithdrawals: any[] = []): Promise<{migrated: number, status: string}> => {
        return fetchApi('/auditoria/migrar-batch', { 
            method: 'POST', 
            body: JSON.stringify({ 
                user_ids: userIds,
                manual_withdrawals: manualWithdrawals
            }) 
        });
    }
};
