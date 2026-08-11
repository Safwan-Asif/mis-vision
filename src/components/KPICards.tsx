import { useMemo } from 'react';
import { ProcessedData } from '../types';
import { formatCurrency, formatPercent, cn } from '../lib/utils';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Target, Activity, DollarSign, Layers, Factory, Building2, BarChart3 } from 'lucide-react';

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

  // MTD Rows (Selected Month)
  const currentMonthRows = useMemo(() => {
    return filteredByDimension.filter(r => r.year === currentYear && r.monthIndex === maxMonthIndex);
  }, [filteredByDimension, currentYear, maxMonthIndex]);

  const priorYearMonthRows = useMemo(() => {
    return filteredByDimension.filter(r => r.year === priorYear && r.monthIndex === maxMonthIndex);
  }, [filteredByDimension, priorYear, maxMonthIndex]);

  // YTD Rows (Cumulative up to selected month)
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

  const m = useMemo(() => calcMetrics(currentMonthRows), [currentMonthRows]);
  const pyM = useMemo(() => calcMetrics(priorYearMonthRows), [priorYearMonthRows]);

  const y = useMemo(() => calcMetrics(currentYTDSubtotalRows), [currentYTDSubtotalRows]);
  const pyY = useMemo(() => calcMetrics(priorYTDSubtotalRows), [priorYTDSubtotalRows]);

  const hasPYMonth = pyM.salesActual > 0 || pyM.netRevActual > 0;
  const hasPYYTD = pyY.salesActual > 0 || pyY.netRevActual > 0;

  // 1. Net Revenue
  const mtdNetRevYoY = hasPYMonth && pyM.netRevActual !== 0 
    ? ((m.netRevActual - pyM.netRevActual) / Math.abs(pyM.netRevActual)) * 100 
    : (m.netRevBudget !== 0 ? ((m.netRevActual - m.netRevBudget) / Math.abs(m.netRevBudget)) * 100 : 0);

  const ytdNetRevYoY = hasPYYTD && pyY.netRevActual !== 0 
    ? ((y.netRevActual - pyY.netRevActual) / Math.abs(pyY.netRevActual)) * 100 
    : (y.netRevBudget !== 0 ? ((y.netRevActual - y.netRevBudget) / Math.abs(y.netRevBudget)) * 100 : 0);

  // 2. Net Profit
  const mtdNPVar = m.netProfitActual - m.netProfitBudget;
  const mtdNPVarPct = m.netProfitBudget !== 0 ? (mtdNPVar / Math.abs(m.netProfitBudget)) * 100 : 0;
  const isMtdNPFav = m.netProfitActual >= m.netProfitBudget;

  const ytdNPVar = y.netProfitActual - y.netProfitBudget;
  const ytdNPVarPct = y.netProfitBudget !== 0 ? (ytdNPVar / Math.abs(y.netProfitBudget)) * 100 : 0;
  const isYtdNPFav = y.netProfitActual >= y.netProfitBudget;

  // 3. Depreciation
  const mtdDepVar = m.depActual - m.depBudget;
  const mtdDepVarPct = m.depBudget !== 0 ? (mtdDepVar / Math.abs(m.depBudget)) * 100 : 0;
  const isMtdDepFav = m.depActual <= m.depBudget;

  const ytdDepVar = y.depActual - y.depBudget;
  const ytdDepVarPct = y.depBudget !== 0 ? (ytdDepVar / Math.abs(y.depBudget)) * 100 : 0;
  const isYtdDepFav = y.depActual <= y.depBudget;

  // 4. Achievement Amount & %
  const mtdAchAmount = m.salesActual - m.salesBudget;
  const mtdAchPct = m.salesBudget !== 0 ? (m.salesActual / m.salesBudget) * 100 : 0;

  const ytdAchAmount = y.salesActual - y.salesBudget;
  const ytdAchPct = y.salesBudget !== 0 ? (y.salesActual / y.salesBudget) * 100 : 0;

  // 5. Growth Rate %
  const mtdGrowth = hasPYMonth && pyM.salesActual !== 0 
    ? ((m.salesActual - pyM.salesActual) / Math.abs(pyM.salesActual)) * 100 
    : (m.salesBudget !== 0 ? ((m.salesActual - m.salesBudget) / Math.abs(m.salesBudget)) * 100 : 0);

  const ytdGrowth = hasPYYTD && pyY.salesActual !== 0 
    ? ((y.salesActual - pyY.salesActual) / Math.abs(pyY.salesActual)) * 100 
    : (y.salesBudget !== 0 ? ((y.salesActual - y.salesBudget) / Math.abs(y.salesBudget)) * 100 : 0);

  // 6. EBITDA
  const mtdEbitdaVar = m.ebitdaActual - m.ebitdaBudget;
  const mtdEbitdaVarPct = m.ebitdaBudget !== 0 ? (mtdEbitdaVar / Math.abs(m.ebitdaBudget)) * 100 : 0;
  const isMtdEbitdaFav = m.ebitdaActual >= m.ebitdaBudget;

  const ytdEbitdaVar = y.ebitdaActual - y.ebitdaBudget;
  const ytdEbitdaVarPct = y.ebitdaBudget !== 0 ? (ytdEbitdaVar / Math.abs(y.ebitdaBudget)) * 100 : 0;
  const isYtdEbitdaFav = y.ebitdaActual >= y.ebitdaBudget;

  // 7. COGS & Direct Factory Costs
  const mtdCogsVar = m.cogsActual - m.cogsBudget;
  const mtdCogsVarPct = m.cogsBudget !== 0 ? (mtdCogsVar / Math.abs(m.cogsBudget)) * 100 : 0;
  const isMtdCogsFav = m.cogsActual <= m.cogsBudget;

  const ytdCogsVar = y.cogsActual - y.cogsBudget;
  const ytdCogsVarPct = y.cogsBudget !== 0 ? (ytdCogsVar / Math.abs(y.cogsBudget)) * 100 : 0;
  const isYtdCogsFav = y.cogsActual <= y.cogsBudget;

  // 8. OPEX
  const mtdOpexVar = m.opexActual - m.opexBudget;
  const mtdOpexVarPct = m.opexBudget !== 0 ? (mtdOpexVar / Math.abs(m.opexBudget)) * 100 : 0;
  const isMtdOpexFav = m.opexActual <= m.opexBudget;

  const ytdOpexVar = y.opexActual - y.opexBudget;
  const ytdOpexVarPct = y.opexBudget !== 0 ? (ytdOpexVar / Math.abs(y.opexBudget)) * 100 : 0;
  const isYtdOpexFav = y.opexActual <= y.opexBudget;

  const ytdPeriodText = `Jan - ${selectedMonthLabel}`;

  return (
    <div className="flex flex-col gap-6">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-3 border-slate-200 dark:border-white/10">
        <div>
          <h2 className={cn("text-lg font-bold tracking-tight flex items-center gap-2", isDarkMode ? "text-white" : "text-slate-900")}>
            <Layers className="text-[#D4AF37]" size={20} />
            Consolidated Executive KPI Grid (8 Split MTD/YTD Glass Cards)
          </h2>
          <p className={cn("text-xs font-medium", isDarkMode ? "text-white/50" : "text-slate-500")}>
            Dual-segment performance view comparing Selected Month (MTD: {selectedMonthLabel}) vs Cumulative YTD ({ytdPeriodText})
          </p>
        </div>
        <div className={cn("text-xs px-3 py-1 rounded-full font-semibold border flex items-center gap-1.5", isDarkMode ? "bg-white/5 border-white/10 text-[#D4AF37]" : "bg-amber-50 border-amber-200 text-[#B48A1D]")}>
          <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse"></span>
          Year {currentYear} • {selectedMonthLabel}
        </div>
      </div>

      {/* 8 Consolidated Split Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">

        {/* CARD 1: Net Revenue */}
        <div className={cn(
          "backdrop-blur-lg rounded-xl p-4 transition-all duration-200 border flex flex-col justify-between hover:border-[#D4AF37]/50 shadow-md",
          isDarkMode ? "bg-white/5 border-white/10 text-white" : "bg-white/90 border-slate-200 text-slate-900"
        )}>
          {/* Card Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10 mb-2">
            <span className={cn("text-xs font-bold uppercase tracking-wider flex items-center gap-1.5", isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]")}>
              <DollarSign size={14} />
              Net Revenue
            </span>
            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded", isDarkMode ? "bg-white/10 text-white/70" : "bg-slate-100 text-slate-600")}>
              Split MTD / YTD
            </span>
          </div>

          {/* Top Segment: MTD */}
          <div className="pb-3 mb-3 border-b border-dashed border-slate-200 dark:border-white/15 space-y-1">
            <div className="flex justify-between items-center">
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDarkMode ? "text-white/50" : "text-slate-500")}>
                MTD ({selectedMonthLabel})
              </span>
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-bold border flex items-center gap-0.5",
                mtdNetRevYoY >= 0 
                  ? (isDarkMode ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-300")
                  : (isDarkMode ? "bg-rose-500/15 text-rose-400 border-rose-500/30" : "bg-rose-50 text-rose-700 border-rose-300")
              )}>
                {mtdNetRevYoY >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                {mtdNetRevYoY >= 0 ? '+' : ''}{formatPercent(mtdNetRevYoY)}
              </span>
            </div>
            <div className={cn("text-xl font-mono font-semibold", isDarkMode ? "text-white" : "text-slate-900")}>
              {formatCurrency(m.netRevActual)}
            </div>
            <div className={cn("text-[10px] flex justify-between font-medium", isDarkMode ? "text-white/40" : "text-slate-500")}>
              <span>Last Year Month: <strong className={isDarkMode ? "text-white/70" : "text-slate-700"}>{hasPYMonth ? formatCurrency(pyM.netRevActual) : 'N/A'}</strong></span>
              <span>Bud: <strong className={isDarkMode ? "text-white/70" : "text-slate-700"}>{formatCurrency(m.netRevBudget)}</strong></span>
            </div>
          </div>

          {/* Bottom Segment: YTD */}
          <div className="space-y-1 pt-0.5">
            <div className="flex justify-between items-center">
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDarkMode ? "text-white/50" : "text-slate-500")}>
                YTD ({ytdPeriodText})
              </span>
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-bold border flex items-center gap-0.5",
                ytdNetRevYoY >= 0 
                  ? (isDarkMode ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-300")
                  : (isDarkMode ? "bg-rose-500/15 text-rose-400 border-rose-500/30" : "bg-rose-50 text-rose-700 border-rose-300")
              )}>
                {ytdNetRevYoY >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                {ytdNetRevYoY >= 0 ? '+' : ''}{formatPercent(ytdNetRevYoY)}
              </span>
            </div>
            <div className={cn("text-xl font-mono font-semibold", isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]")}>
              {formatCurrency(y.netRevActual)}
            </div>
            <div className={cn("text-[10px] flex justify-between font-medium", isDarkMode ? "text-white/40" : "text-slate-500")}>
              <span>Last Year YTD: <strong className={isDarkMode ? "text-white/70" : "text-slate-700"}>{hasPYYTD ? formatCurrency(pyY.netRevActual) : 'N/A'}</strong></span>
              <span>Bud: <strong className={isDarkMode ? "text-white/70" : "text-slate-700"}>{formatCurrency(y.netRevBudget)}</strong></span>
            </div>
          </div>
        </div>

        {/* CARD 2: Net Profit (NP) */}
        <div className={cn(
          "backdrop-blur-lg rounded-xl p-4 transition-all duration-200 border flex flex-col justify-between hover:border-[#D4AF37]/50 shadow-md",
          isDarkMode ? "bg-white/5 border-white/10 text-white" : "bg-white/90 border-slate-200 text-slate-900"
        )}>
          {/* Card Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10 mb-2">
            <span className={cn("text-xs font-bold uppercase tracking-wider flex items-center gap-1.5", isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]")}>
              <TrendingUp size={14} />
              Net Profit (NP)
            </span>
            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded", isDarkMode ? "bg-white/10 text-white/70" : "bg-slate-100 text-slate-600")}>
              Split MTD / YTD
            </span>
          </div>

          {/* Top Segment: MTD */}
          <div className="pb-3 mb-3 border-b border-dashed border-slate-200 dark:border-white/15 space-y-1">
            <div className="flex justify-between items-center">
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDarkMode ? "text-white/50" : "text-slate-500")}>
                MTD ({selectedMonthLabel})
              </span>
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-bold border",
                isMtdNPFav 
                  ? (isDarkMode ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-300")
                  : (isDarkMode ? "bg-rose-500/15 text-rose-400 border-rose-500/30" : "bg-rose-50 text-rose-700 border-rose-300")
              )}>
                {mtdNPVarPct >= 0 ? '+' : ''}{formatPercent(mtdNPVarPct)} {isMtdNPFav ? 'FAV' : 'UNFAV'}
              </span>
            </div>
            <div className={cn("text-xl font-mono font-semibold", isDarkMode ? "text-white" : "text-slate-900")}>
              {formatCurrency(m.netProfitActual)}
            </div>
            <div className={cn("text-[10px] flex justify-between font-medium", isDarkMode ? "text-white/40" : "text-slate-500")}>
              <span>Target: <strong className={isDarkMode ? "text-white/70" : "text-slate-700"}>{formatCurrency(m.netProfitBudget)}</strong></span>
              <span className={cn("font-bold font-mono", isMtdNPFav ? "text-emerald-500" : "text-rose-500")}>
                VAR: {mtdNPVar >= 0 ? '+' : ''}{formatCurrency(mtdNPVar)}
              </span>
            </div>
          </div>

          {/* Bottom Segment: YTD */}
          <div className="space-y-1 pt-0.5">
            <div className="flex justify-between items-center">
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDarkMode ? "text-white/50" : "text-slate-500")}>
                YTD ({ytdPeriodText})
              </span>
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-bold border",
                isYtdNPFav 
                  ? (isDarkMode ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-300")
                  : (isDarkMode ? "bg-rose-500/15 text-rose-400 border-rose-500/30" : "bg-rose-50 text-rose-700 border-rose-300")
              )}>
                {ytdNPVarPct >= 0 ? '+' : ''}{formatPercent(ytdNPVarPct)} {isYtdNPFav ? 'FAV' : 'UNFAV'}
              </span>
            </div>
            <div className={cn("text-xl font-mono font-semibold", isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]")}>
              {formatCurrency(y.netProfitActual)}
            </div>
            <div className={cn("text-[10px] flex justify-between font-medium", isDarkMode ? "text-white/40" : "text-slate-500")}>
              <span>Target: <strong className={isDarkMode ? "text-white/70" : "text-slate-700"}>{formatCurrency(y.netProfitBudget)}</strong></span>
              <span className={cn("font-bold font-mono", isYtdNPFav ? "text-emerald-500" : "text-rose-500")}>
                VAR: {ytdNPVar >= 0 ? '+' : ''}{formatCurrency(ytdNPVar)}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 3: Depreciation */}
        <div className={cn(
          "backdrop-blur-lg rounded-xl p-4 transition-all duration-200 border flex flex-col justify-between hover:border-[#D4AF37]/50 shadow-md",
          isDarkMode ? "bg-white/5 border-white/10 text-white" : "bg-white/90 border-slate-200 text-slate-900"
        )}>
          {/* Card Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10 mb-2">
            <span className={cn("text-xs font-bold uppercase tracking-wider flex items-center gap-1.5", isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]")}>
              <Activity size={14} />
              Depreciation
            </span>
            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded", isDarkMode ? "bg-white/10 text-white/70" : "bg-slate-100 text-slate-600")}>
              Split MTD / YTD
            </span>
          </div>

          {/* Top Segment: MTD */}
          <div className="pb-3 mb-3 border-b border-dashed border-slate-200 dark:border-white/15 space-y-1">
            <div className="flex justify-between items-center">
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDarkMode ? "text-white/50" : "text-slate-500")}>
                MTD ({selectedMonthLabel})
              </span>
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-bold border",
                isMtdDepFav 
                  ? (isDarkMode ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-300")
                  : (isDarkMode ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-amber-50 text-amber-700 border-amber-300")
              )}>
                {mtdDepVarPct <= 0 ? '' : '+'}{formatPercent(mtdDepVarPct)} {isMtdDepFav ? 'FAV' : 'UNFAV'}
              </span>
            </div>
            <div className={cn("text-xl font-mono font-semibold", isDarkMode ? "text-white" : "text-slate-900")}>
              {formatCurrency(m.depActual)}
            </div>
            <div className={cn("text-[10px] flex justify-between font-medium", isDarkMode ? "text-white/40" : "text-slate-500")}>
              <span>Budget: <strong className={isDarkMode ? "text-white/70" : "text-slate-700"}>{formatCurrency(m.depBudget)}</strong></span>
              <span>VAR: <strong className={isDarkMode ? "text-white/70" : "text-slate-700"}>{mtdDepVar >= 0 ? '+' : ''}{formatCurrency(mtdDepVar)}</strong></span>
            </div>
          </div>

          {/* Bottom Segment: YTD */}
          <div className="space-y-1 pt-0.5">
            <div className="flex justify-between items-center">
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDarkMode ? "text-white/50" : "text-slate-500")}>
                YTD ({ytdPeriodText})
              </span>
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-bold border",
                isYtdDepFav 
                  ? (isDarkMode ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-300")
                  : (isDarkMode ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-amber-50 text-amber-700 border-amber-300")
              )}>
                {ytdDepVarPct <= 0 ? '' : '+'}{formatPercent(ytdDepVarPct)} {isYtdDepFav ? 'FAV' : 'UNFAV'}
              </span>
            </div>
            <div className={cn("text-xl font-mono font-semibold", isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]")}>
              {formatCurrency(y.depActual)}
            </div>
            <div className={cn("text-[10px] flex justify-between font-medium", isDarkMode ? "text-white/40" : "text-slate-500")}>
              <span>Budget: <strong className={isDarkMode ? "text-white/70" : "text-slate-700"}>{formatCurrency(y.depBudget)}</strong></span>
              <span>VAR: <strong className={isDarkMode ? "text-white/70" : "text-slate-700"}>{ytdDepVar >= 0 ? '+' : ''}{formatCurrency(ytdDepVar)}</strong></span>
            </div>
          </div>
        </div>

        {/* CARD 4: Achievement Amount & % */}
        <div className={cn(
          "backdrop-blur-lg rounded-xl p-4 transition-all duration-200 border flex flex-col justify-between hover:border-[#D4AF37]/50 shadow-md",
          isDarkMode ? "bg-white/5 border-white/10 text-white" : "bg-white/90 border-slate-200 text-slate-900"
        )}>
          {/* Card Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10 mb-2">
            <span className={cn("text-xs font-bold uppercase tracking-wider flex items-center gap-1.5", isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]")}>
              <Target size={14} />
              Achievement Amt & %
            </span>
            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded", isDarkMode ? "bg-white/10 text-white/70" : "bg-slate-100 text-slate-600")}>
              Split MTD / YTD
            </span>
          </div>

          {/* Top Segment: MTD */}
          <div className="pb-3 mb-3 border-b border-dashed border-slate-200 dark:border-white/15 space-y-1">
            <div className="flex justify-between items-center">
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDarkMode ? "text-white/50" : "text-slate-500")}>
                MTD ({selectedMonthLabel})
              </span>
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-bold border",
                mtdAchPct >= 100 
                  ? (isDarkMode ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-emerald-100 text-emerald-800 border-emerald-300")
                  : (isDarkMode ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-amber-100 text-amber-800 border-amber-300")
              )}>
                {formatPercent(mtdAchPct)}
              </span>
            </div>
            <div className={cn("text-xl font-mono font-semibold", isDarkMode ? "text-white" : "text-slate-900")}>
              {mtdAchAmount >= 0 ? '+' : ''}{formatCurrency(mtdAchAmount)}
            </div>
            <div className={cn("text-[10px] flex justify-between font-medium", isDarkMode ? "text-white/40" : "text-slate-500")}>
              <span>Sales: {formatCurrency(m.salesActual)}</span>
              <span>Bud: {formatCurrency(m.salesBudget)}</span>
            </div>
          </div>

          {/* Bottom Segment: YTD */}
          <div className="space-y-1.5 pt-0.5">
            <div className="flex justify-between items-center">
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDarkMode ? "text-white/50" : "text-slate-500")}>
                YTD ({ytdPeriodText})
              </span>
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-bold border",
                ytdAchPct >= 100 
                  ? (isDarkMode ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-emerald-100 text-emerald-800 border-emerald-300")
                  : (isDarkMode ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-amber-100 text-amber-800 border-amber-300")
              )}>
                {formatPercent(ytdAchPct)}
              </span>
            </div>
            <div className={cn("text-xl font-mono font-semibold", isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]")}>
              {ytdAchAmount >= 0 ? '+' : ''}{formatCurrency(ytdAchAmount)}
            </div>

            {/* Subtle Gold Visual Progress Bar */}
            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500 bg-[#D4AF37]"
                style={{ width: `${Math.min(Math.max(ytdAchPct, 0), 100)}%` }}
              ></div>
            </div>
            <div className={cn("text-[10px] flex justify-between font-medium", isDarkMode ? "text-white/40" : "text-slate-500")}>
              <span>YTD Sales: {formatCurrency(y.salesActual)}</span>
              <span>YTD Bud: {formatCurrency(y.salesBudget)}</span>
            </div>
          </div>
        </div>

        {/* CARD 5: Growth Rate % */}
        <div className={cn(
          "backdrop-blur-lg rounded-xl p-4 transition-all duration-200 border flex flex-col justify-between hover:border-[#D4AF37]/50 shadow-md",
          isDarkMode ? "bg-white/5 border-white/10 text-white" : "bg-white/90 border-slate-200 text-slate-900"
        )}>
          {/* Card Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10 mb-2">
            <span className={cn("text-xs font-bold uppercase tracking-wider flex items-center gap-1.5", isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]")}>
              <BarChart3 size={14} />
              Growth Rate %
            </span>
            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded", isDarkMode ? "bg-white/10 text-white/70" : "bg-slate-100 text-slate-600")}>
              Split MTD / YTD
            </span>
          </div>

          {/* Top Segment: MTD */}
          <div className="pb-3 mb-3 border-b border-dashed border-slate-200 dark:border-white/15 space-y-1">
            <div className="flex justify-between items-center">
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDarkMode ? "text-white/50" : "text-slate-500")}>
                MTD ({selectedMonthLabel})
              </span>
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-0.5",
                mtdGrowth >= 0 
                  ? (isDarkMode ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-emerald-100 text-emerald-800 border-emerald-300")
                  : (isDarkMode ? "bg-rose-500/20 text-rose-300 border-rose-500/40" : "bg-rose-100 text-rose-800 border-rose-300")
              )}>
                {mtdGrowth >= 0 ? '▲' : '▼'} {formatPercent(Math.abs(mtdGrowth))}
              </span>
            </div>
            <div className={cn("text-xl font-mono font-semibold", isDarkMode ? "text-white" : "text-slate-900")}>
              {mtdGrowth >= 0 ? '+' : ''}{formatPercent(mtdGrowth)}
            </div>
            <div className={cn("text-[10px] flex justify-between font-medium", isDarkMode ? "text-white/40" : "text-slate-500")}>
              <span>CY Month: {formatCurrency(m.salesActual)}</span>
              <span>PY Month: {hasPYMonth ? formatCurrency(pyM.salesActual) : 'N/A'}</span>
            </div>
          </div>

          {/* Bottom Segment: YTD */}
          <div className="space-y-1 pt-0.5">
            <div className="flex justify-between items-center">
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDarkMode ? "text-white/50" : "text-slate-500")}>
                YTD ({ytdPeriodText})
              </span>
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-0.5",
                ytdGrowth >= 0 
                  ? (isDarkMode ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-emerald-100 text-emerald-800 border-emerald-300")
                  : (isDarkMode ? "bg-rose-500/20 text-rose-300 border-rose-500/40" : "bg-rose-100 text-rose-800 border-rose-300")
              )}>
                {ytdGrowth >= 0 ? '▲' : '▼'} {formatPercent(Math.abs(ytdGrowth))}
              </span>
            </div>
            <div className={cn("text-xl font-mono font-semibold", isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]")}>
              {ytdGrowth >= 0 ? '+' : ''}{formatPercent(ytdGrowth)}
            </div>
            <div className={cn("text-[10px] flex justify-between font-medium", isDarkMode ? "text-white/40" : "text-slate-500")}>
              <span>CY YTD: {formatCurrency(y.salesActual)}</span>
              <span>PY YTD: {hasPYYTD ? formatCurrency(pyY.salesActual) : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* CARD 6: EBITDA (Net Profit + Depreciation) */}
        <div className={cn(
          "backdrop-blur-lg rounded-xl p-4 transition-all duration-200 border flex flex-col justify-between hover:border-[#D4AF37]/50 shadow-md",
          isDarkMode ? "bg-white/5 border-white/10 text-white" : "bg-white/90 border-slate-200 text-slate-900"
        )}>
          {/* Card Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10 mb-2">
            <span className={cn("text-xs font-bold uppercase tracking-wider flex items-center gap-1.5", isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]")}>
              <Activity size={14} />
              EBITDA (NP + Dep)
            </span>
            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded", isDarkMode ? "bg-white/10 text-white/70" : "bg-slate-100 text-slate-600")}>
              Split MTD / YTD
            </span>
          </div>

          {/* Top Segment: MTD */}
          <div className="pb-3 mb-3 border-b border-dashed border-slate-200 dark:border-white/15 space-y-1">
            <div className="flex justify-between items-center">
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDarkMode ? "text-white/50" : "text-slate-500")}>
                MTD ({selectedMonthLabel})
              </span>
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-bold border",
                isMtdEbitdaFav 
                  ? (isDarkMode ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-300")
                  : (isDarkMode ? "bg-rose-500/15 text-rose-400 border-rose-500/30" : "bg-rose-50 text-rose-700 border-rose-300")
              )}>
                {mtdEbitdaVarPct >= 0 ? '+' : ''}{formatPercent(mtdEbitdaVarPct)}
              </span>
            </div>
            <div className={cn("text-xl font-mono font-semibold", isDarkMode ? "text-white" : "text-slate-900")}>
              {formatCurrency(m.ebitdaActual)}
            </div>
            <div className={cn("text-[10px] flex justify-between font-medium", isDarkMode ? "text-white/40" : "text-slate-500")}>
              <span>Budget: <strong className={isDarkMode ? "text-white/70" : "text-slate-700"}>{formatCurrency(m.ebitdaBudget)}</strong></span>
              <span>VAR: <strong className={isDarkMode ? "text-white/70" : "text-slate-700"}>{mtdEbitdaVar >= 0 ? '+' : ''}{formatCurrency(mtdEbitdaVar)}</strong></span>
            </div>
          </div>

          {/* Bottom Segment: YTD */}
          <div className="space-y-1 pt-0.5">
            <div className="flex justify-between items-center">
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDarkMode ? "text-white/50" : "text-slate-500")}>
                YTD ({ytdPeriodText})
              </span>
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-bold border",
                isYtdEbitdaFav 
                  ? (isDarkMode ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-300")
                  : (isDarkMode ? "bg-rose-500/15 text-rose-400 border-rose-500/30" : "bg-rose-50 text-rose-700 border-rose-300")
              )}>
                {ytdEbitdaVarPct >= 0 ? '+' : ''}{formatPercent(ytdEbitdaVarPct)}
              </span>
            </div>
            <div className={cn("text-xl font-mono font-semibold", isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]")}>
              {formatCurrency(y.ebitdaActual)}
            </div>
            <div className={cn("text-[10px] flex justify-between font-medium", isDarkMode ? "text-white/40" : "text-slate-500")}>
              <span>Budget: <strong className={isDarkMode ? "text-white/70" : "text-slate-700"}>{formatCurrency(y.ebitdaBudget)}</strong></span>
              <span>VAR: <strong className={isDarkMode ? "text-white/70" : "text-slate-700"}>{ytdEbitdaVar >= 0 ? '+' : ''}{formatCurrency(ytdEbitdaVar)}</strong></span>
            </div>
          </div>
        </div>

        {/* CARD 7: COGS & Direct Factory Costs */}
        <div className={cn(
          "backdrop-blur-lg rounded-xl p-4 transition-all duration-200 border flex flex-col justify-between hover:border-[#D4AF37]/50 shadow-md",
          isDarkMode ? "bg-white/5 border-white/10 text-white" : "bg-white/90 border-slate-200 text-slate-900"
        )}>
          {/* Card Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10 mb-2">
            <span className={cn("text-xs font-bold uppercase tracking-wider flex items-center gap-1.5", isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]")}>
              <Factory size={14} />
              COGS & Direct Costs
            </span>
            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded", isDarkMode ? "bg-white/10 text-white/70" : "bg-slate-100 text-slate-600")}>
              Split MTD / YTD
            </span>
          </div>

          {/* Top Segment: MTD */}
          <div className="pb-3 mb-3 border-b border-dashed border-slate-200 dark:border-white/15 space-y-1">
            <div className="flex justify-between items-center">
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDarkMode ? "text-white/50" : "text-slate-500")}>
                MTD ({selectedMonthLabel})
              </span>
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-bold border",
                isMtdCogsFav 
                  ? (isDarkMode ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-300")
                  : (isDarkMode ? "bg-rose-500/15 text-rose-400 border-rose-500/30" : "bg-rose-50 text-rose-700 border-rose-300")
              )}>
                {mtdCogsVarPct <= 0 ? '' : '+'}{formatPercent(mtdCogsVarPct)} {isMtdCogsFav ? 'FAV' : 'UNFAV'}
              </span>
            </div>
            <div className={cn("text-xl font-mono font-semibold", isDarkMode ? "text-white" : "text-slate-900")}>
              {formatCurrency(m.cogsActual)}
            </div>
            <div className={cn("text-[10px] flex justify-between font-medium", isDarkMode ? "text-white/40" : "text-slate-500")}>
              <span>Budget: <strong className={isDarkMode ? "text-white/70" : "text-slate-700"}>{formatCurrency(m.cogsBudget)}</strong></span>
              <span>VAR: <strong className={isDarkMode ? "text-white/70" : "text-slate-700"}>{mtdCogsVar >= 0 ? '+' : ''}{formatCurrency(mtdCogsVar)}</strong></span>
            </div>
          </div>

          {/* Bottom Segment: YTD */}
          <div className="space-y-1 pt-0.5">
            <div className="flex justify-between items-center">
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDarkMode ? "text-white/50" : "text-slate-500")}>
                YTD ({ytdPeriodText})
              </span>
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-bold border",
                isYtdCogsFav 
                  ? (isDarkMode ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-300")
                  : (isDarkMode ? "bg-rose-500/15 text-rose-400 border-rose-500/30" : "bg-rose-50 text-rose-700 border-rose-300")
              )}>
                {ytdCogsVarPct <= 0 ? '' : '+'}{formatPercent(ytdCogsVarPct)} {isYtdCogsFav ? 'FAV' : 'UNFAV'}
              </span>
            </div>
            <div className={cn("text-xl font-mono font-semibold", isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]")}>
              {formatCurrency(y.cogsActual)}
            </div>
            <div className={cn("text-[10px] flex justify-between font-medium", isDarkMode ? "text-white/40" : "text-slate-500")}>
              <span>Budget: <strong className={isDarkMode ? "text-white/70" : "text-slate-700"}>{formatCurrency(y.cogsBudget)}</strong></span>
              <span>VAR: <strong className={isDarkMode ? "text-white/70" : "text-slate-700"}>{ytdCogsVar >= 0 ? '+' : ''}{formatCurrency(ytdCogsVar)}</strong></span>
            </div>
          </div>
        </div>

        {/* CARD 8: Operating Overheads (OPEX) */}
        <div className={cn(
          "backdrop-blur-lg rounded-xl p-4 transition-all duration-200 border flex flex-col justify-between hover:border-[#D4AF37]/50 shadow-md",
          isDarkMode ? "bg-white/5 border-white/10 text-white" : "bg-white/90 border-slate-200 text-slate-900"
        )}>
          {/* Card Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10 mb-2">
            <span className={cn("text-xs font-bold uppercase tracking-wider flex items-center gap-1.5", isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]")}>
              <Building2 size={14} />
              Operating Overheads (OPEX)
            </span>
            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded", isDarkMode ? "bg-white/10 text-white/70" : "bg-slate-100 text-slate-600")}>
              Split MTD / YTD
            </span>
          </div>

          {/* Top Segment: MTD */}
          <div className="pb-3 mb-3 border-b border-dashed border-slate-200 dark:border-white/15 space-y-1">
            <div className="flex justify-between items-center">
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDarkMode ? "text-white/50" : "text-slate-500")}>
                MTD ({selectedMonthLabel})
              </span>
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-bold border",
                isMtdOpexFav 
                  ? (isDarkMode ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-300")
                  : (isDarkMode ? "bg-rose-500/15 text-rose-400 border-rose-500/30" : "bg-rose-50 text-rose-700 border-rose-300")
              )}>
                {mtdOpexVarPct <= 0 ? '' : '+'}{formatPercent(mtdOpexVarPct)} {isMtdOpexFav ? 'FAV' : 'UNFAV'}
              </span>
            </div>
            <div className={cn("text-xl font-mono font-semibold", isDarkMode ? "text-white" : "text-slate-900")}>
              {formatCurrency(m.opexActual)}
            </div>
            <div className={cn("text-[10px] flex justify-between font-medium", isDarkMode ? "text-white/40" : "text-slate-500")}>
              <span>Budget: <strong className={isDarkMode ? "text-white/70" : "text-slate-700"}>{formatCurrency(m.opexBudget)}</strong></span>
              <span>VAR: <strong className={isDarkMode ? "text-white/70" : "text-slate-700"}>{mtdOpexVar >= 0 ? '+' : ''}{formatCurrency(mtdOpexVar)}</strong></span>
            </div>
          </div>

          {/* Bottom Segment: YTD */}
          <div className="space-y-1 pt-0.5">
            <div className="flex justify-between items-center">
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDarkMode ? "text-white/50" : "text-slate-500")}>
                YTD ({ytdPeriodText})
              </span>
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-bold border",
                isYtdOpexFav 
                  ? (isDarkMode ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-300")
                  : (isDarkMode ? "bg-rose-500/15 text-rose-400 border-rose-500/30" : "bg-rose-50 text-rose-700 border-rose-300")
              )}>
                {ytdOpexVarPct <= 0 ? '' : '+'}{formatPercent(ytdOpexVarPct)} {isYtdOpexFav ? 'FAV' : 'UNFAV'}
              </span>
            </div>
            <div className={cn("text-xl font-mono font-semibold", isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]")}>
              {formatCurrency(y.opexActual)}
            </div>
            <div className={cn("text-[10px] flex justify-between font-medium", isDarkMode ? "text-white/40" : "text-slate-500")}>
              <span>Budget: <strong className={isDarkMode ? "text-white/70" : "text-slate-700"}>{formatCurrency(y.opexBudget)}</strong></span>
              <span>VAR: <strong className={isDarkMode ? "text-white/70" : "text-slate-700"}>{ytdOpexVar >= 0 ? '+' : ''}{formatCurrency(ytdOpexVar)}</strong></span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
