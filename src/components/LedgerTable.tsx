import { useState, useMemo } from 'react';
import { ProcessedData } from '../types';
import { formatCurrency, formatPercent, cn } from '../lib/utils';
import { Search, Download, ArrowUpDown } from 'lucide-react';
import Papa from 'papaparse';

interface LedgerTableProps {
  data: ProcessedData[];
  isDarkMode: boolean;
}

type SortField = 'glAccount' | 'groupAccountNumber' | 'costCenter' | 'actual' | 'budget' | 'varianceAmount' | 'variancePercent';
type SortOrder = 'asc' | 'desc';

export function LedgerTable({ data, isDarkMode }: LedgerTableProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('actual');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const filteredAndSortedData = useMemo(() => {
    let result = [...data];
    
    if (search) {
      const lowerSearch = search.toLowerCase();
      result = result.filter(row => 
        row.glAccount.toLowerCase().includes(lowerSearch) ||
        row.groupAccountNumber.toLowerCase().includes(lowerSearch) ||
        row.costCenter.toLowerCase().includes(lowerSearch) ||
        row.misHead.toLowerCase().includes(lowerSearch)
      );
    }
    
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      } else {
        aVal = aVal as number;
        bVal = bVal as number;
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
    });
    
    return result;
  }, [data, search, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleExport = () => {
    const csv = Papa.unparse(filteredAndSortedData.map(row => ({
      'G/L Account': row.glAccount,
      'Group Account Number': row.groupAccountNumber,
      'Cost Center': row.costCenter,
      'MIS Head': row.misHead,
      'Actual ($)': row.actual,
      'Budget ($)': row.budget,
      'Variance ($)': row.varianceAmount,
      'Variance (%)': row.variancePercent,
      'Status': row.status
    })));
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'ledger_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const SortHeader = ({ field, label, align = 'left' }: { field: SortField, label: string, align?: 'left' | 'right' | 'center' }) => (
    <th 
      className={cn(
        "py-3 px-4 cursor-pointer transition-colors font-semibold", 
        align === 'right' && 'text-right', 
        align === 'center' && 'text-center',
        isDarkMode ? "hover:text-white/80" : "hover:text-slate-900"
      )}
      onClick={() => handleSort(field)}
    >
      <div className={cn("flex items-center gap-1.5 inline-flex", align === 'right' && 'flex-row-reverse')}>
        {label}
        <ArrowUpDown size={14} className={cn(
          sortField === field ? (isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]") : (isDarkMode ? "text-white/30" : "text-slate-400")
        )} />
      </div>
    </th>
  );

  return (
    <footer className={cn(
      "min-h-[500px] backdrop-blur-lg border rounded-xl p-4 sm:p-6 overflow-hidden flex flex-col transition-colors",
      isDarkMode 
        ? "bg-white/5 border-white/10 text-white" 
        : "bg-white/90 border-slate-200/90 text-slate-900 shadow-md"
    )}>
      <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 w-full sm:w-auto">
          <h2 className={cn("text-sm font-semibold uppercase tracking-widest whitespace-nowrap", isDarkMode ? "text-white/80" : "text-slate-800")}>
            G/L Account Drill-Down
          </h2>
          <div className="relative w-full sm:w-72">
            <Search size={16} className={cn("absolute left-3 top-1/2 -translate-y-1/2", isDarkMode ? "text-white/40" : "text-slate-400")} />
            <input 
              type="text" 
              placeholder="Search Ledger..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                "border rounded-md py-2 pl-9 pr-3 text-sm w-full outline-none transition-all font-medium",
                isDarkMode 
                  ? "bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#D4AF37]" 
                  : "bg-slate-100 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-[#B48A1D]"
              )}
            />
          </div>
        </div>
        <button 
          onClick={handleExport}
          className={cn(
            "text-xs uppercase tracking-widest transition-colors flex items-center gap-1.5 cursor-pointer font-semibold",
            isDarkMode ? "text-white/40 hover:text-white" : "text-slate-500 hover:text-slate-900"
          )}
        >
          <Download size={14} />
          <span>Export CSV</span>
        </button>
      </div>
      
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[1000px]">
          <thead className={cn(
            "sticky top-0 uppercase text-xs border-b z-10 shadow-sm transition-colors",
            isDarkMode 
              ? "bg-[#161B28] text-white/40 border-white/10" 
              : "bg-slate-100 text-slate-600 border-slate-200"
          )}>
            <tr>
              <SortHeader field="glAccount" label="Account #" />
              <SortHeader field="groupAccountNumber" label="Group Acct" />
              <SortHeader field="costCenter" label="Cost Center" />
              <SortHeader field="actual" label="Actual" align="right" />
              <SortHeader field="budget" label="Budget" align="right" />
              <SortHeader field="varianceAmount" label="Variance" align="right" />
              <SortHeader field="variancePercent" label="Var %" align="right" />
              <th className="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className={cn("divide-y", isDarkMode ? "divide-white/5" : "divide-slate-200/80")}>
            {filteredAndSortedData.map((row) => {
              const isFavorable = row.status === 'favorable';
              return (
                <tr key={row.id} className={cn(
                  "transition-colors",
                  isDarkMode ? "hover:bg-white/[0.04]" : "hover:bg-slate-50"
                )}>
                  <td className={cn("py-3 px-4 font-mono truncate max-w-[200px]", isDarkMode ? "text-white/80" : "text-slate-900 font-semibold")} title={row.glAccount}>
                    {row.glAccount || '-'}
                  </td>
                  <td className={isDarkMode ? "py-3 px-4 text-white/60" : "py-3 px-4 text-slate-600"}>{row.groupAccountNumber || '-'}</td>
                  <td className={cn("py-3 px-4 truncate max-w-[200px]", isDarkMode ? "text-white/70" : "text-slate-700")} title={row.costCenter}>
                    {row.costCenter || '-'}
                  </td>
                  <td className={cn("py-3 px-4 text-right whitespace-nowrap font-medium", isDarkMode ? "text-[#D4AF37]" : "text-[#B48A1D]")}>
                    {formatCurrency(row.actual)}
                  </td>
                  <td className={cn("py-3 px-4 text-right whitespace-nowrap", isDarkMode ? "text-white/50" : "text-slate-500")}>
                    {formatCurrency(row.budget)}
                  </td>
                  <td className={cn(
                    "py-3 px-4 text-right whitespace-nowrap font-medium",
                    row.varianceAmount === 0 
                      ? (isDarkMode ? "text-white/50" : "text-slate-400") 
                      : isFavorable 
                        ? (isDarkMode ? "text-[#10B981]" : "text-emerald-600") 
                        : (isDarkMode ? "text-[#EF4444]" : "text-rose-600")
                  )}>
                    {formatCurrency(row.varianceAmount)}
                  </td>
                  <td className={cn(
                    "py-3 px-4 text-right whitespace-nowrap font-medium",
                    row.varianceAmount === 0 
                      ? (isDarkMode ? "text-white/50" : "text-slate-400") 
                      : isFavorable 
                        ? (isDarkMode ? "text-[#10B981]" : "text-emerald-600") 
                        : (isDarkMode ? "text-[#EF4444]" : "text-rose-600")
                  )}>
                    {row.variancePercent > 0 ? '+' : ''}{formatPercent(row.variancePercent)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={cn(
                      "inline-block w-2.5 h-2.5 rounded-full", 
                      isFavorable 
                        ? (isDarkMode ? "bg-[#10B981]" : "bg-emerald-500") 
                        : (isDarkMode ? "bg-[#EF4444]" : "bg-rose-500")
                    )}></span>
                  </td>
                </tr>
              );
            })}
            {filteredAndSortedData.length === 0 && (
              <tr>
                <td colSpan={8} className={cn("py-8 text-center", isDarkMode ? "text-white/50" : "text-slate-400")}>
                  No matching records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </footer>
  );
}

