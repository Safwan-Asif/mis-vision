import { useState, useMemo } from 'react';
import { ProcessedData } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Search, ArrowUpDown, Table, FileSpreadsheet } from 'lucide-react';
import Papa from 'papaparse';

interface LedgerTableProps {
  data: ProcessedData[];
  allData?: ProcessedData[];
  filters?: {
    year: string;
    month: string;
    groupAccountNumber: string;
    misHead: string;
  };
  isDarkMode: boolean;
}

type SortField = 
  | 'glAccNum' 
  | 'glAccDesc' 
  | 'cyBudget' 
  | 'cyActual' 
  | 'pyActual' 
  | 'var1' 
  | 'var2' 
  | 'status1' 
  | 'status2';

type SortOrder = 'asc' | 'desc';

function isIncomeRow(glGroupName: string = '', misHead: string = ''): boolean {
  const gLower = glGroupName.toLowerCase();
  const mLower = misHead.toLowerCase();

  // If explicit revenue, sales, or income references exist
  if (gLower.includes('revenue') || gLower.includes('sales') || gLower.includes('income') ||
      mLower.includes('revenue') || mLower.includes('sales') || mLower.includes('income')) {
    // Sales returns behave as expense deductions
    if (gLower.includes('return') || mLower.includes('return')) {
      return false;
    }
    return true;
  }
  return false;
}

export function LedgerTable({ data, allData = [], filters, isDarkMode }: LedgerTableProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('cyActual');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Selected year and prior year
  const selectedYear = filters?.year || '2026';
  const priorYear = (parseInt(selectedYear, 10) - 1).toString();

  // Create prior year lookup map: key = `${glAccountNumber||glAccount}|${costCenter}|${monthIndex}`
  const priorYearMap = useMemo(() => {
    const map = new Map<string, { actual: number; budget: number }>();
    const dataset = allData.length > 0 ? allData : data;

    dataset.forEach(row => {
      if (row.year === priorYear) {
        const key = `${row.glAccountNumber || row.glAccount}|${row.costCenter}|${row.monthIndex}`;
        const existing = map.get(key) || { actual: 0, budget: 0 };
        map.set(key, {
          actual: existing.actual + row.actual,
          budget: existing.budget + row.budget
        });
      }
    });

    return map;
  }, [allData, data, priorYear]);

  // Enriched rows mapping exactly to the 9 requested columns
  const enrichedRows = useMemo(() => {
    return data.map(row => {
      const key = `${row.glAccountNumber || row.glAccount}|${row.costCenter}|${row.monthIndex}`;
      const pyMatch = priorYearMap.get(key);
      
      const cyActual = row.actual;
      const cyBudget = row.budget;
      const pyActual = row.lastYearActual !== undefined ? row.lastYearActual : (pyMatch ? pyMatch.actual : 0);

      // VAR1 ($) = Budget - CY Actual
      const var1 = cyBudget - cyActual;
      
      // VAR2 ($) = CY Actual - LY Actual
      const var2 = cyActual - pyActual;

      // STATUS 1 (vs Budget) with Dynamic Income vs Expense Classification
      const isInc = isIncomeRow(row.glGroupName, row.misHead);
      const status1 = isInc
        ? (cyActual >= cyBudget ? 'GROWTH' : 'DEGROWTH')
        : (cyBudget >= cyActual ? 'LOW SPEND' : 'HIGH SPEND');

      // STATUS 2 (vs Prior Year)
      // If CY Actual > LY Actual ➔ HIGH SPEND (Red Glass Pill)
      // If CY Actual < LY Actual ➔ LOW SPEND (Green Glass Pill)
      const status2 = cyActual > pyActual ? 'HIGH SPEND' : 'LOW SPEND';

      return {
        ...row,
        glAccNum: row.glAccountNumber || row.glAccount || '-',
        glAccDesc: row.glAccountDescription || row.glAccount || '-',
        cyActual,
        cyBudget,
        pyActual,
        var1,
        var2,
        status1,
        status2
      };
    });
  }, [data, priorYearMap]);

  // Filter and sort rows
  const filteredAndSortedData = useMemo(() => {
    let result = enrichedRows;

    if (search.trim()) {
      const lower = search.toLowerCase();
      result = result.filter(row => 
        row.glAccNum.toLowerCase().includes(lower) ||
        row.glAccDesc.toLowerCase().includes(lower) ||
        row.groupAccountNumber.toLowerCase().includes(lower) ||
        row.costCenter.toLowerCase().includes(lower) ||
        row.misHead.toLowerCase().includes(lower)
      );
    }

    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      } else {
        const numA = Number(aVal) || 0;
        const numB = Number(bVal) || 0;
        return sortOrder === 'asc' ? numA - numB : numB - numA;
      }
    });

    return result;
  }, [enrichedRows, search, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleExport = () => {
    const csvData = filteredAndSortedData.map(row => ({
      'G/L Account': row.glAccNum,
      'G/L Description': row.glAccDesc,
      'Budget ($)': row.cyBudget,
      'CY Actual ($)': row.cyActual,
      'VAR1 ($) (Budget - CY Actual)': row.var1,
      'Status 1 (vs Budget)': row.status1,
      'LY Actual ($)': row.pyActual,
      'VAR2 ($) (CY Actual - LY Actual)': row.var2,
      'Status 2 (vs Prior Year)': row.status2
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `GL_Ledger_Auditing_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const SortHeader = ({ field, label, align = 'left' }: { field: SortField; label: string; align?: 'left' | 'right' | 'center' }) => (
    <th 
      className={cn(
        "py-3.5 px-3 cursor-pointer transition-colors font-bold uppercase tracking-wider text-[11px] select-none whitespace-nowrap",
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        isDarkMode ? "hover:text-white text-white/70" : "hover:text-slate-900 text-slate-700"
      )}
      onClick={() => handleSort(field)}
    >
      <div className={cn("inline-flex items-center gap-1", align === 'right' && 'flex-row-reverse')}>
        <span>{label}</span>
        <ArrowUpDown size={12} className={cn(
          sortField === field 
            ? (isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]") 
            : (isDarkMode ? "text-white/20" : "text-slate-300")
        )} />
      </div>
    </th>
  );

  return (
    <div className={cn(
      "backdrop-blur-lg border rounded-xl p-5 overflow-hidden flex flex-col transition-all shadow-lg min-h-[520px] w-full",
      isDarkMode 
        ? "bg-white/5 border-white/10 text-white" 
        : "bg-white/90 border-slate-200 text-slate-900"
    )}>
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
        <div>
          <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
            <Table className="text-[#D4AF37]" size={18} />
            Module 4: Itemized G/L Ledger Drill-Down Table
          </h2>
          <p className={cn("text-xs font-medium mt-0.5", isDarkMode ? "text-white/50" : "text-slate-500")}>
            Granular ledger financial auditing panel with dual status indicators ({filteredAndSortedData.length} Records)
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Keyword Search Input */}
          <div className="relative flex-1 md:w-72">
            <Search size={15} className={cn("absolute left-3 top-1/2 -translate-y-1/2", isDarkMode ? "text-white/40" : "text-slate-400")} />
            <input 
              type="text" 
              placeholder="Search account #, description..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                "border rounded-lg py-2 pl-9 pr-3 text-xs w-full outline-none transition-all font-medium",
                isDarkMode 
                  ? "bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#D4AF37]" 
                  : "bg-slate-100 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-[#B48A1D]"
              )}
            />
          </div>

          {/* Export Button */}
          <button 
            onClick={handleExport}
            className={cn(
              "px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border shadow-sm",
              isDarkMode 
                ? "bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/30 hover:bg-[#D4AF37]/25" 
                : "bg-amber-500/10 text-[#B48A1D] border-amber-500/30 hover:bg-amber-500/20"
            )}
          >
            <FileSpreadsheet size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-x-auto rounded-lg border border-slate-200/60 dark:border-white/10">
        <table className="w-full text-left text-xs min-w-[1100px]">
          <thead className={cn(
            "sticky top-0 z-10 border-b backdrop-blur-md transition-colors",
            isDarkMode ? "bg-[#111827]/90 border-white/10 text-white" : "bg-slate-100/90 border-slate-200 text-slate-800"
          )}>
            <tr>
              <SortHeader field="glAccNum" label="1. G/L Account" />
              <SortHeader field="glAccDesc" label="2. G/L Description" />
              <SortHeader field="cyBudget" label="3. Budget ($)" align="right" />
              <SortHeader field="cyActual" label="4. CY Actual ($)" align="right" />
              <SortHeader field="var1" label="5. Var1 ($)" align="right" />
              <SortHeader field="status1" label="6. Status 1 (vs Bud)" align="center" />
              <SortHeader field="pyActual" label="7. LY Actual ($)" align="right" />
              <SortHeader field="var2" label="8. Var2 ($)" align="right" />
              <SortHeader field="status2" label="9. Status 2 (vs LY)" align="center" />
            </tr>
          </thead>
          <tbody className={cn("divide-y", isDarkMode ? "divide-white/5" : "divide-slate-200/70")}>
            {filteredAndSortedData.map((row) => {
              const var1Positive = row.var1 >= 0;
              const var2Positive = row.var2 >= 0;

              return (
                <tr 
                  key={row.id} 
                  className={cn(
                    "transition-colors",
                    isDarkMode ? "hover:bg-white/[0.04]" : "hover:bg-slate-50/80"
                  )}
                >
                  {/* 1. G/L Account Number */}
                  <td className={cn("py-3 px-3 font-mono font-semibold whitespace-nowrap", isDarkMode ? "text-white/90" : "text-slate-900")}>
                    {row.glAccNum}
                  </td>

                  {/* 2. G/L Description */}
                  <td className={cn("py-3 px-3 font-medium max-w-[280px] truncate", isDarkMode ? "text-white/80" : "text-slate-800")} title={row.glAccDesc}>
                    {row.glAccDesc}
                  </td>

                  {/* 3. Budget ($) */}
                  <td className={cn("py-3 px-3 text-right font-mono whitespace-nowrap", isDarkMode ? "text-white/60" : "text-slate-600")}>
                    {formatCurrency(row.cyBudget)}
                  </td>

                  {/* 4. Current Year Actual ($) */}
                  <td className={cn("py-3 px-3 text-right font-mono font-bold whitespace-nowrap", isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]")}>
                    {formatCurrency(row.cyActual)}
                  </td>

                  {/* 5. Var1 ($) (Budget - CY Actual) */}
                  <td className={cn(
                    "py-3 px-3 text-right font-mono font-semibold whitespace-nowrap",
                    var1Positive 
                      ? (isDarkMode ? "text-emerald-400" : "text-emerald-600") 
                      : (isDarkMode ? "text-rose-400" : "text-rose-600")
                  )}>
                    {var1Positive ? '+' : ''}{formatCurrency(row.var1)}
                  </td>

                   {/* 6. Status 1 Badge (vs Budget) */}
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    {(row.status1 === 'LOW SPEND' || row.status1 === 'GROWTH') ? (
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border shadow-sm",
                        isDarkMode 
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" 
                          : "bg-emerald-50 text-emerald-700 border-emerald-300"
                      )}>
                        {row.status1 === 'GROWTH' ? 'GROWTH 👍' : 'LOW SPEND 👍'}
                      </span>
                    ) : (
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border shadow-sm",
                        isDarkMode 
                          ? "bg-rose-500/15 text-rose-400 border-rose-500/30" 
                          : "bg-rose-50 text-rose-700 border-rose-300"
                      )}>
                        {row.status1 === 'DEGROWTH' ? 'DEGROWTH ⚠️' : 'HIGH SPEND ⚠️'}
                      </span>
                    )}
                  </td>

                  {/* 7. Last Year Actual ($) */}
                  <td className={cn("py-3 px-3 text-right font-mono whitespace-nowrap", isDarkMode ? "text-blue-400" : "text-blue-600")}>
                    {formatCurrency(row.pyActual)}
                  </td>

                  {/* 8. Var2 ($) (CY Actual - LY Actual) */}
                  <td className={cn(
                    "py-3 px-3 text-right font-mono font-semibold whitespace-nowrap",
                    var2Positive 
                      ? (isDarkMode ? "text-emerald-400" : "text-emerald-600") 
                      : (isDarkMode ? "text-rose-400" : "text-rose-600")
                  )}>
                    {var2Positive ? '+' : ''}{formatCurrency(row.var2)}
                  </td>

                  {/* 9. Status 2 Badge (vs LY) */}
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    {row.status2 === 'LOW SPEND' ? (
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border shadow-sm",
                        isDarkMode 
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" 
                          : "bg-emerald-50 text-emerald-700 border-emerald-300"
                      )}>
                        LOW SPEND 📉
                      </span>
                    ) : (
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border shadow-sm",
                        isDarkMode 
                          ? "bg-rose-500/15 text-rose-400 border-rose-500/30" 
                          : "bg-rose-50 text-rose-700 border-rose-300"
                      )}>
                        HIGH SPEND 📈
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}

            {filteredAndSortedData.length === 0 && (
              <tr>
                <td colSpan={9} className={cn("py-12 text-center text-xs font-medium", isDarkMode ? "text-white/40" : "text-slate-400")}>
                  No matching G/L ledger records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
