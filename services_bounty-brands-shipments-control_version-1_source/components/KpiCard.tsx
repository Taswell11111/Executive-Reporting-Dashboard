import React from 'react';

interface KpiCardProps {
  title: string;
  value: number;
  color: 'blue' | 'green' | 'yellow' | 'red';
  subtitle?: string;
  subtitleColor?: string;
  onClick?: () => void;
}

const colorMap = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-400',
  red: 'bg-red-500'
};

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, color, subtitle, subtitleColor, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-xl p-6 shadow-sm border border-slate-100 relative overflow-hidden ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    >
      <div className={`absolute right-0 top-0 h-full w-1 ${colorMap[color]}`}></div>
      <div className="text-sm font-medium text-slate-500 mb-1">{title}</div>
      <div className="text-3xl font-bold text-slate-800 text-center">{value}</div>
      {subtitle && (
        <div className={`text-xs mt-2 font-medium text-center ${subtitleColor || 'text-slate-400'}`}>
          {subtitle}
        </div>
      )}
    </div>
  );
};