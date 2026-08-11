import React, { useMemo } from 'react';
import { ProcessedData } from '../types';
import { RefreshCw, FilterX, Sun, Moon } from 'lucide-react';
import { cn } from '../lib/utils';

interface HeaderProps {
  data: ProcessedData[];
  filters: {
    year: string;
    month: string;
    groupAccountNumber: string;
    misHead: string;
  };
  setFilters: React.Dispatch<React.SetStateAction<{
    year: string;
    month: string;
    groupAccountNumber: string;
    misHead: string;
  }>>;
  onRefresh: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

const MONTH_ORDER = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function Header({ data, filters, setFilters, onRefresh, isDarkMode, onToggleTheme }: HeaderProps) {
  const years = useMemo(() => {
    const unique = Array.from(new Set(data.map(d => d.year).filter(Boolean))).sort((a, b) => parseInt(b) - parseInt(a));
    return unique;
  }, [data]);

  const months = useMemo(() => {
    const unique = Array.from(new Set(data.map(d => d.month).filter(Boolean)));
    return unique.sort((a, b) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b));
  }, [data]);

  const groupAccounts = useMemo(() => {
    const unique = Array.from(new Set(data.map(d => d.groupAccountNumber).filter(Boolean))).sort();
    return unique;
  }, [data]);

  const misHeads = useMemo(() => {
    const unique = Array.from(new Set(data.map(d => d.misHead).filter(Boolean))).sort();
    return unique;
  }, [data]);

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    const latestYear = years[0] || '';
    const latestMonth = months[months.length - 1] || '';
    setFilters({
      year: latestYear,
      month: latestMonth,
      groupAccountNumber: '',
      misHead: ''
    });
  };

  const SelectDropdown = ({ label, value, options, onChange, allLabel }: { label: string, value: string, options: string[], onChange: (v: string) => void, allLabel?: string }) => (
    <div className="flex flex-col gap-0.5 min-w-[120px] sm:min-w-[140px]">
      <label className={cn("text-[10px] uppercase tracking-widest font-semibold", isDarkMode ? "text-white/50" : "text-slate-500")}>
        {label}
      </label>
      <select 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "rounded-lg px-3 py-1.5 text-xs outline-none transition-all appearance-none cursor-pointer pr-8 border font-medium",
          isDarkMode 
            ? "bg-white/5 border-white/10 text-white focus:border-[#D4AF37] focus:bg-white/10" 
            : "bg-slate-100 border-slate-300 text-slate-800 focus:border-[#B48A1D] focus:bg-white shadow-sm"
        )}
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(100,116,139,0.8)'}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, 
          backgroundRepeat: 'no-repeat', 
          backgroundPosition: 'right 0.6rem center' 
        }}
      >
        <option value="" className={isDarkMode ? "bg-[#111827] text-white" : "bg-white text-slate-900"}>
          {allLabel || `All ${label}s`}
        </option>
        {options.map(opt => (
          <option key={opt} value={opt} className={isDarkMode ? "bg-[#111827] text-white" : "bg-white text-slate-900"}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <header className={cn(
      "flex flex-col lg:flex-row items-start lg:items-center justify-between backdrop-blur-xl rounded-xl px-6 py-4 shadow-xl transition-colors gap-4 border",
      isDarkMode 
        ? "bg-white/5 border-white/10 text-white shadow-2xl" 
        : "bg-white/90 border-slate-200 text-slate-900 shadow-md"
    )}>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-[#D4AF37] rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.4)] flex-shrink-0">
          <span className="font-bold text-black text-xl">UB</span>
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight flex items-center flex-wrap">
            United Bakeries 
            <span className={cn("ml-2 font-normal text-sm", isDarkMode ? "text-[#D4AF37] opacity-90" : "text-[#B48A1D]")}>
              | Executive MIS Cockpit
            </span>
          </h1>
          <p className={cn("text-xs font-medium", isDarkMode ? "text-white/40" : "text-slate-500")}>
            Safdar Bhai Project • Legal Entity Alpha
          </p>
        </div>
      </div>
      
      {/* 4 Primary Dropdown Filters */}
      <div className="flex flex-wrap items-end gap-3 w-full lg:w-auto justify-start lg:justify-end">
        <SelectDropdown 
          label="Year" 
          value={filters.year} 
          options={years} 
          onChange={(v) => handleFilterChange('year', v)} 
          allLabel="All Years"
        />
        <SelectDropdown 
          label="Month" 
          value={filters.month} 
          options={months} 
          onChange={(v) => handleFilterChange('month', v)} 
          allLabel="Select Month"
        />
        <SelectDropdown 
          label="Group Account" 
          value={filters.groupAccountNumber} 
          options={groupAccounts} 
          onChange={(v) => handleFilterChange('groupAccountNumber', v)} 
          allLabel="All Group Accounts"
        />
        <SelectDropdown 
          label="MIS Head" 
          value={filters.misHead} 
          options={misHeads} 
          onChange={(v) => handleFilterChange('misHead', v)} 
          allLabel="All MIS Heads"
        />
        
        <div className="flex items-center gap-2 self-end">
          <button 
            onClick={onToggleTheme}
            className={cn(
              "p-2 rounded-lg border transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer",
              isDarkMode 
                ? "bg-white/10 hover:bg-white/20 border-white/20 text-amber-300" 
                : "bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-800 shadow-sm"
            )}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-indigo-600" />}
            <span className="hidden sm:inline">{isDarkMode ? "Light" : "Dark"}</span>
          </button>

          <button 
            onClick={handleReset}
            className={cn(
              "p-2 rounded-lg border transition-all cursor-pointer flex items-center gap-1 text-xs font-medium",
              isDarkMode 
                ? "bg-white/5 hover:bg-white/10 border-white/10 text-white/60 hover:text-white" 
                : "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-600 hover:text-slate-900 shadow-sm"
            )}
            title="Reset Filters"
          >
            <FilterX size={14} />
            <span className="hidden sm:inline">Reset</span>
          </button>
          
          <button 
            onClick={onRefresh}
            className="px-3.5 py-2 bg-[#D4AF37] text-black text-xs font-bold rounded-lg hover:brightness-110 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={13} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>
    </header>
  );
}


