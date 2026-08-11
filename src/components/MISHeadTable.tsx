import { useMemo } from 'react';
import { ProcessedData } from '../types';
import { formatCurrency, formatPercent, cn } from '../lib/utils';

interface MISHeadTableProps {
  data: ProcessedData[];
  isDarkMode: boolean;
}

export function MISHeadTable({ data, isDarkMode }: MISHeadTableProps) {
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
    <div className={cn(
      "flex-1 backdrop-blur-lg border rounded-xl flex flex-col p-4 sm:p-6 overflow-hidden transition-colors",
      isDarkMode 
        ? "bg-white/5 border-white/10 text-white" 
        : "bg-white/90 border-slate-200/90 text-slate-900 shadow-md"
    )}>
      <h2 className={cn("text-sm font-semibold uppercase tracking-widest mb-4", isDarkMode ? "text-white/80" : "text-slate-800")}>
        MIS Head Breakdown
      </h2>
      <div className="flex-1 overflow-x-auto pr-2">
        <table className="w-full text-left text-sm border-separate border-spacing-y-2">
          <thead>
            <tr className={cn("uppercase text-xs tracking-widest font-semibold", isDarkMode ? "text-white/40" : "text-slate-500")}>
              <th className="pb-3">Category</th>
              <th className="pb-3 text-right">Actual ($)</th>
              <th className="pb-3 text-right">Var %</th>
            </tr>
          </thead>
          <tbody className={isDarkMode ? "text-white/80" : "text-slate-800"}>
            {aggregatedData.map((row, i) => (
              <tr key={i} className={cn(
                "transition-colors",
                isDarkMode ? "bg-white/[0.02] hover:bg-white/[0.04]" : "bg-slate-50 hover:bg-slate-100"
              )}>
                <td className={cn("p-3 sm:px-4 rounded-l border-y border-l", isDarkMode ? "border-white/5" : "border-slate-200")}>
                  {row.misHead}
                </td>
                <td className={cn("p-3 sm:px-4 text-right border-y", isDarkMode ? "border-white/5" : "border-slate-200")}>
                  {formatCurrency(row.actual)}
                </td>
                <td className={cn(
                  "p-3 sm:px-4 text-right font-bold rounded-r border-y border-r",
                  isDarkMode ? "border-white/5" : "border-slate-200",
                  row.status === 'favorable' 
                    ? (isDarkMode ? "text-[#10B981]" : "text-emerald-600") 
                    : (isDarkMode ? "text-[#EF4444]" : "text-rose-600")
                )}>
                  {row.variancePercent > 0 ? '+' : ''}{formatPercent(row.variancePercent)}
                </td>
              </tr>
            ))}
            {aggregatedData.length === 0 && (
              <tr>
                <td colSpan={3} className={cn("p-4 text-center", isDarkMode ? "text-white/50" : "text-slate-400")}>
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

