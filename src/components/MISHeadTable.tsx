import { useMemo } from 'react';
import { ProcessedData } from '../types';
import { GlassCard } from './GlassCard';
import { formatCurrency, formatPercent, cn } from '../lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MISHeadTableProps {
  data: ProcessedData[];
}

export function MISHeadTable({ data }: MISHeadTableProps) {
  const aggregatedData = useMemo(() => {
    const map: Record<string, { misHead: string, actual: number, budget: number, isRevenue: boolean }> = {};
    
    data.forEach(row => {
      if (!row.misHead) return;
      if (!map[row.misHead]) {
        map[row.misHead] = {
          misHead: row.misHead,
          actual: 0,
          budget: 0,
          isRevenue: row.isRevenue
        };
      }
      
      map[row.misHead].actual += row.actual;
      map[row.misHead].budget += row.budget;
    });
    
    return Object.values(map).map(item => {
      const varianceAmount = item.actual - item.budget;
      const variancePercent = item.budget !== 0 ? (varianceAmount / Math.abs(item.budget)) * 100 : 0;
      
      let status: 'favorable' | 'unfavorable' = 'unfavorable';
      if (item.isRevenue) {
        status = item.actual >= item.budget ? 'favorable' : 'unfavorable';
      } else {
        status = item.actual <= item.budget ? 'favorable' : 'unfavorable';
      }
      
      return {
        ...item,
        varianceAmount,
        variancePercent,
        status
      };
    }).sort((a, b) => b.actual - a.actual);
  }, [data]);

  return (
    <div className="flex-1 bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl flex flex-col p-4 sm:p-6 overflow-hidden">
      <h2 className="text-sm font-semibold text-white/80 uppercase tracking-widest mb-4">MIS Head Breakdown</h2>
      <div className="flex-1 overflow-x-auto pr-2">
        <table className="w-full text-left text-sm border-separate border-spacing-y-2">
          <thead>
            <tr className="text-white/40 uppercase text-xs tracking-widest">
              <th className="pb-3">Category</th>
              <th className="pb-3 text-right">Actual ($)</th>
              <th className="pb-3 text-right">Var %</th>
            </tr>
          </thead>
          <tbody className="text-white/80">
            {aggregatedData.map((row, i) => (
              <tr key={i} className="bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                <td className="p-3 sm:px-4 rounded-l border-y border-l border-white/5">{row.misHead}</td>
                <td className="p-3 sm:px-4 text-right border-y border-white/5">{formatCurrency(row.actual)}</td>
                <td className={cn(
                  "p-3 sm:px-4 text-right font-bold rounded-r border-y border-r border-white/5",
                  row.status === 'favorable' ? "text-[#10B981]" : "text-[#EF4444]"
                )}>
                  {row.variancePercent > 0 ? '+' : ''}{formatPercent(row.variancePercent)}
                </td>
              </tr>
            ))}
            {aggregatedData.length === 0 && (
              <tr>
                <td colSpan={3} className="p-4 text-center text-white/50">
                  No data available for the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
