import { cn } from '../lib/utils';

const styles: Record<string, string> = {
  COMPLETED: 'bg-emerald-50 text-emerald-700', PROCESSING: 'bg-blue-50 text-blue-700', PENDING: 'bg-amber-50 text-amber-700', REVIEW: 'bg-violet-50 text-violet-700', FAILED: 'bg-rose-50 text-rose-700', ACTIVE: 'bg-emerald-50 text-emerald-700',
};
export function StatusPill({ value }: { value: string }) {
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize tracking-[.01em]', styles[value] ?? 'bg-slate-100 text-slate-600')}><span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />{value.toLowerCase().replace('_', ' ')}</span>;
}
