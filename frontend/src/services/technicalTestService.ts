import { fetchApi } from './api';

export interface TestCaseResult {
  test_id: number;
  name: string;
  passed: boolean;
  expected?: any;
  actual?: any;
  error?: string;
}

export interface RunCodeResponse {
  success: boolean;
  syntax_error?: string;
  passed_tests: number;
  total_tests: number;
  all_passed: boolean;
  details: TestCaseResult[];
}

export interface IntegrityData {
  tab_switches: number;
  away_seconds: number;
  paste_events: number;
  max_pasted_length: number;
  keystrokes_count: number;
  code_length: number;
  ai_risk_level: 'low' | 'medium' | 'high';
  ai_risk_reasons: string[];
}

export interface TechnicalSubmission {
  id: number;
  candidate_name: string;
  candidate_email: string;
  candidate_phone?: string;
  language: string;
  code: string;
  passed_tests: number;
  total_tests: number;
  test_results: TestCaseResult[];
  integrity_data?: IntegrityData;
  time_spent_seconds: number;
  status: string;
  created_at: string;
}

export interface TestConfig {
  is_active: boolean;
  access_pin: string;
  max_code_length: number;
  max_submissions: number;
}

export const technicalTestService = {
  async runCode(code: string, language: string, access_pin?: string): Promise<RunCodeResponse> {
    const pin = access_pin || localStorage.getItem('gloint_eval_pin') || 'GLOINT-JR-2026';
    return fetchApi('/technical-test/run', {
      method: 'POST',
      headers: { 'X-Access-Pin': pin },
      body: JSON.stringify({ code, language, access_pin: pin })
    });
  },

  async submitTest(data: {
    candidate_name: string;
    candidate_email: string;
    candidate_phone?: string;
    language: string;
    code: string;
    access_pin: string;
    time_spent_seconds: number;
    test_results?: TestCaseResult[];
    integrity_data?: IntegrityData;
  }) {
    return fetchApi('/technical-test/submit', {
      method: 'POST',
      headers: { 'X-Access-Pin': data.access_pin },
      body: JSON.stringify(data)
    });
  },

  async getSubmissions(access_pin?: string): Promise<TechnicalSubmission[]> {
    const pin = access_pin || localStorage.getItem('gloint_eval_pin') || 'GLOINT-JR-2026';
    return fetchApi(`/technical-test/submissions?pin=${encodeURIComponent(pin)}`, {
      headers: { 'X-Access-Pin': pin }
    });
  },

  async getConfig(access_pin?: string): Promise<TestConfig> {
    const pin = access_pin || localStorage.getItem('gloint_eval_pin') || 'GLOINT-JR-2026';
    return fetchApi(`/technical-test/config?pin=${encodeURIComponent(pin)}`, {
      headers: { 'X-Access-Pin': pin }
    });
  },

  async updateConfig(data: { is_active?: boolean; access_pin?: string }, current_pin?: string) {
    const pin = current_pin || localStorage.getItem('gloint_eval_pin') || 'GLOINT-JR-2026';
    return fetchApi(`/technical-test/toggle-config?pin=${encodeURIComponent(pin)}`, {
      method: 'POST',
      headers: { 'X-Access-Pin': pin },
      body: JSON.stringify(data)
    });
  }
};
