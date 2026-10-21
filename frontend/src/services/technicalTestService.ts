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
    return fetchApi('/technical-test/run', {
      method: 'POST',
      body: JSON.stringify({ code, language, access_pin })
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
  }) {
    return fetchApi('/technical-test/submit', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getSubmissions(): Promise<TechnicalSubmission[]> {
    return fetchApi('/technical-test/submissions');
  },

  async getConfig(): Promise<TestConfig> {
    return fetchApi('/technical-test/config');
  },

  async updateConfig(data: { is_active?: boolean; access_pin?: string }) {
    return fetchApi('/technical-test/toggle-config', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};
