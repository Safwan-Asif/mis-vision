import { ProcessedData } from '../types';
import { GlassCard } from './GlassCard';
import { formatCurrency, formatPercent, cn } from '../lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardsProps {
  data: ProcessedData[];
}

export function KPICards({ data }: KPICardsProps) {
  // Gross Sales = Σ |Actual(SALES/REVENUE)|
  // Sales Returns = Σ Actual(SALES RETURN) -- wait, Sales Return was not explicitly listed in sign logic, but usually it's negative or positive. Let's look at MIS Head.
  // Actually, the prompt says: 
  // Gross Sales = Σ |Actual(SALES/REVENUE)|
  // Sales Returns = Σ Actual(SALES RETURN) 
  // Net Revenue = Gross Sales - Sales Returns
  // COGS = Σ Actual(MATERIAL COST + DC - MANPOWER + DC - UTILITY + DC - OTHER + DC - DEPRECIATION)
  // OPEX = Σ Actual(SM - * + GA - *)
  
  let grossSalesActual = 0;
  let grossSalesBudget = 0;
  
  let returnsActual = 0;
  let returnsBudget = 0;
  
  let cogsActual = 0;
  let cogsBudget = 0;
  
  let opexActual = 0;
  let opexBudget = 0;
  
  data.forEach(row => {
    if (row.misHead === 'SALES/REVENUE') {
      grossSalesActual += Math.abs(row.actual);
      grossSalesBudget += Math.abs(row.budget);
    } else if (row.misHead === 'SALES RETURN') {
      // Assuming SALES RETURN is represented positively in our normalized actuals or original?
      // Wait, if it wasn't sign-normalized, it stays as is. Let's just add it.
      returnsActual += row.actual;
      returnsBudget += row.budget;
    } else if (
      row.misHead === 'MATERIAL COST' || 
      row.misHead.startsWith('DC -')
    ) {
      cogsActual += row.actual;
      cogsBudget += row.budget;
    } else if (
      row.misHead.startsWith('SM -') || 
      row.misHead.startsWith('GA -')
    ) {
      opexActual += row.actual;
      opexBudget += row.budget;
    }
  });
  
  const netRevActual = grossSalesActual - returnsActual;
  const netRevBudget = grossSalesBudget - returnsBudget;
  
  const ebitActual = netRevActual - cogsActual - opexActual;
  const ebitBudget = netRevBudget - cogsBudget - opexBudget;
  
  const kpis = [
    {
      title: 'Net Revenue',
      actual: netRevActual,
      budget: netRevBudget,
      isRevenue: true
    },
    {
      title: 'Total Direct Costs (COGS)',
      actual: cogsActual,
      budget: cogsBudget,
      isRevenue: false
    },
    {
      title: 'Operating Profit (EBIT)',
      actual: ebitActual,
      budget: ebitBudget,
      isRevenue: true
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {kpis.map((kpi, i) => {
        const variance = kpi.actual - kpi.budget;
        const variancePct = kpi.budget !== 0 ? (variance / Math.abs(kpi.budget)) * 100 : 0;
        
        let isFavorable = false;
        if (kpi.isRevenue) {
          isFavorable = kpi.actual >= kpi.budget;
        } else {
          isFavorable = kpi.actual <= kpi.budget;
        }
        
        return (
          <div key={i} className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-5 relative overflow-hidden transition-transform duration-300 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-medium text-white/60 uppercase tracking-wider">{kpi.title}</span>
              <span className={cn(
                "px-2 py-0.5 rounded text-[10px] font-bold",
                isFavorable 
                  ? "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30" 
                  : "bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30"
              )}>
                {variancePct > 0 ? '+' : ''}{formatPercent(variancePct)} {isFavorable ? 'FAV' : 'UNFAV'}
              </span>
            </div>
            <div className="text-3xl font-light text-[#D4AF37]">
              {formatCurrency(kpi.actual)}
            </div>
            <div className="mt-3 text-[11px] text-white/40 flex items-center gap-2">
              <span>Budget Target: {formatCurrency(kpi.budget)}</span>
              <div className="h-1 w-1 rounded-full bg-white/20"></div>
              <span className="text-white/60 font-mono">VAR: {formatCurrency(variance)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
