import { useState, type FormEvent } from 'react';
import { Alert, Input } from 'antd';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function LoginPage({ onLogin, loading }: { onLogin: (email: string, password: string) => Promise<void>; loading: boolean }) {
  const showDemo = import.meta.env.DEV;
  const [email, setEmail] = useState(showDemo ? 'admin@mfs.local' : '');
  const [password, setPassword] = useState(showDemo ? 'Welcome123!' : '');
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(''); try { await onLogin(email, password); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to sign in.'); } };
  return <div className="login-shell min-h-screen bg-[#f8f9fb] text-ink">
    <div className="mx-auto flex min-h-screen max-w-[1320px] flex-col px-6 py-6 lg:px-10">
      <header className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#254db8] text-white"><span className="text-[15px] font-bold tracking-tight">m</span></div><div><div className="text-[15px] font-bold tracking-[-.03em]">MFS <span className="font-medium text-slate-400">Portal</span></div><div className="text-[10px] font-medium uppercase tracking-[.18em] text-slate-400">Operations</div></div></div><div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex"><span className="h-2 w-2 rounded-full bg-emerald-500" /> All systems operational</div></header>
      <main className="grid flex-1 items-center gap-14 py-16 lg:grid-cols-[1.1fr_.9fr] lg:gap-20">
        <section className="mx-auto w-full max-w-[530px] lg:mx-0">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.12em] text-blue-700"><ShieldCheck size={14} /> Secure workspace</div>
          <h1 className="max-w-[510px] text-[42px] font-semibold leading-[1.12] tracking-[-.045em] text-[#1d2533] sm:text-[52px]">Your operations, <span className="text-[#315bd6]">in focus.</span></h1>
          <p className="mt-5 max-w-[440px] text-[15px] leading-7 text-slate-500">A clear view of every branch, transfer, and team member across your organization.</p>
          <div className="mt-12 hidden items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_-24px_rgba(24,39,75,.3)] sm:flex"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf2ff] text-[#315bd6]"><LockKeyhole size={18} /></div><div className="flex-1"><p className="text-sm font-semibold">Security you can count on</p><p className="mt-0.5 text-xs text-slate-500">Encrypted access with company and branch controls</p></div><span className="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500">JWT · RBAC</span></div>
        </section>
        <section className="mx-auto w-full max-w-[430px] rounded-2xl border border-slate-200/80 bg-white p-7 shadow-[0_20px_70px_-45px_rgba(29,37,51,.25)] sm:p-9">
          <div><h2 className="text-[22px] font-semibold tracking-[-.025em]">Welcome back</h2><p className="mt-1.5 text-sm text-slate-500">Sign in to your MFS workspace</p></div>
          <form onSubmit={submit} className="mt-8 space-y-5">
            {error && <Alert type="error" showIcon message={error} />}
            <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-700">Work email</span><Input size="large" prefix={<Mail size={16} className="mr-1 text-slate-400" />} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></label>
            <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-700">Password</span><Input size="large" prefix={<LockKeyhole size={16} className="mr-1 text-slate-400" />} type={visible ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" suffix={<button type="button" onClick={() => setVisible(!visible)} className="border-0 bg-transparent p-1 text-slate-400" aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button>} /></label>
            <Button className="mt-2 w-full" disabled={loading} type="submit">{loading ? 'Signing in…' : 'Sign in'}{!loading && <ArrowRight size={16} />}</Button>
          </form>
          {showDemo && <div className="mt-6 rounded-xl bg-[#f7f8fa] p-3.5"><div className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">Demo account</div><div className="mt-1.5 flex items-center justify-between text-xs"><span className="font-medium text-slate-700">admin@mfs.local</span><span className="text-slate-400">Welcome123!</span></div></div>}
          <p className="mt-6 text-center text-[11px] text-slate-400">Protected workspace · Access is monitored and audited</p>
        </section>
      </main>
      <footer className="flex flex-col justify-between gap-2 border-t border-slate-200/70 pt-5 text-[11px] text-slate-400 sm:flex-row"><span>© {new Date().getFullYear()} MFS Financial Services</span><span>Need help? <a href="mailto:support@mfs.local" className="font-medium text-slate-600">Contact support</a></span></footer>
    </div>
  </div>;
}
