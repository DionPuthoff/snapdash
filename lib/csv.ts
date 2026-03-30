import Papa from 'papaparse';

export function parseCsvFile(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data as Record<string, string>[]),
      error: (error) => reject(error),
    });
  });
}

export function inferType(value: unknown): 'number' | 'date' | 'string' {
  if (value == null || value === '') return 'string';

  const str = String(value).trim();

  if (!Number.isNaN(Number(str)) && str !== '') return 'number';
  if (!Number.isNaN(Date.parse(str))) return 'date';

  return 'string';
}

export function buildTypeHints(rows: Record<string, string>[]) {
  const firstRow = rows[0] ?? {};
  const hints: Record<string, string> = {};

  Object.keys(firstRow).forEach((key) => {
    hints[key] = inferType(firstRow[key]);
  });

  return hints;
}