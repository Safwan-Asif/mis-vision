import { useMemo } from 'react';
import { ProcessedData } from '../types';
import { RefreshCw, FilterX, Sun, Moon } from 'lucide-react';
import { cn } from '../lib/utils';

interface HeaderProps {
  data: ProcessedData[];
  filters: {
    month: string;
    functionalArea: string;
    costCenter: string;
    misHead: string;
  };
  setFilters: (filters: any) => void;
  onRefresh: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export function Header({ data, filters, setFilters, onRefresh, isDarkMode, onToggleTheme }: HeaderProps) {
  const months = useMemo(() => {
    const unique = Array.from(new Set(data.map(d => d.month).filter(Boolean)));
    return unique;
  }, [data]);

  const functionalAreas = useMemo(() => Array.from(new Set(data.map(d => d.functionalArea).filter(Boolean))).sort(), [data]);
  const costCenters = useMemo(() => Array.from(new Set(data.map(d => d.costCenter).filter(Boolean))).sort(), [data]);
  const misHeads = useMemo(() => Array.from(new Set(data.map(d => d.misHead).filter(Boolean))).sort(), [data]);

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setFilters({
      month: '',
      functionalArea: '',
      costCenter: '',
      misHead: ''
    });
  };

  const SelectDropdown = ({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (v: string) => void }) => (
    <div className="flex flex-col gap-0.5">
      <label className={cn("text-[10px] uppercase tracking-widest font-semibold", isDarkMode ? "text-white/40" : "text-slate-500")}>
        {label}
      </label>
      <select 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "rounded px-2.5 py-1 text-xs outline-none transition-all appearance-none cursor-pointer pr-7 border font-medium",
          isDarkMode 
            ? "bg-white/5 border-white/10 text-white focus:border-[#D4AF37]" 
            : "bg-slate-100 border-slate-300 text-slate-800 focus:border-[#B48A1D]"
        )}
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(100,116,139,0.8)'}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, 
          backgroundRepeat: 'no-repeat', 
          backgroundPosition: 'right 0.5rem center' 
        }}
      >
        <option value="" className={isDarkMode ? "bg-[#111827] text-white" : "bg-white text-slate-900"}>All {label}s</option>
        {options.map(opt => (
          <option key={opt} value={opt} className={isDarkMode ? "bg-[#111827] text-white" : "bg-white text-slate-900"}>{opt}</option>
        ))}
      </select>
    </div>
  );

  return (
    <header className={cn(
      "flex flex-col md:flex-row items-start md:items-center justify-between backdrop-blur-xl rounded-xl px-6 py-4 shadow-xl transition-colors gap-4",
      isDarkMode 
        ? "bg-white/5 border border-white/10 text-white shadow-2xl" 
        : "bg-white/80 border border-slate-200/90 text-slate-900 shadow-md"
    )}>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-[#D4AF37] rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.4)] flex-shrink-0">
          <span className="font-bold text-black text-xl">UB</span>
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight flex items-center flex-wrap">
            United Bakeries 
            <span className={cn("ml-2 font-normal text-sm", isDarkMode ? "text-[#D4AF37] opacity-80" : "text-[#B48A1D]")}>
              | Executive MIS Cockpit
            </span>
          </h1>
          <p className={cn("text-xs", isDarkMode ? "text-white/40" : "text-slate-500")}>
            Company Code: 5202 • Legal Entity Alpha
          </p>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-start md:justify-end">
        <SelectDropdown label="Period" value={filters.month} options={months} onChange={(v) => handleFilterChange('month', v)} />
        <SelectDropdown label="Cost Center" value={filters.costCenter} options={costCenters} onChange={(v) => handleFilterChange('costCenter', v)} />
        <SelectDropdown label="MIS Head" value={filters.misHead} options={misHeads} onChange={(v) => handleFilterChange('misHead', v)} />
        
        <div className="flex items-center gap-2 mt-4">
          <button 
            onClick={onToggleTheme}
            className={cn(
              "p-1.5 rounded-md border transition-all flex items-center gap-1.5 px-2.5 text-xs font-semibold cursor-pointer",
              isDarkMode 
                ? "bg-white/10 hover:bg-white/20 border-white/20 text-amber-300" 
                : "bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-800 shadow-sm"
            )}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-indigo-600" />}
            <span>{isDarkMode ? "Light" : "Dark"}</span>
          </button>

          <button 
            onClick={handleReset}
            className={cn(
              "p-1.5 rounded-md border transition-all cursor-pointer",
              isDarkMode 
                ? "bg-white/5 hover:bg-white/10 border-white/10 text-white/50 hover:text-white" 
                : "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-500 hover:text-slate-900"
            )}
            title="Reset Filters"
          >
            <FilterX size={14} />
          </button>
          
          <button 
            onClick={onRefresh}
            className="px-4 py-1.5 bg-[#D4AF37] text-black text-xs font-bold rounded-md hover:brightness-110 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={12} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>
    </header>
  );
}

