'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import UploadZone from './upload-zone';
import KpiGrid from './kpi-grid';
import ChartRenderer from './chart-renderer';
import FilterBar from './filter-bar';
import DataTable from './data-table';
import { parseCsvFile, buildTypeHints } from '@/lib/csv';
import { generateDashboardConfig } from '@/app/actions';
import type { DashboardConfig, ChartConfig, ChartType } from '@/types/dashboard';


type Row = Record<string, string>;

function DashboardSkeleton() {
  return (
    <div className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(41,240,186,0.08),transparent_22%),linear-gradient(180deg,#0a1120,#060a16)] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.42)]">
      <div className="inline-flex rounded-full border border-[#29F0BA]/15 bg-[#29F0BA]/8 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[#29F0BA]">
        Generating dashboard
      </div>

      <div className="mt-4 h-10 w-80 animate-pulse rounded-xl bg-white/10" />
      <div className="mt-3 h-5 w-[32rem] max-w-full animate-pulse rounded-lg bg-white/6" />

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5"
          >
            <div className="h-3 w-20 animate-pulse rounded bg-white/8" />
            <div className="mt-4 h-8 w-28 animate-pulse rounded bg-white/10" />
            <div className="mt-4 h-6 w-16 animate-pulse rounded-full bg-[#29F0BA]/12" />
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5"
          >
            <div className="h-5 w-48 animate-pulse rounded bg-white/8" />
            <div className="mt-3 h-4 w-32 animate-pulse rounded bg-white/6" />
            <div className="mt-5 h-72 animate-pulse rounded-2xl bg-black/20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardBuilder() {
  const [rows, setRows] = useState<Row[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [globalSearch, setGlobalSearch] = useState('');
  const [hasStartedGeneration, setHasStartedGeneration] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dashboardRef = useRef<HTMLDivElement | null>(null);
  const [chartTypeOverrides, setChartTypeOverrides] = useState<Record<string, ChartType>>({});

  async function handleFileSelect(file: File) {
    try {
      setError('');
      setConfig(null);
      setFileName(file.name);
      setFilters({});
      setGlobalSearch('');
      setHasStartedGeneration(false);
      setChartTypeOverrides({});

      const parsedRows = await parseCsvFile(file);

      if (!parsedRows.length) {
        setRows([]);
        setColumns([]);
        setError('This CSV looks empty or could not be parsed.');
        return;
      }

      setRows(parsedRows);
      setColumns(Object.keys(parsedRows[0] ?? {}));
    } catch (err) {
      console.error(err);
      setError('There was a problem parsing that CSV file.');
      setRows([]);
      setColumns([]);
      setConfig(null);
      setHasStartedGeneration(false);
    }
  }

  function handleGenerate() {
    if (!rows.length) return;

    setError('');
    setHasStartedGeneration(true);

    const sampleRows = rows.slice(0, 25);
    const typeHints = buildTypeHints(sampleRows);

    startTransition(async () => {
      try {
        const result = await generateDashboardConfig({
          columns,
          rowCount: rows.length,
          sampleRows,
          typeHints,
        });

        setConfig(result);
      } catch (err) {
        console.error(err);
        setError('Something went wrong while generating the dashboard config.');
      }
    });
  }

  function handleFilterChange(field: string, value: string) {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleResetFilters() {
    setFilters({});
    setGlobalSearch('');
  }

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesFilters = Object.entries(filters).every(([field, value]) => {
        if (!value) return true;
        return String(row[field] ?? '') === value;
      });

      if (!matchesFilters) return false;

      if (!globalSearch.trim()) return true;

      const query = globalSearch.toLowerCase();
      return columns.some((column) =>
        String(row[column] ?? '').toLowerCase().includes(query)
      );
    });
  }, [rows, filters, globalSearch, columns]);

  const activeFilters = useMemo(() => {
    if (!config?.filters?.length) return [];

    const seen = new Set<string>();
    return config.filters.filter((filter) => {
      if (seen.has(filter.field)) return false;
      seen.add(filter.field);
      return true;
    });
  }, [config]);

  async function exportScreenshot() {
    if (!dashboardRef.current) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(dashboardRef.current, {
        backgroundColor: '#050816',
        scale: 2,
        useCORS: true,
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${(config?.datasetSummary.title || 'dashboard')
        .replace(/\s+/g, '-')
        .toLowerCase()}.png`;
      link.click();
    } catch (err) {
      console.error(err);
      setError('Could not export screenshot.');
    }
  }

  async function exportPdf() {
    if (!dashboardRef.current) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(dashboardRef.current, {
        backgroundColor: '#050816',
        scale: 2,
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(
        `${(config?.datasetSummary.title || 'dashboard')
          .replace(/\s+/g, '-')
          .toLowerCase()}.pdf`
      );
    } catch (err) {
      console.error(err);
      setError('Could not export PDF.');
    }
  }

  function isLikelyTimeField(chart: ChartConfig) {
  const field = (chart.xField || chart.categoryField || '').toLowerCase();
  return (
    field.includes('date') ||
    field.includes('time') ||
    field.includes('month') ||
    field.includes('year') ||
    field.includes('day')
  );
}

function getUniqueValueCount(rows: Row[], field?: string) {
  if (!field) return 0;
  return new Set(rows.map((row) => String(row[field] ?? '')).filter(Boolean)).size;
}

function getChartTypeOptions(chart: ChartConfig): ChartType[] {
  const primary = chart.type;
  const xField = chart.xField || chart.categoryField;
  const uniqueCount = getUniqueValueCount(filteredRows, xField);
  const timeLike = isLikelyTimeField(chart);

  if (timeLike) {
    return primary === 'line'
      ? ['line', 'area']
      : primary === 'area'
      ? ['area', 'line']
      : [primary, 'line'];
  }

  if (primary === 'pie') {
    return uniqueCount <= 8 ? ['pie', 'bar'] : ['bar', 'line'];
  }

  if (primary === 'bar') {
    return uniqueCount <= 8 ? ['bar', 'pie'] : ['bar', 'line'];
  }

  if (primary === 'line') {
    return ['line', 'bar'];
  }

  if (primary === 'area') {
    return ['area', 'line'];
  }

  return [primary, 'bar'];
}

function getActiveChartType(chart: ChartConfig): ChartType {
  return chartTypeOverrides[chart.id] ?? chart.type;
}

  const showDashboardArea = hasStartedGeneration || isPending || !!config;

  return (
    <div className="space-y-8 text-white">
      <div className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(41,240,186,0.08),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur">
        <UploadZone onFileSelect={handleFileSelect} />
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {rows.length > 0 && (
        <div className="space-y-6">
          <div
            className={`overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              showDashboardArea
                ? 'max-h-[5000px] translate-y-0 opacity-100'
                : 'max-h-0 -translate-y-4 opacity-0'
            }`}
          >
            <div className="pb-2">
              {isPending ? (
                <DashboardSkeleton />
              ) : config ? (
                <div
                  ref={dashboardRef}
                  className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(41,240,186,0.08),transparent_22%),linear-gradient(180deg,#0a1120,#060a16)] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.42)] transition-all duration-500 ease-out"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="inline-flex rounded-full border border-[#29F0BA]/15 bg-[#29F0BA]/8 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[#29F0BA]">
                        Dashboard generated
                      </div>

                      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                        {config.datasetSummary.title}
                      </h2>

                      {config.datasetSummary.description && (
                        <p className="mt-3 max-w-4xl text-base leading-7 text-white/60">
                          {config.datasetSummary.description}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={exportScreenshot}
                        className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-medium text-white/80 transition hover:border-[#29F0BA]/25 hover:text-white"
                      >
                        Export screenshot
                      </button>
                      <button
                        onClick={exportPdf}
                        className="rounded-2xl bg-[#29F0BA] px-4 py-3 text-sm font-semibold text-[#04110d] transition hover:brightness-95"
                      >
                        Export PDF
                      </button>
                    </div>
                  </div>

                  <div className="mt-8">
                    <KpiGrid rows={filteredRows ?? []} kpis={config.kpis ?? []} />
                  </div>

                  <div className="mt-8">
                    <FilterBar
                      rows={rows}
                      filters={activeFilters}
                      values={filters}
                      globalSearch={globalSearch}
                      onFilterChange={handleFilterChange}
                      onGlobalSearchChange={setGlobalSearch}
                      onReset={handleResetFilters}
                    />
                  </div>

                  <div className="mt-8 grid gap-5 lg:grid-cols-2">
                    {(config.charts ?? []).map((chart) => (
                      <div
                        key={chart.id}
                        className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-xl font-semibold text-white">
                              {chart.title}
                            </h3>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {getChartTypeOptions(chart).map((type) => {
                                    const isActive = getActiveChartType(chart) === type;

                                    return (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() =>
                                        setChartTypeOverrides((prev) => ({
                                            ...prev,
                                            [chart.id]: type,
                                        }))
                                        }
                                        className={`rounded-full border px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] transition ${
                                        isActive
                                            ? 'border-[#29F0BA]/35 bg-[#29F0BA]/12 text-[#29F0BA]'
                                            : 'border-white/10 bg-black/20 text-white/55 hover:border-white/20 hover:text-white'
                                        }`}
                                    >
                                        {type}
                                    </button>
                                    );
                                })}
                                </div>
                          </div>
                        </div>

                        {chart.reasoning && (
                          <p className="mt-4 text-sm leading-6 text-white/58">
                            {chart.reasoning}
                          </p>
                        )}

                        <ChartRenderer
                            rows={filteredRows ?? []}
                            chart={chart}
                            chartType={getActiveChartType(chart)}
                            />
                      </div>
                    ))}
                  </div>

                  <div className="mt-8">
                    <DataTable rows={filteredRows ?? []} columns={columns ?? []} />
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div
            className={`transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              showDashboardArea
                ? 'translate-y-0'
                : 'translate-y-0'
            }`}
          >
            <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] transition-all duration-500 ease-out">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="inline-flex rounded-full border border-[#29F0BA]/15 bg-[#29F0BA]/8 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[#29F0BA]">
                    Dataset ready
                  </div>

                  <h3 className="mt-4 text-2xl font-semibold text-white">
                    Schema preview
                  </h3>
                  <p className="mt-2 text-sm text-white/55">
                    {fileName ? `${fileName} • ` : ''}
                    {rows.length.toLocaleString()} rows detected
                  </p>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isPending}
                  className="inline-flex items-center justify-center rounded-2xl bg-[#29F0BA] px-5 py-3 text-sm font-semibold text-[#04110d] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? 'Generating dashboard...' : 'Generate dashboard'}
                </button>
              </div>

              <div className="mt-7 flex flex-wrap gap-2">
                {columns.map((column) => (
                  <span
                    key={column}
                    className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-sm text-white/80"
                  >
                    {column}
                  </span>
                ))}
              </div>

              <div className="mt-8 overflow-x-auto rounded-2xl border border-white/8 bg-black/25">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-white/[0.04] text-white/55">
                    <tr>
                      {columns.map((column) => (
                        <th
                          key={column}
                          className="whitespace-nowrap px-4 py-3 font-medium"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {rows.slice(0, 5).map((row, rowIndex) => (
                      <tr
                        key={rowIndex}
                        className="border-t border-white/6 text-white/82"
                      >
                        {columns.map((column) => (
                          <td
                            key={column}
                            className="max-w-[220px] whitespace-nowrap px-4 py-3"
                          >
                            {row[column] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}