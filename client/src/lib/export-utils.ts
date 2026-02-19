import * as XLSX from 'xlsx';
import { formatCurrency } from "@/lib/currency";
import type { Currency } from "@shared/schema";

interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[],
  filename: string
) {
  const worksheetData = data.map(row => {
    const rowData: Record<string, any> = {};
    columns.forEach(col => {
      rowData[col.header] = row[col.key] ?? '';
    });
    return rowData;
  });

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  
  const colWidths = columns.map(col => ({ wch: col.width || 15 }));
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportSalesReport(
  sales: Array<{
    id: string;
    customerName: string;
    amount: string;
    date: Date | string;
    currency?: string;
    country?: string | null;
  }>,
  targets: Array<{
    month: number;
    year: number;
    targetAmount: string;
    targetType: string;
    currency?: string;
  }>,
  filename: string = 'sales-report'
) {
  const workbook = XLSX.utils.book_new();

  const salesData = sales.map(sale => ({
    'Customer': sale.customerName,
    'Amount': `$${parseFloat(sale.amount).toLocaleString()}`,
    'Currency': sale.currency || 'USD',
    'Country': sale.country || '',
    'Date': new Date(sale.date).toLocaleDateString(),
  }));
  
  const salesSheet = XLSX.utils.json_to_sheet(salesData);
  salesSheet['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, salesSheet, 'Sales');

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const targetsData = targets.map(target => ({
    'Month': monthNames[target.month - 1],
    'Year': target.year,
    'Target Amount': formatCurrency(target.targetAmount, (target.currency as Currency) || "USD"),
    'Type': target.targetType,
  }));
  
  const targetsSheet = XLSX.utils.json_to_sheet(targetsData);
  targetsSheet['!cols'] = [{ wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(workbook, targetsSheet, 'Targets');

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportAnalyticsReport(
  stats: {
    totalCustomers: number;
    leadCount: number;
    prospectCount: number;
    customerCount: number;
    totalSales?: number;
    conversionRate?: number;
  },
  customers: Array<{
    id: string;
    name: string;
    email?: string | null;
    country?: string | null;
    stage: string;
    retailerType?: string | null;
    lastContactDate?: Date | null;
  }>,
  filename: string = 'analytics-report'
) {
  const workbook = XLSX.utils.book_new();

  const summaryData = [
    { 'Metric': 'Total Customers', 'Value': stats.totalCustomers },
    { 'Metric': 'Leads', 'Value': stats.leadCount },
    { 'Metric': 'Prospects', 'Value': stats.prospectCount },
    { 'Metric': 'Customers', 'Value': stats.customerCount },
    { 'Metric': 'Total Sales', 'Value': stats.totalSales !== undefined ? `$${stats.totalSales.toLocaleString()}` : 'N/A' },
    { 'Metric': 'Conversion Rate', 'Value': stats.conversionRate !== undefined ? `${stats.conversionRate.toFixed(1)}%` : 'N/A' },
  ];
  
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  const customersData = customers.map(c => ({
    'Company': c.name,
    'Email': c.email,
    'Country': c.country || 'Not set',
    'Stage': c.stage,
    'Retailer Type': c.retailerType || 'Not set',
    'Last Contact': c.lastContactDate 
      ? new Date(c.lastContactDate).toLocaleDateString() 
      : 'Never',
  }));
  
  const customersSheet = XLSX.utils.json_to_sheet(customersData);
  customersSheet['!cols'] = [
    { wch: 30 }, { wch: 30 }, { wch: 20 }, 
    { wch: 12 }, { wch: 20 }, { wch: 15 }
  ];
  XLSX.utils.book_append_sheet(workbook, customersSheet, 'Customers');

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportCustomerList(
  customers: Array<{
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    country?: string | null;
    stage: string;
    retailerType?: string | null;
    quarterlySoftTarget?: string | null;
    lastContactDate?: Date | null;
    brands?: Array<{ name: string }>;
  }>,
  filename: string = 'customer-list'
) {
  const customersData = customers.map(c => ({
    'Company Name': c.name,
    'Email': c.email,
    'Phone': c.phone || '',
    'Country': c.country || 'Not set',
    'Stage': c.stage,
    'Retailer Type': c.retailerType || 'Not set',
    'Quarterly Target': c.quarterlySoftTarget 
      ? `$${parseFloat(c.quarterlySoftTarget).toLocaleString()}` 
      : '',
    'Last Contact': c.lastContactDate 
      ? new Date(c.lastContactDate).toLocaleDateString() 
      : 'Never',
    'Brands': c.brands?.map(b => b.name).join(', ') || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(customersData);
  worksheet['!cols'] = [
    { wch: 30 }, { wch: 30 }, { wch: 15 }, { wch: 20 },
    { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 30 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
