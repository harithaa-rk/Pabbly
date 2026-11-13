import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FormErrorProps {
  message?: string | null;
  className?: string;
}

export const FormError: React.FC<FormErrorProps> = ({ message, className }) => {
  if (!message) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm animate-shake',
        className
      )}
      role="alert"
    >
      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
      <span>{message}</span>
    </div>
  );
};

