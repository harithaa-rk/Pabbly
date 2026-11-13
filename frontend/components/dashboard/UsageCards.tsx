import React from 'react';
import { Layers, Activity, Clock, Gift } from 'lucide-react';

interface UsageCardsProps {
  tasksAllotted?: number;
  tasksConsumed?: number;
  tasksRemaining?: number;
  freeTasksConsumed?: number;
}

export const UsageCards: React.FC<UsageCardsProps> = ({
  tasksAllotted = 0,
  tasksConsumed = 0,
  tasksRemaining = 0,
  freeTasksConsumed = 0,
}) => {
  const cards = [
    {
      title: 'Tasks Allotted',
      value: tasksAllotted,
      icon: Layers,
      accentBg: 'bg-[#F8D8C5]',       // Soft Peach
      iconColor: 'text-[#9A4E20]',
      borderHover: 'hover:border-[#F8D8C5]',
    },
    {
      title: 'Tasks Consumed',
      value: tasksConsumed,
      icon: Activity,
      accentBg: 'bg-[#E8DDF0]',       // Soft Lavender
      iconColor: 'text-[#6D4298]',
      borderHover: 'hover:border-[#E8DDF0]',
    },
    {
      title: 'Tasks Remaining',
      value: tasksRemaining,
      icon: Clock,
      accentBg: 'bg-[#FFF0D8]',       // Soft Cream / Warm
      iconColor: 'text-[#9E6A14]',
      borderHover: 'hover:border-[#FFF0D8]',
    },
    {
      title: 'Free Tasks Consumed',
      value: freeTasksConsumed,
      icon: Gift,
      accentBg: 'bg-[#F8DCE5]',       // Soft Pink
      iconColor: 'text-[#E85D8A]',
      borderHover: 'hover:border-[#F8DCE5]',
    },
  ];

  return (
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
          </div>
        );
      })}
    </div>
  );
};

