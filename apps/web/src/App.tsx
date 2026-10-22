import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Alert, Dropdown, Empty, Input, Modal, Select, Skeleton, Table, Tag, Tooltip, message } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  Activity, ArrowUpRight, Bell, Building2, ChevronDown, ChevronRight, Copy,
  CircleHelp, Command, Download, Ellipsis, FileClock, FileText, LayoutDashboard, LogOut,
  ClipboardList, Menu, MoreHorizontal, Share2, Settings2, Shield, ShieldCheck, UserRoundPlus, Users, WalletCards, X,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';
import { Avatar } from './components/ui/Avatar';
import { Button } from './components/ui/Button';
import { StatusPill } from './components/StatusPill';
import { LoginPage } from './pages/LoginPage';
import { LoanApplicationsPage } from './pages/LoanApplicationsPage';
import { api, clearToken, getToken, saveToken, type Branch, type Company, type CustomerAccount, type CustomerCredentials, type Dashboard, type KycDetails, type SessionUser, type TeamUser, type Transfer, type TransferPage } from './lib/api';
import { formatDate, formatMoney } from './lib/utils';

type Page = 'overview' | 'transfers' | 'branches' | 'team' | 'audit' | 'kyc' | 'customers' | 'loan-applications';
const nav = [
  { key: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
  { key: 'transfers' as const, label: 'Transfers', icon: WalletCards },
  { key: 'kyc' as const, label: 'KYC onboarding', icon: UserRoundPlus },
  { key: 'customers' as const, label: 'Customer accounts', icon: Users },
  { key: 'loan-applications' as const, label: 'Loan applications', icon: ClipboardList },
  { key: 'branches' as const, label: 'Branches', icon: Building2 },
  { key: 'team' as const, label: 'Team & access', icon: Users },
  { key: 'audit' as const, label: 'Audit log', icon: FileClock },
];
const roleName: Record<string, string> = { PLATFORM_ADMIN: 'Platform admin', COMPANY_ADMIN: 'Company admin', BRANCH_MANAGER: 'Branch manager', OPERATOR: 'Operator', AUDITOR: 'Auditor' };

export default function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loadingSession, setLoadingSession] = useState(Boolean(getToken()));
  const [loggingIn, setLoggingIn] = useState(false);
  const [page, setPage] = useState<Page>('overview');
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [transferPageData, setTransferPageData] = useState<TransferPage | null>(null);
  const [transferPage, setTransferPage] = useState(1);
  const [transferSearch, setTransferSearch] = useState('');
  const [transferStatus, setTransferStatus] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [team, setTeam] = useState<TeamUser[]>([]);
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [sharedCredentials, setSharedCredentials] = useState<CustomerCredentials | null>(null);
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [audit, setAudit] = useState<Awaited<ReturnType<typeof api.audit>>>([]);
  const [companyId, setCompanyId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [error, setError] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);

  const logout = useCallback(() => { clearToken(); setUser(null); setDashboard(null); setPage('overview'); }, []);
  const loadDashboard = useCallback(async () => {
    if (!user) return;
    setError('');
    try { setDashboard(await api.dashboard({ ...(user.role === 'PLATFORM_ADMIN' && companyId ? { companyId } : {}), ...(branchId ? { branchId } : {}) })); }
    catch (e) { if (!getToken()) logout(); else setError(e instanceof Error ? e.message : 'Unable to load dashboard.'); }
  }, [user, companyId, branchId, logout]);

  useEffect(() => { if (getToken()) api.me().then(setUser).catch(logout).finally(() => setLoadingSession(false)); }, [logout]);
  useEffect(() => {
    if (!user) return;
    api.companies().then(setCompanies).catch(() => undefined);
    api.branches().then(setBranches).catch(() => undefined);
  }, [user]);
  useEffect(() => { void loadDashboard(); }, [loadDashboard]);
  useEffect(() => {
    if (!user || page !== 'transfers') return;
    api.transfers({ page: transferPage, pageSize: 10, search: transferSearch, status: transferStatus, ...(user.role === 'PLATFORM_ADMIN' && companyId ? { companyId } : {}), ...(branchId ? { branchId } : {}) })
      .then(setTransferPageData).catch((e) => setError(e instanceof Error ? e.message : 'Unable to load transfers.'));
  }, [user, page, transferPage, transferSearch, transferStatus, companyId, branchId]);
  useEffect(() => {
    if (!user || page === 'overview' || page === 'transfers') return;
    if (page === 'branches') api.branches().then(setBranches).catch((e) => setError(e.message));
    if (page === 'team') api.team().then(setTeam).catch((e) => setError(e.message));
    if (page === 'audit') api.audit().then(setAudit).catch((e) => setError(e.message));
    if (page === 'customers') api.customers({ ...(user.role === 'PLATFORM_ADMIN' && companyId ? { companyId } : {}), ...(branchId ? { branchId } : {}) }).then(setCustomers).catch((e) => setError(e.message));
  }, [page, user, companyId, branchId]);

  const signIn = async (email: string, password: string) => {
    setLoggingIn(true);
    try { const result = await api.login(email, password); saveToken(result.accessToken); setUser(result.user); }
    finally { setLoggingIn(false); }
  };

  if (loadingSession) return <div className="flex min-h-screen items-center justify-center bg-canvas"><div className="w-64"><Skeleton active /></div></div>;
  if (!user) return <LoginPage onLogin={signIn} loading={loggingIn} />;

  const visibleNav = nav.filter((item) => item.key !== 'team' || ['PLATFORM_ADMIN', 'COMPANY_ADMIN', 'BRANCH_MANAGER'].includes(user.role)).filter((item) => item.key !== 'audit' || ['PLATFORM_ADMIN', 'COMPANY_ADMIN', 'BRANCH_MANAGER', 'AUDITOR'].includes(user.role)).filter((item) => !['kyc', 'customers'].includes(item.key) || user.role !== 'AUDITOR');
  const company = companies.find((item) => item.id === companyId);
  const currentBranch = branches.find((item) => item.id === branchId);
  const pageLabel = nav.find((item) => item.key === page)?.label ?? (page === 'team' ? 'Team & access' : page === 'audit' ? 'Audit log' : 'Overview');
  const onSelectCompany = (value: string) => { setCompanyId(value); setBranchId(''); };

  return <div className="min-h-screen bg-[#f5f6f8] text-ink">
    {mobileMenu && <button className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden" onClick={() => setMobileMenu(false)} aria-label="Close menu" />}
    <aside className={`sidebar fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col border-r border-slate-200/70 bg-white px-4 transition-transform lg:translate-x-0 ${mobileMenu ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-slate-100 px-1"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#254db8] text-white"><span className="text-sm font-bold">m</span></div><div><p className="text-sm font-bold tracking-[-.025em]">MFS <span className="font-medium text-slate-400">Portal</span></p><p className="mt-0.5 text-[9px] font-bold uppercase tracking-[.19em] text-slate-400">Operations</p></div></div><button onClick={() => setMobileMenu(false)} className="text-slate-400 lg:hidden"><X size={18} /></button></div>
      <button onClick={() => setCompanyId(user.companyId ?? '')} className="mt-5 flex items-center gap-3 rounded-xl border border-slate-200/80 p-2.5 text-left hover:bg-slate-50"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f0f3fa] text-[#4a5c84]"><Building2 size={15} /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{company?.name ?? (user.role === 'PLATFORM_ADMIN' ? 'All companies' : 'MFS Myanmar')}</p><p className="mt-0.5 truncate text-[10px] text-slate-400">{currentBranch?.name ?? (company ? 'All branches' : 'Organization')}</p></div><ChevronDown size={14} className="text-slate-400" /></button>
      <div className="mt-8 px-2 text-[9px] font-bold uppercase tracking-[.15em] text-slate-400">Workspace</div>
      <nav className="mt-2 space-y-1">{visibleNav.map(({ key, label, icon: Icon }) => <button key={key} onClick={() => { setPage(key); setMobileMenu(false); }} className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[12px] font-medium transition-colors ${page === key ? 'bg-[#eef2fc] text-[#315bd6]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}><Icon size={16} strokeWidth={1.8} /><span className="flex-1">{label}</span></button>)}</nav>
      <div className="mt-8 px-2 text-[9px] font-bold uppercase tracking-[.15em] text-slate-400">Manage</div>
      <nav className="mt-2 space-y-1"><button onClick={() => setPage('team')} className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[12px] font-medium text-slate-600 hover:bg-slate-50"><Shield size={16} strokeWidth={1.8} />Roles & permissions</button><button onClick={() => setPage('branches')} className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[12px] font-medium text-slate-600 hover:bg-slate-50"><Settings2 size={16} strokeWidth={1.8} />Settings</button></nav>
      <div className="mt-auto"><div className="mb-3 rounded-xl bg-[#f7f8fa] p-3"><div className="flex items-center gap-2 text-[11px] font-semibold text-slate-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />All systems operational</div><p className="mt-1.5 pl-3.5 text-[10px] text-slate-400">Updated just now</p></div><button onClick={() => setPage('audit')} className="flex w-full items-center gap-3 border-t border-slate-100 py-4 text-left"><Avatar name={user.name} size="sm" /><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold">{user.name}</p><p className="mt-0.5 truncate text-[10px] text-slate-400">{roleName[user.role] ?? user.role}</p></div><Dropdown menu={{ items: [{ key: 'audit', label: 'Audit log', icon: <FileText size={14} /> }, { type: 'divider' }, { key: 'logout', label: 'Sign out', icon: <LogOut size={14} />, danger: true }], onClick: ({ key }) => key === 'logout' ? logout() : setPage('audit') }} trigger={['click']}><button onClick={(e) => e.stopPropagation()} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"><MoreHorizontal size={17} /></button></Dropdown></button></div>
    </aside>

    <main className="min-h-screen lg:pl-[250px]">
      <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-slate-200/70 bg-white/90 px-5 backdrop-blur lg:px-9"><div className="flex items-center gap-3"><button onClick={() => setMobileMenu(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"><Menu size={18} /></button><div className="hidden items-center gap-2 text-[11px] text-slate-400 sm:flex"><span>Workspace</span><ChevronRight size={13} /><span className="font-semibold text-slate-700">{pageLabel}</span></div><h1 className="text-sm font-semibold sm:hidden">{pageLabel}</h1></div><div className="flex items-center gap-2 sm:gap-3"><div className="hidden items-center gap-1 rounded-lg bg-[#f5f6f8] px-2 py-1.5 text-[10px] text-slate-500 md:flex"><Command size={12} /> <span>Search</span><kbd className="ml-2 rounded border border-slate-200 bg-white px-1 py-0.5 text-[9px]">⌘ K</kbd></div><Tooltip title="Help center"><button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><CircleHelp size={17} /></button></Tooltip><Tooltip title="Notifications"><button className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Bell size={17} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full border border-white bg-rose-500" /></button></Tooltip><div className="mx-1 h-6 border-l border-slate-200" /><button className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-50"><Avatar name={user.name} size="sm" /><span className="hidden text-[11px] font-semibold sm:block">{user.name.split(' ')[0]}</span><ChevronDown size={13} className="text-slate-400" /></button></div></header>
      <div className="mx-auto max-w-[1500px] px-5 py-7 lg:px-9 lg:py-8">
        {error && <Alert className="mb-5" type="error" showIcon closable message={error} onClose={() => setError('')} />}
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.12em] text-slate-400"><span>{new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())}</span><span className="h-1 w-1 rounded-full bg-slate-300" /><span className="text-emerald-600">Live overview</span></div><h2 className="text-[25px] font-semibold tracking-[-.04em] text-[#1d2533]">Good morning, {user.name.split(' ')[0]} <span>👋</span></h2><p className="mt-1 text-[12px] text-slate-500">Here’s what’s happening across your operations today.</p></div><div className="flex flex-wrap items-center gap-2"><Select value={companyId || undefined} onChange={onSelectCompany} placeholder="All companies" allowClear className="filter-select min-w-[155px]" options={companies.map((item) => ({ label: item.name, value: item.id }))} disabled={user.role !== 'PLATFORM_ADMIN'} /><Select value={branchId || undefined} onChange={(value) => setBranchId(value ?? '')} placeholder="All branches" allowClear className="filter-select min-w-[145px]" options={branches.filter((item) => !companyId || item.companyId === companyId).map((item) => ({ label: item.name, value: item.id }))} /><Button variant="outline" size="sm" onClick={() => window.print()}><Download size={14} />Export</Button></div></div>
        {page === 'overview' && <Overview dashboard={dashboard} onViewTransfers={() => setPage('transfers')} />}
        {page === 'transfers' && <Transfers result={transferPageData} onPageChange={setTransferPage} onFiltersChange={(search, status) => { setTransferPage(1); setTransferSearch(search); setTransferStatus(status); }} />}
        {page === 'branches' && <Branches branches={branches} />}
        {page === 'team' && <Team team={team} />}
        {page === 'audit' && <Audit audit={audit} />}
        {page === 'kyc' && <KycOnboarding branches={branches.filter((item) => item.status === 'ACTIVE' && (!companyId || item.companyId === companyId))} initialBranch={branchId || user.branchIds[0] || ''} onSubmit={async (details) => {
          try {
            const created = await api.onboardCustomer(details);
            setSharedCredentials({ accountNumber: created.accountNumber, fullName: created.fullName, phone: created.credentials.username, password: created.credentials.password });
            setCredentialsOpen(true);
            setPage('customers');
            setError('');
            message.success('KYC completed and customer account created.');
            const next = await api.customers({ ...(user.role === 'PLATFORM_ADMIN' && companyId ? { companyId } : {}), ...(branchId ? { branchId } : {}) });
            setCustomers(next);
            return true;
          } catch (e) { setError(e instanceof Error ? e.message : 'Unable to complete KYC.'); return false; }
        }} />}
        {page === 'customers' && <CustomerAccounts accounts={customers} onSearch={async (search) => {
          try { setCustomers(await api.customers({ ...(user.role === 'PLATFORM_ADMIN' && companyId ? { companyId } : {}), ...(branchId ? { branchId } : {}), ...(search ? { search } : {}) })); }
          catch (e) { setError(e instanceof Error ? e.message : 'Unable to load customer accounts.'); }
        }} onShare={async (customer) => {
          try { setSharedCredentials(await api.customerCredentials(customer.id)); setCredentialsOpen(true); }
          catch (e) { setError(e instanceof Error ? e.message : 'Unable to load account credentials.'); }
        }} />}
        {page === 'loan-applications' && <LoanApplicationsPage branches={branches} initialBranch={user.branchIds[0] || ''} companyId={user.role === 'PLATFORM_ADMIN' ? companyId : ''} branchId={branchId} canWrite={user.role !== 'AUDITOR'} />}
        <CredentialsModal credentials={sharedCredentials} open={credentialsOpen} onClose={() => setCredentialsOpen(false)} />
        <footer className="mt-9 flex flex-col justify-between gap-2 border-t border-slate-200/80 py-5 text-[10px] text-slate-400 sm:flex-row"><span>© 2026 MFS Financial Services <span className="mx-1.5">·</span> Internal operations</span><div className="flex items-center gap-4"><span>Privacy</span><span>Security</span><span className="flex items-center gap-1"><ShieldCheck size={12} /> Secured session</span></div></footer>
      </div>
    </main>
  </div>;
}

function KycOnboarding({ branches, initialBranch, onSubmit }: { branches: Branch[]; initialBranch: string; onSubmit: (details: KycDetails) => Promise<boolean> }) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<KycDetails>({ fullName: '', phone: '', email: '', nationalId: '', dateOfBirth: '', address: '', branchId: initialBranch });
  const update = (key: keyof KycDetails, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try { if (await onSubmit(form)) setForm({ fullName: '', phone: '', email: '', nationalId: '', dateOfBirth: '', address: '', branchId: initialBranch }); }
    finally { setSubmitting(false); }
  };
  const fieldClass = 'mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
  return <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
    <div className="border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><UserRoundPlus size={17} /></span><div><h3 className="text-[13px] font-semibold">New customer KYC</h3><p className="mt-1 text-[10px] text-slate-400">Complete identity details to create the customer account.</p></div></div></div>
    <form onSubmit={submit} className="p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-[11px] font-semibold text-slate-600">Full legal name<input className={fieldClass} value={form.fullName} onChange={(e) => update('fullName', e.target.value)} autoComplete="name" required minLength={2} maxLength={120} placeholder="Customer's full name" /></label>
        <label className="text-[11px] font-semibold text-slate-600">Phone number<input className={fieldClass} value={form.phone} onChange={(e) => update('phone', e.target.value)} autoComplete="tel" required type="tel" placeholder="09 123 456 789" /></label>
        <label className="text-[11px] font-semibold text-slate-600">Email address <span className="font-normal text-slate-400">(optional)</span><input className={fieldClass} value={form.email} onChange={(e) => update('email', e.target.value)} autoComplete="email" type="email" placeholder="name@example.com" /></label>
        <label className="text-[11px] font-semibold text-slate-600">National ID number<input className={fieldClass} value={form.nationalId} onChange={(e) => update('nationalId', e.target.value)} required minLength={4} maxLength={60} placeholder="Enter national ID" /></label>
        <label className="text-[11px] font-semibold text-slate-600">Date of birth<input className={fieldClass} value={form.dateOfBirth} onChange={(e) => update('dateOfBirth', e.target.value)} required type="date" max={new Date().toISOString().slice(0, 10)} /></label>
        <label className="text-[11px] font-semibold text-slate-600">Registering branch<select className={fieldClass} value={form.branchId} onChange={(e) => update('branchId', e.target.value)} required><option value="" disabled>Select branch</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name} · {branch.city}</option>)}</select></label>
        <label className="text-[11px] font-semibold text-slate-600 sm:col-span-2">Residential address<textarea className="mt-1.5 min-h-[92px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[12px] text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" value={form.address} onChange={(e) => update('address', e.target.value)} required minLength={5} maxLength={500} placeholder="Street, township, city" /></label>
      </div>
      <div className="mt-5 flex flex-col justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center"><p className="text-[10px] text-slate-400">Submitting creates the account and generates a temporary password.</p><Button type="submit" disabled={!branches.length || submitting}><UserRoundPlus size={14} />{submitting ? 'Creating account…' : 'Complete KYC & create account'}</Button></div>
    </form>
  </section>;
}

function CustomerAccounts({ accounts, onSearch, onShare }: { accounts: CustomerAccount[]; onSearch: (search: string) => void; onShare: (customer: CustomerAccount) => void }) {
  const columns: ColumnsType<CustomerAccount> = [
    { title: 'CUSTOMER', dataIndex: 'fullName', render: (value, row) => <div className="flex items-center gap-3"><Avatar name={value} size="sm" /><div><div className="font-semibold text-slate-700">{value}</div><div className="mt-0.5 text-[10px] text-slate-400">{row.phone}</div></div></div> },
    { title: 'ACCOUNT NUMBER', dataIndex: 'accountNumber', render: (value) => <span className="font-semibold text-[#315bd6]">{value}</span> },
    { title: 'BRANCH', dataIndex: 'branch' },
    { title: 'CREATED', dataIndex: 'createdAt', responsive: ['md'], render: (value) => <span className="text-slate-500">{formatDate(value)}</span> },
    { title: '', key: 'actions', align: 'right', render: (_value, row) => <Button variant="outline" size="sm" onClick={() => onShare(row)}><Share2 size={13} />Share</Button> },
  ];
  return <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white"><div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:px-5"><div><h3 className="text-[13px] font-semibold">Customer accounts</h3><p className="mt-1 text-[10px] text-slate-400">Accounts created after completing customer KYC</p></div><Input.Search allowClear onSearch={onSearch} onChange={(e) => { if (!e.target.value) onSearch(''); }} placeholder="Search name, phone or account" className="max-w-[280px]" /></div><Table rowKey="id" columns={columns} dataSource={accounts} pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (total) => `${total} accounts` }} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No customer accounts yet" /> }} /></section>;
}

function CredentialsModal({ credentials, open, onClose }: { credentials: CustomerCredentials | null; open: boolean; onClose: () => void }) {
  if (!credentials) return null;
  const text = `MFS customer account\nName: ${credentials.fullName}\nAccount number: ${credentials.accountNumber}\nLogin: ${credentials.phone}\nTemporary password: ${credentials.password}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); message.success('Account details copied.'); }
    catch { message.error('Clipboard access is unavailable in this browser.'); }
  };
  const share = async () => {
    if (!navigator.share) { await copy(); return; }
    try { await navigator.share({ title: 'Your MFS customer account', text }); }
    catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) message.error('Unable to open the share menu.'); }
  };
  return <Modal open={open} onCancel={onClose} footer={null} centered title={<div><div className="text-[15px] font-semibold text-slate-800">Share customer account</div><p className="mt-1 text-[11px] font-normal text-slate-400">Copy the login details or share them using your device.</p></div>}>
    <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 p-4"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-blue-700">Customer login</p><div className="mt-3 grid grid-cols-[110px_1fr] gap-y-3 text-[11px]"><span className="text-slate-500">Name</span><b className="text-slate-800">{credentials.fullName}</b><span className="text-slate-500">Account number</span><b className="font-mono text-slate-800">{credentials.accountNumber}</b><span className="text-slate-500">Username</span><b className="font-mono text-slate-800">{credentials.phone}</b><span className="text-slate-500">Password</span><b className="font-mono text-slate-800">{credentials.password}</b></div></div>
    <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="outline" onClick={copy}><Copy size={14} />Copy details</Button><Button onClick={share}><Share2 size={14} />Share with customer</Button></div>
  </Modal>;
}

function Overview({ dashboard, onViewTransfers }: { dashboard: Dashboard | null; onViewTransfers: () => void }) {
  const metric = dashboard?.metrics;
  const cards = [
    { title: 'Total transfers', value: metric?.transfers.toLocaleString() ?? '—', change: '+12.8%', icon: WalletCards, color: 'blue' },
    { title: 'Transfer volume', value: metric ? formatMoney(metric.volume) : '—', change: '+8.2%', icon: Activity, color: 'violet' },
    { title: 'Completion rate', value: metric ? `${metric.completionRate}%` : '—', change: '+2.4%', icon: ShieldCheck, color: 'green' },
    { title: 'Active branches', value: metric?.activeBranches.toString() ?? '—', change: 'Across org', icon: Building2, color: 'amber' },
  ];
  return <>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ title, value, change, icon: Icon, color }) => <div key={title} className="metric-card rounded-xl border border-slate-200/80 bg-white p-4"><div className="flex items-center justify-between"><span className="text-[11px] font-medium text-slate-500">{title}</span><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${color === 'blue' ? 'bg-blue-50 text-blue-600' : color === 'violet' ? 'bg-violet-50 text-violet-600' : color === 'green' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}><Icon size={15} /></span></div><div className="mt-3 flex items-end justify-between"><strong className="text-[25px] font-semibold leading-none tracking-[-.04em]">{value}</strong><span className={`mb-0.5 flex items-center gap-0.5 text-[10px] font-semibold ${change.startsWith('+') ? 'text-emerald-600' : 'text-slate-400'}`}>{change.startsWith('+') && <ArrowUpRight size={12} />}{change}</span></div><p className="mt-2 text-[10px] text-slate-400">Last 30 days</p></div>)}</div>
    <div className="mt-4 grid gap-4 xl:grid-cols-[1.7fr_1fr]"><section className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5"><div className="flex items-start justify-between"><div><h3 className="text-[13px] font-semibold">Transfer volume</h3><p className="mt-1 text-[10px] text-slate-400">Daily completed volume · Last 30 days</p></div><span className="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-500">USD</span></div><div className="mt-5 h-[220px] w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={dashboard?.trend.map((item) => ({ day: new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(item.day)), volume: item.volume })) ?? []} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}><defs><linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#315bd6" stopOpacity={0.18} /><stop offset="100%" stopColor="#315bd6" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid stroke="#eef0f4" vertical={false} /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#9aa2af', fontSize: 10 }} tickMargin={10} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#9aa2af', fontSize: 10 }} tickFormatter={(value) => `$${new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value))}`} /><ChartTooltip contentStyle={{ border: '1px solid #e9edf2', borderRadius: 10, fontSize: 11 }} formatter={(value) => [formatMoney(Number(value)), 'Volume']} /><Area type="monotone" dataKey="volume" stroke="#315bd6" strokeWidth={2} fill="url(#volumeFill)" activeDot={{ r: 4, strokeWidth: 0 }} /></AreaChart></ResponsiveContainer></div><div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400"><span className="h-2 w-2 rounded-full bg-[#315bd6]" />Completed transfer volume <span className="ml-auto">Values shown in USD</span></div></section>
      <section className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5"><div className="flex items-start justify-between"><div><h3 className="text-[13px] font-semibold">Transfer status</h3><p className="mt-1 text-[10px] text-slate-400">Current 30 day breakdown</p></div><button className="rounded-md p-1 text-slate-400 hover:bg-slate-50"><Ellipsis size={17} /></button></div><div className="mt-5 space-y-[17px]">{[['Completed', 'completed', '#14a674'], ['Processing', 'processing', '#4778e8'], ['Pending', 'pending', '#e6a53a'], ['In review', 'review', '#8a62d7'], ['Failed', 'failed', '#dc6373']].map(([label, key, color]) => { const value = dashboard?.statuses[key] ?? 0; const total = Math.max(metric?.transfers ?? 0, 1); return <div key={key}><div className="mb-1.5 flex items-center justify-between text-[10px]"><span className="flex items-center gap-2 text-slate-600"><span className="h-2 w-2 rounded-full" style={{ background: color }} />{label}</span><span className="font-semibold text-slate-700">{value} <span className="font-normal text-slate-400">({Math.round(value / total * 100)}%)</span></span></div><div className="h-[5px] overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${value / total * 100}%`, background: color }} /></div></div>; })}</div><div className="mt-5 rounded-lg bg-[#f7f8fa] p-3"><div className="flex items-center justify-between"><span className="text-[10px] font-medium text-slate-500">Needs your attention</span><span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-700">{metric?.pendingReview ?? 0}</span></div><p className="mt-1 text-[11px] font-semibold">Transfers pending review</p></div></section></div>
    <div className="mt-4 grid gap-4 xl:grid-cols-[1.7fr_1fr]"><section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-5"><div><h3 className="text-[13px] font-semibold">Recent transfers</h3><p className="mt-1 text-[10px] text-slate-400">Latest activity across all branches</p></div><button onClick={onViewTransfers} className="text-[10px] font-semibold text-[#315bd6] hover:text-blue-800">View all transfers <ArrowUpRight size={12} className="ml-1 inline" /></button></div><TransferTable data={dashboard?.transfers ?? []} compact /></section><ActivityPanel data={dashboard?.activity ?? []} /></div>
  </>;
}

function TransferTable({ data, compact = false, pagination, onPageChange }: { data: Transfer[]; compact?: boolean; pagination?: false | TablePaginationConfig; onPageChange?: (page: number) => void }) {
  const columns: ColumnsType<Transfer> = [
    { title: 'REFERENCE', dataIndex: 'reference', key: 'reference', render: (value) => <span className="font-semibold text-[#315bd6]">{value}</span> },
    { title: 'CUSTOMER', dataIndex: 'customer', key: 'customer', render: (value) => <span className="font-medium text-slate-700">{value}</span> },
    { title: 'DESTINATION', dataIndex: 'destination', key: 'destination', responsive: ['md'] },
    { title: 'BRANCH', dataIndex: 'branch', key: 'branch', responsive: ['lg'] },
    { title: 'AMOUNT', dataIndex: 'amount', key: 'amount', align: 'right', render: (value, row) => <span className="font-semibold text-slate-700">{formatMoney(value, row.currency)}</span> },
    { title: 'STATUS', dataIndex: 'status', key: 'status', render: (value) => <StatusPill value={value} /> },
    ...(!compact ? [{ title: 'DATE', dataIndex: 'createdAt', key: 'createdAt', render: (value: string) => <span className="text-slate-500">{formatDate(value)}</span> }] : []),
  ];
  return <Table rowKey="id" size="small" columns={columns} dataSource={data} pagination={compact ? false : pagination ?? { pageSize: 8, showSizeChanger: false, showTotal: (total) => `${total} transfers` }} onChange={(pageInfo) => { if (pageInfo.current) onPageChange?.(pageInfo.current); }} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No transfers found" /> }} />;
}

function Transfers({ result, onPageChange, onFiltersChange }: { result: TransferPage | null; onPageChange: (page: number) => void; onFiltersChange: (search: string, status: string) => void }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  return <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white"><div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:px-5"><div><h3 className="text-[13px] font-semibold">All transfers</h3><p className="mt-1 text-[10px] text-slate-400">Review and monitor transactions</p></div><div className="flex flex-wrap items-center gap-2"><Input.Search value={search} onChange={(e) => setSearch(e.target.value)} onSearch={(value) => onFiltersChange(value, status)} placeholder="Search reference or customer" className="max-w-[250px]" /><Select value={status || undefined} onChange={(value) => { setStatus(value ?? ''); onFiltersChange(search, value ?? ''); }} allowClear placeholder="All statuses" className="w-[135px]" options={['COMPLETED', 'PROCESSING', 'PENDING', 'REVIEW', 'FAILED'].map((value) => ({ label: value.toLowerCase(), value }))} /></div></div><TransferTable data={result?.items ?? []} pagination={{ current: result?.page ?? 1, pageSize: result?.pageSize ?? 10, total: result?.total ?? 0, showSizeChanger: false, showTotal: (total) => `${total} transfers` }} onPageChange={onPageChange} /></section>;
}

function Branches({ branches }: { branches: Branch[] }) {
  const columns: ColumnsType<Branch> = [
    { title: 'BRANCH', dataIndex: 'name', render: (value, row) => <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Building2 size={16} /></div><div><div className="font-semibold text-slate-700">{value}</div><div className="mt-0.5 text-[10px] text-slate-400">{row.code}</div></div></div> },
    { title: 'CITY', dataIndex: 'city' }, { title: 'STATUS', dataIndex: 'status', render: (v) => <StatusPill value={v} /> },
    { title: '', key: 'actions', align: 'right', render: () => <button className="rounded p-1 text-slate-400 hover:bg-slate-100"><MoreHorizontal size={16} /></button> },
  ];
  return <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white"><div className="flex justify-between border-b border-slate-100 p-4 sm:px-5"><div><h3 className="text-[13px] font-semibold">Branches</h3><p className="mt-1 text-[10px] text-slate-400">Locations available within your access scope</p></div><Button size="sm" onClick={() => window.alert('Branch creation can be enabled for your deployment.')}>+ Add branch</Button></div><Table rowKey="id" columns={columns} dataSource={branches} pagination={{ pageSize: 8, showSizeChanger: false }} /></section>;
}

function Team({ team }: { team: TeamUser[] }) {
  const columns: ColumnsType<TeamUser> = [
    { title: 'TEAM MEMBER', dataIndex: 'name', render: (value, row) => <div className="flex items-center gap-3"><Avatar name={value} size="sm" /><div><div className="font-semibold text-slate-700">{value}</div><div className="mt-0.5 text-[10px] text-slate-400">{row.email}</div></div></div> },
    { title: 'ROLE', dataIndex: 'role', render: (value) => <Tag bordered={false} className="rounded-md bg-[#f2f4f8] px-2 py-1 text-[10px] font-semibold text-slate-600">{roleName[value] ?? value}</Tag> },
    { title: 'BRANCH ACCESS', dataIndex: 'branches', render: (value: string[]) => <span className="text-slate-600">{value.length ? value.join(', ') : 'All branches'}</span> },
    { title: 'STATUS', dataIndex: 'active', render: (value) => <StatusPill value={value ? 'ACTIVE' : 'INACTIVE'} /> },
    { title: '', key: 'actions', align: 'right', render: () => <button className="rounded p-1 text-slate-400 hover:bg-slate-100"><MoreHorizontal size={16} /></button> },
  ];
  return <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white"><div className="flex justify-between border-b border-slate-100 p-4 sm:px-5"><div><h3 className="text-[13px] font-semibold">Team & access</h3><p className="mt-1 text-[10px] text-slate-400">People and their assigned organization roles</p></div><Button size="sm" onClick={() => window.alert('Invite flow can be enabled for your deployment.')}>+ Invite member</Button></div><Table rowKey="id" columns={columns} dataSource={team} pagination={{ pageSize: 8, showSizeChanger: false }} /></section>;
}

function ActivityPanel({ data }: { data: Dashboard['activity'] }) {
  const actions: Record<string, string> = { 'branch.settings.updated': 'updated branch settings', 'transfer.created': 'created a transfer', 'report.exported': 'exported an operations report', 'auth.login': 'signed in' };
  return <section className="rounded-xl border border-slate-200/80 bg-white"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-5"><div><h3 className="text-[13px] font-semibold">Activity</h3><p className="mt-1 text-[10px] text-slate-400">Recent actions from your team</p></div><button className="text-[10px] font-semibold text-[#315bd6]">View log</button></div><div className="divide-y divide-slate-50 px-4 sm:px-5">{data.length ? data.map((item) => <div key={item.id} className="flex gap-3 py-3.5"><Avatar name={item.actor} size="sm" /><div className="min-w-0 flex-1"><p className="text-[10px] leading-5 text-slate-600"><span className="font-semibold text-slate-800">{item.actor}</span> {actions[item.action] ?? item.action.replaceAll('.', ' ')}.</p><p className="mt-1 text-[9px] text-slate-400">{formatDate(item.createdAt)}</p></div><span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#b9c9fa]" /></div>) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No recent activity" />}</div><button className="w-full border-t border-slate-100 py-3 text-[10px] font-semibold text-[#315bd6] hover:bg-slate-50">View all activity <ArrowUpRight size={12} className="ml-1 inline" /></button></section>;
}

function Audit({ audit }: { audit: Awaited<ReturnType<typeof api.audit>> }) {
  const columns: ColumnsType<(typeof audit)[number]> = [
    { title: 'ACTOR', dataIndex: 'user', render: (value) => <span className="font-semibold text-slate-700">{value?.name ?? 'System'}</span> },
    { title: 'ACTION', dataIndex: 'action', render: (value) => <span className="font-medium text-slate-700">{value.replaceAll('.', ' ')}</span> },
    { title: 'ENTITY', dataIndex: 'entityType', render: (value, row) => <span className="capitalize text-slate-500">{value}{row.entityId ? ` · ${row.entityId}` : ''}</span> },
    { title: 'TIME', dataIndex: 'createdAt', render: (value) => <span className="text-slate-500">{formatDate(value)}</span> },
  ];
  return <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white"><div className="border-b border-slate-100 p-4 sm:px-5"><h3 className="text-[13px] font-semibold">Audit log</h3><p className="mt-1 text-[10px] text-slate-400">A record of security and workspace activity</p></div><Table rowKey="id" columns={columns} dataSource={audit} pagination={{ pageSize: 10, showSizeChanger: false }} /></section>;
}
