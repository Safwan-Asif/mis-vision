/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useMemo } from 'react';
import { fetchAndProcessData } from './lib/data';
import { ProcessedData } from './types';
import { Header } from './components/Header';
import { KPICards } from './components/KPICards';
import { PerformanceChart } from './components/PerformanceChart';
import { MISHeadTable } from './components/MISHeadTable';
import { LedgerTable } from './components/LedgerTable';
import { cn } from './lib/utils';

export default function App() {
  const [data, setData] = useState<ProcessedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('mis_theme');
    return saved ? saved === 'dark' : true;
  });

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('mis_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const [filters, setFilters] = useState({
    month: '',
    functionalArea: '',
    costCenter: '',
    misHead: ''
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const processed = await fetchAndProcessData();
      setData(processed);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredData = useMemo(() => {
    return data.filter(row => {
      if (filters.month && row.month !== filters.month) return false;
      if (filters.functionalArea && row.functionalArea !== filters.functionalArea) return false;
      if (filters.costCenter && row.costCenter !== filters.costCenter) return false;
      if (filters.misHead && row.misHead !== filters.misHead) return false;
      return true;
    });
  }, [data, filters]);

  if (loading && data.length === 0) {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center transition-colors",
        isDarkMode ? "bg-[#0B0F19] text-white" : "bg-[#F8FAFC] text-slate-800"
      )}>
        <div className="flex flex-col items-center gap-4">
          <div className={cn(
            "w-12 h-12 border-4 rounded-full animate-spin",
            isDarkMode ? "border-white/10 border-t-[#D4AF37]" : "border-slate-300 border-t-[#B48A1D]"
          )}></div>
          <p className={cn("font-medium tracking-wide animate-pulse", isDarkMode ? "text-white/50" : "text-slate-500")}>
            Loading Dashboard Data...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center transition-colors",
        isDarkMode ? "bg-[#0B0F19] text-white" : "bg-[#F8FAFC] text-slate-800"
      )}>
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-6 py-4 rounded-xl max-w-md text-center shadow-lg">
          <h3 className="font-bold mb-2">Error Loading Data</h3>
          <p className="text-sm opacity-80">{error}</p>
          <button 
            onClick={loadData}
            className={cn(
              "mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
              isDarkMode ? "bg-white/5 hover:bg-white/10" : "bg-slate-200 hover:bg-slate-300 text-slate-800"
            )}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen font-sans overflow-y-auto flex flex-col p-4 sm:p-6 lg:p-8 gap-6 transition-colors duration-300",
      isDarkMode 
        ? "bg-[#0B0F19] bg-[radial-gradient(at_top_left,_#111827,_#0B0F19)] text-white selection:bg-[#D4AF37]/30" 
        : "bg-[#F8FAFC] bg-[radial-gradient(at_top_left,_#FFFFFF,_#E2E8F0)] text-slate-900 selection:bg-[#B48A1D]/20"
    )}>
      <div className="max-w-[1600px] w-full mx-auto flex flex-col gap-6">
        <Header 
          data={data} 
          filters={filters} 
          setFilters={setFilters} 
          onRefresh={loadData} 
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
        />
        
        <KPICards allData={data} filters={filters} isDarkMode={isDarkMode} />
        
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-[1.5] flex flex-col">
            <PerformanceChart data={filteredData} isDarkMode={isDarkMode} />
          </div>
          <div className="flex-1 flex flex-col">
            <MISHeadTable data={filteredData} isDarkMode={isDarkMode} />
          </div>
        </div>
        
        <LedgerTable data={filteredData} isDarkMode={isDarkMode} />
      </div>
    </div>
  );
}

