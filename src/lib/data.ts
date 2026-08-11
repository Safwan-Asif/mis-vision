import Papa from 'papaparse';
import { RawData, ProcessedData } from '../types';

const CSV_URL = 'https://docs.google.com/spreadsheets/d/1V7G2St8h5eq04GhqWKPvdRg4f3z7CIS45iBGXF962vU/export?format=csv';

export async function fetchAndProcessData(): Promise<ProcessedData[]> {
  try {
    const response = await fetch(CSV_URL);
    const csvText = await response.text();
    
    return new Promise((resolve, reject) => {
      Papa.parse<RawData>(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const processed = processRawData(results.data);
          resolve(processed);
        },
        error: (error: any) => {
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    return [];
  }
}

function processRawData(rawData: RawData[]): ProcessedData[] {
  return rawData.map((row, index) => {
    const misHead = (row['MIS Head'] || '').trim();
    
    // Normalize Revenue vs Expenses signs
    const isRevenue = misHead === 'SALES/REVENUE' || misHead === 'OTHER INCOME';
    
    // Parse raw values, removing commas if present
    const rawActualStr = (row['Actual Value'] || '0').replace(/,/g, '');
    const rawBudgetStr = (row['Budget'] || '0').replace(/,/g, '');
    
    let rawActual = parseFloat(rawActualStr) || 0;
    let rawBudget = parseFloat(rawBudgetStr) || 0;
    
    // Apply sign normalization
    if (isRevenue) {
      rawActual = rawActual * -1;
      rawBudget = rawBudget * -1;
    }
    
    const varianceAmount = rawActual - rawBudget;
    const variancePercent = rawBudget !== 0 ? (varianceAmount / Math.abs(rawBudget)) * 100 : 0;
    
    let status: 'favorable' | 'unfavorable' | 'neutral' = 'neutral';
    if (isRevenue) {
      status = rawActual >= rawBudget ? 'favorable' : 'unfavorable';
    } else {
      status = rawActual <= rawBudget ? 'favorable' : 'unfavorable';
    }
    
    // Extract date parts
    const dateStr = (row['Attribute'] || '').trim();
    let month = '';
    let year = '';
    let monthIndex = 0;

    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (dateStr) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        monthIndex = d.getMonth();
        month = MONTH_NAMES[monthIndex];
        year = d.getFullYear().toString();
      } else {
        // Fallback custom string parsing
        for (let i = 0; i < MONTH_NAMES.length; i++) {
          if (new RegExp(MONTH_NAMES[i], 'i').test(dateStr)) {
            monthIndex = i;
            month = MONTH_NAMES[i];
            const ym = dateStr.match(/\b(20\d\d|\d\d)\b/);
            if (ym) {
              year = ym[1].length === 2 ? `20${ym[1]}` : ym[1];
            }
            break;
          }
        }
        if (!month) {
          const parts = dateStr.split(/[./-]/);
          if (parts.length >= 2) {
            let m = 0;
            let y = '';
            if (parts[0].length === 4) {
              y = parts[0];
              m = parseInt(parts[1], 10);
            } else if (parts[1].length === 4) {
              y = parts[1];
              m = parseInt(parts[0], 10);
            }
            if (m >= 1 && m <= 12) {
              monthIndex = m - 1;
              month = MONTH_NAMES[monthIndex];
              year = y || '2024';
            }
          }
        }
      }
    }
    
    const rawGLFull = row['G/L Account / G/L Account5'] || row['G/L Account5'] || row['G/L Account'] || '';
    let rawGLNumber = (row['G/L Account'] || '').trim();
    let rawGLDesc = (row['G/L Account5'] || '').trim();

    if (!rawGLNumber || !rawGLDesc) {
      if (rawGLFull.includes(' - ')) {
        const parts = rawGLFull.split(' - ');
        rawGLNumber = rawGLNumber || parts[0].trim();
        rawGLDesc = rawGLDesc || parts.slice(1).join(' - ').trim();
      } else {
        const match = rawGLFull.match(/^(\d+[\w-]*)\s*(.*)$/);
        if (match) {
          rawGLNumber = rawGLNumber || match[1];
          rawGLDesc = rawGLDesc || match[2] || match[1];
        } else {
          rawGLNumber = rawGLNumber || rawGLFull;
          rawGLDesc = rawGLDesc || rawGLFull;
        }
      }
    }

    return {
      id: `row-${index}`,
      companyCode: row['Company Code'] || '',
      companyName: row['Company Code2'] || '',
      misHead: misHead,
      functionalArea: row['Functional Area3'] || '',
      costCenter: row['Cost Center / Cost Center4'] || row['Cost Center4'] || row['Cost Center'] || '',
      glAccount: rawGLFull,
      glAccountNumber: rawGLNumber || rawGLFull,
      glAccountDescription: rawGLDesc || rawGLFull,
      groupAccountNumber: row['Group Account Number'] || '',
      date: dateStr,
      month: month,
      monthIndex: monthIndex,
      year: year,
      actual: rawActual,
      budget: rawBudget,
      varianceAmount: varianceAmount,
      variancePercent: variancePercent,
      isRevenue,
      status
    };
  });
}
