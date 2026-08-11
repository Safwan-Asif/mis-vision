import { useMemo } from 'react';
import { ProcessedData } from '../types';
import { GlassCard } from './GlassCard';
import { RefreshCw, FilterX } from 'lucide-react';

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
}

export function Header({ data, filters, setFilters, onRefresh }: HeaderProps) {
  const months = useMemo(() => {
    const unique = Array.from(new Set(data.map(d => d.month).filter(Boolean)));
    // Simple sort based on typical month names if possible, but keeping it as string sort or order of appearance
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
      <label className="text-[10px] uppercase tracking-widest text-white/40">{label}</label>
      <select 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs outline-none focus:border-[#D4AF37] transition-all appearance-none cursor-pointer pr-6"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center' }}
      >
        <option value="" className="bg-[#111827] text-white">All {label}s</option>
        {options.map(opt => (
          <option key={opt} value={opt} className="bg-[#111827] text-white">{opt}</option>
        ))}
      </select>
    </div>
  );

  return (
    <header className="flex items-center justify-between bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl px-6 py-3 shadow-2xl">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-[#D4AF37] rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.4)]">
          <span className="font-bold text-black text-xl">UB</span>
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">United Bakeries <span className="text-[#D4AF37] ml-2 opacity-80 text-sm font-normal">| Executive MIS Cockpit</span></h1>
          <p className="text-xs text-white/40">Company Code: 5202 • Legal Entity Alpha</p>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-3">
        <SelectDropdown label="Period" value={filters.month} options={months} onChange={(v) => handleFilterChange('month', v)} />
        <SelectDropdown label="Cost Center" value={filters.costCenter} options={costCenters} onChange={(v) => handleFilterChange('costCenter', v)} />
        <SelectDropdown label="MIS Head" value={filters.misHead} options={misHeads} onChange={(v) => handleFilterChange('misHead', v)} />
        
        <button 
          onClick={handleReset}
          className="mt-4 p-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white transition-all"
          title="Reset Filters"
        >
          <FilterX size={14} />
        </button>
        <button 
          onClick={onRefresh}
          className="mt-4 px-4 py-1.5 bg-[#D4AF37] text-black text-xs font-bold rounded-md hover:brightness-110 transition-all"
        >
          Refresh Data
        </button>
      </div>
    </header>
  );
}
