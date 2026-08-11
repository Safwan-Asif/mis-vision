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
    const dateStr = row['Attribute'] || '';
    let month = '';
    let year = '';
    if (dateStr) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        month = d.toLocaleString('default', { month: 'short' });
        year = d.getFullYear().toString();
      }
    }
    
    return {
      id: `row-${index}`,
      companyCode: row['Company Code'] || '',
      companyName: row['Company Code2'] || '',
      misHead: misHead,
      functionalArea: row['Functional Area3'] || '',
      costCenter: row['Cost Center / Cost Center4'] || row['Cost Center4'] || row['Cost Center'] || '',
      glAccount: row['G/L Account / G/L Account5'] || row['G/L Account5'] || row['G/L Account'] || '',
      groupAccountNumber: row['Group Account Number'] || '',
      date: dateStr,
      month: month,
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
