import { useState, useMemo } from 'react';
import { ProcessedData } from '../types';
import { GlassCard } from './GlassCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line } from 'recharts';
import { formatCurrency, formatPercent } from '../lib/utils';
import { cn } from '../lib/utils';

interface PerformanceChartProps {
  data: ProcessedData[];
}

type ViewType = 'revenue' | 'cogs' | 'opex';

export function PerformanceChart({ data }: PerformanceChartProps) {
  const [view, setView] = useState<ViewType>('revenue');

  const chartData = useMemo(() => {
    const monthlyData: Record<string, { month: string, actual: number, budget: number }> = {};
    
    // Sort logic for months (simple approach assuming data has year/month)
    // To keep it simple, we group by month string.
    
    data.forEach(row => {
      const { month, year, misHead, actual, budget } = row;
      if (!month) return; // Skip rows without dates
      
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
            monthlyData[key].actual -= actual; // since revenue is net
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
        // Simple string sort works for YYYY-MMM if months are numbered or we can parse dates
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA.getTime() - dateB.getTime();
    }).map(d => ({
        ...d,
        month: d.month.split('-')[1] // Just show month name
    }));
  }, [data, view]);

  return (
    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-5 flex flex-col w-full min-h-[400px]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-sm font-semibold text-white/80 uppercase tracking-widest">
          Actual vs. Budget <span className="font-normal normal-case text-white/40 ml-2">(Performance)</span>
        </h2>
        
        <div className="flex gap-4 text-[10px] uppercase tracking-tighter">
          <button 
            onClick={() => setView('revenue')}
            className={cn("flex items-center gap-2 transition-colors", view === 'revenue' ? "text-[#D4AF37]" : "text-white/40 hover:text-white/80")}
          >
            <div className={cn("w-3 h-3", view === 'revenue' ? "bg-[#D4AF37]" : "bg-white/40")}></div> Revenue
          </button>
          <button 
            onClick={() => setView('cogs')}
            className={cn("flex items-center gap-2 transition-colors", view === 'cogs' ? "text-[#D4AF37]" : "text-white/40 hover:text-white/80")}
          >
            <div className={cn("w-3 h-3", view === 'cogs' ? "bg-[#D4AF37]" : "bg-white/40")}></div> Direct Costs
          </button>
          <button 
            onClick={() => setView('opex')}
            className={cn("flex items-center gap-2 transition-colors", view === 'opex' ? "text-[#D4AF37]" : "text-white/40 hover:text-white/80")}
          >
            <div className={cn("w-3 h-3", view === 'opex' ? "bg-[#D4AF37]" : "bg-white/40")}></div> OPEX
          </button>
        </div>
      </div>
      
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 0, left: 20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
              tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
              dx={-10}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(17, 24, 39, 0.9)', 
                backdropFilter: 'blur(8px)',
                borderColor: 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: '#fff'
              }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Bar dataKey="actual" name="Actual" fill="#D4AF37" radius={[4, 4, 0, 0]} maxBarSize={50} />
            {/* Using a custom dashed line for budget markers instead of another bar for better visual distinction */}
            <Line 
              type="monotone" 
              dataKey="budget" 
              name="Budget" 
              stroke="#78350F" 
              strokeWidth={3}
              strokeDasharray="5 5"
              dot={{ r: 4, fill: '#78350F', stroke: 'none' }} 
              activeDot={{ r: 6, fill: '#D4AF37' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
