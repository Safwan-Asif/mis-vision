import { useState, useMemo } from 'react';
import { ProcessedData } from '../types';
import { GlassCard } from './GlassCard';
import { formatCurrency, formatPercent, cn } from '../lib/utils';
import { Search, Download, ArrowUpDown } from 'lucide-react';
import Papa from 'papaparse';

interface LedgerTableProps {
  data: ProcessedData[];
}

type SortField = 'glAccount' | 'groupAccountNumber' | 'costCenter' | 'actual' | 'budget' | 'varianceAmount' | 'variancePercent';
type SortOrder = 'asc' | 'desc';

export function LedgerTable({ data }: LedgerTableProps) {
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
      setSortOrder('desc'); // Default to desc for new numerical fields usually
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
      className={cn("py-3 px-4 cursor-pointer hover:text-white/60 transition-colors", align === 'right' && 'text-right', align === 'center' && 'text-center')}
      onClick={() => handleSort(field)}
    >
      <div className={cn("flex items-center gap-1.5 inline-flex", align === 'right' && 'flex-row-reverse')}>
        {label}
        <ArrowUpDown size={14} className={cn("text-white/30", sortField === field && "text-[#D4AF37]")} />
      </div>
    </th>
  );

  return (
    <footer className="min-h-[500px] bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4 sm:p-6 overflow-hidden flex flex-col">
      <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 w-full sm:w-auto">
          <h2 className="text-sm font-semibold text-white/80 uppercase tracking-widest whitespace-nowrap">G/L Account Drill-Down</h2>
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input 
              type="text" 
              placeholder="Search Ledger..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-md py-2 pl-9 pr-3 text-sm w-full outline-none focus:border-[#D4AF37] text-white placeholder:text-white/30 transition-all"
            />
          </div>
        </div>
        <button 
          onClick={handleExport}
          className="text-xs text-white/40 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-1.5"
        >
          <Download size={14} />
          <span>Export CSV</span>
        </button>
      </div>
      
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[1000px]">
          <thead className="sticky top-0 bg-[#161B28] text-white/40 uppercase text-xs border-b border-white/10 z-10 shadow-sm">
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
          <tbody className="divide-y divide-white/5">
            {filteredAndSortedData.map((row) => {
              const isFavorable = row.status === 'favorable';
              return (
                <tr key={row.id} className="hover:bg-white/[0.04] transition-colors">
                  <td className="py-3 px-4 font-mono text-white/80 truncate max-w-[200px]" title={row.glAccount}>{row.glAccount || '-'}</td>
                  <td className="py-3 px-4 text-white/60">{row.groupAccountNumber || '-'}</td>
                  <td className="py-3 px-4 text-white/70 truncate max-w-[200px]" title={row.costCenter}>{row.costCenter || '-'}</td>
                  <td className="py-3 px-4 text-right text-[#D4AF37] whitespace-nowrap">{formatCurrency(row.actual)}</td>
                  <td className="py-3 px-4 text-right text-white/50 whitespace-nowrap">{formatCurrency(row.budget)}</td>
                  <td className={cn(
                    "py-3 px-4 text-right whitespace-nowrap",
                    row.varianceAmount === 0 ? "text-white/50" : isFavorable ? "text-[#10B981]" : "text-[#EF4444]"
                  )}>
                    {formatCurrency(row.varianceAmount)}
                  </td>
                  <td className={cn(
                    "py-3 px-4 text-right whitespace-nowrap font-medium",
                    row.varianceAmount === 0 ? "text-white/50" : isFavorable ? "text-[#10B981]" : "text-[#EF4444]"
                  )}>
                    {row.variancePercent > 0 ? '+' : ''}{formatPercent(row.variancePercent)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={cn("inline-block w-2.5 h-2.5 rounded-full", isFavorable ? "bg-[#10B981]" : "bg-[#EF4444]")}></span>
                  </td>
                </tr>
              );
            })}
            {filteredAndSortedData.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-white/50">
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
