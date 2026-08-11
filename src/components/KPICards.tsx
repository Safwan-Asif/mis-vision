import { useMemo, useState } from 'react';
import { ProcessedData } from '../types';
import { formatCurrency, formatPercent, cn } from '../lib/utils';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Target, Activity, DollarSign, Layers, PieChart } from 'lucide-react';

interface KPICardsProps {
  allData: ProcessedData[];
  filters: {
    year: string;
    month: string;
    groupAccountNumber: string;
    misHead: string;
  };
  isDarkMode: boolean;
}

const MONTH_ORDER = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function KPICards({ allData, filters, isDarkMode }: KPICardsProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'monthly' | 'ytd'>('all');

  // Filter data by dimension (groupAccountNumber and misHead)
  const filteredByDimension = useMemo(() => {
    return allData.filter(row => {
      if (filters.groupAccountNumber && row.groupAccountNumber !== filters.groupAccountNumber) return false;
      if (filters.misHead && row.misHead !== filters.misHead) return false;
      return true;
    });
  }, [allData, filters.groupAccountNumber, filters.misHead]);

  // Determine current year and prior year
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>(filteredByDimension.map(r => r.year).filter((y): y is string => Boolean(y)));
    return Array.from(yearsSet).sort((a: string, b: string) => parseInt(a, 10) - parseInt(b, 10));
  }, [filteredByDimension]);

  const currentYear = filters.year || (availableYears.length > 0 ? availableYears[availableYears.length - 1] : '2026');
  const priorYear = (parseInt(currentYear, 10) - 1).toString();

  // Determine max month index and selected month label
  const { maxMonthIndex, selectedMonthLabel } = useMemo(() => {
    if (filters.month) {
      const idx = MONTH_ORDER.indexOf(filters.month);
      if (idx !== -1) return { maxMonthIndex: idx, selectedMonthLabel: filters.month };
    }
    // Default to highest month available in dataset
    const cyRows = filteredByDimension.filter(r => r.year === currentYear);
    if (cyRows.length > 0) {
      const maxIdx = Math.max(...cyRows.map(r => r.monthIndex));
      return { maxMonthIndex: maxIdx, selectedMonthLabel: MONTH_ORDER[maxIdx] || 'Dec' };
    }
    return { maxMonthIndex: 11, selectedMonthLabel: 'Dec' };
  }, [filters.month, filteredByDimension, currentYear]);

  // Section A Data: Particular Selected Month
  const currentMonthRows = useMemo(() => {
    return filteredByDimension.filter(r => r.year === currentYear && r.monthIndex === maxMonthIndex);
  }, [filteredByDimension, currentYear, maxMonthIndex]);

  const priorYearMonthRows = useMemo(() => {
    return filteredByDimension.filter(r => r.year === priorYear && r.monthIndex === maxMonthIndex);
  }, [filteredByDimension, priorYear, maxMonthIndex]);

  // Section B Data: Cumulative YTD up to selected month
  const currentYTDSubtotalRows = useMemo(() => {
    return filteredByDimension.filter(r => r.year === currentYear && r.monthIndex <= maxMonthIndex);
  }, [filteredByDimension, currentYear, maxMonthIndex]);

  const priorYTDSubtotalRows = useMemo(() => {
    return filteredByDimension.filter(r => r.year === priorYear && r.monthIndex <= maxMonthIndex);
  }, [filteredByDimension, priorYear, maxMonthIndex]);

  // Metric Calculation Helper
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
    const ebitdaActual = netProfitActual + depActual;
    const ebitdaBudget = netProfitBudget + depBudget;

    return {
      salesActual,
      salesBudget,
      returnsActual,
      returnsBudget,
      netRevActual,
      netRevBudget,
      cogsActual,
      cogsBudget,
      grossProfitActual,
      grossProfitBudget,
      opexActual,
      opexBudget,
      depActual,
      depBudget,
      netProfitActual,
      netProfitBudget,
      ebitdaActual,
      ebitdaBudget
    };
  };

  const monthMetrics = useMemo(() => calcMetrics(currentMonthRows), [currentMonthRows]);
  const pyMonthMetrics = useMemo(() => calcMetrics(priorYearMonthRows), [priorYearMonthRows]);

  const ytdMetrics = useMemo(() => calcMetrics(currentYTDSubtotalRows), [currentYTDSubtotalRows]);
  const pyYTDMetrics = useMemo(() => calcMetrics(priorYTDSubtotalRows), [priorYTDSubtotalRows]);

  // Card Grid Component for rendering 8 KPI Cards
  const CardGrid = ({ 
    title, 
    subtitle, 
    cur, 
    py, 
    periodLabel,
    badgePrefix 
  }: { 
    title: string; 
    subtitle: string; 
    cur: ReturnType<typeof calcMetrics>; 
    py: ReturnType<typeof calcMetrics>; 
    periodLabel: string;
    badgePrefix: string;
  }) => {
    const hasPYData = py.salesActual > 0 || py.netRevActual > 0;

    // 1. Net Revenue
    const netRevYoY = hasPYData && py.netRevActual !== 0 
      ? ((cur.netRevActual - py.netRevActual) / Math.abs(py.netRevActual)) * 100 
      : (cur.netRevBudget !== 0 ? ((cur.netRevActual - cur.netRevBudget) / Math.abs(cur.netRevBudget)) * 100 : 0);

    // 2. Net Profit
    const npVar = cur.netProfitActual - cur.netProfitBudget;
    const npVarPct = cur.netProfitBudget !== 0 ? (npVar / Math.abs(cur.netProfitBudget)) * 100 : 0;
    const isNPFav = cur.netProfitActual >= cur.netProfitBudget;

    // 3. Depreciation
    const depVar = cur.depActual - cur.depBudget;
    const depVarPct = cur.depBudget !== 0 ? (depVar / Math.abs(cur.depBudget)) * 100 : 0;
    const isDepFav = cur.depActual <= cur.depBudget;

    // 4. Achievement Amount & %
    const achAmount = cur.salesActual - cur.salesBudget;
    const achPct = cur.salesBudget !== 0 ? (cur.salesActual / cur.salesBudget) * 100 : 0;

    // 5. Growth Rate %
    const growthRate = hasPYData && py.salesActual !== 0 
      ? ((cur.salesActual - py.salesActual) / Math.abs(py.salesActual)) * 100 
      : (cur.salesBudget !== 0 ? ((cur.salesActual - cur.salesBudget) / Math.abs(cur.salesBudget)) * 100 : 0);

    // 6. EBITDA
    const ebitdaVar = cur.ebitdaActual - cur.ebitdaBudget;
    const ebitdaVarPct = cur.ebitdaBudget !== 0 ? (ebitdaVar / Math.abs(cur.ebitdaBudget)) * 100 : 0;
    const isEbitdaFav = cur.ebitdaActual >= cur.ebitdaBudget;

    // 7. COGS & Direct Costs
    const cogsVar = cur.cogsActual - cur.cogsBudget;
    const cogsVarPct = cur.cogsBudget !== 0 ? (cogsVar / Math.abs(cur.cogsBudget)) * 100 : 0;
    const isCogsFav = cur.cogsActual <= cur.cogsBudget;

    // 8. OPEX
    const opexVar = cur.opexActual - cur.opexBudget;
    const opexVarPct = cur.opexBudget !== 0 ? (opexVar / Math.abs(cur.opexBudget)) * 100 : 0;
    const isOpexFav = cur.opexActual <= cur.opexBudget;

    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-6 bg-[#D4AF37] rounded-full"></div>
            <div>
              <h3 className={cn("text-base font-bold tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                {title}
              </h3>
              <p className={cn("text-xs font-medium", isDarkMode ? "text-white/50" : "text-slate-500")}>
                {subtitle} ({periodLabel})
              </p>
            </div>
          </div>
          <span className={cn(
            "text-xs px-3 py-1 rounded-full font-semibold border",
            isDarkMode ? "bg-white/5 border-white/10 text-[#D4AF37]" : "bg-amber-50 border-amber-200 text-[#B48A1D]"
          )}>
            {badgePrefix}: {periodLabel}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Net Revenue */}
          <div className={cn(
            "backdrop-blur-lg rounded-xl p-4 transition-all duration-200 border flex flex-col justify-between hover:border-[#D4AF37]/50",
            isDarkMode ? "bg-white/5 border-white/10 text-white" : "bg-white/90 border-slate-200 text-slate-900 shadow-md"
          )}>
            <div>
              <div className="flex justify-between items-start mb-1">
                <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDarkMode ? "text-white/60" : "text-slate-500")}>
                  Net Revenue
                </span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-0.5",
                  netRevYoY >= 0 
                    ? (isDarkMode ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-300")
                    : (isDarkMode ? "bg-rose-500/15 text-rose-400 border-rose-500/30" : "bg-rose-50 text-rose-700 border-rose-300")
                )}>
                  {netRevYoY >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {netRevYoY >= 0 ? '+' : ''}{formatPercent(netRevYoY)}
                </span>
              </div>
              <div className={cn("text-2xl font-light tracking-tight my-1 font-mono", isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]")}>
                {formatCurrency(cur.netRevActual)}
              </div>
            </div>
            <div className={cn("mt-2 pt-2 border-t text-[11px] flex justify-between font-medium", isDarkMode ? "border-white/5 text-white/50" : "border-slate-100 text-slate-500")}>
              <span>Last Year: <strong className={isDarkMode ? "text-white/80" : "text-slate-800"}>{hasPYData ? formatCurrency(py.netRevActual) : 'N/A'}</strong></span>
              <span>Target: <strong className={isDarkMode ? "text-white/80" : "text-slate-800"}>{formatCurrency(cur.netRevBudget)}</strong></span>
            </div>
          </div>

          {/* Card 2: Net Profit */}
          <div className={cn(
            "backdrop-blur-lg rounded-xl p-4 transition-all duration-200 border flex flex-col justify-between hover:border-[#D4AF37]/50",
            isDarkMode ? "bg-white/5 border-white/10 text-white" : "bg-white/90 border-slate-200 text-slate-900 shadow-md"
          )}>
            <div>
              <div className="flex justify-between items-start mb-1">
                <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDarkMode ? "text-white/60" : "text-slate-500")}>
                  Net Profit
                </span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-0.5",
                  isNPFav 
                    ? (isDarkMode ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-300")
                    : (isDarkMode ? "bg-rose-500/15 text-rose-400 border-rose-500/30" : "bg-rose-50 text-rose-700 border-rose-300")
                )}>
                  {isNPFav ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {npVarPct >= 0 ? '+' : ''}{formatPercent(npVarPct)} {isNPFav ? 'FAV' : 'UNFAV'}
                </span>
              </div>
              <div className={cn("text-2xl font-light tracking-tight my-1 font-mono", isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]")}>
                {formatCurrency(cur.netProfitActual)}
              </div>
            </div>
            <div className={cn("mt-2 pt-2 border-t text-[11px] flex justify-between font-medium", isDarkMode ? "border-white/5 text-white/50" : "border-slate-100 text-slate-500")}>
              <span>Budget: <strong className={isDarkMode ? "text-white/80" : "text-slate-800"}>{formatCurrency(cur.netProfitBudget)}</strong></span>
              <span className={cn("font-mono font-bold", isNPFav ? "text-emerald-500" : "text-rose-500")}>
                VAR: {npVar >= 0 ? '+' : ''}{formatCurrency(npVar)}
              </span>
            </div>
          </div>

          {/* Card 3: Depreciation */}
          <div className={cn(
            "backdrop-blur-lg rounded-xl p-4 transition-all duration-200 border flex flex-col justify-between hover:border-[#D4AF37]/50",
            isDarkMode ? "bg-white/5 border-white/10 text-white" : "bg-white/90 border-slate-200 text-slate-900 shadow-md"
          )}>
            <div>
              <div className="flex justify-between items-start mb-1">
                <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDarkMode ? "text-white/60" : "text-slate-500")}>
                  Depreciation
                </span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold border",
                  isDepFav 
                    ? (isDarkMode ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-300")
                    : (isDarkMode ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-amber-50 text-amber-700 border-amber-300")
                )}>
                  {depVarPct <= 0 ? '' : '+'}{formatPercent(depVarPct)} {isDepFav ? 'FAV' : 'UNFAV'}
                </span>
              </div>
              <div className={cn("text-2xl font-light tracking-tight my-1 font-mono", isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]")}>
                {formatCurrency(cur.depActual)}
              </div>
            </div>
            <div className={cn("mt-2 pt-2 border-t text-[11px] flex justify-between font-medium", isDarkMode ? "border-white/5 text-white/50" : "border-slate-100 text-slate-500")}>
              <span>Budget: <strong className={isDarkMode ? "text-white/80" : "text-slate-800"}>{formatCurrency(cur.depBudget)}</strong></span>
              <span className="font-mono font-semibold">VAR: {depVar >= 0 ? '+' : ''}{formatCurrency(depVar)}</span>
            </div>
          </div>

          {/* Card 4: Achievement Amount & % */}
          <div className={cn(
            "backdrop-blur-lg rounded-xl p-4 transition-all duration-200 border flex flex-col justify-between hover:border-[#D4AF37]/50",
            isDarkMode ? "bg-white/5 border-white/10 text-white" : "bg-white/90 border-slate-200 text-slate-900 shadow-md"
          )}>
            <div>
              <div className="flex justify-between items-start mb-1">
                <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDarkMode ? "text-white/60" : "text-slate-500")}>
                  Achievement Amt & %
                </span>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1",
                  achPct >= 100 
                    ? (isDarkMode ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-emerald-100 text-emerald-800 border-emerald-300")
                    : achPct >= 90
                      ? (isDarkMode ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-amber-100 text-amber-800 border-amber-300")
                      : (isDarkMode ? "bg-rose-500/20 text-rose-300 border-rose-500/40" : "bg-rose-100 text-rose-800 border-rose-300")
                )}>
                  <Target size={11} />
                  {formatPercent(achPct)}
                </span>
              </div>
              <div className={cn("text-2xl font-light tracking-tight my-1 font-mono", isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]")}>
                {achAmount >= 0 ? '+' : ''}{formatCurrency(achAmount)}
              </div>
            </div>
            <div className="mt-2 space-y-1">
              <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                <div 
                  className={cn("h-full rounded-full transition-all duration-500", achPct >= 100 ? "bg-emerald-500" : achPct >= 90 ? "bg-amber-500" : "bg-rose-500")}
                  style={{ width: `${Math.min(Math.max(achPct, 0), 100)}%` }}
                ></div>
              </div>
              <div className={cn("text-[10px] flex justify-between font-medium", isDarkMode ? "text-white/40" : "text-slate-500")}>
                <span>Act: {formatCurrency(cur.salesActual)}</span>
                <span>Bud: {formatCurrency(cur.salesBudget)}</span>
              </div>
            </div>
          </div>

          {/* Card 5: Growth Rate % */}
          <div className={cn(
            "backdrop-blur-lg rounded-xl p-4 transition-all duration-200 border flex flex-col justify-between hover:border-[#D4AF37]/50",
            isDarkMode ? "bg-white/5 border-white/10 text-white" : "bg-white/90 border-slate-200 text-slate-900 shadow-md"
          )}>
            <div>
              <div className="flex justify-between items-start mb-1">
                <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDarkMode ? "text-white/60" : "text-slate-500")}>
                  Growth Rate %
                </span>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1",
                  growthRate >= 0 
                    ? (isDarkMode ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-emerald-100 text-emerald-800 border-emerald-300")
                    : (isDarkMode ? "bg-rose-500/20 text-rose-300 border-rose-500/40" : "bg-rose-100 text-rose-800 border-rose-300")
                )}>
                  {growthRate >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  <span>{growthRate >= 0 ? '▲' : '▼'} {formatPercent(Math.abs(growthRate))} YoY</span>
                </span>
              </div>
              <div className={cn("text-2xl font-light tracking-tight my-1 font-mono", isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]")}>
                {growthRate >= 0 ? '+' : ''}{formatPercent(growthRate)}
              </div>
            </div>
            <div className={cn("mt-2 pt-2 border-t text-[11px] flex justify-between font-medium", isDarkMode ? "border-white/5 text-white/50" : "border-slate-100 text-slate-500")}>
              <span>CY: <strong className={isDarkMode ? "text-white/80" : "text-slate-800"}>{formatCurrency(cur.salesActual)}</strong></span>
              <span>PY: <strong className={isDarkMode ? "text-white/80" : "text-slate-800"}>{hasPYData ? formatCurrency(py.salesActual) : 'N/A'}</strong></span>
            </div>
          </div>

          {/* Card 6: EBITDA */}
          <div className={cn(
            "backdrop-blur-lg rounded-xl p-4 transition-all duration-200 border flex flex-col justify-between hover:border-[#D4AF37]/50",
            isDarkMode ? "bg-white/5 border-white/10 text-white" : "bg-white/90 border-slate-200 text-slate-900 shadow-md"
          )}>
            <div>
              <div className="flex justify-between items-start mb-1">
                <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDarkMode ? "text-white/60" : "text-slate-500")}>
                  EBITDA (NP + Dep)
                </span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-0.5",
                  isEbitdaFav 
                    ? (isDarkMode ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-300")
                    : (isDarkMode ? "bg-rose-500/15 text-rose-400 border-rose-500/30" : "bg-rose-50 text-rose-700 border-rose-300")
                )}>
                  {isEbitdaFav ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {ebitdaVarPct >= 0 ? '+' : ''}{formatPercent(ebitdaVarPct)}
                </span>
              </div>
              <div className={cn("text-2xl font-light tracking-tight my-1 font-mono", isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]")}>
                {formatCurrency(cur.ebitdaActual)}
              </div>
            </div>
            <div className={cn("mt-2 pt-2 border-t text-[11px] flex justify-between font-medium", isDarkMode ? "border-white/5 text-white/50" : "border-slate-100 text-slate-500")}>
              <span>Target: <strong className={isDarkMode ? "text-white/80" : "text-slate-800"}>{formatCurrency(cur.ebitdaBudget)}</strong></span>
              <span className={cn("font-mono font-bold", isEbitdaFav ? "text-emerald-500" : "text-rose-500")}>
                VAR: {ebitdaVar >= 0 ? '+' : ''}{formatCurrency(ebitdaVar)}
              </span>
            </div>
          </div>

          {/* Card 7: COGS & Direct Overheads */}
          <div className={cn(
            "backdrop-blur-lg rounded-xl p-4 transition-all duration-200 border flex flex-col justify-between hover:border-[#D4AF37]/50",
            isDarkMode ? "bg-white/5 border-white/10 text-white" : "bg-white/90 border-slate-200 text-slate-900 shadow-md"
          )}>
            <div>
              <div className="flex justify-between items-start mb-1">
                <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDarkMode ? "text-white/60" : "text-slate-500")}>
                  COGS & Direct Costs
                </span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold border",
                  isCogsFav 
                    ? (isDarkMode ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-300")
                    : (isDarkMode ? "bg-rose-500/15 text-rose-400 border-rose-500/30" : "bg-rose-50 text-rose-700 border-rose-300")
                )}>
                  {cogsVarPct <= 0 ? '' : '+'}{formatPercent(cogsVarPct)} {isCogsFav ? 'FAV' : 'UNFAV'}
                </span>
              </div>
              <div className={cn("text-2xl font-light tracking-tight my-1 font-mono", isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]")}>
                {formatCurrency(cur.cogsActual)}
              </div>
            </div>
            <div className={cn("mt-2 pt-2 border-t text-[11px] flex justify-between font-medium", isDarkMode ? "border-white/5 text-white/50" : "border-slate-100 text-slate-500")}>
              <span>Budget: <strong className={isDarkMode ? "text-white/80" : "text-slate-800"}>{formatCurrency(cur.cogsBudget)}</strong></span>
              <span className="font-mono font-semibold">VAR: {cogsVar >= 0 ? '+' : ''}{formatCurrency(cogsVar)}</span>
            </div>
          </div>

          {/* Card 8: OPEX */}
          <div className={cn(
            "backdrop-blur-lg rounded-xl p-4 transition-all duration-200 border flex flex-col justify-between hover:border-[#D4AF37]/50",
            isDarkMode ? "bg-white/5 border-white/10 text-white" : "bg-white/90 border-slate-200 text-slate-900 shadow-md"
          )}>
            <div>
              <div className="flex justify-between items-start mb-1">
                <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDarkMode ? "text-white/60" : "text-slate-500")}>
                  OPEX (SM & GA)
                </span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold border",
                  isOpexFav 
                    ? (isDarkMode ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-300")
                    : (isDarkMode ? "bg-rose-500/15 text-rose-400 border-rose-500/30" : "bg-rose-50 text-rose-700 border-rose-300")
                )}>
                  {opexVarPct <= 0 ? '' : '+'}{formatPercent(opexVarPct)} {isOpexFav ? 'FAV' : 'UNFAV'}
                </span>
              </div>
              <div className={cn("text-2xl font-light tracking-tight my-1 font-mono", isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]")}>
                {formatCurrency(cur.opexActual)}
              </div>
            </div>
            <div className={cn("mt-2 pt-2 border-t text-[11px] flex justify-between font-medium", isDarkMode ? "border-white/5 text-white/50" : "border-slate-100 text-slate-500")}>
              <span>Budget: <strong className={isDarkMode ? "text-white/80" : "text-slate-800"}>{formatCurrency(cur.opexBudget)}</strong></span>
              <span className="font-mono font-semibold">VAR: {opexVar >= 0 ? '+' : ''}{formatCurrency(opexVar)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ytdPeriodText = `Jan - ${selectedMonthLabel}`;

  return (
    <div className="flex flex-col gap-8">
      {/* View Switcher Tab Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-3 border-slate-200 dark:border-white/10">
        <div>
          <h2 className={cn("text-lg font-bold tracking-tight flex items-center gap-2", isDarkMode ? "text-white" : "text-slate-900")}>
            <Layers className="text-[#D4AF37]" size={20} />
            Dual Executive KPI Canvas (16 Glass Cards Total)
          </h2>
          <p className={cn("text-xs font-medium", isDarkMode ? "text-white/50" : "text-slate-500")}>
            Comprehensive performance audit comparing Particular Month vs. Cumulative YTD Subtotals
          </p>
        </div>

        <div className={cn(
          "flex items-center p-1 rounded-lg border text-xs font-semibold self-start sm:self-auto",
          isDarkMode ? "bg-white/5 border-white/10 text-white" : "bg-slate-100 border-slate-300 text-slate-700"
        )}>
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              "px-3 py-1.5 rounded-md transition-all cursor-pointer",
              activeTab === 'all' 
                ? "bg-[#D4AF37] text-black font-bold shadow-sm" 
                : (isDarkMode ? "hover:text-white" : "hover:text-slate-900")
            )}
          >
            All 16 Cards
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={cn(
              "px-3 py-1.5 rounded-md transition-all cursor-pointer",
              activeTab === 'monthly' 
                ? "bg-[#D4AF37] text-black font-bold shadow-sm" 
                : (isDarkMode ? "hover:text-white" : "hover:text-slate-900")
            )}
          >
            Particular Month ({selectedMonthLabel})
          </button>
          <button
            onClick={() => setActiveTab('ytd')}
            className={cn(
              "px-3 py-1.5 rounded-md transition-all cursor-pointer",
              activeTab === 'ytd' 
                ? "bg-[#D4AF37] text-black font-bold shadow-sm" 
                : (isDarkMode ? "hover:text-white" : "hover:text-slate-900")
            )}
          >
            Cumulative YTD ({ytdPeriodText})
          </button>
        </div>
      </div>

      {/* SECTION A: Particular Month KPIs (8 Cards) */}
      {(activeTab === 'all' || activeTab === 'monthly') && (
        <CardGrid
          title="SECTION A: Particular Month KPIs (8 Cards)"
          subtitle={`Single Month Execution Audit for Year ${currentYear}`}
          cur={monthMetrics}
          py={pyMonthMetrics}
          periodLabel={selectedMonthLabel}
          badgePrefix="Month"
        />
      )}

      {/* SECTION B: Cumulative YTD Subtotal KPIs (8 Cards) */}
      {(activeTab === 'all' || activeTab === 'ytd') && (
        <CardGrid
          title="SECTION B: Cumulative YTD Subtotal KPIs (8 Cards)"
          subtitle={`Year-to-Date Accumulated Performance up to ${selectedMonthLabel}`}
          cur={ytdMetrics}
          py={pyYTDMetrics}
          periodLabel={ytdPeriodText}
          badgePrefix="YTD Subtotal"
        />
      )}
    </div>
  );
}
