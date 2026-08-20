import React, { useMemo, useState } from 'react';
import { ProcessedData } from '../types';
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line, Legend } from 'recharts';
import { formatCurrency, cn } from '../lib/utils';
import { BarChart3, TrendingUp, DollarSign, Percent } from 'lucide-react';

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

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function PerformanceChart({ data, filters, isDarkMode }: PerformanceChartProps) {
  // Chart Selection State
  const [activeChart, setActiveChart] = useState<'revenue' | 'netprofit' | 'ebitda'>('revenue');

  // Determine Current Year and Prior Year
  const selectedYear = filters?.year || '2026';
  const priorYear = (parseInt(selectedYear, 10) - 1).toString();

  // Aggregate monthly data for all 12 months (Jan-Dec) using precise P&L statutory mappings
  const chartData = useMemo(() => {
    return MONTH_NAMES.map((monthName, monthIndex) => {
      // Find rows for current month index across both selected year and prior year
      const cyRows = data.filter(r => {
        if (r.year !== selectedYear || r.monthIndex !== monthIndex) return false;
        if (filters?.groupAccountNumber && r.groupAccountNumber !== filters.groupAccountNumber) return false;
        if (filters?.misHead && r.misHead !== filters.misHead) return false;
        return true;
      });
      const pyRows = data.filter(r => {
        if (r.year !== priorYear || r.monthIndex !== monthIndex) return false;
        if (filters?.groupAccountNumber && r.groupAccountNumber !== filters.groupAccountNumber) return false;
        if (filters?.misHead && r.misHead !== filters.misHead) return false;
        return true;
      });

      const computeForRows = (rows: ProcessedData[]) => {
        let salesActual = 0, salesBudget = 0;
        let returnsActual = 0, returnsBudget = 0;
        let materialActual = 0, materialBudget = 0;
        
        let dcActual = 0, dcBudget = 0;
        let gaActual = 0, gaBudget = 0;
        let smActual = 0, smBudget = 0;
        
        let otherIncActual = 0, otherIncBudget = 0;
        let finActual = 0, finBudget = 0;
        let taxActual = 0, taxBudget = 0;
        
        let depActual = 0, depBudget = 0;

        rows.forEach(row => {
          const raw = (row.misHead || '').trim();
          if (!raw) return;
          const upper = raw.toUpperCase();
          
          const act = Math.abs(row.actual);
          const bud = Math.abs(row.budget);

          if (upper.includes('SALES RETURN') || upper.includes('SALES/RETURN')) {
            returnsActual += act;
            returnsBudget += bud;
          } else if (upper.includes('SALES') || upper.includes('REVENUE')) {
            salesActual += act;
            salesBudget += bud;
          } else if (upper.includes('MATERIAL')) {
            materialActual += act;
            materialBudget += bud;
          } else if (upper.startsWith('DC -')) {
            dcActual += act;
            dcBudget += bud;
            if (upper.includes('DEPRECIATION')) {
              depActual += act;
              depBudget += bud;
            }
          } else if (upper.startsWith('GA -')) {
            gaActual += act;
            gaBudget += bud;
            if (upper.includes('DEPRECIATION')) {
              depActual += act;
              depBudget += bud;
            }
          } else if (upper.startsWith('SM -')) {
            smActual += act;
            smBudget += bud;
            if (upper.includes('DEPRECIATION')) {
              depActual += act;
              depBudget += bud;
            }
          } else if (upper.includes('OTHER INCOME')) {
            otherIncActual += act;
            otherIncBudget += bud;
          } else if (upper.includes('FINANCE')) {
            finActual += act;
            finBudget += bud;
          } else if (upper.includes('TAX')) {
            taxActual += act;
            taxBudget += bud;
          }
        });

        // Net Revenue (Net Sales) = sales - returns
        const revenueActual = salesActual - returnsActual;
        const revenueBudget = salesBudget - returnsBudget;

        const netSalesActual = salesActual - returnsActual;
        const netSalesBudget = salesBudget - returnsBudget;

        const momActual = netSalesActual - materialActual;
        const momBudget = netSalesBudget - materialBudget;

        const gpActual = momActual - dcActual;
        const gpBudget = momBudget - dcBudget;

        const npbtActual = gpActual + otherIncActual - (gaActual + smActual + finActual);
        const npbtBudget = gpBudget + otherIncBudget - (gaActual + smActual + finActual);

        const npatActual = npbtActual - taxActual;
        const npatBudget = npbtBudget - taxBudget;

        // EBITDA = NPBT + financeCharges + depreciation
        const ebitdaActual = npbtActual + finActual + depActual;
        const ebitdaBudget = npbtBudget + finActual + depBudget;

        return {
          revenueActual,
          revenueBudget,
          npatActual,
          npatBudget,
          ebitdaActual,
          ebitdaBudget
        };
      };

      const cy = computeForRows(cyRows);
      const py = computeForRows(pyRows);

      return {
        month: monthName,
        // Revenue metrics
        cyRevenueActual: cy.revenueActual,
        cyRevenueBudget: cy.revenueBudget,
        pyRevenueActual: py.revenueActual,
        // Net Profit (NPAT) metrics
        cyNetProfitActual: cy.npatActual,
        cyNetProfitBudget: cy.npatBudget,
        pyNetProfitActual: py.npatActual,
        // EBITDA metrics
        cyEbitdaActual: cy.ebitdaActual,
        cyEbitdaBudget: cy.ebitdaBudget,
        pyEbitdaActual: py.ebitdaActual,
      };
    });
  }, [data, selectedYear, priorYear, filters?.groupAccountNumber, filters?.misHead]);

  // Design Theme Colors
  const colors = {
    gold: isDarkMode ? "#D4AF37" : "#B48A1D",
    blue: isDarkMode ? "#60A5FA" : "#2563EB",
    red: isDarkMode ? "#F87171" : "#DC2626",
    gridStroke: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)",
  };

  return (
    <div className={cn(
      "backdrop-blur-lg rounded-xl p-5 flex flex-col w-full border transition-all shadow-lg min-h-[500px]",
      isDarkMode ? "bg-white/5 border-white/10 text-white" : "bg-white/90 border-slate-200 text-slate-900"
    )}>
      {/* Header Bar with Title and Toggle Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="text-[#D4AF37]" size={18} />
            Module 2: Month-on-Month Performance Graphs
          </h2>
          <p className={cn("text-xs font-medium mt-0.5", isDarkMode ? "text-white/50" : "text-slate-500")}>
            Comparative 12-Month Trend Visualizations ({selectedYear} Actual vs. {priorYear} Actual vs. Budget Target)
          </p>
        </div>

        {/* Coordinated Chart Switch Selector Tab Controls */}
        <div className="flex items-center p-1 rounded-full border text-xs font-semibold w-full sm:w-auto overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <div className={cn(
            "flex items-center p-0.5 rounded-full",
            isDarkMode ? "bg-white/5 border-white/5" : "bg-slate-100"
          )}>
            <button
              onClick={() => setActiveChart('revenue')}
              className={cn(
                "px-4 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap text-xs flex items-center gap-1.5",
                activeChart === 'revenue'
                  ? "bg-[#D4AF37] text-black font-extrabold shadow-sm"
                  : (isDarkMode ? "text-white/70 hover:text-white" : "text-slate-600 hover:text-slate-900")
              )}
            >
              <TrendingUp size={13} />
              <span>Revenue Trend</span>
            </button>
            <button
              onClick={() => setActiveChart('netprofit')}
              className={cn(
                "px-4 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap text-xs flex items-center gap-1.5",
                activeChart === 'netprofit'
                  ? "bg-[#D4AF37] text-black font-extrabold shadow-sm"
                  : (isDarkMode ? "text-white/70 hover:text-white" : "text-slate-600 hover:text-slate-900")
              )}
            >
              <DollarSign size={13} />
              <span>Net Profit Trend</span>
            </button>
            <button
              onClick={() => setActiveChart('ebitda')}
              className={cn(
                "px-4 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap text-xs flex items-center gap-1.5",
                activeChart === 'ebitda'
                  ? "bg-[#D4AF37] text-black font-extrabold shadow-sm"
                  : (isDarkMode ? "text-white/70 hover:text-white" : "text-slate-600 hover:text-slate-900")
              )}
            >
              <Percent size={13} />
              <span>EBITDA Trajectory</span>
            </button>
          </div>
        </div>
      </div>

      {/* Render Single Active High-Visibility Chart */}
      <div className={cn(
        "flex-1 border rounded-xl p-4 sm:p-6 flex flex-col min-h-[380px] shadow-sm transition-all w-full",
        isDarkMode ? "bg-white/[0.02] border-white/5" : "bg-slate-50/50 border-slate-100"
      )}>
        {/* Active Title Indicator */}
        <div className="text-xs sm:text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
          <span className={cn("w-2.5 h-2.5 rounded-full animate-pulse", isDarkMode ? "bg-[#D4AF37]" : "bg-[#B48A1D]")}></span>
          <span className={isDarkMode ? "text-white/95" : "text-slate-800"}>
            {activeChart === 'revenue' && `1. Revenue MoM Trend (${selectedYear} vs. ${priorYear} vs. Budget)`}
            {activeChart === 'netprofit' && `2. Net Profit MoM Trend (${selectedYear} vs. ${priorYear} vs. Budget)`}
            {activeChart === 'ebitda' && `3. EBITDA MoM Trajectory (${selectedYear} vs. ${priorYear})`}
          </span>
        </div>

        {/* Interactive Responsive Container */}
        <div className="w-full h-[350px] mt-2">
          {activeChart === 'revenue' && (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.gridStroke} vertical={false} />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.8)', fontSize: 11, fontWeight: 600 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.8)', fontSize: 10 }}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? '#111827' : '#fff', 
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: isDarkMode ? '#fff' : '#000'
                  }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingTop: '10px' }} />
                <Bar dataKey="cyRevenueActual" name={`${selectedYear} Actual`} fill={colors.gold} radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="pyRevenueActual" name={`${priorYear} Actual`} fill={colors.blue} radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Line 
                  type="monotone" 
                  dataKey="cyRevenueBudget" 
                  name={`${selectedYear} Budget Target`} 
                  stroke={colors.red} 
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  dot={{ r: 3.5, fill: colors.red }} 
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}

          {activeChart === 'netprofit' && (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.gridStroke} vertical={false} />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.8)', fontSize: 11, fontWeight: 600 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.8)', fontSize: 10 }}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? '#111827' : '#fff', 
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: isDarkMode ? '#fff' : '#000'
                  }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingTop: '10px' }} />
                <Bar dataKey="cyNetProfitActual" name={`${selectedYear} Net Profit`} fill={colors.gold} radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="pyNetProfitActual" name={`${priorYear} Net Profit`} fill={colors.blue} radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Line 
                  type="monotone" 
                  dataKey="cyNetProfitBudget" 
                  name={`${selectedYear} Budget Target`} 
                  stroke={colors.red} 
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  dot={{ r: 3.5, fill: colors.red }} 
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}

          {activeChart === 'ebitda' && (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.gridStroke} vertical={false} />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.8)', fontSize: 11, fontWeight: 600 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.8)', fontSize: 10 }}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? '#111827' : '#fff', 
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: isDarkMode ? '#fff' : '#000'
                  }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingTop: '10px' }} />
                <Bar dataKey="cyEbitdaActual" name={`${selectedYear} EBITDA Actual`} fill={colors.gold} radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="pyEbitdaActual" name={`${priorYear} EBITDA Actual`} fill={colors.blue} radius={[4, 4, 0, 0]} maxBarSize={32} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
