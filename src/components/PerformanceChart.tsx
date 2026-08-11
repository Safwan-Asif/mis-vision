import { useState, useMemo } from 'react';
import { ProcessedData } from '../types';
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line, Legend } from 'recharts';
import { formatCurrency, formatPercent, cn } from '../lib/utils';
import { TrendingUp, BarChart3, DollarSign, Activity } from 'lucide-react';

interface PerformanceChartProps {
  data: ProcessedData[];
  filters?: {
    year: string;
    month: string;
    groupAccountNumber: string;
    misHead: string;
  };
  isDarkMode: boolean;
}

type ChartMetric = 'revenue' | 'netProfit' | 'ebitda';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function PerformanceChart({ data, filters, isDarkMode }: PerformanceChartProps) {
  const [activeMetric, setActiveMetric] = useState<ChartMetric>('revenue');

  // Determine Current Year and Prior Year
  const selectedYear = filters?.year || '2026';
  const priorYear = (parseInt(selectedYear, 10) - 1).toString();

  // Aggregate monthly data for all 12 months (Jan-Dec)
  const chartData = useMemo(() => {
    return MONTH_NAMES.map((monthName, monthIndex) => {
      let cyRevenueActual = 0;
      let cyRevenueBudget = 0;
      let pyRevenueActual = 0;

      let cyNetProfitActual = 0;
      let cyNetProfitBudget = 0;
      let pyNetProfitActual = 0;

      let cyEbitdaActual = 0;
      let cyEbitdaBudget = 0;
      let pyEbitdaActual = 0;

      // Helper to compute metrics for a set of rows
      const computeForRows = (rows: ProcessedData[]) => {
        let salesActual = 0, salesBudget = 0;
        let otherIncomeActual = 0, otherIncomeBudget = 0;
        let returnsActual = 0, returnsBudget = 0;
        let cogsActual = 0, cogsBudget = 0;
        let opexActual = 0, opexBudget = 0;
        let depActual = 0, depBudget = 0;

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
          netRevActual,
          netRevBudget,
          netProfitActual,
          netProfitBudget,
          ebitdaActual,
          ebitdaBudget
        };
      };

      const cyRows = data.filter(r => r.year === selectedYear && r.monthIndex === monthIndex);
      const pyRows = data.filter(r => r.year === priorYear && r.monthIndex === monthIndex);

      const cyComputed = computeForRows(cyRows);
      const pyComputed = computeForRows(pyRows);

      cyRevenueActual = cyComputed.netRevActual;
      cyRevenueBudget = cyComputed.netRevBudget;
      pyRevenueActual = pyComputed.netRevActual;

      cyNetProfitActual = cyComputed.netProfitActual;
      cyNetProfitBudget = cyComputed.netProfitBudget;
      pyNetProfitActual = pyComputed.netProfitActual;

      cyEbitdaActual = cyComputed.ebitdaActual;
      cyEbitdaBudget = cyComputed.ebitdaBudget;
      pyEbitdaActual = pyComputed.ebitdaActual;

      return {
        month: monthName,
        cyRevenueActual,
        pyRevenueActual,
        cyRevenueBudget,
        cyNetProfitActual,
        pyNetProfitActual,
        cyNetProfitBudget,
        cyEbitdaActual,
        pyEbitdaActual,
        cyEbitdaBudget
      };
    });
  }, [data, selectedYear, priorYear]);

  // Color Constants
  const colors = {
    gold: isDarkMode ? "#D4AF37" : "#B48A1D",
    blue: isDarkMode ? "#60A5FA" : "#2563EB",
    red: isDarkMode ? "#F87171" : "#DC2626",
    emerald: isDarkMode ? "#34D399" : "#059669",
  };

  const getMetricTitle = () => {
    switch (activeMetric) {
      case 'revenue':
        return 'Net Revenue MoM Trend';
      case 'netProfit':
        return 'Net Profit MoM Trend';
      case 'ebitda':
        return 'EBITDA (NP + Dep) MoM Trend';
    }
  };

  return (
    <div className={cn(
      "backdrop-blur-lg rounded-xl p-6 flex flex-col w-full min-h-[460px] border transition-colors shadow-lg",
      isDarkMode ? "bg-white/5 border-white/10 text-white" : "bg-white/90 border-slate-200 text-slate-900"
    )}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="text-[#D4AF37]" size={18} />
            Module 2: Month-on-Month Performance Graphs
          </h2>
          <p className={cn("text-xs font-medium mt-0.5", isDarkMode ? "text-white/50" : "text-slate-500")}>
            Comparative 12-Month Trend Analysis ({selectedYear} Actual vs. {priorYear} Actual vs. Budget Target)
          </p>
        </div>

        {/* Chart View Selector Tabs */}
        <div className={cn(
          "flex items-center p-1 rounded-lg border text-xs font-semibold self-start md:self-auto",
          isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-300"
        )}>
          <button
            onClick={() => setActiveMetric('revenue')}
            className={cn(
              "px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5",
              activeMetric === 'revenue' 
                ? "bg-[#D4AF37] text-black font-bold shadow-sm" 
                : (isDarkMode ? "text-white/70 hover:text-white" : "text-slate-600 hover:text-slate-900")
            )}
          >
            <DollarSign size={13} />
            <span>Revenue MoM</span>
          </button>

          <button
            onClick={() => setActiveMetric('netProfit')}
            className={cn(
              "px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5",
              activeMetric === 'netProfit' 
                ? "bg-[#D4AF37] text-black font-bold shadow-sm" 
                : (isDarkMode ? "text-white/70 hover:text-white" : "text-slate-600 hover:text-slate-900")
            )}
          >
            <TrendingUp size={13} />
            <span>Net Profit MoM</span>
          </button>

          <button
            onClick={() => setActiveMetric('ebitda')}
            className={cn(
              "px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5",
              activeMetric === 'ebitda' 
                ? "bg-[#D4AF37] text-black font-bold shadow-sm" 
                : (isDarkMode ? "text-white/70 hover:text-white" : "text-slate-600 hover:text-slate-900")
            )}
          >
            <Activity size={13} />
            <span>EBITDA MoM</span>
          </button>
        </div>
      </div>

      <div className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
        <span className={cn("w-2 h-2 rounded-full", isDarkMode ? "bg-[#D4AF37]" : "bg-[#B48A1D]")}></span>
        <span className={isDarkMode ? "text-white/80" : "text-slate-800"}>{getMetricTitle()}</span>
      </div>

      {/* Recharts Month-on-Month Visualizer */}
      <div className="flex-1 w-full min-h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"} vertical={false} />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(51,65,85,0.9)', fontSize: 12, fontWeight: 600 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(51,65,85,0.9)', fontSize: 11 }}
              tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
              dx={-5}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)', 
                backdropFilter: 'blur(12px)',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(203,213,225,0.9)',
                borderRadius: '12px',
                color: isDarkMode ? '#fff' : '#0f172a',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)'
              }}
              formatter={(value: number) => [formatCurrency(value), '']}
            />
            <Legend 
              verticalAlign="top" 
              align="right" 
              wrapperStyle={{ paddingBottom: '15px', fontSize: '11px', fontWeight: 600 }}
            />

            {/* Render Bars & Line according to active metric */}
            {activeMetric === 'revenue' && (
              <>
                <Bar dataKey="cyRevenueActual" name={`${selectedYear} Actual Revenue`} fill={colors.gold} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="pyRevenueActual" name={`${priorYear} Actual Revenue`} fill={colors.blue} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Line 
                  type="monotone" 
                  dataKey="cyRevenueBudget" 
                  name={`${selectedYear} Target Budget`} 
                  stroke={colors.red} 
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={{ r: 4, fill: colors.red }} 
                  activeDot={{ r: 6 }}
                />
              </>
            )}

            {activeMetric === 'netProfit' && (
              <>
                <Bar dataKey="cyNetProfitActual" name={`${selectedYear} Actual Net Profit`} fill={colors.gold} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="pyNetProfitActual" name={`${priorYear} Actual Net Profit`} fill={colors.blue} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Line 
                  type="monotone" 
                  dataKey="cyNetProfitBudget" 
                  name={`${selectedYear} Target Budget`} 
                  stroke={colors.red} 
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={{ r: 4, fill: colors.red }} 
                  activeDot={{ r: 6 }}
                />
              </>
            )}

            {activeMetric === 'ebitda' && (
              <>
                <Bar dataKey="cyEbitdaActual" name={`${selectedYear} Actual EBITDA`} fill={colors.gold} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="pyEbitdaActual" name={`${priorYear} Actual EBITDA`} fill={colors.blue} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Line 
                  type="monotone" 
                  dataKey="cyEbitdaBudget" 
                  name={`${selectedYear} Target Budget`} 
                  stroke={colors.red} 
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={{ r: 4, fill: colors.red }} 
                  activeDot={{ r: 6 }}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
