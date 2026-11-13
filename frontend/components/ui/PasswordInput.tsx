import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  hint?: string;
  showIcon?: boolean;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label = 'Password', error, hint, showIcon = true, className, id, ...props }, ref) => {
    const [isVisible, setIsVisible] = useState(false);
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
          {showIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#667085]">
              <Lock className="w-4 h-4" />
            </div>
          )}
          <input
            ref={ref}
            id={generatedId}
            type={isVisible ? 'text' : 'password'}
            className={cn(
              'block w-full rounded-lg border border-[#E9E5E4] bg-white py-2 px-3 text-[#182033] placeholder-[#98A2B3] text-sm transition-colors focus:border-[#E85D8A] focus:outline-none focus:ring-1 focus:ring-[#E85D8A] disabled:bg-[#FFF7F4]',
              showIcon && 'pl-9',
              'pr-10',
              error && 'border-[#D6455D] focus:border-[#D6455D] focus:ring-[#D6455D]',
              className
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setIsVisible(!isVisible)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#667085] hover:text-[#182033] transition-colors focus:outline-none"
            tabIndex={-1}
            aria-label={isVisible ? 'Hide password' : 'Show password'}
          >
            {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-[#D6455D]">{error}</p>}
        {hint && !error && <p className="mt-1 text-xs text-[#667085]">{hint}</p>}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
