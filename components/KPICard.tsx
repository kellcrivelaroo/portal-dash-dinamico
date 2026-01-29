import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, icon: Icon, color, bgColor }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
      </div>
      <div className={`p-3 rounded-full ${bgColor}`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
    </div>
  );
};

export default KPICard;
