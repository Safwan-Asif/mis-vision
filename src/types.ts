export interface RawData {
  'Company Code'?: string;
  'Company Code2'?: string;
  'MIS Head'?: string;
  'Functional Area3'?: string;
  'Cost Center / Cost Center4'?: string;
  'Cost Center4'?: string;
  'Cost Center'?: string;
  'G/L Account / G/L Account5'?: string;
  'G/L Account5'?: string;
  'G/L Account'?: string;
  'Group Account Number'?: string;
  'Attribute'?: string;
  'Actual Value'?: string;
  'Budget'?: string;
  [key: string]: any;
}

export interface ProcessedData {
  id: string;
  companyCode: string;
  companyName: string;
  misHead: string;
  functionalArea: string;
  costCenter: string;
  glAccount: string;
  glAccountNumber: string;
  glAccountDescription: string;
  groupAccountNumber: string;
  date: string;
  month: string; 
  monthIndex: number;
  year: string;
  actual: number;
  budget: number;
  varianceAmount: number;
  variancePercent: number;
  isRevenue: boolean;
  status: 'favorable' | 'unfavorable' | 'neutral';
  lastYearActual: number;
  glGroup: string;
  glGroupName: string;
}
