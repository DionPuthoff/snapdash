'use server';

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { DASHBOARD_PROMPT } from '@/lib/dashboard-prompt';
import type { DashboardConfig } from '@/types/dashboard';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const nullableString = z.string().nullish().transform((val) => val ?? undefined);

const DashboardConfigSchema = z.object({
  datasetSummary: z.object({
    title: z.string(),
    description: nullableString,
    timeField: nullableString,
    primaryMetric: nullableString,
  }),
  kpis: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      field: z.string(),
      aggregation: z.enum(['sum', 'avg', 'count', 'min', 'max']),
      format: z.enum(['currency', 'number', 'percent']).optional(),
    })
  ),
  charts: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      type: z.enum(['line', 'bar', 'area', 'pie']),
      xField: nullableString,
      yField: nullableString,
      categoryField: nullableString,
      valueField: nullableString,
      aggregation: z.enum(['sum', 'avg', 'count', 'min', 'max']).optional(),
      reasoning: nullableString,
    })
  ),
  filters: z.array(
    z.object({
      field: z.string(),
      type: z.enum(['select', 'date', 'search']),
    })
  ),
});

function extractJsonFromText(text: string) {
  const trimmed = text.trim();

  const withoutCodeFences = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '');

  try {
    return JSON.parse(withoutCodeFences);
  } catch {
    const firstBrace = withoutCodeFences.indexOf('{');
    const lastBrace = withoutCodeFences.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error(`Claude did not return valid JSON.\n\nRaw response:\n${text}`);
    }

    const possibleJson = withoutCodeFences.slice(firstBrace, lastBrace + 1);
    return JSON.parse(possibleJson);
  }
}

export async function generateDashboardConfig(input: {
  columns: string[];
  rowCount: number;
  sampleRows: Record<string, unknown>[];
  typeHints: Record<string, string>;
}): Promise<DashboardConfig> {
  const prompt = `${DASHBOARD_PROMPT}

Dataset context:
${JSON.stringify(input, null, 2)}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2500,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');

  const parsedJson = extractJsonFromText(text);

    const normalized = {
    datasetSummary: parsedJson.datasetSummary ?? {
        title: 'Generated Dashboard',
        description: undefined,
        timeField: undefined,
        primaryMetric: undefined,
    },
    kpis: Array.isArray(parsedJson.kpis) ? parsedJson.kpis : [],
    charts: Array.isArray(parsedJson.charts) ? parsedJson.charts : [],
    filters: Array.isArray(parsedJson.filters) ? parsedJson.filters : [],
    };

    return DashboardConfigSchema.parse(normalized);
}