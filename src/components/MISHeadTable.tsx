import { useMemo, useState } from 'react';
import { ProcessedData } from '../types';
import { formatCurrency, formatPercent, cn } from '../lib/utils';
import { FileText, ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react';

interface MISHeadTableProps {
  data: ProcessedData[];
  isDarkMode: boolean;
}

interface PLRow {
  key: string;
  label: string;
  actual: number;
  budget: number;
  varianceAmount: number;
  variancePercent: number;
  isSubtotal?: boolean;
  isFinalTotal?: boolean;
  isRevenueLike?: boolean;
}

// Maps child row keys to their respective subtotal parent keys
const rowParentMap: Record<string, string> = {
  'a': 'sub_net_sales',
  'b': 'sub_net_sales',
  'c': 'sub_mom',
  'd1': 'sub_prod',
  'd2': 'sub_prod',
  'd3': 'sub_prod',
  'd4': 'sub_prod',
  'e1': 'sub_ga',
  'e2': 'sub_ga',
  'e3': 'sub_ga',
  'f1': 'sub_sm',
  'f2': 'sub_sm',
  'f3': 'sub_sm',
  'f4': 'sub_sm',
  'other_inc': 'sub_npbt',
  'fin_chg': 'sub_npbt',
  'tax': 'final_npat',
};

export function MISHeadTable({ data, isDarkMode }: MISHeadTableProps) {
  // Collapsed by default for executive summary view
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    sub_net_sales: true,
    sub_mom: true,
    sub_prod: true,
    sub_ga: true,
    sub_sm: true,
    sub_npbt: true,
    final_npat: true,
  });

  const isAllExpanded = useMemo(() => {
    return Object.values(collapsedGroups).every(v => !v);
  }, [collapsedGroups]);

  const toggleAll = () => {
    const nextState = !isAllExpanded;
    setCollapsedGroups({
      sub_net_sales: !nextState,
      sub_mom: !nextState,
      sub_prod: !nextState,
      sub_ga: !nextState,
      sub_sm: !nextState,
      sub_npbt: !nextState,
      final_npat: !nextState,
    });
  };

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const isRowVisible = (rowKey: string) => {
    const parentKey = rowParentMap[rowKey];
    if (!parentKey) return true; // subtotal and total rows are always visible
    return !collapsedGroups[parentKey];
  };

  const plData = useMemo(() => {
    // 1. Accumulate raw values by normalized key
    const totals: Record<string, { actual: number; budget: number }> = {};

    data.forEach(row => {
      const raw = (row.misHead || '').trim();
      if (!raw) return;

      const upper = raw.toUpperCase();
      let normKey = upper;

      if (upper.includes('SALES RETURN') || upper.includes('SALES/RETURN')) normKey = 'SALES RETURN';
      else if (upper.includes('SALES') || upper.includes('REVENUE')) normKey = 'SALES/REVENUE';
      else if (upper.includes('MATERIAL')) normKey = 'MATERIAL COST';
      else if (upper.includes('DC - OTHER') || upper.includes('DC-OTHER')) normKey = 'DC - OTHER OVERHEADS';
      else if (upper.includes('DC - MANPOWER') || upper.includes('DC-MANPOWER')) normKey = 'DC - MANPOWER COST';
      else if (upper.includes('DC - UTILITY') || upper.includes('DC-UTILITY')) normKey = 'DC - UTILITY COST';
      else if (upper.includes('DC - DEPRECIATION') || upper.includes('DC-DEPRECIATION')) normKey = 'DC - DEPRECIATION';
      else if (upper.includes('GA - OTHER') || upper.includes('GA-OTHER')) normKey = 'GA - OTHER OVERHEADS';
      else if (upper.includes('GA - MANPOWER') || upper.includes('GA-MANPOWER')) normKey = 'GA - MANPOWER COST';
      else if (upper.includes('GA - DEPRECIATION') || upper.includes('GA-DEPRECIATION')) normKey = 'GA - DEPRECIATION';
      else if (upper.includes('SM - OTHER') || upper.includes('SM-OTHER')) normKey = 'SM - OTHER OVERHEADS';
      else if (upper.includes('SM - MANPOWER') || upper.includes('SM-MANPOWER')) normKey = 'SM - MANPOWER COST';
      else if (upper.includes('SM - VEHICLE') || upper.includes('SM-VEHICLE')) normKey = 'SM - VEHICLE FUEL';
      else if (upper.includes('SM - DEPRECIATION') || upper.includes('SM-DEPRECIATION')) normKey = 'SM - DEPRECIATION';
      else if (upper.includes('OTHER INCOME')) normKey = 'OTHER INCOME';
      else if (upper.includes('FINANCE')) normKey = 'FINANCE CHARGES';
      else if (upper.includes('TAX')) normKey = 'TAX EXPENSE';

      if (!totals[normKey]) {
        totals[normKey] = { actual: 0, budget: 0 };
      }

      // In data.ts, actual & budget for sales/other income are already positive (abs)
      totals[normKey].actual += Math.abs(row.actual);
      totals[normKey].budget += Math.abs(row.budget);
    });

    const getVal = (key: string) => totals[key] || { actual: 0, budget: 0 };

    // 2. Extract base values
    const a = getVal('SALES/REVENUE');
    const b = getVal('SALES RETURN');
    const c = getVal('MATERIAL COST');

    const d1 = getVal('DC - OTHER OVERHEADS');
    const d2 = getVal('DC - MANPOWER COST');
    const d3 = getVal('DC - UTILITY COST');
    const d4 = getVal('DC - DEPRECIATION');

    const e1 = getVal('GA - OTHER OVERHEADS');
    const e2 = getVal('GA - MANPOWER COST');
    const e3 = getVal('GA - DEPRECIATION');

    const f1 = getVal('SM - OTHER OVERHEADS');
    const f2 = getVal('SM - MANPOWER COST');
    const f3 = getVal('SM - VEHICLE FUEL');
    const f4 = getVal('SM - DEPRECIATION');

    const otherInc = getVal('OTHER INCOME');
    const finChg = getVal('FINANCE CHARGES');
    const taxExp = getVal('TAX EXPENSE');

    // 3. Calculated Subtotals
    // Net Sales = a - b
    const netSales = {
      actual: a.actual - b.actual,
      budget: a.budget - b.budget
    };

    // MOM = Net Sales - c
    const mom = {
      actual: netSales.actual - c.actual,
      budget: netSales.budget - c.budget
    };

    // Production Overheads = SUM(d items)
    const prodOverheads = {
      actual: d1.actual + d2.actual + d3.actual + d4.actual,
      budget: d1.budget + d2.budget + d3.budget + d4.budget
    };

    // Gross Profit = MOM - Production Overheads
    const grossProfit = {
      actual: mom.actual - prodOverheads.actual,
      budget: mom.budget - prodOverheads.budget
    };

    // GA Overheads = SUM(e items)
    const gaOverheads = {
      actual: e1.actual + e2.actual + e3.actual,
      budget: e1.budget + e2.budget + e3.budget
    };

    // SM Overheads = SUM(f items)
    const smOverheads = {
      actual: f1.actual + f2.actual + f3.actual + f4.actual,
      budget: f1.budget + f2.budget + f3.budget + f4.budget
    };

    // NPBT = Gross Profit + OTHER INCOME - (GA Overheads + SM Overheads + FINANCE CHARGES)
    const npbt = {
      actual: grossProfit.actual + otherInc.actual - (gaOverheads.actual + smOverheads.actual + finChg.actual),
      budget: grossProfit.budget + otherInc.budget - (gaOverheads.budget + smOverheads.budget + finChg.budget)
    };

    // NPAT = NPBT - TAX EXPENSE
    const npat = {
      actual: npbt.actual - taxExp.actual,
      budget: npbt.budget - taxExp.budget
    };

    // Helper to format line object
    const makeRow = (
      key: string, 
      label: string, 
      item: { actual: number; budget: number }, 
      isSubtotal = false, 
      isFinalTotal = false,
      isRevenueLike = false
    ): PLRow => {
      const varAmt = item.actual - item.budget;
      const varPct = item.budget !== 0 ? (varAmt / Math.abs(item.budget)) * 100 : 0;
      return {
        key,
        label,
        actual: item.actual,
        budget: item.budget,
        varianceAmount: varAmt,
        variancePercent: varPct,
        isSubtotal,
        isFinalTotal,
        isRevenueLike
      };
    };

    // 4. Construct FIXED, UNCHANGING P&L SEQUENCING
    const rows: PLRow[] = [
      makeRow('a', 'SALES/REVENUE', a, false, false, true),
      makeRow('b', 'SALES RETURN', b, false, false, false),
      makeRow('sub_net_sales', 'Net Sales', netSales, true, false, true),
      
      makeRow('c', 'MATERIAL COST', c, false, false, false),
      makeRow('sub_mom', 'MOM (Margin Over Material)', mom, true, false, true),

      makeRow('d1', 'DC - OTHER OVERHEADS', d1, false, false, false),
      makeRow('d2', 'DC - MANPOWER COST', d2, false, false, false),
      makeRow('d3', 'DC - UTILITY COST', d3, false, false, false),
      makeRow('d4', 'DC - DEPRECIATION', d4, false, false, false),
      makeRow('sub_prod', 'Production Overheads', prodOverheads, true, false, false),
      makeRow('sub_gp', 'Gross Profit', grossProfit, true, false, true),

      makeRow('e1', 'GA - OTHER OVERHEADS', e1, false, false, false),
      makeRow('e2', 'GA - MANPOWER COST', e2, false, false, false),
      makeRow('e3', 'GA - DEPRECIATION', e3, false, false, false),
      makeRow('sub_ga', 'GA Overheads', gaOverheads, true, false, false),

      makeRow('f1', 'SM - OTHER OVERHEADS', f1, false, false, false),
      makeRow('f2', 'SM - MANPOWER COST', f2, false, false, false),
      makeRow('f3', 'SM - VEHICLE FUEL', f3, false, false, false),
      makeRow('f4', 'SM - DEPRECIATION', f4, false, false, false),
      makeRow('sub_sm', 'SM Overheads', smOverheads, true, false, false),

      makeRow('other_inc', 'OTHER INCOME', otherInc, false, false, true),
      makeRow('fin_chg', 'FINANCE CHARGES', finChg, false, false, false),
      makeRow('sub_npbt', 'NPBT (Net Profit Before Tax)', npbt, true, false, true),

      makeRow('tax', 'TAX EXPENSE', taxExp, false, false, false),
      makeRow('final_npat', 'NPAT (Net Profit After Tax)', npat, true, true, true)
    ];

    return rows;
  }, [data]);

  return (
    <div className={cn(
      "flex-1 backdrop-blur-lg border rounded-xl flex flex-col p-4 sm:p-5 overflow-hidden transition-all shadow-lg min-h-[520px]",
      isDarkMode 
        ? "bg-white/5 border-white/10 text-white" 
        : "bg-white/90 border-slate-200 text-slate-900"
    )}>
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
            <FileText className="text-[#D4AF37]" size={18} />
            Module 3: Fixed Statutory MIS Head P&L Breakdown Table
          </h2>
          <p className={cn("text-xs font-medium mt-0.5", isDarkMode ? "text-white/50" : "text-slate-500")}>
            Fixed, unchanging P&L financial sequencing & subtotal hierarchy
          </p>
        </div>

        {/* Dual-State Pill Toggle Control */}
        <button
          onClick={toggleAll}
          className={cn(
            "px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all border flex items-center gap-2 cursor-pointer shadow-sm shrink-0",
            isDarkMode 
              ? "bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/35 hover:bg-[#D4AF37]/20" 
              : "bg-amber-500/10 text-[#B48A1D] border-amber-500/30 hover:bg-amber-500/20"
          )}
        >
          {isAllExpanded ? <EyeOff size={13} /> : <Eye size={13} />}
          <span>{isAllExpanded ? "Collapse All" : "Expand All"}</span>
        </button>
      </div>

      <div className="flex-1 overflow-x-auto rounded-lg border border-slate-200/60 dark:border-white/10">
        <table className="w-full text-left text-xs min-w-[700px]">
          <thead className={cn(
            "sticky top-0 z-10 border-b backdrop-blur-md transition-colors",
            isDarkMode ? "bg-[#111827]/90 border-white/10 text-white" : "bg-slate-100/90 border-slate-200 text-slate-800"
          )}>
            <tr>
              <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px]">P&L Category</th>
              <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px] text-right">Actual ($)</th>
              <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px] text-right">Budget ($)</th>
              <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px] text-right">Var ($)</th>
              <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px] text-right">Var %</th>
            </tr>
          </thead>
          <tbody className={cn("divide-y", isDarkMode ? "divide-white/5" : "divide-slate-200/70")}>
            {plData.map((row) => {
              if (!isRowVisible(row.key)) return null;

              const isFavorable = row.isRevenueLike 
                ? row.actual >= row.budget 
                : row.actual <= row.budget;

              const isCollapsible = [
                'sub_net_sales', 'sub_mom', 'sub_prod', 'sub_ga', 'sub_sm', 'sub_npbt', 'final_npat'
              ].includes(row.key);

              return (
                <tr 
                  key={row.key} 
                  className={cn(
                    "transition-colors",
                    row.isFinalTotal
                      ? (isDarkMode ? "bg-[#D4AF37]/20 font-black border-y-2 border-[#D4AF37]/50" : "bg-amber-100/90 font-black border-y-2 border-amber-400")
                      : row.isSubtotal 
                        ? (isDarkMode ? "bg-white/10 font-bold border-y border-white/15" : "bg-amber-500/10 font-bold border-y border-amber-200/80")
                        : (isDarkMode ? "hover:bg-white/[0.03]" : "hover:bg-slate-50")
                  )}
                >
                  {/* Category Label */}
                  <td 
                    className={cn(
                      "py-2.5 px-3.5 whitespace-nowrap select-none",
                      row.isFinalTotal 
                        ? (isDarkMode ? "text-[#D4AF37] font-black text-xs" : "text-[#B48A1D] font-black text-xs")
                        : row.isSubtotal 
                          ? (isDarkMode ? "text-white font-bold" : "text-slate-900 font-bold")
                          : (isDarkMode ? "text-white/80 font-medium pl-8" : "text-slate-700 font-medium pl-8")
                    )}
                  >
                    <div 
                      className="flex items-center gap-2"
                      onClick={() => isCollapsible && toggleGroup(row.key)}
                      style={{ cursor: isCollapsible ? 'pointer' : 'default' }}
                    >
                      {isCollapsible && (
                        collapsedGroups[row.key] 
                          ? <ChevronRight size={14} className="text-[#D4AF37] shrink-0 hover:scale-110 transition-transform" />
                          : <ChevronDown size={14} className="text-[#D4AF37] shrink-0 hover:scale-110 transition-transform" />
                      )}
                      {!isCollapsible && rowParentMap[row.key] && (
                        <span className="w-3.5 shrink-0" /> // subtle alignment alignment spacing for child rows
                      )}
                      <span>{row.label}</span>
                    </div>
                  </td>

                  {/* Actual ($) */}
                  <td className={cn(
                    "py-2.5 px-3.5 text-right font-mono whitespace-nowrap",
                    row.isFinalTotal || row.isSubtotal
                      ? (isDarkMode ? "text-[#D4AF37] font-extrabold" : "text-[#B48A1D] font-extrabold")
                      : (isDarkMode ? "text-white/90 font-medium" : "text-slate-800 font-medium")
                  )}>
                    {formatCurrency(row.actual)}
                  </td>

                  {/* Budget ($) */}
                  <td className={cn(
                    "py-2.5 px-3.5 text-right font-mono whitespace-nowrap",
                    row.isSubtotal || row.isFinalTotal
                      ? (isDarkMode ? "text-white/80 font-bold" : "text-slate-800 font-bold")
                      : (isDarkMode ? "text-white/60" : "text-slate-600")
                  )}>
                    {formatCurrency(row.budget)}
                  </td>

                  {/* Variance Amount ($) */}
                  <td className={cn(
                    "py-2.5 px-3.5 text-right font-mono font-medium whitespace-nowrap",
                    isFavorable 
                      ? (isDarkMode ? "text-emerald-400" : "text-emerald-600")
                      : (isDarkMode ? "text-rose-400" : "text-rose-600")
                  )}>
                    {row.varianceAmount >= 0 ? '+' : ''}{formatCurrency(row.varianceAmount)}
                  </td>

                  {/* Variance % */}
                  <td className={cn(
                    "py-2.5 px-3.5 text-right font-mono font-bold whitespace-nowrap",
                    isFavorable 
                      ? (isDarkMode ? "text-emerald-400" : "text-emerald-600")
                      : (isDarkMode ? "text-rose-400" : "text-rose-600")
                  )}>
                    {row.variancePercent >= 0 ? '+' : ''}{formatPercent(row.variancePercent)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
