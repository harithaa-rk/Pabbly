'use client';

import React from 'react';
import { Layers, Activity, Clock, Gift, Calendar } from 'lucide-react';

interface UsageCardsProps {
  tasksAllotted?: number;
  tasksConsumed?: number;
  tasksRemaining?: number;
  freeTasksConsumed?: number;
  resetDate?: string;
}

export const UsageCards: React.FC<UsageCardsProps> = ({
  tasksAllotted = 100,
  tasksConsumed = 0,
  tasksRemaining = 100,
  freeTasksConsumed = 0,
  resetDate,
}) => {
  const percentageUsed = tasksAllotted > 0
    ? Math.min(100, Math.round((tasksConsumed / tasksAllotted) * 100))
    : 0;

  const formattedResetDate = resetDate
    ? new Date(resetDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Next month cycle';

  const cards = [
    {
      title: 'Tasks Allocated',
      value: tasksAllotted,
      icon: Layers,
      accentBg: 'bg-[#F8D8C5]',
      iconColor: 'text-[#9A4E20]',
      borderHover: 'hover:border-[#F8D8C5]',
      subtitle: 'Free monthly allocation',
    },
    {
      title: 'Tasks Consumed',
      value: tasksConsumed,
      icon: Activity,
      accentBg: 'bg-[#E8DDF0]',
      iconColor: 'text-[#6D4298]',
      borderHover: 'hover:border-[#E8DDF0]',
      subtitle: 'Successful executions',
    },
    {
      title: 'Tasks Remaining',
      value: tasksRemaining,
      icon: Clock,
      accentBg: 'bg-[#FFF0D8]',
      iconColor: 'text-[#9E6A14]',
      borderHover: 'hover:border-[#FFF0D8]',
      subtitle: `${100 - percentageUsed}% available`,
    },
    {
      title: 'Free Tasks Consumed',
      value: freeTasksConsumed,
      icon: Gift,
      accentBg: 'bg-[#F8DCE5]',
      iconColor: 'text-[#E85D8A]',
      borderHover: 'hover:border-[#F8DCE5]',
      subtitle: '1 task / successful run',
    },
  ];

  return (
    <div className="space-y-4">
      {/* 4 Usage Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className={`bg-white border border-[#E9E5E4] rounded-xl p-5 shadow-xs transition-all duration-150 ${card.borderHover}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[#667085] tracking-tight">
                  {card.title}
                </span>
                <div
                  className={`w-8 h-8 rounded-lg ${card.accentBg} ${card.iconColor} flex items-center justify-center`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-[#182033] tracking-tight">
                {card.value.toLocaleString()}
              </div>
              <p className="text-[11px] text-[#98A2B3] mt-1">
                {card.subtitle}
              </p>
            </div>
          );
        })}
      </div>

      {/* Usage Progress Bar & Reset Date Bar */}
      <div className="bg-white border border-[#E9E5E4] rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-2/3 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#182033]">
            <span>Monthly Task Usage</span>
            <span>{tasksConsumed} / {tasksAllotted} Tasks ({percentageUsed}%)</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#F2F4F7] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                percentageUsed >= 90
                  ? 'bg-[#D92D20]'
                  : percentageUsed >= 70
                  ? 'bg-[#E59A23]'
                  : 'bg-[#E85D8A]'
              }`}
              style={{ width: `${percentageUsed}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#667085] bg-[#FFF7F4] border border-[#F8D8C5] px-3 py-1.5 rounded-lg shrink-0">
          <Calendar className="w-3.5 h-3.5 text-[#E85D8A]" />
          <span>Reset cycle: <strong className="text-[#182033]">{formattedResetDate}</strong></span>
        </div>
      </div>
    </div>
  );
};
