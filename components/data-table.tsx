'use client';

type Row = Record<string, string>;

export default function DataTable({
  rows,
  columns,
}: {
  rows: Row[];
  columns: string[];
}) {
  const visibleRows = rows.slice(0, 100);

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Filtered data</h3>
          <p className="mt-1 text-sm text-white/45">
            Showing {visibleRows.length} of {rows.length.toLocaleString()} rows
          </p>
        </div>

        <div className="rounded-full border border-[#29F0BA]/15 bg-[#29F0BA]/8 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-[#29F0BA]">
          Live table
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/8 bg-black/25">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 bg-white/[0.04] text-white/55">
            <tr>
              {columns.map((column) => (
                <th key={column} className="whitespace-nowrap px-4 py-3 font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {visibleRows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-t border-white/6 text-white/82 transition hover:bg-white/[0.03]"
              >
                {columns.map((column) => (
                  <td key={column} className="max-w-[240px] whitespace-nowrap px-4 py-3">
                    {row[column] || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}