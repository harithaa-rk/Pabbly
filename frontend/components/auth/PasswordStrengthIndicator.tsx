import React from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PasswordStrengthIndicatorProps {
  password?: string;
  className?: string;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password = '',
  className,
}) => {
  const criteria = [
    { label: 'At least 8 characters', valid: password.length >= 8 },
    { label: 'At least one uppercase letter (A-Z)', valid: /[A-Z]/.test(password) },
    { label: 'At least one lowercase letter (a-z)', valid: /[a-z]/.test(password) },
    { label: 'At least one number (0-9)', valid: /\d/.test(password) },
    { label: 'At least one special character (!@#$...)', valid: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) },
  ];

  const score = criteria.filter((c) => c.valid).length;

  const strengthColor =
    score <= 2
      ? 'bg-rose-500 text-rose-600'
      : score <= 4
      ? 'bg-amber-500 text-amber-600'
      : 'bg-emerald-500 text-emerald-600';

  const strengthLabel =
    score <= 2 ? 'Weak' : score <= 4 ? 'Moderate' : 'Strong';

  if (!password) return null;

  return (
    <div className={cn('space-y-2 mt-2 pt-2 border-t border-slate-100', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">Password Strength:</span>
        <span className={cn('font-semibold', strengthColor.split(' ')[1])}>
          {strengthLabel}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-1.5 h-1.5 w-full">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={cn(
              'h-full rounded-full transition-colors',
              level <= score ? strengthColor.split(' ')[0] : 'bg-slate-200'
            )}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1">
        {criteria.map((c, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            {c.valid ? (
              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            )}
            <span className={c.valid ? 'text-slate-700' : 'text-slate-400'}>
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

