import { cn, initials } from '../../lib/utils';

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  return <div className={cn('flex shrink-0 items-center justify-center rounded-full bg-[#e8edfa] font-semibold text-[#315bd6]', size === 'sm' && 'h-8 w-8 text-[11px]', size === 'md' && 'h-9 w-9 text-xs', size === 'lg' && 'h-12 w-12 text-sm')}>{initials(name)}</div>;
}
