import { fetchApi, getMediaUrl } from './api';

export interface SarlaftCheckResponse {
  status: 'none' | 'pending' | 'processing' | 'completed' | 'failed';
  check: {
    id: number;
    job_id?: string;
    report_id?: string;
    document_number: string;
    document_type: string;
    status: string;
    has_findings: boolean;
    risk_level: 'CLEAN' | 'LOW' | 'MEDIUM' | 'HIGH';
    pdf_path?: string;
    details?: {
      validado?: boolean;
      nombre?: string;
      hallazgos_resumen?: string;
      dict_hallazgos?: {
        altos?: any[];
        medios?: any[];
        bajos?: any[];
        infos?: any[];
      };
    };
    created_at?: string;
  } | null;
}

export const sarlaftService = {
  async getCheckByUser(userId: number): Promise<SarlaftCheckResponse> {
    return await fetchApi(`/sarlaft/user/${userId}`);
  },

  async triggerCheck(data: {
    user_id: number;
    document_number: str;
    document_type?: str;
    fecha_expedicion?: str;
    investment_request_id?: number;
  }): Promise<any> {
    return await fetchApi('/sarlaft/check', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  getPdfUrl(checkId: number): string {
    return getMediaUrl(`/api/v1/sarlaft/pdf/${checkId}`);
  }
};
