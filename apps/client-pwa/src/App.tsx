import { useMemo, useState, type FormEvent } from 'react';
import {
  ArrowDownLeft, ArrowRight, Bell, CalendarDays, Check, ChevronDown,
  ChevronRight, CircleHelp, Clock3, CreditCard, Eye, EyeOff, FileText, Home,
  LogOut, Menu, Search, ShieldCheck, Smartphone, UserRound, WalletCards,
} from 'lucide-react';

type Page = 'overview' | 'schedule' | 'history' | 'profile';
type Payment = { date: string; title: string; detail: string; amount: number; status: 'Paid' | 'Upcoming' | 'Late'; type: 'Loan' | 'Hire purchase'; ref: string };

const payments: Payment[] = [
  { date: 'Oct 18, 2026', title: 'Personal loan', detail: 'Monthly installment · 08 of 18', amount: 285000, status: 'Paid', type: 'Loan', ref: 'LN-2408-008' },
  { date: 'Oct 12, 2026', title: 'Samsung Galaxy A55', detail: 'Hire purchase · 05 of 12', amount: 146000, status: 'Paid', type: 'Hire purchase', ref: 'HP-8821-005' },
  { date: 'Nov 18, 2026', title: 'Personal loan', detail: 'Monthly installment · 09 of 18', amount: 285000, status: 'Upcoming', type: 'Loan', ref: 'LN-2408-009' },
  { date: 'Nov 12, 2026', title: 'Samsung Galaxy A55', detail: 'Hire purchase · 06 of 12', amount: 146000, status: 'Upcoming', type: 'Hire purchase', ref: 'HP-8821-006' },
  { date: 'Sep 18, 2026', title: 'Personal loan', detail: 'Monthly installment · 07 of 18', amount: 285000, status: 'Paid', type: 'Loan', ref: 'LN-2408-007' },
  { date: 'Sep 12, 2026', title: 'Samsung Galaxy A55', detail: 'Hire purchase · 04 of 12', amount: 146000, status: 'Paid', type: 'Hire purchase', ref: 'HP-8821-004' },
  { date: 'Aug 18, 2026', title: 'Personal loan', detail: 'Monthly installment · 06 of 18', amount: 285000, status: 'Paid', type: 'Loan', ref: 'LN-2408-006' },
];

const navItems: { id: Page; label: string; icon: typeof Home }[] = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'schedule', label: 'Payment schedule', icon: CalendarDays },
  { id: 'history', label: 'Payment history', icon: FileText },
  { id: 'profile', label: 'My profile', icon: UserRound },
];

const money = (amount: number) => `${amount.toLocaleString('en-US')} MMK`;

export default function App() {
  const [signedIn, setSignedIn] = useState(false);
  const [page, setPage] = useState<Page>('overview');
  const [showPassword, setShowPassword] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All payments');
  const [menuOpen, setMenuOpen] = useState(false);

  const filteredPayments = useMemo(() => payments.filter((item) => {
    const matchesText = `${item.title} ${item.detail} ${item.ref} ${item.type}`.toLowerCase().includes(search.toLowerCase());
    const matchesType = filter === 'All payments' || item.type === filter;
    return matchesText && matchesType;
  }), [search, filter]);

  const login = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignedIn(true);
    setPage('overview');
  };

  if (!signedIn) return <Login onLogin={login} showPassword={showPassword} onTogglePassword={() => setShowPassword((show) => !show)} />;

  return <div className="portal">
    <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
      <a className="brand" href="#overview" onClick={(event) => { event.preventDefault(); setPage('overview'); }}><span className="brand-symbol">m</span><span><b>MFS</b><small>MY FINANCIAL SPACE</small></span></a>
      <div className="side-caption">YOUR ACCOUNT</div>
      <nav className="side-nav" aria-label="Main navigation">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-link ${page === id ? 'active' : ''}`} onClick={() => { setPage(id); setMenuOpen(false); }}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{id === 'schedule' && <span className="nav-count">2</span>}</button>)}</nav>
      <div className="side-help"><div className="help-icon"><CircleHelp size={17} /></div><b>Need a hand?</b><p>Our team is ready to help with your account.</p><button onClick={() => setPage('profile')}>Contact support <ArrowRight size={14} /></button></div>
      <div className="side-user"><div className="avatar">TH</div><span><b>Thiri Hlaing</b><small>Customer account</small></span><button aria-label="Sign out" onClick={() => setSignedIn(false)}><LogOut size={16} /></button></div>
    </aside>

    <div className="portal-main">
      <header className="appbar">
        <button className="mobile-menu" aria-label="Open navigation" onClick={() => setMenuOpen((open) => !open)}><Menu size={21} /></button>
        <div className="crumb"><span>My account</span><ChevronRight size={14} /><b>{navItems.find((item) => item.id === page)?.label}</b></div>
        <div className="appbar-right"><span className="secure-chip"><ShieldCheck size={14} /> Secure portal</span><button className="bell-button" aria-label="Notifications"><Bell size={19} /><i /></button><div className="avatar small-avatar">TH</div></div>
      </header>
      <div className="preview-strip"><span className="preview-dot" /> Sample customer account <span>·</span> This preview uses example loan and payment information.</div>

      <main className="content" key={page}>
        {page === 'overview' && <Overview onNavigate={setPage} />}
        {page === 'schedule' && <PaymentsPage mode="schedule" items={filteredPayments.filter((item) => item.status === 'Upcoming')} search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} />}
        {page === 'history' && <PaymentsPage mode="history" items={filteredPayments.filter((item) => item.status === 'Paid' || item.status === 'Late')} search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} />}
        {page === 'profile' && <Profile />}
      </main>
      <footer className="portal-footer"><span>© {new Date().getFullYear()} MFS Financial Services</span><span><LockKeyIcon /> Your information is protected</span></footer>
    </div>
    {menuOpen && <button className="menu-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
    <nav className="mobile-nav" aria-label="Mobile navigation">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={page === id ? 'active' : ''} onClick={() => setPage(id)}><Icon size={19} /><span>{label === 'Payment schedule' ? 'Schedule' : label === 'Payment history' ? 'History' : label === 'My profile' ? 'Profile' : label}</span></button>)}</nav>
  </div>;
}

function Login({ onLogin, showPassword, onTogglePassword }: { onLogin: (event: FormEvent<HTMLFormElement>) => void; showPassword: boolean; onTogglePassword: () => void }) {
  return <div className="login-shell">
    <header className="login-top"><a className="brand" href="#"><span className="brand-symbol">m</span><span><b>MFS</b><small>MY FINANCIAL SPACE</small></span></a><div><ShieldCheck size={15} /> Private & secure</div></header>
    <main className="login-layout">
      <section className="login-story"><div className="story-kicker"><span /> YOUR FINANCES, IN ONE PLACE</div><h1>Stay on top of<br />every <em>payment.</em></h1><p>See your loan details, keep track of hire purchase payments, and know exactly when your next payment is due.</p>
        <div className="story-art" aria-hidden="true"><div className="art-glow" /><div className="art-card art-back"><span className="art-card-dot" /><span>HIRE PURCHASE</span><b>146,000 <small>MMK</small></b><i>Next payment · Nov 12</i></div><div className="art-card art-front"><div className="art-card-top"><span className="art-card-dot" /> <span>PERSONAL LOAN</span><span className="art-check"><Check size={14} /></span></div><b>285,000 <small>MMK</small></b><div className="art-card-bottom"><span>Next payment</span><strong>Nov 18, 2026</strong></div></div><div className="art-float"><span><Check size={13} /></span> Payment recorded</div></div>
        <div className="story-points"><span><Check size={14} /> Clear payment dates</span><span><Check size={14} /> Your account at a glance</span></div>
      </section>
      <section className="login-card"><div className="login-card-heading"><div className="login-icon"><UserRound size={20} /></div><p className="eyebrow">WELCOME BACK</p><h2>Sign in to your account</h2><p>Enter your registered phone number and password.</p></div>
        <form onSubmit={onLogin} className="login-form"><label>Phone number<span className="input-wrap"><Smartphone size={17} /><input type="tel" placeholder="09 123 456 789" autoComplete="username" required /></span></label><label>Password<span className="input-wrap"><span className="input-lock">•</span><input type={showPassword ? 'text' : 'password'} placeholder="Enter your password" autoComplete="current-password" required /><button type="button" onClick={onTogglePassword} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label><div className="login-options"><label className="remember"><input type="checkbox" /> <span>Remember me</span></label><button type="button" className="text-button">Forgot password?</button></div><button className="sign-in-button" type="submit">Sign in <ArrowRight size={17} /></button></form>
        <div className="login-security"><ShieldCheck size={16} /><span>Your account is protected with secure sign-in.</span></div><div className="login-preview-note">Preview access: entering any phone number and password opens a sample customer account.</div>
      </section>
    </main>
    <footer className="login-footer"><span>© {new Date().getFullYear()} MFS Financial Services</span><span>Need help signing in? <b>Contact support</b></span></footer>
  </div>;
}

function Overview({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return <>
    <div className="page-heading"><div><p className="eyebrow">SUNDAY, OCTOBER 25, 2026</p><h1>Good morning, Thiri <span>☀</span></h1><p>Here’s what’s happening with your account.</p></div><button className="outline-action" onClick={() => onNavigate('schedule')}><CalendarDays size={16} /> View payment schedule</button></div>
    <section className="next-payment-card"><div className="next-copy"><span className="next-label"><Clock3 size={14} /> NEXT PAYMENT</span><h2>146,000 <small>MMK</small></h2><p>Samsung Galaxy A55 installment <span>·</span> Due in 18 days</p><div className="due-date"><div className="date-icon"><CalendarDays size={18} /></div><span><small>PAYMENT DUE</small><b>Thursday, November 12, 2026</b></span></div></div><div className="payment-visual"><div className="visual-orbit orbit-one"/><div className="visual-orbit orbit-two"/><div className="visual-calendar"><small>NOV</small><b>12</b><span>THU</span></div><div className="visual-mini"><Check size={13} /> On track</div></div><div className="next-bottom"><span><ShieldCheck size={15} /> Your account is up to date</span><button onClick={() => onNavigate('schedule')}>See all payments <ArrowRight size={15} /></button></div></section>
    <div className="section-title-row"><div><h2>Your active plans</h2><p>Loans and products you’re paying off</p></div><button className="quiet-link" onClick={() => onNavigate('profile')}>Account details <ChevronRight size={16} /></button></div>
    <section className="plan-grid"><PlanCard kind="loan" title="Personal loan" number="LN-2408-001" paid="8 of 18 payments" percent={44} next="Nov 18" due="285,000 MMK" /><PlanCard kind="device" title="Samsung Galaxy A55" number="HP-8821-001" paid="5 of 12 payments" percent={42} next="Nov 12" due="146,000 MMK" /></section>
    <div className="section-title-row recent-heading"><div><h2>Recent payments</h2><p>Your latest account activity</p></div><button className="quiet-link" onClick={() => onNavigate('history')}>Full history <ChevronRight size={16} /></button></div>
    <PaymentTable items={payments.filter((item) => item.status === 'Paid').slice(0, 3)} compact />
  </>;
}

function PlanCard({ kind, title, number, paid, percent, next, due }: { kind: string; title: string; number: string; paid: string; percent: number; next: string; due: string }) {
  return <article className="plan-card"><div className="plan-top"><div className={`plan-icon ${kind}`}><CreditCard size={19} /></div><span className="active-pill"><i /> Active</span></div><h3>{title}</h3><p className="plan-number">{number}</p><div className="plan-progress-label"><span>Repayment progress</span><b>{percent}%</b></div><div className="plan-progress"><span style={{ width: `${percent}%` }} /></div><p className="plan-paid">{paid} paid</p><div className="plan-bottom"><span><small>NEXT · {next}</small><b>{due}</b></span><button aria-label={`View ${title}`}><ChevronRight size={18} /></button></div></article>;
}

function PaymentsPage({ mode, items, search, setSearch, filter, setFilter }: { mode: 'schedule' | 'history'; items: Payment[]; search: string; setSearch: (value: string) => void; filter: string; setFilter: (value: string) => void }) {
  const upcoming = mode === 'schedule';
  return <>
    <div className="page-heading"><div><p className="eyebrow">YOUR ACCOUNT</p><h1>{upcoming ? 'Payment schedule' : 'Payment history'}</h1><p>{upcoming ? 'Know what’s due and when, across all your plans.' : 'A record of payments made toward your plans.'}</p></div>{upcoming && <div className="due-summary"><CalendarDays size={17} /><span><b>2 payments</b><small>due next month</small></span></div>}</div>
    <div className="payment-stats"><div><span className="stat-icon blue"><CalendarDays size={17} /></span><span><small>{upcoming ? 'UPCOMING' : 'PAID THIS MONTH'}</small><b>{upcoming ? '2 payments' : '431,000 MMK'}</b></span></div><div><span className="stat-icon green"><Check size={17} /></span><span><small>{upcoming ? 'NEXT DUE' : 'ON-TIME PAYMENTS'}</small><b>{upcoming ? 'Nov 12, 2026' : '100%'}</b></span></div><div><span className="stat-icon violet"><WalletCards size={17} /></span><span><small>{upcoming ? 'TOTAL DUE' : 'TOTAL PAID'}</small><b>{upcoming ? '431,000 MMK' : '2,687,000 MMK'}</b></span></div></div>
    <section className="records-card"><div className="records-heading"><div><h2>{upcoming ? 'Coming up' : 'All payments'}</h2><p>{upcoming ? 'Upcoming installments for your active plans' : 'Most recent transactions first'}</p></div><span className="record-count">{items.length} records</span></div><div className="record-tools"><label className="search-field"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search payments" /></label><label className="select-wrap"><select value={filter} onChange={(e) => setFilter(e.target.value)}><option>All payments</option><option>Loan</option><option>Hire purchase</option></select><ChevronDown size={14} /></label></div><PaymentTable items={items} /></section>
  </>;
}

function PaymentTable({ items, compact = false }: { items: Payment[]; compact?: boolean }) {
  if (items.length === 0) return <div className="empty-state"><Search size={22} /><b>No payments found</b><span>Try changing your search or payment filter.</span></div>;
  return <div className={`payments-list ${compact ? 'compact' : ''}`}><div className="table-head"><span>PAYMENT</span><span>DATE</span><span>AMOUNT</span><span>STATUS</span><span /></div>{items.map((item, index) => <div className="payment-row" key={`${item.ref}-${index}`}><div className="row-title"><span className={`row-icon ${item.type === 'Loan' ? 'loan' : 'hp'}`}>{item.type === 'Loan' ? <ArrowDownLeft size={17} /> : <CreditCard size={16} />}</span><span><b>{item.title}</b><small>{item.detail}</small></span></div><div className="row-date">{item.date}</div><div className="row-amount">{money(item.amount)}</div><div><span className={`status-pill ${item.status.toLowerCase()}`}><i />{item.status}</span></div><button className="row-more" aria-label={`Details for ${item.ref}`}><ChevronRight size={17} /></button></div>)}</div>;
}

function Profile() {
  return <><div className="page-heading"><div><p className="eyebrow">ACCOUNT SETTINGS</p><h1>My profile</h1><p>Review your personal and account information.</p></div><span className="verified-label"><ShieldCheck size={16} /> Verified account</span></div><section className="profile-card"><div className="profile-hero"><div className="profile-avatar">TH</div><div><h2>Thiri Hlaing</h2><p>Customer since March 2024 <span>·</span> Account ID MFS-102948</p></div><span className="verified-label"><ShieldCheck size={15} /> Verified</span></div><div className="profile-section"><h3>Personal information</h3><div className="profile-grid"><ProfileField label="Full name" value="Thiri Hlaing" /><ProfileField label="Phone number" value="+95 9 123 456 789" /><ProfileField label="Email address" value="thiri.hlaing@example.com" /><ProfileField label="National ID" value="•••• •••• 2841" /></div></div><div className="profile-section"><h3>Account preferences</h3><div className="preference-row"><span className="preference-icon"><Bell size={17} /></span><span><b>Payment reminders</b><small>Get notified before an installment is due</small></span><span className="toggle-on"><i /></span></div><div className="preference-row"><span className="preference-icon"><Smartphone size={17} /></span><span><b>SMS notifications</b><small>Payment updates sent to your registered phone</small></span><span className="toggle-on"><i /></span></div></div><div className="profile-note"><ShieldCheck size={16} /> To change personal details, contact MFS customer support.</div></section></>;
}

function ProfileField({ label, value }: { label: string; value: string }) { return <div className="profile-field"><small>{label}</small><b>{value}</b></div>; }
function LockKeyIcon() { return <ShieldCheck size={13} />; }

