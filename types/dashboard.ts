export type Aggregation = 'sum' | 'avg' | 'count' | 'min' | 'max';
export type ChartType = 'line' | 'bar' | 'area' | 'pie';

export interface DatasetSummary {
  title: string;
  description?: string;
  timeField?: string;
  primaryMetric?: string;
}

export interface KpiConfig {
  id: string;
  label: string;
  field: string;
  aggregation: Aggregation;
  format?: 'currency' | 'number' | 'percent';
}

export interface ChartConfig {
  id: string;
  title: string;
  type: ChartType;
  xField?: string;
  yField?: string;
  categoryField?: string;
  valueField?: string;
  aggregation?: Aggregation;
  reasoning?: string;
}

export interface FilterConfig {
  field: string;
  type: 'select' | 'date' | 'search';
}

export interface DashboardConfig {
  datasetSummary: DatasetSummary;
  kpis: KpiConfig[];
  charts: ChartConfig[];
  filters: FilterConfig[];
}