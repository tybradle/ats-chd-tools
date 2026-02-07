import * as XLSX from 'xlsx';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { isTauri } from '@/lib/db/client';
import type { HeatReportRow, LoadingReportRow, BalanceReportRow } from './reports';

export interface ReportData {
  heat: HeatReportRow[];
  loading: LoadingReportRow[];
  balance: BalanceReportRow[];
}

type ReportTab = 'heat' | 'loading' | 'balance';

// ---------------------------------------------------------------------------
// HTML generation (shared by clipboard + PNG)
// ---------------------------------------------------------------------------

const TABLE_STYLE = `
  border-collapse: collapse;
  font-family: Calibri, Arial, sans-serif;
  font-size: 10pt;
  width: 100%;
`.trim();

const TH_STYLE = `
  border: 1px solid #999;
  background: #f0f0f0;
  padding: 4px 8px;
  font-weight: 600;
  text-align: left;
`.trim();

const TD_STYLE = `
  border: 1px solid #ccc;
  padding: 4px 8px;
`.trim();

const TD_RIGHT = `${TD_STYLE} text-align: right; font-family: Consolas, monospace;`;
const TD_CENTER = `${TD_STYLE} text-align: center;`;
const TOTALS_STYLE = `${TD_STYLE} font-weight: 700; background: #fafafa;`;
const TOTALS_RIGHT = `${TOTALS_STYLE} text-align: right; font-family: Consolas, monospace;`;

function fmt(n: number, decimals = 1): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function generateHeatHtml(data: HeatReportRow[]): string {
  const totalWatts = data.reduce((s, r) => s + r.totalWatts, 0);
  const totalTables = data.reduce((s, r) => s + r.tableCount, 0);

  const rows = data
    .map(
      (r) => `
    <tr>
      <td style="${TD_STYLE}">${r.locationName}</td>
      <td style="${TD_RIGHT}">${r.tableCount}</td>
      <td style="${TD_RIGHT}">${fmt(r.totalWatts)} W</td>
      <td style="${TD_CENTER}">${r.totalWatts > 1000 ? 'HIGH' : 'OK'}</td>
    </tr>`
    )
    .join('');

  const totalsRow =
    data.length > 1
      ? `<tr>
      <td style="${TOTALS_STYLE}">Total Project Heat</td>
      <td style="${TOTALS_RIGHT}">${totalTables}</td>
      <td style="${TOTALS_RIGHT}">${fmt(totalWatts)} W</td>
      <td style="${TOTALS_STYLE}"></td>
    </tr>`
      : '';

  return `
<table style="${TABLE_STYLE}">
  <thead>
    <tr>
      <th style="${TH_STYLE}">Enclosure Location</th>
      <th style="${TH_STYLE} text-align: right;">Tables</th>
      <th style="${TH_STYLE} text-align: right;">Total Heat (Watts)</th>
      <th style="${TH_STYLE} text-align: center;">Status</th>
    </tr>
  </thead>
  <tbody>${rows}${totalsRow}</tbody>
</table>`;
}

function generateLoadingHtml(data: LoadingReportRow[]): string {
  const totalWatts = data.reduce((s, r) => s + r.totalWatts, 0);
  const totalAmps = data.reduce((s, r) => s + r.totalAmperes, 0);

  const rows = data
    .map(
      (r) => `
    <tr>
      <td style="${TD_STYLE}">${r.locationName}</td>
      <td style="${TD_STYLE}">${r.voltageType}</td>
      <td style="${TD_RIGHT}">${fmt(r.totalWatts)} W</td>
      <td style="${TD_RIGHT}">${fmt(r.totalAmperes)} A</td>
      <td style="${TD_CENTER}">${r.isCalculated ? 'Calculated' : 'Pending'}</td>
    </tr>`
    )
    .join('');

  const totalsRow =
    data.length > 1
      ? `<tr>
      <td colspan="2" style="${TOTALS_STYLE}">Project Totals</td>
      <td style="${TOTALS_RIGHT}">${fmt(totalWatts)} W</td>
      <td style="${TOTALS_RIGHT}">${fmt(totalAmps)} A</td>
      <td style="${TOTALS_STYLE}"></td>
    </tr>`
      : '';

  return `
<table style="${TABLE_STYLE}">
  <thead>
    <tr>
      <th style="${TH_STYLE}">Enclosure</th>
      <th style="${TH_STYLE}">Voltage Type</th>
      <th style="${TH_STYLE} text-align: right;">Total Watts</th>
      <th style="${TH_STYLE} text-align: right;">Total Amps</th>
      <th style="${TH_STYLE} text-align: center;">Status</th>
    </tr>
  </thead>
  <tbody>${rows}${totalsRow}</tbody>
</table>`;
}

function generateBalanceHtml(data: BalanceReportRow[]): string {
  const rows = data
    .map(
      (r) => `
    <tr>
      <td style="${TD_STYLE}">${r.locationName}<br/><small>${r.voltageType}</small></td>
      <td style="${TD_RIGHT}">${r.L1.toLocaleString()} W</td>
      <td style="${TD_RIGHT}">${r.L2.toLocaleString()} W</td>
      <td style="${TD_RIGHT}">${r.L3.toLocaleString()} W</td>
      <td style="${TD_CENTER}">${r.balancePct !== null ? `${r.balancePct.toFixed(1)}%` : 'N/A'}</td>
    </tr>`
    )
    .join('');

  return `
<table style="${TABLE_STYLE}">
  <thead>
    <tr>
      <th style="${TH_STYLE}">Enclosure / Table</th>
      <th style="${TH_STYLE} text-align: right;">L1 (W)</th>
      <th style="${TH_STYLE} text-align: right;">L2 (W)</th>
      <th style="${TH_STYLE} text-align: right;">L3 (W)</th>
      <th style="${TH_STYLE} text-align: center;">Imbalance</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
}

function getReportHtml(tab: ReportTab, data: ReportData): string {
  switch (tab) {
    case 'heat':
      return generateHeatHtml(data.heat);
    case 'loading':
      return generateLoadingHtml(data.loading);
    case 'balance':
      return generateBalanceHtml(data.balance);
  }
}

// ---------------------------------------------------------------------------
// Clipboard copy (current tab as HTML → paste into Word)
// ---------------------------------------------------------------------------

export async function copyReportToClipboard(
  tab: ReportTab,
  data: ReportData
): Promise<void> {
  const html = getReportHtml(tab, data);
  const blob = new Blob([html], { type: 'text/html' });
  const textBlob = new Blob([html], { type: 'text/plain' });
  await navigator.clipboard.write([
    new ClipboardItem({
      'text/html': blob,
      'text/plain': textBlob,
    }),
  ]);
}

// ---------------------------------------------------------------------------
// XLSX export (all 3 reports as sheets)
// ---------------------------------------------------------------------------

export async function exportReportsToXlsx(
  data: ReportData,
  projectName: string
): Promise<void> {
  const wb = XLSX.utils.book_new();

  // Heat sheet
  const heatRows = data.heat.map((r) => ({
    'Enclosure Location': r.locationName,
    Tables: r.tableCount,
    'Total Heat (W)': r.totalWatts,
    Status: r.totalWatts > 1000 ? 'HIGH' : 'OK',
  }));
  if (data.heat.length > 1) {
    heatRows.push({
      'Enclosure Location': 'Total Project Heat',
      Tables: data.heat.reduce((s, r) => s + r.tableCount, 0),
      'Total Heat (W)': data.heat.reduce((s, r) => s + r.totalWatts, 0),
      Status: '',
    });
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(heatRows), 'Heat');

  // Loading sheet
  const loadingRows = data.loading.map((r) => ({
    Enclosure: r.locationName,
    'Voltage Type': r.voltageType,
    'Total Watts': r.totalWatts,
    'Total Amps': r.totalAmperes,
    Status: r.isCalculated ? 'Calculated' : 'Pending',
  }));
  if (data.loading.length > 1) {
    loadingRows.push({
      Enclosure: 'Project Totals',
      'Voltage Type': '',
      'Total Watts': data.loading.reduce((s, r) => s + r.totalWatts, 0),
      'Total Amps': data.loading.reduce((s, r) => s + r.totalAmperes, 0),
      Status: '',
    });
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(loadingRows), 'Loading');

  // Balance sheet
  const balanceRows = data.balance.map((r) => ({
    'Enclosure / Table': `${r.locationName} (${r.voltageType})`,
    'L1 (W)': r.L1,
    'L2 (W)': r.L2,
    'L3 (W)': r.L3,
    'Imbalance %': r.balancePct !== null ? r.balancePct : 'N/A',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(balanceRows), 'Balance');

  const xlsxData = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
  const filename = `${projectName}_Load_Calculations.xlsx`;

  await saveFileBytes(xlsxData, filename, 'Excel Files', 'xlsx');
}

// ---------------------------------------------------------------------------
// PDF export (all 3 reports)
// ---------------------------------------------------------------------------

export async function exportReportsToPdf(
  data: ReportData,
  projectName: string
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(16);
  doc.text(`${projectName} — Load Calculations`, 14, 18);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated ${new Date().toLocaleDateString()}`, 14, 24);
  doc.setTextColor(0);

  // Heat table
  doc.setFontSize(12);
  doc.text('Heat Dissipation Summary', 14, 34);
  autoTable(doc, {
    startY: 38,
    head: [['Enclosure Location', 'Tables', 'Total Heat (W)', 'Status']],
    body: [
      ...data.heat.map((r) => [
        r.locationName,
        r.tableCount.toString(),
        fmt(r.totalWatts),
        r.totalWatts > 1000 ? 'HIGH' : 'OK',
      ]),
      ...(data.heat.length > 1
        ? [
            [
              'Total Project Heat',
              data.heat.reduce((s, r) => s + r.tableCount, 0).toString(),
              fmt(data.heat.reduce((s, r) => s + r.totalWatts, 0)),
              '',
            ],
          ]
        : []),
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [60, 60, 60] },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'center' },
    },
  });

  // Loading table
  doc.addPage();
  doc.setFontSize(12);
  doc.text('Project Loading Report', 14, 18);
  autoTable(doc, {
    startY: 22,
    head: [['Enclosure', 'Voltage Type', 'Total Watts', 'Total Amps', 'Status']],
    body: [
      ...data.loading.map((r) => [
        r.locationName,
        r.voltageType,
        fmt(r.totalWatts),
        fmt(r.totalAmperes),
        r.isCalculated ? 'Calculated' : 'Pending',
      ]),
      ...(data.loading.length > 1
        ? [
            [
              'Project Totals',
              '',
              fmt(data.loading.reduce((s, r) => s + r.totalWatts, 0)),
              fmt(data.loading.reduce((s, r) => s + r.totalAmperes, 0)),
              '',
            ],
          ]
        : []),
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [60, 60, 60] },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'center' },
    },
  });

  // Balance table
  if (data.balance.length > 0) {
    doc.addPage();
    doc.setFontSize(12);
    doc.text('3-Phase Balance Report', 14, 18);
    autoTable(doc, {
      startY: 22,
      head: [['Enclosure / Table', 'L1 (W)', 'L2 (W)', 'L3 (W)', 'Imbalance %']],
      body: data.balance.map((r) => [
        `${r.locationName} (${r.voltageType})`,
        r.L1.toLocaleString(),
        r.L2.toLocaleString(),
        r.L3.toLocaleString(),
        r.balancePct !== null ? `${r.balancePct.toFixed(1)}%` : 'N/A',
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [60, 60, 60] },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'center' },
      },
    });
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 30, doc.internal.pageSize.getHeight() - 10);
    doc.text('ATS CHD Tools — Load Calculator', 14, doc.internal.pageSize.getHeight() - 10);
  }

  const pdfBytes = doc.output('arraybuffer');
  const filename = `${projectName}_Load_Calculations.pdf`;
  await saveFileBytes(new Uint8Array(pdfBytes), filename, 'PDF Files', 'pdf');
}

// ---------------------------------------------------------------------------
// PNG export (captures a DOM element)
// ---------------------------------------------------------------------------

export async function exportReportToPng(
  element: HTMLElement,
  projectName: string,
  tabName: string
): Promise<void> {
  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
  });

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas to blob failed'))),
      'image/png'
    );
  });

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const filename = `${projectName}_${tabName}_Report.png`;
  await saveFileBytes(bytes, filename, 'PNG Images', 'png');
}

// ---------------------------------------------------------------------------
// Shared file save helper (Tauri dialog + browser fallback)
// ---------------------------------------------------------------------------

async function saveFileBytes(
  bytes: Uint8Array,
  defaultFilename: string,
  filterName: string,
  ext: string
): Promise<void> {
  if (isTauri) {
    const path = await save({
      defaultPath: defaultFilename,
      filters: [{ name: filterName, extensions: [ext] }],
    });
    if (path) {
      await writeFile(path, bytes);
    }
  } else {
    const mimeMap: Record<string, string> = {
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pdf: 'application/pdf',
      png: 'image/png',
    };
    const blob = new Blob([bytes], { type: mimeMap[ext] || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFilename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
