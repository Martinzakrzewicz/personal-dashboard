import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-[var(--space-accent-contrast)] border border-transparent hover:opacity-90 active:opacity-80',
  secondary:
    'bg-surface text-ink border border-line hover:bg-surface2 active:bg-surface2',
  ghost: 'bg-transparent text-ink border border-transparent hover:bg-surface2',
  danger:
    'bg-transparent text-danger border border-[color:var(--danger)] hover:bg-[var(--danger-soft)]',
};

const SIZES: Record<Size, string> = {
  sm: 'min-h-[44px] px-3 text-sm gap-1.5',
  md: 'min-h-[44px] px-4 text-sm gap-2',
  icon: 'h-11 w-11 min-h-[44px] min-w-[44px] justify-center',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'secondary', size = 'md', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex select-none items-center rounded-xl font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
});
