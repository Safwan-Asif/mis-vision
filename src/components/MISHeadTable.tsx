import { useMemo, useState } from 'react';
import { ProcessedData } from '../types';
import { formatCurrency, formatPercent, cn } from '../lib/utils';
import { FileText, ChevronDown, ChevronRight } from 'lucide-react';

interface MISHeadTableProps {
  data: ProcessedData[];
  filters: {
    year: string;
    month: string;
    groupAccountNumber: string;
    misHead: string;
  };
  isDarkMode: boolean;
}

interface PLRow {
  key: string;
  label: string;
  actual: number;
  budget: number;
  lyActual: number;
  varianceAmount: number;
  variancePercent: number;
  isSubtotal?: boolean;
  isFinalTotal?: boolean;
  isRevenueLike?: boolean;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

export function MISHeadTable({ data, filters, isDarkMode }: MISHeadTableProps) {
  const selectedYear = filters.year || '2026';
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

  // Toggle for Variance Display (true = percentage, false = amount)
  const [showVariancePercent, setShowVariancePercent] = useState(false);

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

  // Determine current active month index from the global filter
  const selectedMonthIndex = useMemo(() => {
    const index = MONTH_NAMES.indexOf(filters.month);
    return index !== -1 ? index : 11;
  }, [filters.month]);

  // General row filtering helper (excludes the month check since MTD and YTD handle it differently)
  const filterRowGeneral = (row: ProcessedData) => {
    if (filters.year && row.year !== filters.year) return false;
    if (filters.groupAccountNumber && row.groupAccountNumber !== filters.groupAccountNumber) return false;
    if (filters.misHead && row.misHead !== filters.misHead) return false;
    return true;
  };

  // 1. LEFT DATA: MTD Rows (Selected Month only)
  const mtdRowsData = useMemo(() => {
    return data.filter(row => filterRowGeneral(row) && row.month === filters.month);
  }, [data, filters]);

  // 2. RIGHT DATA: YTD Rows (Jan up to Selected Month)
  const ytdRowsData = useMemo(() => {
    return data.filter(row => filterRowGeneral(row) && row.monthIndex <= selectedMonthIndex);
  }, [data, filters, selectedMonthIndex]);

  // Common function to compute full hierarchical P&L row state
  const calculatePLData = (rowsList: ProcessedData[]) => {
    const totals: Record<string, { actual: number; budget: number; lyActual: number }> = {};

    rowsList.forEach(row => {
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
        totals[normKey] = { actual: 0, budget: 0, lyActual: 0 };
      }

      totals[normKey].actual += Math.abs(row.actual);
      totals[normKey].budget += Math.abs(row.budget);
      totals[normKey].lyActual += Math.abs(row.lastYearActual || 0);
    });

    const getVal = (key: string) => totals[key] || { actual: 0, budget: 0, lyActual: 0 };

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

    // Calculated Subtotals
    const netSales = {
      actual: a.actual - b.actual,
      budget: a.budget - b.budget,
      lyActual: a.lyActual - b.lyActual
    };

    const mom = {
      actual: netSales.actual - c.actual,
      budget: netSales.budget - c.budget,
      lyActual: netSales.lyActual - c.lyActual
    };

    const prodOverheads = {
      actual: d1.actual + d2.actual + d3.actual + d4.actual,
      budget: d1.budget + d2.budget + d3.budget + d4.budget,
      lyActual: d1.lyActual + d2.lyActual + d3.lyActual + d4.lyActual
    };

    const grossProfit = {
      actual: mom.actual - prodOverheads.actual,
      budget: mom.budget - prodOverheads.budget,
      lyActual: mom.lyActual - prodOverheads.lyActual
    };

    const gaOverheads = {
      actual: e1.actual + e2.actual + e3.actual,
      budget: e1.budget + e2.budget + e3.budget,
      lyActual: e1.lyActual + e2.lyActual + e3.lyActual
    };

    const smOverheads = {
      actual: f1.actual + f2.actual + f3.actual + f4.actual,
      budget: f1.budget + f2.budget + f3.budget + f4.budget,
      lyActual: f1.lyActual + f2.lyActual + f3.lyActual + f4.lyActual
    };

    const npbt = {
      actual: grossProfit.actual + otherInc.actual - (gaOverheads.actual + smOverheads.actual + finChg.actual),
      budget: grossProfit.budget + otherInc.budget - (gaOverheads.budget + smOverheads.budget + finChg.budget),
      lyActual: grossProfit.lyActual + otherInc.lyActual - (gaOverheads.lyActual + smOverheads.lyActual + finChg.lyActual)
    };

    const npat = {
      actual: npbt.actual - taxExp.actual,
      budget: npbt.budget - taxExp.budget,
      lyActual: npbt.lyActual - taxExp.lyActual
    };

    const makeRow = (
      key: string, 
      label: string, 
      item: { actual: number; budget: number; lyActual: number }, 
      isSubtotal = false, 
      isFinalTotal = false,
      isRevenueLike = false
    ): PLRow => {
      // VAR$ = BUD - CY ACTUAL
      const varAmt = item.budget - item.actual;
      const varPct = item.budget !== 0 ? (varAmt / Math.abs(item.budget)) * 100 : 0;
      return {
        key,
        label,
        actual: item.actual,
        budget: item.budget,
        lyActual: item.lyActual,
        varianceAmount: varAmt,
        variancePercent: varPct,
        isSubtotal,
        isFinalTotal,
        isRevenueLike
      };
    };

    return [
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
  };

  const mtdPLData = useMemo(() => calculatePLData(mtdRowsData), [mtdRowsData]);
  const ytdPLData = useMemo(() => calculatePLData(ytdRowsData), [ytdRowsData]);

  // Common inner component to render a single P&L table (MTD or YTD)
  const RenderTable = ({ title, description, rows }: { title: string; description: string; rows: PLRow[] }) => (
    <div className={cn(
      "backdrop-blur-lg border rounded-xl flex flex-col p-3 sm:p-4 overflow-hidden transition-all shadow-md w-full",
      isDarkMode 
        ? "bg-white/5 border-white/10 text-white" 
        : "bg-white/90 border-slate-200 text-slate-900"
    )}>
      <div className="flex flex-col mb-2.5">
        <h3 className="text-xs sm:text-sm font-bold tracking-tight flex items-center gap-1.5">
          <FileText className="text-[#D4AF37]" size={14} />
          {title}
        </h3>
        <p className={cn("text-[10px] sm:text-[11px] font-medium mt-0.5", isDarkMode ? "text-white/50" : "text-slate-500")}>
          {description}
        </p>
      </div>

      <div className="rounded-lg border border-slate-200/60 dark:border-white/10 overflow-hidden w-full">
        <table className="w-full text-left text-[10px] sm:text-[11px] table-fixed">
          <colgroup>
            <col className="w-[32%]" />
            <col className="w-[11%]" />
            <col className="w-[12%]" />
            <col className="w-[11%]" />
            <col className="w-[11%]" />
            <col className="w-[11%]" />
            <col className="w-[12%]" />
          </colgroup>
          <thead className={cn(
            "sticky top-0 z-10 border-b backdrop-blur-md transition-colors",
            isDarkMode ? "bg-[#111827]/90 border-white/10 text-white" : "bg-slate-100/90 border-slate-200 text-slate-800"
          )}>
            <tr>
              <th className="py-1 px-1 font-bold uppercase tracking-wider text-[8.5px] sm:text-[9.5px] truncate">P&L Category</th>
              <th className="py-1 px-1 font-bold uppercase tracking-wider text-[8.5px] sm:text-[9.5px] text-right truncate">Budget</th>
              <th className="py-1 px-1 font-bold uppercase tracking-wider text-[8.5px] sm:text-[9.5px] text-right truncate">CY Act</th>
              <th className="py-1 px-1 font-bold uppercase tracking-wider text-[8.5px] sm:text-[9.5px] text-right truncate">LY Act</th>
              <th className="py-1 px-1 font-bold uppercase tracking-wider text-[8.5px] sm:text-[9.5px] text-right text-amber-500 truncate">
                Var {showVariancePercent ? "%" : "$"}
              </th>
              <th className="py-1 px-1 font-bold uppercase tracking-wider text-[8.5px] sm:text-[9.5px] text-center truncate">Status 1</th>
              <th className="py-1 px-1 font-bold uppercase tracking-wider text-[8.5px] sm:text-[9.5px] text-center truncate">Status 2</th>
            </tr>
          </thead>
          <tbody className={cn("divide-y", isDarkMode ? "divide-white/5" : "divide-slate-200/70")}>
            {rows.map((row) => {
              if (!isRowVisible(row.key)) return null;

              const isVarPositive = row.varianceAmount >= 0;

              const isCollapsible = [
                'sub_net_sales', 'sub_mom', 'sub_prod', 'sub_ga', 'sub_sm', 'sub_npbt', 'final_npat'
              ].includes(row.key);

              // Status 1 Badge (vs Budget):
              const isIncome = row.isRevenueLike;
              const status1 = isIncome 
                ? (row.actual >= row.budget ? 'GROWTH' : 'DEGROWTH')
                : (row.budget >= row.actual ? 'LOW SPEND' : 'HIGH SPEND');

              // Status 2 Badge (vs Prior Year):
              const status2 = row.actual > row.lyActual ? 'HIGH SPEND' : 'LOW SPEND';

              return (
                <tr 
                  key={row.key} 
                  className={cn(
                    "transition-colors",
                    row.isFinalTotal 
                      ? (isDarkMode ? "bg-[#D4AF37]/10 hover:bg-[#D4AF37]/15" : "bg-amber-500/10 hover:bg-amber-500/15") 
                      : row.isSubtotal 
                        ? (isDarkMode ? "bg-white/[0.02] hover:bg-white/[0.04]" : "bg-slate-50 hover:bg-slate-100") 
                        : (isDarkMode ? "hover:bg-white/[0.01]" : "hover:bg-slate-50/50")
                  )}
                >
                  {/* Category Name */}
                  <td className="py-1 px-1 font-medium whitespace-nowrap truncate">
                    <div className="flex items-center gap-1">
                      {isCollapsible ? (
                        <button 
                          onClick={() => toggleGroup(row.key)}
                          className={cn(
                            "p-0 rounded transition-colors cursor-pointer",
                            isDarkMode ? "hover:bg-white/10 text-white/60" : "hover:bg-slate-200 text-slate-500"
                          )}
                        >
                          {collapsedGroups[row.key] ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                        </button>
                      ) : (
                        <span className="w-3" />
                      )}
                      
                      <span className={cn(
                        "truncate text-[9.5px] sm:text-[10.5px]",
                        row.isFinalTotal || row.isSubtotal
                          ? (isDarkMode ? "text-[#D4AF37] font-extrabold" : "text-[#B48A1D] font-extrabold")
                          : (isDarkMode ? "text-white/90" : "text-slate-800")
                      )}>
                        {row.label}
                      </span>
                    </div>
                  </td>

                  {/* Budget ($) */}
                  <td className={cn(
                    "py-1 px-1 text-right font-mono whitespace-nowrap truncate text-[9.5px] sm:text-[10.5px]",
                    row.isSubtotal || row.isFinalTotal
                      ? (isDarkMode ? "text-white/85 font-bold" : "text-slate-900 font-bold")
                      : (isDarkMode ? "text-white/60" : "text-slate-600")
                  )}>
                    {formatCurrency(row.budget)}
                  </td>

                  {/* CY Actual ($) */}
                  <td className={cn(
                    "py-1 px-1 text-right font-mono whitespace-nowrap truncate text-[9.5px] sm:text-[10.5px]",
                    row.isFinalTotal || row.isSubtotal
                      ? (isDarkMode ? "text-[#D4AF37] font-extrabold" : "text-[#B48A1D] font-extrabold")
                      : (isDarkMode ? "text-white/90 font-medium" : "text-slate-800 font-medium")
                  )}>
                    {formatCurrency(row.actual)}
                  </td>

                  {/* LY Actual ($) */}
                  <td className={cn(
                    "py-1 px-1 text-right font-mono whitespace-nowrap truncate text-[9.5px] sm:text-[10.5px]",
                    row.isSubtotal || row.isFinalTotal
                      ? (isDarkMode ? "text-white/70 font-medium" : "text-slate-700 font-medium")
                      : (isDarkMode ? "text-white/50" : "text-slate-500")
                  )}>
                    {formatCurrency(row.lyActual)}
                  </td>

                  {/* Variance */}
                  <td className={cn(
                    "py-1 px-1 text-right font-mono font-bold whitespace-nowrap truncate text-[9.5px] sm:text-[10.5px]",
                    isVarPositive 
                      ? (isDarkMode ? "text-emerald-400" : "text-emerald-600")
                      : (isDarkMode ? "text-rose-400" : "text-rose-600")
                  )}>
                    {showVariancePercent ? (
                      <>
                        {row.variancePercent >= 0 ? '+' : ''}
                        {formatPercent(row.variancePercent)}
                      </>
                    ) : (
                      <>
                        {row.varianceAmount >= 0 ? '+' : ''}
                        {formatCurrency(row.varianceAmount)}
                      </>
                    )}
                  </td>

                  {/* Status 1 Badge */}
                  <td className="py-1 px-0.5 text-center whitespace-nowrap truncate">
                    {(status1 === 'LOW SPEND' || status1 === 'GROWTH') ? (
                      <span className={cn(
                        "inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[7.5px] sm:text-[8.5px] font-extrabold border shadow-xs leading-none",
                        isDarkMode 
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" 
                          : "bg-emerald-50 text-emerald-700 border-emerald-300"
                      )}>
                        {status1 === 'GROWTH' ? 'GROWTH 👍' : 'LOW 👍'}
                      </span>
                    ) : (
                      <span className={cn(
                        "inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[7.5px] sm:text-[8.5px] font-extrabold border shadow-xs leading-none",
                        isDarkMode 
                          ? "bg-rose-500/15 text-rose-400 border-rose-500/20" 
                          : "bg-rose-50 text-rose-700 border-rose-300"
                      )}>
                        {status1 === 'DEGROWTH' ? 'DEGROWTH ⚠️' : 'HIGH ⚠️'}
                      </span>
                    )}
                  </td>

                  {/* Status 2 Badge */}
                  <td className="py-1 px-0.5 text-center whitespace-nowrap truncate">
                    {status2 === 'LOW SPEND' ? (
                      <span className={cn(
                        "inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[7.5px] sm:text-[8.5px] font-extrabold border shadow-xs leading-none",
                        isDarkMode 
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" 
                          : "bg-emerald-50 text-emerald-700 border-emerald-300"
                      )}>
                        LOW 📉
                      </span>
                    ) : (
                      <span className={cn(
                        "inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[7.5px] sm:text-[8.5px] font-extrabold border shadow-xs leading-none",
                        isDarkMode 
                          ? "bg-rose-500/15 text-rose-400 border-rose-500/20" 
                          : "bg-rose-50 text-rose-700 border-rose-300"
                      )}>
                        HIGH 📈
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Shared Header Controls and Features Card */}
      <div className={cn(
        "backdrop-blur-lg border rounded-xl p-3 sm:p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md transition-all",
        isDarkMode 
          ? "bg-white/5 border-white/10 text-white" 
          : "bg-white/90 border-slate-200 text-slate-900"
      )}>
        <div>
          <h2 className="text-sm sm:text-base font-bold tracking-tight flex items-center gap-2">
            <FileText className="text-[#D4AF37]" size={18} />
            Module 3: Fixed Statutory P&L Breakdown Module
          </h2>
          <p className={cn("text-xs font-medium mt-0.5", isDarkMode ? "text-white/50" : "text-slate-500")}>
            Side-by-side comparison of Month-to-Date (MTD) vs. Year-to-Date (YTD) executive P&L statements
          </p>
        </div>

        {/* Coordinated Action Pill Swapped Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Toggle 1: Variance Display Toggle */}
          <div className={cn(
            "flex items-center p-0.5 rounded-full border text-[10.5px] font-semibold",
            isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-300"
          )}>
            <button
              onClick={() => setShowVariancePercent(false)}
              className={cn(
                "px-2.5 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap",
                !showVariancePercent 
                  ? "bg-[#D4AF37] text-black font-extrabold shadow-sm" 
                  : (isDarkMode ? "text-white/70 hover:text-white" : "text-slate-600 hover:text-slate-900")
              )}
            >
              Var Amount ($)
            </button>
            <button
              onClick={() => setShowVariancePercent(true)}
              className={cn(
                "px-2.5 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap",
                showVariancePercent 
                  ? "bg-[#D4AF37] text-black font-extrabold shadow-sm" 
                  : (isDarkMode ? "text-white/70 hover:text-white" : "text-slate-600 hover:text-slate-900")
              )}
            >
              Var Percent (%)
            </button>
          </div>

          {/* View Mode Toggle (Expand/Collapse All) */}
          <button
            onClick={toggleAll}
            className={cn(
              "px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-all border flex items-center gap-1 cursor-pointer shadow-sm shrink-0",
              isDarkMode 
                ? "bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/35 hover:bg-[#D4AF37]/20" 
                : "bg-amber-500/10 text-[#B48A1D] border-amber-500/30 hover:bg-amber-500/20"
            )}
          >
            {isAllExpanded ? "Collapse All View" : "Expand All View"}
          </button>
        </div>
      </div>

      {/* Side-by-Side 2-Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 w-full">
        {/* LEFT MTD Table */}
        <RenderTable 
          title="Module 3: Fixed Statutory MIS Head P&L Table (MTD)"
          description={`Reflects performance for the Selected Month only: ${filters.month} ${selectedYear}`}
          rows={mtdPLData}
        />

        {/* RIGHT YTD Table */}
        <RenderTable 
          title="Module 3B: Fixed Statutory MIS Head P&L Table (YTD)"
          description={`Reflects accumulated performance from January up to: ${filters.month} ${selectedYear}`}
          rows={ytdPLData}
        />
      </div>
    </div>
  );
}
