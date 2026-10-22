import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert, Empty, Input, InputNumber, Select, Steps, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, CheckCircle2, ClipboardList, FilePlus, Save, UserRound, UsersRound } from 'lucide-react';
import { api, type Branch, type CustomerAccount, type LoanApplication, type LoanApplicationData } from '../lib/api';
import { Button } from '../components/ui/Button';
import { formatDate, formatMoney } from '../lib/utils';

type Choice = { label: string; value: string };
type Field = { key: string; label: string; type?: 'text' | 'number' | 'date' | 'select' | 'textarea'; options?: Choice[]; required?: boolean; wide?: boolean; suffix?: string };
type Step = { title: string; description: string; icon: ReactNode; fields?: Field[] };

const loanTypeOptions: Choice[] = [
  { label: 'Credit loan', value: 'CREDIT_LOAN' },
  { label: 'Energy loan', value: 'ENERGY_LOAN' },
  { label: 'Staff loan', value: 'STAFF_LOAN' },
];
const purposeOptions: Choice[] = [
  { label: 'Household needs', value: 'HOME' },
  { label: 'Business', value: 'BUSINESS' },
  { label: 'Other', value: 'OTHER' },
];
const residenceOptions: Choice[] = [
  { label: 'Owner occupied', value: 'OWNER' }, { label: 'Renting', value: 'RENTING' },
  { label: 'Living with family', value: 'FAMILY' }, { label: 'Dormitory', value: 'DORMITORY' }, { label: 'Other', value: 'OTHER' },
];
const genderOptions: Choice[] = [{ label: 'Female', value: 'FEMALE' }, { label: 'Male', value: 'MALE' }, { label: 'Other / prefer not to say', value: 'OTHER' }];
const maritalOptions: Choice[] = [{ label: 'Single', value: 'SINGLE' }, { label: 'Married', value: 'MARRIED' }, { label: 'Separated', value: 'SEPARATED' }, { label: 'Widowed', value: 'WIDOWED' }];
const educationOptions: Choice[] = [{ label: 'No formal schooling', value: 'NONE' }, { label: 'Primary', value: 'PRIMARY' }, { label: 'Middle school', value: 'MIDDLE' }, { label: 'High school', value: 'HIGH' }, { label: 'University', value: 'UNIVERSITY' }];
const incomeOptions: Choice[] = [{ label: 'Business income', value: 'BUSINESS' }, { label: 'Salary', value: 'SALARY' }, { label: 'Rental income', value: 'RENTAL' }, { label: 'Other', value: 'OTHER' }];

const steps: Step[] = [
  {
    title: 'Applicant & loan', description: 'Identity and request', icon: <UserRound size={16} />,
    fields: [
      { key: 'loanType', label: 'Loan product', type: 'select', options: loanTypeOptions, required: true },
      { key: 'loanPurpose', label: 'Loan purpose', type: 'select', options: purposeOptions, required: true },
      { key: 'loanPurposeOther', label: 'Describe other purpose', type: 'text' },
      { key: 'loanAmount', label: 'Requested amount', type: 'number', suffix: 'MMK', required: true },
      { key: 'tenureMonths', label: 'Loan term', type: 'number', suffix: 'months', required: true },
      { key: 'monthlyRepayment', label: 'Expected monthly repayment', type: 'number', suffix: 'MMK' },
      { key: 'priorMfsLoanCount', label: 'Previous MFS loans', type: 'number' },
      { key: 'fullNameMyanmar', label: 'Applicant name (Myanmar)', type: 'text' },
      { key: 'fullNameEnglish', label: 'Applicant name (English)', type: 'text', required: true },
      { key: 'phoneMobile', label: 'Mobile phone', type: 'text', required: true },
      { key: 'phoneHome', label: 'Home phone', type: 'text' },
      { key: 'phoneWork', label: 'Work phone', type: 'text' },
      { key: 'nationalId', label: 'National ID number', type: 'text', required: true },
      { key: 'fatherName', label: 'Father’s name', type: 'text' },
      { key: 'dateOfBirth', label: 'Date of birth', type: 'date' },
      { key: 'gender', label: 'Gender', type: 'select', options: genderOptions },
      { key: 'maritalStatus', label: 'Marital status', type: 'select', options: maritalOptions },
      { key: 'spouseName', label: 'Spouse’s name', type: 'text' },
      { key: 'education', label: 'Highest education', type: 'select', options: educationOptions },
      { key: 'familyCount', label: 'Household members', type: 'number' },
      { key: 'childrenUnder16', label: 'Children aged 0–16', type: 'number' },
    ],
  },
  {
    title: 'Household & debts', description: 'Address and current borrowing', icon: <UsersRound size={16} />,
    fields: [
      { key: 'permanentAddress', label: 'Permanent address', type: 'textarea', wide: true },
      { key: 'permanentResidenceYears', label: 'Years at permanent address', type: 'number', suffix: 'years' },
      { key: 'currentAddress', label: 'Current address', type: 'textarea', wide: true, required: true },
      { key: 'currentResidenceYears', label: 'Years at current address', type: 'number', suffix: 'years' },
      { key: 'residenceType', label: 'Current living arrangement', type: 'select', options: residenceOptions },
      { key: 'homeLatitude', label: 'Home latitude', type: 'text' },
      { key: 'homeLongitude', label: 'Home longitude', type: 'text' },
      { key: 'businessLatitude', label: 'Business latitude', type: 'text' },
      { key: 'businessLongitude', label: 'Business longitude', type: 'text' },
      { key: 'bankDebt', label: 'Bank / finance balance owed', type: 'number', suffix: 'MMK' },
      { key: 'bankLoanCount', label: 'Bank / finance loan count', type: 'number' },
      { key: 'mfiDebt', label: 'Other MFI balance owed', type: 'number', suffix: 'MMK' },
      { key: 'mfiLoanCount', label: 'Other MFI loan count', type: 'number' },
      { key: 'privateDebt', label: 'Private lender / pawnshop balance', type: 'number', suffix: 'MMK' },
      { key: 'privateLoanCount', label: 'Private lender / pawnshop loan count', type: 'number' },
      { key: 'savingsAmount', label: 'Savings balance', type: 'number', suffix: 'MMK' },
      { key: 'savingsPurpose', label: 'Savings purpose', type: 'text' },
    ],
  },
  {
    title: 'Income & expenses', description: 'Work and affordability', icon: <BriefcaseBusiness size={16} />,
    fields: [
      { key: 'incomeSource', label: 'Main income source', type: 'select', options: incomeOptions },
      { key: 'employerName', label: 'Employer / business name', type: 'text' },
      { key: 'businessType', label: 'Business type', type: 'text' },
      { key: 'position', label: 'Position / occupation', type: 'text' },
      { key: 'monthlySalary', label: 'Monthly salary', type: 'number', suffix: 'MMK' },
      { key: 'employmentStartDate', label: 'Employment start date', type: 'date' },
      { key: 'yearsInWork', label: 'Time in work / business', type: 'number', suffix: 'years' },
      { key: 'workAddress', label: 'Work / business address', type: 'textarea', wide: true },
      { key: 'monthlySales', label: 'Monthly business sales', type: 'number', suffix: 'MMK' },
      { key: 'businessStockValue', label: 'Current stock value', type: 'number', suffix: 'MMK' },
      { key: 'rentalIncome', label: 'Rental income', type: 'number', suffix: 'MMK' },
      { key: 'farmingIncome', label: 'Farming income', type: 'number', suffix: 'MMK' },
      { key: 'foodExpense', label: 'Food', type: 'number', suffix: 'MMK' },
      { key: 'medicineExpense', label: 'Medical', type: 'number', suffix: 'MMK' },
      { key: 'rentExpense', label: 'House rent', type: 'number', suffix: 'MMK' },
      { key: 'educationExpense', label: 'Education', type: 'number', suffix: 'MMK' },
      { key: 'utilitiesExpense', label: 'Household utilities / phone', type: 'number', suffix: 'MMK' },
      { key: 'otherExpense', label: 'Other household expenses', type: 'number', suffix: 'MMK' },
      { key: 'otherMfiInstallments', label: 'Other monthly loan installments', type: 'number', suffix: 'MMK' },
      { key: 'businessCapitalCosts', label: 'Business capital costs', type: 'number', suffix: 'MMK' },
      { key: 'businessRent', label: 'Shop / workplace rent', type: 'number', suffix: 'MMK' },
      { key: 'businessWages', label: 'Staff wages', type: 'number', suffix: 'MMK' },
      { key: 'businessUtilities', label: 'Business utilities', type: 'number', suffix: 'MMK' },
      { key: 'transportCosts', label: 'Transport costs', type: 'number', suffix: 'MMK' },
      { key: 'businessOtherCosts', label: 'Other business costs', type: 'number', suffix: 'MMK' },
    ],
  },
  {
    title: 'Guarantor & assets', description: 'Support and declarations', icon: <ClipboardList size={16} />,
    fields: [
      { key: 'guarantorName', label: 'Guarantor’s full name', type: 'text' },
      { key: 'guarantorNationalId', label: 'Guarantor’s national ID', type: 'text' },
      { key: 'guarantorPhone', label: 'Guarantor’s phone', type: 'text' },
      { key: 'guarantorFatherName', label: 'Guarantor’s father’s name', type: 'text' },
      { key: 'guarantorAddress', label: 'Guarantor’s address', type: 'textarea', wide: true },
      { key: 'guarantorMaritalStatus', label: 'Guarantor’s marital status', type: 'select', options: maritalOptions },
      { key: 'guarantorBusinessIncome', label: 'Guarantor’s monthly business income', type: 'number', suffix: 'MMK' },
      { key: 'guarantorSalaryIncome', label: 'Guarantor’s monthly salary', type: 'number', suffix: 'MMK' },
      { key: 'guarantorBusinessExpenses', label: 'Guarantor’s business expenses', type: 'number', suffix: 'MMK' },
      { key: 'guarantorHouseholdExpenses', label: 'Guarantor’s household expenses', type: 'number', suffix: 'MMK' },
      { key: 'guarantorBuildingValue', label: 'Guarantor’s building assets', type: 'number', suffix: 'MMK' },
      { key: 'guarantorVehicleValue', label: 'Guarantor’s vehicle assets', type: 'number', suffix: 'MMK' },
      { key: 'guarantorEquipmentValue', label: 'Guarantor’s business equipment', type: 'number', suffix: 'MMK' },
      { key: 'assetVehicleType', label: 'Applicant vehicle type', type: 'select', options: [{ label: 'Car', value: 'CAR' }, { label: 'Motorcycle', value: 'MOTORCYCLE' }, { label: 'Other', value: 'OTHER' }, { label: 'None', value: 'NONE' }] },
      { key: 'assetVehicleValue', label: 'Applicant vehicle value', type: 'number', suffix: 'MMK' },
      { key: 'householdAssets', label: 'Household assets', type: 'textarea', wide: true },
      { key: 'eddDetails', label: 'Additional due diligence notes', type: 'textarea', wide: true },
    ],
  },
];

const initialData: LoanApplicationData = { loanType: 'CREDIT_LOAN', loanPurpose: 'BUSINESS', priorMfsLoanCount: 0 };
const amountKeys = [
  'monthlySalary', 'monthlySales', 'rentalIncome', 'farmingIncome', 'foodExpense', 'medicineExpense', 'rentExpense', 'educationExpense',
  'utilitiesExpense', 'otherExpense', 'otherMfiInstallments', 'businessCapitalCosts', 'businessRent', 'businessWages', 'businessUtilities', 'transportCosts', 'businessOtherCosts',
];
const asNumber = (data: LoanApplicationData, key: string) => Number(data[key] ?? 0) || 0;
const valueText = (data: LoanApplicationData, key: string) => typeof data[key] === 'string' || typeof data[key] === 'number' ? String(data[key]) : '';

export function LoanApplicationsPage({ branches, initialBranch, companyId, branchId, canWrite }: { branches: Branch[]; initialBranch: string; companyId: string; branchId: string; canWrite: boolean }) {
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [active, setActive] = useState(false);
  const [applicationId, setApplicationId] = useState<string>();
  const [applicationNumber, setApplicationNumber] = useState('');
  const [branch, setBranch] = useState(initialBranch || branchId);
  const [data, setData] = useState<LoanApplicationData>(initialData);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [error, setError] = useState('');

  const filters = useMemo(() => ({ ...(companyId ? { companyId } : {}), ...(branchId ? { branchId } : {}), ...(search ? { search } : {}), ...(status ? { status } : {}) }), [companyId, branchId, search, status]);
  const loadApplications = useCallback(async () => {
    try { setApplications(await api.loanApplications(filters)); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load loan applications.'); }
  }, [filters]);
  useEffect(() => { void loadApplications(); }, [loadApplications]);
  useEffect(() => {
    api.customers({ ...(companyId ? { companyId } : {}), ...(branchId ? { branchId } : {}) })
      .then(setCustomers).catch(() => setCustomers([]));
  }, [companyId, branchId]);

  const openNew = () => {
    setApplicationId(undefined); setApplicationNumber(''); setBranch(branchId || initialBranch || '');
    setData({ ...initialData }); setStep(0); setError(''); setActive(true);
  };
  const openDraft = async (item: LoanApplication) => {
    try {
      const detail = await api.loanApplication(item.id);
      setApplicationId(item.id); setApplicationNumber(detail.applicationNumber);
      setBranch(detail.branchId); setData(detail.applicationData); setStep(0); setError(''); setActive(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to open this application.'); }
  };
  const update = (key: string, value: unknown) => setData((current) => ({ ...current, [key]: value }));
  const uploadPhoto = async (file?: File) => {
    if (!file) return;
    const selectedBranch = branches.find((item) => item.id === branch);
    if (!selectedBranch) { message.error('Select a branch before adding a photo.'); return; }
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 10 * 1024 * 1024) { message.error('Choose a JPG or PNG photo up to 10 MB.'); return; }
    setPhotoUploading(true);
    try { update('applicantPhotoDocumentId', await api.uploadLoanPhoto(file, selectedBranch.companyId, selectedBranch.id)); update('applicantPhotoName', file.name); message.success('Applicant photo uploaded.'); }
    catch (e) { message.error(e instanceof Error ? e.message : 'Unable to upload the applicant photo.'); }
    finally { setPhotoUploading(false); }
  };
  const calculated = useMemo(() => {
    const totalIncome = asNumber(data, 'monthlySales') + asNumber(data, 'rentalIncome') + asNumber(data, 'farmingIncome') + asNumber(data, 'monthlySalary');
    const totalCosts = amountKeys.slice(4).reduce((sum, key) => sum + asNumber(data, key), 0);
    const household = amountKeys.slice(4, 11).reduce((sum, key) => sum + asNumber(data, key), 0);
    const business = ['businessCapitalCosts', 'businessRent', 'businessWages', 'businessUtilities', 'transportCosts', 'businessOtherCosts'].reduce((sum, key) => sum + asNumber(data, key), 0);
    const gross = totalIncome;
    const net = gross - totalCosts;
    return { gross, household, business, totalCosts, net, repaymentGuide: Math.max(0, Math.round(net * 0.3)) };
  }, [data]);

  const persist = async (submit: boolean) => {
    if (!branch) { setError('Select a registering branch before saving.'); return false; }
    setSaving(true); setError('');
    try {
      const result = await api.saveLoanApplication({ branchId: applicationId ? undefined : branch, applicationData: { ...data, calculatedTotals: calculated }, submit }, applicationId);
      setApplicationId(result.id); setApplicationNumber(result.applicationNumber);
      if (submit) { message.success(`Application ${result.applicationNumber} submitted.`); setActive(false); }
      else message.success(`Draft ${result.applicationNumber} saved.`);
      await loadApplications();
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save this application.'); return false; }
    finally { setSaving(false); }
  };

  const continueStep = async () => {
    const requiredKeys = step === 0 ? ['fullNameEnglish', 'phoneMobile', 'nationalId', 'loanAmount', 'tenureMonths', 'loanPurpose'] : step === 1 ? ['currentAddress'] : [];
    const missing = requiredKeys.some((key) => valueText(data, key).trim() === '');
    if (missing) { setError('Complete the required fields marked with * before continuing.'); return; }
    if (await persist(false)) { setStep((current) => Math.min(current + 1, steps.length)); }
  };

  const columns: ColumnsType<LoanApplication> = [
    { title: 'APPLICATION', dataIndex: 'applicationNumber', render: (value, row) => <div><b className="text-[#315bd6]">{value}</b><div className="mt-1 text-[10px] text-slate-400">{row.loanType.replaceAll('_', ' ').toLowerCase()}</div></div> },
    { title: 'CUSTOMER', dataIndex: 'applicantName', render: (value, row) => <div><b className="text-slate-700">{value || 'New applicant'}</b><div className="mt-1 text-[10px] text-slate-400">{row.phone || 'Phone not added'}</div></div> },
    { title: 'REQUESTED', dataIndex: 'loanAmount', render: (value, row) => <div><b className="text-slate-700">{value ? formatMoney(value, 'MMK') : '—'}</b><div className="mt-1 text-[10px] text-slate-400">{row.tenureMonths ? `${row.tenureMonths} months` : 'Term not set'}</div></div> },
    { title: 'BRANCH', dataIndex: 'branch', responsive: ['md'] },
    { title: 'STATUS', dataIndex: 'status', render: (value: string) => <Tag bordered={false} className={`rounded-md px-2 py-1 text-[10px] font-semibold ${value === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : value === 'DECLINED' ? 'bg-rose-50 text-rose-700' : value === 'SUBMITTED' || value === 'IN_REVIEW' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{value.replaceAll('_', ' ')}</Tag> },
    { title: 'UPDATED', dataIndex: 'updatedAt', responsive: ['lg'], render: (value) => <span className="text-slate-500">{formatDate(value)}</span> },
    { title: '', key: 'action', align: 'right', render: (_value, row) => row.status === 'DRAFT' && canWrite ? <Button variant="outline" size="sm" onClick={() => void openDraft(row)}>Continue</Button> : <span className="text-[10px] text-slate-400">{row.status === 'DRAFT' ? 'Draft' : 'Submitted'}</span> },
  ];

  if (active) return <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
    <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center"><div><button onClick={() => setActive(false)} className="mb-2 inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-slate-800"><ArrowLeft size={13} />All applications</button><h2 className="text-[17px] font-semibold tracking-tight">{applicationId ? `Continue ${applicationNumber}` : 'New loan application'}</h2><p className="mt-1 text-[11px] text-slate-400">One customer per application · Save progress at any step</p></div><div className="flex items-center gap-2"><span className="text-[10px] text-slate-400">Registering branch</span><Select value={branch || undefined} onChange={setBranch} disabled={Boolean(applicationId || branchId)} placeholder="Select branch" className="min-w-[175px]" options={branches.filter((item) => item.status === 'ACTIVE').map((item) => ({ value: item.id, label: item.name }))} /></div></div>
    {error && <Alert className="mx-5 mt-4" type="error" showIcon message={error} onClose={() => setError('')} closable />}
    <div className="px-4 py-5 sm:px-6"><Steps current={step} responsive size="small" items={steps.map(({ title, icon }) => ({ title, icon }))} /></div>
    {step < steps.length ? <>
      <div className="border-y border-slate-100 bg-[#fbfcfe] px-5 py-4"><h3 className="text-[13px] font-semibold text-slate-800">{steps[step].title}</h3><p className="mt-1 text-[10px] text-slate-400">{steps[step].description}. Required fields are marked with an asterisk.</p></div>
      {step === 0 && customers.length > 0 && <label className="block px-5 pt-5 text-[10px] font-semibold text-slate-600">Link an existing customer <span className="font-normal text-slate-400">(optional)</span><Select allowClear showSearch optionFilterProp="label" value={valueText(data, 'customerAccountId') || undefined} onChange={(id) => { update('customerAccountId', id ?? ''); const customer = customers.find((item) => item.id === id); if (customer) void api.customerKycSummary(id).then((profile) => setData((current) => current.customerAccountId === id ? { ...current, fullNameEnglish: profile.fullName, phoneMobile: profile.phone, nationalId: profile.nationalId, dateOfBirth: profile.dateOfBirth, currentAddress: profile.address } : current)).catch(() => message.error('Unable to load the selected customer’s KYC details.')); }} options={customers.map((customer) => ({ value: customer.id, label: `${customer.fullName} · ${customer.phone} · ${customer.accountNumber}` }))} placeholder="Search by name, phone, or account number" className="mt-1.5 w-full max-w-[560px]" /></label>}
      <div className="grid gap-x-5 gap-y-4 p-5 sm:grid-cols-2 xl:grid-cols-3">{steps[step].fields?.map((field) => <FieldInput key={field.key} field={field} value={data[field.key]} onChange={(value) => update(field.key, value)} />)}</div>
      {step === 0 && <div className="mx-5 mb-5 flex flex-wrap items-center gap-4 rounded-lg border border-slate-100 px-4 py-3"><div className="min-w-0 flex-1"><p className="text-[10px] font-semibold text-slate-700">Applicant photo <span className="font-normal text-slate-400">(optional)</span></p><p className="mt-1 truncate text-[10px] text-slate-400">{valueText(data, 'applicantPhotoName') || 'JPG or PNG, up to 10 MB'}</p></div><label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-700 hover:bg-slate-50">{photoUploading ? 'Uploading…' : valueText(data, 'applicantPhotoDocumentId') ? 'Replace photo' : 'Add photo'}<input type="file" accept="image/jpeg,image/png" className="hidden" disabled={photoUploading} onChange={(event) => { void uploadPhoto(event.target.files?.[0]); event.target.value = ''; }} /></label></div>}
      {step === 2 && <div className="mx-5 mb-5 grid gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4 sm:grid-cols-4"><Summary label="Monthly income" value={formatMoney(calculated.gross, 'MMK')} /><Summary label="Household expenses" value={formatMoney(calculated.household, 'MMK')} /><Summary label="Business costs" value={formatMoney(calculated.business, 'MMK')} /><Summary label="Net income · 30% guide" value={`${formatMoney(calculated.net, 'MMK')} · ${formatMoney(calculated.repaymentGuide, 'MMK')}`} /></div>}
      {step === 3 && <div className="mx-5 mb-5 rounded-lg bg-slate-50 px-4 py-3 text-[10px] leading-5 text-slate-500">Check guarantor information, declared assets, and any additional due diligence notes before submission.</div>}
      <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row"><Button variant="outline" onClick={() => void persist(false)} disabled={saving}><Save size={14} />Save draft</Button><div className="flex justify-end gap-2">{step > 0 && <Button variant="outline" onClick={() => setStep((current) => current - 1)} disabled={saving}><ArrowLeft size={14} />Back</Button>}<Button onClick={() => void continueStep()} disabled={saving}>{saving ? 'Saving…' : 'Save & continue'}<ArrowRight size={14} /></Button></div></div>
    </> : <div className="p-5 sm:p-7"><div className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><CheckCircle2 size={20} /></span><div><h3 className="text-[15px] font-semibold">Review application</h3><p className="mt-1 text-[11px] text-slate-400">Confirm the key details with the customer before submitting.</p></div></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[
        ['Applicant', valueText(data, 'fullNameEnglish') || valueText(data, 'fullNameMyanmar')], ['Phone', valueText(data, 'phoneMobile')], ['National ID', valueText(data, 'nationalId')],
        ['Loan product', loanTypeOptions.find((item) => item.value === valueText(data, 'loanType'))?.label ?? 'Credit loan'], ['Amount', formatMoney(asNumber(data, 'loanAmount'), 'MMK')],
        ['Term', `${valueText(data, 'tenureMonths') || '—'} months`], ['Purpose', purposeOptions.find((item) => item.value === valueText(data, 'loanPurpose'))?.label ?? valueText(data, 'loanPurposeOther')],
        ['Current address', valueText(data, 'currentAddress')], ['Net monthly income', formatMoney(calculated.net, 'MMK')], ['Guarantor', valueText(data, 'guarantorName') || 'Not entered'],
      ].map(([label, value]) => <div key={label} className="rounded-lg border border-slate-100 px-3.5 py-3"><p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1.5 break-words text-[11px] font-semibold text-slate-700">{value}</p></div>)}</div>
      <label className="mt-5 flex cursor-pointer items-start gap-2.5 rounded-lg bg-slate-50 p-3 text-[10px] leading-5 text-slate-600"><input type="checkbox" className="mt-1 accent-blue-600" checked={Boolean(data.applicantConfirmed)} onChange={(e) => update('applicantConfirmed', e.target.checked)} />I have reviewed the details with the applicant and confirm that the information recorded is accurate to the best of my knowledge.</label>
      <div className="mt-5 flex flex-col-reverse justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row"><Button variant="outline" onClick={() => void persist(false)} disabled={saving}><Save size={14} />Save draft</Button><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setStep(steps.length - 1)}><ArrowLeft size={14} />Back to form</Button><Button onClick={() => void persist(true)} disabled={saving || !data.applicantConfirmed}>{saving ? 'Submitting…' : 'Submit application'}<CheckCircle2 size={15} /></Button></div></div>
    </div>}
  </section>;

  const counts = { all: applications.length, drafts: applications.filter((item) => item.status === 'DRAFT').length, submitted: applications.filter((item) => ['SUBMITTED', 'IN_REVIEW'].includes(item.status)).length };
  return <>
    {error && <Alert className="mb-4" type="error" showIcon message={error} closable onClose={() => setError('')} />}
    <div className="mb-4 grid gap-3 sm:grid-cols-3">{[['All applications', counts.all, <ClipboardList size={15} />], ['Drafts', counts.drafts, <Save size={15} />], ['Submitted / in review', counts.submitted, <CheckCircle2 size={15} />]].map(([label, count, icon]) => <div key={String(label)} className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-4"><div><p className="text-[10px] text-slate-400">{label}</p><p className="mt-1 text-[21px] font-semibold tracking-tight text-slate-800">{count}</p></div><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">{icon}</span></div>)}</div>
    <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white"><div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:px-5"><div><h3 className="text-[13px] font-semibold">Loan applications</h3><p className="mt-1 text-[10px] text-slate-400">Start an application for one customer, save a draft, and submit it for review.</p></div>{canWrite && <Button size="sm" onClick={openNew}><FilePlus size={14} />New application</Button>}</div><div className="flex flex-wrap gap-2 px-4 py-3 sm:px-5"><Input.Search allowClear onSearch={setSearch} onChange={(e) => { if (!e.target.value) setSearch(''); }} placeholder="Search customer or application" className="max-w-[280px]" /><Select allowClear value={status || undefined} onChange={(value) => setStatus(value ?? '')} placeholder="All statuses" className="w-[150px]" options={['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'DECLINED'].map((value) => ({ label: value.replaceAll('_', ' '), value }))} /></div><Table rowKey="id" columns={columns} dataSource={applications} pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (total) => `${total} applications` }} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No loan applications yet" /> }} /></section>
  </>;
}

function FieldInput({ field, value, onChange }: { field: Field; value: unknown; onChange: (value: unknown) => void }) {
  const common = 'w-full';
  const control = field.type === 'select'
    ? <Select allowClear showSearch optionFilterProp="label" value={valueText({ v: value }, 'v') || undefined} onChange={onChange} options={field.options} placeholder="Select an option" className={common} />
    : field.type === 'number'
      ? <InputNumber min={0} value={typeof value === 'number' ? value : value ? Number(value) : null} onChange={(next) => onChange(next ?? '')} addonAfter={field.suffix} className={common} />
      : field.type === 'textarea'
        ? <Input.TextArea value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} rows={3} placeholder={`Enter ${field.label.toLowerCase()}`} />
        : <Input type={field.type === 'date' ? 'date' : 'text'} value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''} onChange={(e) => onChange(e.target.value)} placeholder={`Enter ${field.label.toLowerCase()}`} />;
  return <label className={`text-[10px] font-semibold text-slate-600 ${field.wide ? 'sm:col-span-2 xl:col-span-3' : ''}`}>{field.label}{field.required && <span className="ml-0.5 text-rose-500">*</span>}<div className="mt-1.5">{control}</div></label>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[9px] font-semibold uppercase tracking-wider text-blue-600/70">{label}</p><p className="mt-1.5 text-[12px] font-semibold text-slate-700">{value}</p></div>;
}
