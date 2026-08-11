import { useState, useMemo } from 'react';
import { ProcessedData } from '../types';
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line } from 'recharts';
import { formatCurrency } from '../lib/utils';
import { cn } from '../lib/utils';

interface PerformanceChartProps {
  data: ProcessedData[];
  isDarkMode: boolean;
}

type ViewType = 'revenue' | 'cogs' | 'opex';

export function PerformanceChart({ data, isDarkMode }: PerformanceChartProps) {
  const [view, setView] = useState<ViewType>('revenue');

  const chartData = useMemo(() => {
    const monthlyData: Record<string, { month: string, actual: number, budget: number }> = {};
    
    data.forEach(row => {
      const { month, year, misHead, actual, budget } = row;
      if (!month) return;
      
      const key = `${year}-${month}`;
      
      if (!monthlyData[key]) {
        monthlyData[key] = { month: key, actual: 0, budget: 0 };
      }
      
      let include = false;
      if (view === 'revenue' && (misHead === 'SALES/REVENUE' || misHead === 'SALES RETURN')) {
        include = true;
      } else if (view === 'cogs' && (misHead === 'MATERIAL COST' || misHead.startsWith('DC -'))) {
        include = true;
      } else if (view === 'opex' && (misHead.startsWith('SM -') || misHead.startsWith('GA -'))) {
        include = true;
      }
      
      if (include) {
        if (misHead === 'SALES RETURN') {
            monthlyData[key].actual -= actual;
            monthlyData[key].budget -= budget;
        } else if (misHead === 'SALES/REVENUE') {
            monthlyData[key].actual += Math.abs(actual);
            monthlyData[key].budget += Math.abs(budget);
        } else {
            monthlyData[key].actual += actual;
            monthlyData[key].budget += budget;
        }
      }
    });

    return Object.values(monthlyData).sort((a, b) => {
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA.getTime() - dateB.getTime();
    }).map(d => ({
        ...d,
        month: d.month.split('-')[1]
    }));
  }, [data, view]);

  const activeColor = isDarkMode ? "#D4AF37" : "#B48A1D";
  const inactiveColor = isDarkMode ? "text-white/40 hover:text-white/80" : "text-slate-400 hover:text-slate-700";

  return (
    <div className={cn(
      "backdrop-blur-lg rounded-xl p-5 flex flex-col w-full min-h-[400px] border transition-colors",
      isDarkMode 
        ? "bg-white/5 border-white/10 text-white" 
        : "bg-white/90 border-slate-200/90 text-slate-900 shadow-md"
    )}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className={cn("text-sm font-semibold uppercase tracking-widest", isDarkMode ? "text-white/80" : "text-slate-800")}>
          Actual vs. Budget <span className={cn("font-normal normal-case ml-2", isDarkMode ? "text-white/40" : "text-slate-500")}>(Performance)</span>
        </h2>
        
        <div className="flex gap-4 text-[10px] uppercase tracking-tighter font-semibold">
          <button 
            onClick={() => setView('revenue')}
            className={cn("flex items-center gap-2 transition-colors cursor-pointer", view === 'revenue' ? (isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]") : inactiveColor)}
          >
            <div className={cn("w-3 h-3 rounded-xs", view === 'revenue' ? (isDarkMode ? "bg-[#D4AF37]" : "bg-[#B48A1D]") : (isDarkMode ? "bg-white/40" : "bg-slate-300"))}></div> Revenue
          </button>
          <button 
            onClick={() => setView('cogs')}
            className={cn("flex items-center gap-2 transition-colors cursor-pointer", view === 'cogs' ? (isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]") : inactiveColor)}
          >
            <div className={cn("w-3 h-3 rounded-xs", view === 'cogs' ? (isDarkMode ? "bg-[#D4AF37]" : "bg-[#B48A1D]") : (isDarkMode ? "bg-white/40" : "bg-slate-300"))}></div> Direct Costs
          </button>
          <button 
            onClick={() => setView('opex')}
            className={cn("flex items-center gap-2 transition-colors cursor-pointer", view === 'opex' ? (isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]") : inactiveColor)}
          >
            <div className={cn("w-3 h-3 rounded-xs", view === 'opex' ? (isDarkMode ? "bg-[#D4AF37]" : "bg-[#B48A1D]") : (isDarkMode ? "bg-white/40" : "bg-slate-300"))}></div> OPEX
          </button>
        </div>
      </div>
      
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 0, left: 20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"} vertical={false} />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(51,65,85,0.8)', fontSize: 12 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(51,65,85,0.8)', fontSize: 12 }}
              tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
              dx={-10}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)', 
                backdropFilter: 'blur(8px)',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(203,213,225,0.8)',
                borderRadius: '12px',
                color: isDarkMode ? '#fff' : '#0f172a',
                boxShadow: isDarkMode ? 'none' : '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Bar dataKey="actual" name="Actual" fill={activeColor} radius={[4, 4, 0, 0]} maxBarSize={50} />
            <Line 
              type="monotone" 
              dataKey="budget" 
              name="Budget" 
              stroke={isDarkMode ? "#78350F" : "#9A3412"} 
              strokeWidth={3}
              strokeDasharray="5 5"
              dot={{ r: 4, fill: isDarkMode ? '#78350F' : '#9A3412', stroke: 'none' }} 
              activeDot={{ r: 6, fill: activeColor }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

