import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'ghost'; size?: 'default' | 'sm' };
export function Button({ className, variant = 'primary', size = 'default', ...props }: Props) {
  return <button className={cn('inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50', variant === 'primary' && 'bg-brand text-white shadow-sm hover:bg-blue-700', variant === 'outline' && 'border border-slate-200 bg-white text-ink hover:bg-slate-50', variant === 'ghost' && 'text-slate-600 hover:bg-slate-100', size === 'default' ? 'h-10 px-4 text-sm' : 'h-8 px-3 text-xs', className)} {...props} />;
}
