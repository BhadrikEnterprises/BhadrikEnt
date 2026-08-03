import Papa from 'papaparse';

export function parseCsv<T = Record<string, string>>(text: string): T[] {
  const res = Papa.parse<T>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
  });
  return (res.data as T[]).filter((row) =>
    row && Object.values(row as Record<string, unknown>).some((v) => v !== '' && v != null)
  );
}

export function exportCsv(filename: string, rows: Record<string, unknown>[]): void {
  const csv = Papa.unparse(rows);
  downloadFile(filename, csv, 'text/csv;charset=utf-8;');
}

export function downloadFile(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function pick(row: Record<string, string>, keys: string[]): string | undefined {
  for (const k of keys) {
    if (row[k] != null && String(row[k]).trim() !== '') return String(row[k]).trim();
  }
  return undefined;
}
