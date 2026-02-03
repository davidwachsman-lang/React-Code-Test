/**
 * One-off script: reads File Check.xlsx from Desktop and writes
 * src/data/pmDashboardData.js for the PM Dashboard mockup.
 * Run: node scripts/extract-pm-dashboard-xlsx.js
 */
import * as XLSX from 'xlsx';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const xlsxPath = '/Users/dw/Desktop/File Check.xlsx';
const outPath = join(projectRoot, 'src', 'data', 'pmDashboardData.js');

const buf = readFileSync(xlsxPath);
const workbook = XLSX.read(buf, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

const headers = raw[0] || [];
const rows = raw.slice(1).filter((row) => row.some((cell) => cell !== '' && cell != null));

const jsContent = `// PM Dashboard mockup data extracted from File Check.xlsx
export const pmDashboardHeaders = ${JSON.stringify(headers, null, 2)};
export const pmDashboardRows = ${JSON.stringify(rows, null, 2)};
`;

writeFileSync(outPath, jsContent, 'utf8');
console.log('Wrote', outPath, '| headers:', headers.length, '| rows:', rows.length);
