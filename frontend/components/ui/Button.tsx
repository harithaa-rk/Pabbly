import React from 'react';
import { cn } from '../../lib/utils';
import { LoadingSpinner } from './LoadingSpinner';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      primary:
        'bg-[#E85D8A] hover:bg-[#D64B78] text-white shadow-sm focus:ring-[#E85D8A]/40 focus:ring-offset-1',
      secondary:
        'bg-[#FFF7F4] hover:bg-[#F8D8C5]/40 text-[#182033] border border-[#E9E5E4] focus:ring-[#E85D8A]/30',
      outline:
        'bg-white hover:bg-[#FFF7F4] text-[#344054] border border-[#E9E5E4] focus:ring-[#E85D8A]/30',
      danger:
        'bg-[#D6455D] hover:bg-[#B9384E] text-white shadow-sm focus:ring-[#D6455D]/40',
      ghost:
        'hover:bg-[#FFF7F4] text-[#344054] focus:ring-[#E85D8A]/20',
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-xs font-medium rounded-lg gap-1.5',
      md: 'px-4 py-2 text-sm font-medium rounded-lg gap-2',
      lg: 'px-5 py-2.5 text-sm font-semibold rounded-lg gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed select-none',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {isLoading && <LoadingSpinner size="sm" className="mr-1.5 text-current" />}
        {!isLoading && leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
