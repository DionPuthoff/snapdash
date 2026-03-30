'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import type { ChartConfig, ChartType } from '@/types/dashboard';

type Row = Record<string, string>;

const PIE_COLORS = ['#29F0BA', '#7EF7D6', '#1AC6A0', '#0EA37E', '#C7FFF0', '#5DEFD0'];

function parseNumber(value: unknown): number | null {
  if (value == null) return null;

  const raw = String(value).trim();

  if (!raw || raw === '-' || raw === '—' || raw.toLowerCase() === 'n/a') {
    return null;
  }

  const cleaned = raw.replace(/[$,%]/g, '').replace(/,/g, '');
  const num = Number(cleaned);

  return Number.isNaN(num) ? null : num;
}

function aggregateValues(values: number[], aggregation?: string) {
  if (!values.length) return 0;

  switch (aggregation) {
    case 'avg':
      return values.reduce((a, b) => a + b, 0) / values.length;
    case 'count':
      return values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    case 'sum':
    default:
      return values.reduce((a, b) => a + b, 0);
  }
}

function sortLabels(a: string, b: string) {
  const aTrim = a.trim();
  const bTrim = b.trim();

  const aNum = Number(aTrim);
  const bNum = Number(bTrim);

  const aIsNum = aTrim !== '' && !Number.isNaN(aNum);
  const bIsNum = bTrim !== '' && !Number.isNaN(bNum);

  if (aIsNum && bIsNum) {
    return aNum - bNum;
  }

  const aDate = Date.parse(aTrim);
  const bDate = Date.parse(bTrim);

  const aIsDate = !Number.isNaN(aDate);
  const bIsDate = !Number.isNaN(bDate);

  if (aIsDate && bIsDate) {
    return aDate - bDate;
  }

  return aTrim.localeCompare(bTrim, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

function getColumnNames(rows: Row[]) {
  return Object.keys(rows[0] ?? {});
}

function getLikelyLabelField(rows: Row[]) {
  const columns = getColumnNames(rows);

  const preferred = columns.find((col) => {
    const lower = col.toLowerCase();
    return (
      lower.includes('item') ||
      lower.includes('name') ||
      lower.includes('drink') ||
      lower.includes('product') ||
      lower.includes('menu')
    );
  });

  if (preferred) return preferred;

  return columns.find((col) => {
    const sample = rows.slice(0, 10).map((row) => String(row[col] ?? '').trim());
    const nonEmpty = sample.filter(Boolean);
    if (!nonEmpty.length) return false;

    const mostlyText = nonEmpty.some((v) => Number.isNaN(Number(v)));
    return mostlyText;
  });
}

function getLikelyNumericField(rows: Row[], preferredName?: string) {
  const columns = getColumnNames(rows);

  const preferred = preferredName
    ? columns.find((col) => col.toLowerCase() === preferredName.toLowerCase())
    : undefined;

  if (preferred) return preferred;

  const priorityNames = [
    'calories',
    'protein',
    'fat (g)',
    'fat',
    'carb. (g)',
    'carbs',
    'carbohydrates',
    'fiber (g)',
    'fiber',
    'sodium',
  ];

  for (const name of priorityNames) {
    const match = columns.find((col) => col.toLowerCase() === name);
    if (match) return match;
  }

  return columns.find((col) => {
    const values = rows
      .slice(0, 25)
      .map((row) => parseNumber(row[col]))
      .filter((v) => v !== null);

    return values.length >= 3;
  });
}

function resolveFields(rows: Row[], chart: ChartConfig) {
  const configuredLabelField = chart.xField || chart.categoryField;
  const configuredValueField = chart.yField || chart.valueField;

  const labelField =
    configuredLabelField && rows.some((row) => String(row[configuredLabelField] ?? '').trim())
      ? configuredLabelField
      : getLikelyLabelField(rows);

  const valueField =
    configuredValueField &&
    rows.some((row) => parseNumber(row[configuredValueField]) !== null)
      ? configuredValueField
      : getLikelyNumericField(rows, chart.yField || chart.valueField || chart.title);

  return { labelField, valueField };
}

function shouldUseTopN(chart: ChartConfig) {
  const title = chart.title.toLowerCase();
  return title.includes('top ');
}

function getTopN(chart: ChartConfig) {
  const match = chart.title.toLowerCase().match(/top\s+(\d+)/);
  return match ? Number(match[1]) : 10;
}

function buildChartData(rows: Row[], chart: ChartConfig, chartType: ChartType) {
  if (!rows.length) return [];

  const { labelField, valueField } = resolveFields(rows, chart);

  if (!labelField || (!valueField && chart.aggregation !== 'count')) {
    return [];
  }

  const grouped = new Map<string, number[]>();

  for (const row of rows) {
    const label = String(row[labelField] ?? '').trim();
    if (!label) continue;

    if (chart.aggregation === 'count') {
      const existing = grouped.get(label) || [];
      existing.push(1);
      grouped.set(label, existing);
      continue;
    }

    if (!valueField) continue;

    const numericValue = parseNumber(row[valueField]);
    if (numericValue === null) continue;

    const existing = grouped.get(label) || [];
    existing.push(numericValue);
    grouped.set(label, existing);
  }

  let result = Array.from(grouped.entries()).map(([label, values]) => ({
    label,
    value: aggregateValues(values, chart.aggregation),
  }));

  if (shouldUseTopN(chart)) {
    result = result.sort((a, b) => b.value - a.value).slice(0, getTopN(chart));
  } else {
    const looksDateLike = result.some((d) => !Number.isNaN(Date.parse(d.label)));
    const looksNumericLike = result.every(
      (d) => d.label.trim() !== '' && !Number.isNaN(Number(d.label))
    );

    if (looksDateLike || looksNumericLike) {
      result = result.sort((a, b) => sortLabels(a.label, b.label));
    } else if (chartType === 'bar' || chartType === 'pie') {
      result = result.sort((a, b) => b.value - a.value);
    } else {
      result = result.sort((a, b) => sortLabels(a.label, b.label));
    }
  }

  if (chartType === 'pie') {
    result = result.slice(0, 8);
  }

  return result;
}

export default function ChartRenderer({
  rows = [],
  chart,
  chartType,
}: {
  rows?: Row[];
  chart: ChartConfig;
  chartType: ChartType;
}) {
  const data = buildChartData(rows, chart, chartType);

  if (!data.length) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-white/45">
        No chart data available for this configuration
      </div>
    );
  }

  return (
    <div className="mt-5 h-80 rounded-2xl border border-white/8 bg-black/25 p-4">
      <ResponsiveContainer width="100%" height="100%">
        {chartType === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="label" stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} />
            <YAxis stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#081019',
                border: '1px solid rgba(41,240,186,0.18)',
                borderRadius: '14px',
                color: '#fff',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#29F0BA"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#29F0BA' }}
              activeDot={{ r: 5, fill: '#29F0BA' }}
            />
          </LineChart>
        ) : chartType === 'area' ? (
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`area-${chart.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#29F0BA" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#29F0BA" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="label" stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} />
            <YAxis stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#081019',
                border: '1px solid rgba(41,240,186,0.18)',
                borderRadius: '14px',
                color: '#fff',
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#29F0BA"
              strokeWidth={2.5}
              fill={`url(#area-${chart.id})`}
            />
          </AreaChart>
        ) : chartType === 'pie' ? (
          <PieChart>
            <Tooltip
              contentStyle={{
                backgroundColor: '#081019',
                border: '1px solid rgba(41,240,186,0.18)',
                borderRadius: '14px',
                color: '#fff',
              }}
            />
            <Legend />
            <Pie data={data} dataKey="value" nameKey="label" outerRadius={100} label>
              {data.map((entry, index) => (
                <Cell key={`${entry.label}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="label" stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} />
            <YAxis stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#081019',
                border: '1px solid rgba(41,240,186,0.18)',
                borderRadius: '14px',
                color: '#fff',
              }}
            />
            <Bar dataKey="value" fill="#29F0BA" radius={[8, 8, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}