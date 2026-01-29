import React from 'react';
import {
  PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';
import { KPIMetrics } from '../types';

interface ChartsProps {
  metrics: KPIMetrics;
  primaryColor: string;
}

const COLORS = ['#F97316', '#14B8A6', '#3B82F6', '#EF4444', '#8B5CF6'];

const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

// Custom Tooltip for Categories
const CustomCategoryTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg text-xs min-w-[120px]">
                <p className="font-bold text-gray-800 mb-1.5 pb-1 border-b border-gray-100">{data.name}</p>
                <div className="flex justify-between items-center gap-4 mb-1">
                     <span className="text-gray-500 font-medium">Qtde:</span>
                     <span className="font-bold text-gray-700">{data.value}</span>
                </div>
                <div className="flex justify-between items-center gap-4">
                     <span className="text-gray-500 font-medium">Valor:</span>
                     <span className="font-bold text-green-600">{formatCurrency(data.total)}</span>
                </div>
            </div>
        );
    }
    return null;
};

export const StatusPieChart: React.FC<ChartsProps> = ({ metrics }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={metrics.statusDistribution}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          fill="#8884d8"
          paddingAngle={5}
          dataKey="value"
        >
          {metrics.statusDistribution.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
        />
        <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  );
};

export const TimeLineChart: React.FC<ChartsProps> = ({ metrics, primaryColor }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={metrics.timelineData}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={primaryColor} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={primaryColor} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tick={{fontSize: 11}} axisLine={false} tickLine={false} />
        <YAxis tick={{fontSize: 11}} axisLine={false} tickLine={false} />
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
        <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            formatter={(value: number) => [formatCurrency(value), "Valor"]}
        />
        <Area type="monotone" dataKey="value" stroke={primaryColor} fillOpacity={1} fill="url(#colorValue)" />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export const CategoryBarChart: React.FC<ChartsProps> = ({ metrics, primaryColor }) => {
  // Sort and take top 5 for cleanliness
  const data = [...metrics.categoryDistribution].sort((a, b) => b.value - a.value).slice(0, 5);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
        <XAxis type="number" hide />
        <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomCategoryTooltip />} cursor={{fill: 'transparent'}} />
        <Bar dataKey="value" fill={primaryColor} radius={[0, 4, 4, 0]} barSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
};