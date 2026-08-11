import { useMemo } from 'react';
import { ProcessedData } from '../types';
import { formatCurrency, formatPercent, cn } from '../lib/utils';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Target, Activity, ShieldCheck } from 'lucide-react';

interface KPICardsProps {
  allData: ProcessedData[];
  filters: {
    month: string;
    functionalArea: string;
    costCenter: string;
    misHead: string;
  };
  isDarkMode: boolean;
}

const MONTH_ORDER = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function KPICards({ allData, filters, isDarkMode }: KPICardsProps) {
  // Filter by non-month dimensions (costCenter, functionalArea, misHead)
  const filteredByDimension = useMemo(() => {
    return allData.filter(row => {
      if (filters.functionalArea && row.functionalArea !== filters.functionalArea) return false;
      if (filters.costCenter && row.costCenter !== filters.costCenter) return false;
      if (filters.misHead && row.misHead !== filters.misHead) return false;
      return true;
    });
  }, [allData, filters.functionalArea, filters.costCenter, filters.misHead]);

  // Determine available years and current year / prior year
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>(filteredByDimension.map(r => r.year).filter((y): y is string => Boolean(y)));
    return Array.from(yearsSet).sort((a: string, b: string) => parseInt(a, 10) - parseInt(b, 10));
  }, [filteredByDimension]);

  const currentYear = availableYears.length > 0 ? availableYears[availableYears.length - 1] : '2024';
  const priorYear = availableYears.length > 1 ? availableYears[availableYears.length - 2] : (parseInt(currentYear) - 1).toString();

  // Determine max month index for YTD
  const { maxMonthIndex, selectedMonthLabel } = useMemo(() => {
    if (filters.month) {
      const idx = MONTH_ORDER.indexOf(filters.month);
      if (idx !== -1) return { maxMonthIndex: idx, selectedMonthLabel: filters.month };
    }
    // Default to maximum month index found in currentYear
    const cyRows = filteredByDimension.filter(r => r.year === currentYear);
    if (cyRows.length > 0) {
      const maxIdx = Math.max(...cyRows.map(r => r.monthIndex));
      return { maxMonthIndex: maxIdx, selectedMonthLabel: MONTH_ORDER[maxIdx] || 'YTD' };
    }
    return { maxMonthIndex: 11, selectedMonthLabel: 'Dec' };
  }, [filters.month, filteredByDimension, currentYear]);

  // YTD Accumulation up to maxMonthIndex
  const currentYearYTD = useMemo(() => {
    return filteredByDimension.filter(r => r.year === currentYear && r.monthIndex <= maxMonthIndex);
  }, [filteredByDimension, currentYear, maxMonthIndex]);

  const priorYearYTD = useMemo(() => {
    return filteredByDimension.filter(r => r.year === priorYear && r.monthIndex <= maxMonthIndex);
  }, [filteredByDimension, priorYear, maxMonthIndex]);

  // Calculate Metrics helper
  const calcMetrics = (rows: ProcessedData[]) => {
    let salesActual = 0;
    let salesBudget = 0;
    let otherIncomeActual = 0;
    let otherIncomeBudget = 0;
    let returnsActual = 0;
    let returnsBudget = 0;
    let cogsActual = 0;
    let cogsBudget = 0;
    let opexActual = 0;
    let opexBudget = 0;
    let depActual = 0;
    let depBudget = 0;

    rows.forEach(row => {
      const mh = row.misHead || '';
      if (mh === 'SALES/REVENUE') {
        salesActual += Math.abs(row.actual);
        salesBudget += Math.abs(row.budget);
      } else if (mh === 'OTHER INCOME') {
        otherIncomeActual += Math.abs(row.actual);
        otherIncomeBudget += Math.abs(row.budget);
      } else if (mh === 'SALES RETURN') {
        returnsActual += Math.abs(row.actual);
        returnsBudget += Math.abs(row.budget);
      } else if (mh === 'MATERIAL COST' || mh.startsWith('DC -')) {
        cogsActual += row.actual;
        cogsBudget += row.budget;
        if (mh.toLowerCase().includes('depreciation')) {
          depActual += row.actual;
          depBudget += row.budget;
        }
      } else if (mh.startsWith('SM -') || mh.startsWith('GA -')) {
        opexActual += row.actual;
        opexBudget += row.budget;
        if (mh.toLowerCase().includes('depreciation')) {
          depActual += row.actual;
          depBudget += row.budget;
        }
      } else if (mh.toLowerCase().includes('depreciation')) {
        depActual += row.actual;
        depBudget += row.budget;
      }
    });

    const netRevActual = (salesActual + otherIncomeActual) - returnsActual;
    const netRevBudget = (salesBudget + otherIncomeBudget) - returnsBudget;
    const grossProfitActual = netRevActual - cogsActual;
    const grossProfitBudget = netRevBudget - cogsBudget;
    const netProfitActual = grossProfitActual - opexActual;
    const netProfitBudget = grossProfitBudget - opexBudget;

    return {
      salesActual,
      salesBudget,
      returnsActual,
      returnsBudget,
      netRevActual,
      netRevBudget,
      cogsActual,
      cogsBudget,
      opexActual,
      opexBudget,
      netProfitActual,
      netProfitBudget,
      depActual,
      depBudget
    };
  };

  const cy = useMemo(() => calcMetrics(currentYearYTD), [currentYearYTD]);
  const py = useMemo(() => calcMetrics(priorYearYTD), [priorYearYTD]);

  const hasPYData = py.salesActual > 0 || py.netRevActual > 0;

  // Card 1: Net Revenue (YTD)
  const netRevYoYPct = hasPYData && py.netRevActual !== 0 
    ? ((cy.netRevActual - py.netRevActual) / Math.abs(py.netRevActual)) * 100 
    : (cy.netRevBudget !== 0 ? ((cy.netRevActual - cy.netRevBudget) / Math.abs(cy.netRevBudget)) * 100 : 0);

  // Card 2: Net Profit (YTD)
  const netProfitVarAmount = cy.netProfitActual - cy.netProfitBudget;
  const netProfitVarPct = cy.netProfitBudget !== 0 
    ? (netProfitVarAmount / Math.abs(cy.netProfitBudget)) * 100 
    : 0;
  const isNetProfitFav = cy.netProfitActual >= cy.netProfitBudget;

  // Card 3: Depreciation (YTD)
  const depVarAmount = cy.depActual - cy.depBudget;
  const depVarPct = cy.depBudget !== 0 
    ? (depVarAmount / Math.abs(cy.depBudget)) * 100 
    : 0;
  const isDepFav = cy.depActual <= cy.depBudget;

  // Card 4: Achievement Amount & Percentage (YTD)
  const salesAchievementAmount = cy.salesActual - cy.salesBudget;
  const salesAchievementPct = cy.salesBudget !== 0 
    ? (cy.salesActual / cy.salesBudget) * 100 
    : 0;

  // Card 5: Growth Rate % (YTD)
  const growthRatePct = hasPYData && py.salesActual !== 0 
    ? ((cy.salesActual - py.salesActual) / Math.abs(py.salesActual)) * 100 
    : (cy.salesBudget !== 0 ? ((cy.salesActual - cy.salesBudget) / Math.abs(cy.salesBudget)) * 100 : 0);

  // Card 6: Overall Budget Variance & Health (YTD)
  const overallVarAmount = cy.netProfitActual - cy.netProfitBudget;
  const overallExecutionVarPct = cy.netProfitBudget !== 0 
    ? (overallVarAmount / Math.abs(cy.netProfitBudget)) * 100 
    : 0;
  const isOverallFav = overallVarAmount >= 0;

  const ytdRangeText = `Jan - ${selectedMonthLabel}`;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
      {/* CARD 1: Net Revenue (YTD) */}
      <div className={cn(
        "backdrop-blur-lg rounded-xl p-5 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 border flex flex-col justify-between",
        isDarkMode 
          ? "bg-white/5 border-white/10 text-white" 
          : "bg-white/90 border-slate-200/90 text-slate-900 shadow-md"
      )}>
        <div className={cn(
          "absolute top-0 right-0 w-24 h-24 rounded-full -mr-10 -mt-10 blur-2xl",
          isDarkMode ? "bg-[#D4AF37]/10" : "bg-[#D4AF37]/20"
        )}></div>
        <div>
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className={cn(
                "text-xs font-semibold uppercase tracking-wider block",
                isDarkMode ? "text-white/60" : "text-slate-500"
              )}>
                Net Revenue <span className="normal-case opacity-75">({ytdRangeText})</span>
              </span>
            </div>
            <span className={cn(
              "px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1",
              netRevYoYPct >= 0 
                ? (isDarkMode ? "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30" : "bg-emerald-50 text-emerald-700 border-emerald-300")
                : (isDarkMode ? "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30" : "bg-rose-50 text-rose-700 border-rose-300")
            )}>
              {netRevYoYPct >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {netRevYoYPct >= 0 ? '+' : ''}{formatPercent(netRevYoYPct)} {hasPYData ? 'vs PY' : 'vs Bud'}
            </span>
          </div>

          <div className={cn(
            "text-3xl font-light tracking-tight my-1",
            isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]"
          )}>
            {formatCurrency(cy.netRevActual)}
          </div>
        </div>

        <div className={cn(
          "mt-3 pt-3 border-t text-[11px] flex items-center justify-between font-medium",
          isDarkMode ? "border-white/5 text-white/50" : "border-slate-100 text-slate-500"
        )}>
          <span>Prior Year YTD: <strong className={isDarkMode ? "text-white/80" : "text-slate-700"}>{hasPYData ? formatCurrency(py.netRevActual) : 'N/A'}</strong></span>
          <span>Target: <strong className={isDarkMode ? "text-white/80" : "text-slate-700"}>{formatCurrency(cy.netRevBudget)}</strong></span>
        </div>
      </div>

      {/* CARD 2: Net Profit (YTD) */}
      <div className={cn(
        "backdrop-blur-lg rounded-xl p-5 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 border flex flex-col justify-between",
        isDarkMode 
          ? "bg-white/5 border-white/10 text-white" 
          : "bg-white/90 border-slate-200/90 text-slate-900 shadow-md"
      )}>
        <div className={cn(
          "absolute top-0 right-0 w-24 h-24 rounded-full -mr-10 -mt-10 blur-2xl",
          isDarkMode ? "bg-emerald-500/10" : "bg-emerald-500/20"
        )}></div>
        <div>
          <div className="flex justify-between items-start mb-2">
            <span className={cn(
              "text-xs font-semibold uppercase tracking-wider block",
              isDarkMode ? "text-white/60" : "text-slate-500"
            )}>
              Net Profit <span className="normal-case opacity-75">({ytdRangeText})</span>
            </span>
            <span className={cn(
              "px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1",
              isNetProfitFav 
                ? (isDarkMode ? "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30" : "bg-emerald-50 text-emerald-700 border-emerald-300")
                : (isDarkMode ? "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30" : "bg-rose-50 text-rose-700 border-rose-300")
            )}>
              {isNetProfitFav ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {netProfitVarPct >= 0 ? '+' : ''}{formatPercent(netProfitVarPct)} {isNetProfitFav ? 'FAV' : 'UNFAV'}
            </span>
          </div>

          <div className={cn(
            "text-3xl font-light tracking-tight my-1",
            isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]"
          )}>
            {formatCurrency(cy.netProfitActual)}
          </div>
        </div>

        <div className={cn(
          "mt-3 pt-3 border-t text-[11px] flex items-center justify-between font-medium",
          isDarkMode ? "border-white/5 text-white/50" : "border-slate-100 text-slate-500"
        )}>
          <span>Budget Target: <strong className={isDarkMode ? "text-white/80" : "text-slate-700"}>{formatCurrency(cy.netProfitBudget)}</strong></span>
          <span className={cn("font-mono font-semibold", isNetProfitFav ? (isDarkMode ? "text-emerald-400" : "text-emerald-600") : (isDarkMode ? "text-rose-400" : "text-rose-600"))}>
            VAR: {netProfitVarAmount >= 0 ? '+' : ''}{formatCurrency(netProfitVarAmount)}
          </span>
        </div>
      </div>

      {/* CARD 3: Depreciation (YTD) */}
      <div className={cn(
        "backdrop-blur-lg rounded-xl p-5 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 border flex flex-col justify-between",
        isDarkMode 
          ? "bg-white/5 border-white/10 text-white" 
          : "bg-white/90 border-slate-200/90 text-slate-900 shadow-md"
      )}>
        <div className={cn(
          "absolute top-0 right-0 w-24 h-24 rounded-full -mr-10 -mt-10 blur-2xl",
          isDarkMode ? "bg-amber-500/10" : "bg-amber-500/20"
        )}></div>
        <div>
          <div className="flex justify-between items-start mb-2">
            <span className={cn(
              "text-xs font-semibold uppercase tracking-wider block",
              isDarkMode ? "text-white/60" : "text-slate-500"
            )}>
              Depreciation <span className="normal-case opacity-75">({ytdRangeText})</span>
            </span>
            <span className={cn(
              "px-2 py-0.5 rounded text-[10px] font-bold border",
              isDepFav 
                ? (isDarkMode ? "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30" : "bg-emerald-50 text-emerald-700 border-emerald-300")
                : (isDarkMode ? "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30" : "bg-rose-50 text-rose-700 border-rose-300")
            )}>
              {depVarPct <= 0 ? '' : '+'}{formatPercent(depVarPct)} {isDepFav ? 'FAV' : 'UNFAV'}
            </span>
          </div>

          <div className={cn(
            "text-3xl font-light tracking-tight my-1",
            isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]"
          )}>
            {formatCurrency(cy.depActual)}
          </div>
        </div>

        <div className={cn(
          "mt-3 pt-3 border-t text-[11px] flex items-center justify-between font-medium",
          isDarkMode ? "border-white/5 text-white/50" : "border-slate-100 text-slate-500"
        )}>
          <span>Budget Target: <strong className={isDarkMode ? "text-white/80" : "text-slate-700"}>{formatCurrency(cy.depBudget)}</strong></span>
          <span className="font-mono">
            VAR: {depVarAmount >= 0 ? '+' : ''}{formatCurrency(depVarAmount)}
          </span>
        </div>
      </div>

      {/* CARD 4: Achievement Amount & Percentage (YTD) */}
      <div className={cn(
        "backdrop-blur-lg rounded-xl p-5 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 border flex flex-col justify-between",
        isDarkMode 
          ? "bg-white/5 border-white/10 text-white" 
          : "bg-white/90 border-slate-200/90 text-slate-900 shadow-md"
      )}>
        <div className={cn(
          "absolute top-0 right-0 w-24 h-24 rounded-full -mr-10 -mt-10 blur-2xl",
          isDarkMode ? "bg-cyan-500/10" : "bg-cyan-500/20"
        )}></div>
        <div>
          <div className="flex justify-between items-start mb-2">
            <span className={cn(
              "text-xs font-semibold uppercase tracking-wider block",
              isDarkMode ? "text-white/60" : "text-slate-500"
            )}>
              Sales Achievement <span className="normal-case opacity-75">({ytdRangeText})</span>
            </span>
            <span className={cn(
              "px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1",
              salesAchievementPct >= 100 
                ? (isDarkMode ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-emerald-100 text-emerald-800 border-emerald-300")
                : salesAchievementPct >= 90
                  ? (isDarkMode ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-amber-100 text-amber-800 border-amber-300")
                  : (isDarkMode ? "bg-rose-500/20 text-rose-300 border-rose-500/40" : "bg-rose-100 text-rose-800 border-rose-300")
            )}>
              <Target size={11} />
              {formatPercent(salesAchievementPct)} Achieved
            </span>
          </div>

          <div className={cn(
            "text-3xl font-light tracking-tight my-1",
            isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]"
          )}>
            {salesAchievementAmount >= 0 ? '+' : ''}{formatCurrency(salesAchievementAmount)}
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-500",
                salesAchievementPct >= 100 
                  ? "bg-emerald-500" 
                  : salesAchievementPct >= 90 
                    ? "bg-amber-500" 
                    : "bg-rose-500"
              )}
              style={{ width: `${Math.min(Math.max(salesAchievementPct, 0), 100)}%` }}
            ></div>
          </div>
          <div className={cn(
            "text-[10px] flex justify-between font-medium",
            isDarkMode ? "text-white/40" : "text-slate-500"
          )}>
            <span>Actual Sales: {formatCurrency(cy.salesActual)}</span>
            <span>Target: {formatCurrency(cy.salesBudget)}</span>
          </div>
        </div>
      </div>

      {/* CARD 5: Growth Rate % (YTD) */}
      <div className={cn(
        "backdrop-blur-lg rounded-xl p-5 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 border flex flex-col justify-between",
        isDarkMode 
          ? "bg-white/5 border-white/10 text-white" 
          : "bg-white/90 border-slate-200/90 text-slate-900 shadow-md"
      )}>
        <div className={cn(
          "absolute top-0 right-0 w-24 h-24 rounded-full -mr-10 -mt-10 blur-2xl",
          isDarkMode ? "bg-blue-500/10" : "bg-blue-500/20"
        )}></div>
        <div>
          <div className="flex justify-between items-start mb-2">
            <span className={cn(
              "text-xs font-semibold uppercase tracking-wider block",
              isDarkMode ? "text-white/60" : "text-slate-500"
            )}>
              Growth Rate % <span className="normal-case opacity-75">({ytdRangeText})</span>
            </span>
            <div className={cn(
              "px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1",
              growthRatePct >= 0 
                ? (isDarkMode ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-emerald-100 text-emerald-800 border-emerald-300")
                : (isDarkMode ? "bg-rose-500/20 text-rose-300 border-rose-500/40" : "bg-rose-100 text-rose-800 border-rose-300")
            )}>
              {growthRatePct >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              <span>{growthRatePct >= 0 ? '▲' : '▼'} {formatPercent(Math.abs(growthRatePct))} YoY</span>
            </div>
          </div>

          <div className={cn(
            "text-3xl font-light tracking-tight my-1 flex items-center gap-2",
            isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]"
          )}>
            <span>{growthRatePct >= 0 ? '+' : ''}{formatPercent(growthRatePct)}</span>
          </div>
        </div>

        <div className={cn(
          "mt-3 pt-3 border-t text-[11px] flex items-center justify-between font-medium",
          isDarkMode ? "border-white/5 text-white/50" : "border-slate-100 text-slate-500"
        )}>
          <span>CY YTD Sales: <strong className={isDarkMode ? "text-white/80" : "text-slate-700"}>{formatCurrency(cy.salesActual)}</strong></span>
          <span>PY YTD: <strong className={isDarkMode ? "text-white/80" : "text-slate-700"}>{hasPYData ? formatCurrency(py.salesActual) : 'N/A'}</strong></span>
        </div>
      </div>

      {/* CARD 6: Overall Budget Variance & Health (YTD) */}
      <div className={cn(
        "backdrop-blur-lg rounded-xl p-5 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 border flex flex-col justify-between",
        isDarkMode 
          ? "bg-white/5 border-white/10 text-white" 
          : "bg-white/90 border-slate-200/90 text-slate-900 shadow-md"
      )}>
        <div className={cn(
          "absolute top-0 right-0 w-24 h-24 rounded-full -mr-10 -mt-10 blur-2xl",
          isDarkMode ? "bg-purple-500/10" : "bg-purple-500/20"
        )}></div>
        <div>
          <div className="flex justify-between items-start mb-2">
            <span className={cn(
              "text-xs font-semibold uppercase tracking-wider block",
              isDarkMode ? "text-white/60" : "text-slate-500"
            )}>
              Overall Budget Health <span className="normal-case opacity-75">({ytdRangeText})</span>
            </span>
            <span className={cn(
              "px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1",
              isOverallFav 
                ? (isDarkMode ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-emerald-100 text-emerald-800 border-emerald-300")
                : (isDarkMode ? "bg-rose-500/20 text-rose-300 border-rose-500/40" : "bg-rose-100 text-rose-800 border-rose-300")
            )}>
              <ShieldCheck size={11} />
              {isOverallFav ? 'ON TRACK (FAVORABLE)' : 'OFF TRACK (UNFAVORABLE)'}
            </span>
          </div>

          <div className={cn(
            "text-3xl font-light tracking-tight my-1",
            isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]"
          )}>
            {overallVarAmount >= 0 ? '+' : ''}{formatCurrency(overallVarAmount)}
          </div>
        </div>

        <div className={cn(
          "mt-3 pt-3 border-t text-[11px] flex items-center justify-between font-medium",
          isDarkMode ? "border-white/5 text-white/50" : "border-slate-100 text-slate-500"
        )}>
          <span>Execution Var %: <strong className={cn("font-mono font-semibold", isOverallFav ? (isDarkMode ? "text-emerald-400" : "text-emerald-600") : (isDarkMode ? "text-rose-400" : "text-rose-600"))}>{overallExecutionVarPct >= 0 ? '+' : ''}{formatPercent(overallExecutionVarPct)}</strong></span>
          <span>Status: <strong className={isDarkMode ? "text-white/80" : "text-slate-700"}>{isOverallFav ? 'FAVORABLE' : 'UNFAVORABLE'}</strong></span>
        </div>
      </div>
    </div>
  );
}
