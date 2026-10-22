export type SessionUser = { sub: string; email: string; name: string; role: string; companyId: string | null; branchIds: string[] };
export type Transfer = { id: string; reference: string; customer: string; destination: string; amount: number; currency: string; status: string; branch: string; createdAt: string };
export type TransferPage = { items: Transfer[]; page: number; pageSize: number; total: number };
export type Dashboard = {
  metrics: { transfers: number; volume: number; completionRate: number; activeBranches: number; teamMembers: number; pendingReview: number };
  statuses: Record<string, number>;
  trend: { day: string; volume: number; count: number }[];
  transfers: Transfer[];
  activity: { id: string; action: string; actor: string; entity: string; createdAt: string }[];
};
export type Branch = { id: string; name: string; code: string; city: string; status: string; companyId: string };
export type TeamUser = { id: string; email: string; name: string; role: string; active: boolean; company: string; branches: string[] };
export type Company = { id: string; name: string; code: string; status: string };
export type CustomerAccount = { id: string; accountNumber: string; fullName: string; phone: string; email: string | null; branch: string; createdAt: string };
export type CustomerCredentials = { accountNumber: string; fullName: string; phone: string; password: string };
export type CustomerKycSummary = { fullName: string; phone: string; nationalId: string; dateOfBirth: string; address: string };
export type KycDetails = { fullName: string; phone: string; email: string; nationalId: string; dateOfBirth: string; address: string; branchId: string };
export type LoanApplication = { id: string; applicationNumber: string; applicantName: string; phone: string | null; loanType: string; loanAmount: number | null; tenureMonths: number | null; status: string; createdAt: string; updatedAt: string; branch: string };
export type LoanApplicationData = Record<string, unknown>;

const tokenKey = 'mfs.accessToken';
export const getToken = () => sessionStorage.getItem(tokenKey);
export const saveToken = (token: string) => sessionStorage.setItem(tokenKey, token);
export const clearToken = () => sessionStorage.removeItem(tokenKey);

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } });
  if (response.status === 401 && token) clearToken();
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message ?? 'Unable to complete your request.');
  return body as T;
}

export const api = {
  login: (email: string, password: string) => request<{ accessToken: string; user: SessionUser }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request<SessionUser>('/api/auth/me'),
  dashboard: (filters: { companyId?: string; branchId?: string } = {}) => {
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => Boolean(value)) as [string, string][]);
    return request<Dashboard>(`/api/dashboard${params.size ? `?${params}` : ''}`);
  },
  transfers: (filters: { page?: number; pageSize?: number; search?: string; status?: string; companyId?: string; branchId?: string } = {}) => {
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== undefined && value !== '') as [string, string][]);
    return request<TransferPage>(`/api/transfers${params.size ? `?${params}` : ''}`);
  },
  branches: () => request<Branch[]>('/api/organization/branches'),
  team: () => request<TeamUser[]>('/api/organization/team'),
  companies: () => request<Company[]>('/api/organization/companies'),
  audit: () => request<{ id: string; action: string; entityType: string; entityId: string | null; metadata: unknown; createdAt: string; user: { name: string; email: string } | null }[]>('/api/audit'),
  customers: (filters: { companyId?: string; branchId?: string; search?: string } = {}) => {
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => Boolean(value)) as [string, string][]);
    return request<CustomerAccount[]>(`/api/customers${params.size ? `?${params}` : ''}`);
  },
  onboardCustomer: (details: KycDetails) => request<CustomerAccount & { credentials: { username: string; password: string } }>('/api/customers/onboard', { method: 'POST', body: JSON.stringify(details) }),
  customerCredentials: (id: string) => request<CustomerCredentials>(`/api/customers/${encodeURIComponent(id)}/credentials`),
  customerKycSummary: (id: string) => request<CustomerKycSummary>(`/api/customers/${encodeURIComponent(id)}/kyc-summary`),
  uploadLoanPhoto: async (file: File, companyId: string, branchId: string) => {
    const result = await request<{ documentId: string; uploadUrl: string; method: 'PUT'; headers: Record<string, string> }>('/api/files/upload-url', {
      method: 'POST', body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size, companyId, branchId }),
    });
    const uploaded = await fetch(result.uploadUrl, { method: result.method, headers: result.headers, body: file });
    if (!uploaded.ok) throw new Error('The customer photo could not be uploaded.');
    return result.documentId;
  },
  loanApplications: (filters: { companyId?: string; branchId?: string; search?: string; status?: string } = {}) => {
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => Boolean(value)) as [string, string][]);
    return request<LoanApplication[]>(`/api/loan-applications${params.size ? `?${params}` : ''}`);
  },
  loanApplication: (id: string) => request<{ id: string; applicationNumber: string; status: string; branchId: string; branch: string; applicationData: LoanApplicationData }>(`/api/loan-applications/${encodeURIComponent(id)}`),
  saveLoanApplication: (details: { branchId?: string; applicationData: LoanApplicationData; submit: boolean }, id?: string) => request<{ id: string; applicationNumber: string; status: string }>(id ? `/api/loan-applications/${encodeURIComponent(id)}` : '/api/loan-applications', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(details) }),
};
