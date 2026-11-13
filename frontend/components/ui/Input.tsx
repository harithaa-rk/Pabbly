import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, className, id, ...props }, ref) => {
    const generatedId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={generatedId}
            className="block text-xs font-semibold text-[#182033] mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative rounded-lg shadow-sm">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#667085]">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={generatedId}
            className={cn(
              'block w-full rounded-lg border border-[#E9E5E4] bg-white py-2 px-3 text-[#182033] placeholder-[#98A2B3] text-sm transition-colors focus:border-[#E85D8A] focus:outline-none focus:ring-1 focus:ring-[#E85D8A] disabled:bg-[#FFF7F4] disabled:text-[#98A2B3]',
              leftIcon && 'pl-9',
              error && 'border-[#D6455D] focus:border-[#D6455D] focus:ring-[#D6455D]',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-[#D6455D]">{error}</p>}
        {hint && !error && <p className="mt-1 text-xs text-[#667085]">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
