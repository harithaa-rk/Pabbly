import React from 'react';
import { cn, getInitials } from '../../lib/utils';

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  size = 'md',
  className,
}) => {
  const sizeClasses = {
    sm: 'w-7 h-7 text-[11px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-11 h-11 text-sm font-semibold',
    xl: 'w-16 h-16 text-lg font-bold',
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(
          'rounded-full object-cover border border-[#E9E5E4]',
          sizeClasses[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full bg-[#F8DCE5] text-[#182033] border border-[#F8D8C5] flex items-center justify-center font-semibold shadow-xs select-none',
        sizeClasses[size],
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
};
