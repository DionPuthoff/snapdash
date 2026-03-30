'use client';

import type { KpiConfig } from '@/types/dashboard';

type Row = Record<string, string>;

function aggregate(values: number[], mode: KpiConfig['aggregation']) {
  if (mode === 'count') return values.length;
  if (!values.length) return 0;
  if (mode === 'sum') return values.reduce((a, b) => a + b, 0);
  if (mode === 'avg') return values.reduce((a, b) => a + b, 0) / values.length;
  if (mode === 'min') return Math.min(...values);
  if (mode === 'max') return Math.max(...values);
  return 0;
}

function formatValue(value: number, format?: KpiConfig['format']) {
  if (format === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  }

  if (format === 'percent') {
    return `${value.toFixed(1)}%`;
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
  }).format(value);
}

export default function KpiGrid({
  rows = [],
  kpis = [],
}: {
  rows?: Row[];
  kpis?: KpiConfig[];
}) {
  if (!kpis.length) {
    return (
      <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 text-sm text-white/55">
        No KPI suggestions available for this dataset.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => {
        const values = rows
          .map((row) => Number(row[kpi.field]))
          .filter((value) => !Number.isNaN(value));

        const value =
          kpi.aggregation === 'count'
            ? rows.length
            : aggregate(values, kpi.aggregation);

        return (
          <div
            key={kpi.id}
            className="group rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.28)] transition hover:border-[#29F0BA]/25"
          >
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-white/45">
              {kpi.label}
            </div>

            <div className="mt-4 text-3xl font-semibold tracking-tight text-white">
              {formatValue(value, kpi.format)}
            </div>

            <div className="mt-3 inline-flex rounded-full border border-[#29F0BA]/15 bg-[#29F0BA]/8 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[#29F0BA]">
              {kpi.aggregation}
            </div>
          </div>
        );
      })}
    </div>
  );
}