'use client';

type Row = Record<string, string>;

type FilterBarProps = {
  rows: Row[];
  filters: {
    field: string;
    type: 'select' | 'date' | 'search';
  }[];
  values: Record<string, string>;
  globalSearch: string;
  onFilterChange: (field: string, value: string) => void;
  onGlobalSearchChange: (value: string) => void;
  onReset: () => void;
};

function sortFilterValues(values: string[]) {
  return [...values].sort((a, b) => {
    const aTrim = a.trim();
    const bTrim = b.trim();

    const aNum = Number(aTrim);
    const bNum = Number(bTrim);

    const aIsNum = aTrim !== '' && !Number.isNaN(aNum);
    const bIsNum = bTrim !== '' && !Number.isNaN(bNum);

    if (aIsNum && bIsNum) {
      return aNum - bNum;
    }

    return aTrim.localeCompare(bTrim, undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  });
}

function getUniqueValues(rows: Row[], field: string) {
  const rawValues = Array.from(
    new Set(
      rows
        .map((row) => String(row[field] ?? '').trim())
        .filter(Boolean)
    )
  ).slice(0, 100);

  return sortFilterValues(rawValues);
}

export default function FilterBar({
  rows,
  filters,
  values,
  globalSearch,
  onFilterChange,
  onGlobalSearchChange,
  onReset,
}: FilterBarProps) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="grid flex-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-white/45">
              Search
            </label>
            <input
              value={globalSearch}
              onChange={(e) => onGlobalSearchChange(e.target.value)}
              placeholder="Search rows..."
              className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#29F0BA]/35"
            />
          </div>

          {filters.map((filter) => {
            if (filter.type === 'search') return null;

            const options = getUniqueValues(rows, filter.field);

            return (
              <div key={filter.field}>
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-white/45">
                  {filter.field}
                </label>

                <div className="relative">
                  <select
                    value={values[filter.field] ?? ''}
                    onChange={(e) => onFilterChange(filter.field, e.target.value)}
                    className="w-full appearance-none rounded-2xl border border-white/10 bg-black/25 px-4 py-3 pr-12 text-sm text-white outline-none focus:border-[#29F0BA]/35"
                  >
                    <option value="">All</option>
                    {options.map((option) => (
                      <option key={option} value={option} className="bg-[#081019]">
                        {option}
                      </option>
                    ))}
                  </select>

                  <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-white/55">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.51a.75.75 0 0 1-1.08 0l-4.25-4.51a.75.75 0 0 1 .02-1.06Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onReset}
          className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-medium text-white/75 transition hover:border-[#29F0BA]/25 hover:text-white"
        >
          Reset filters
        </button>
      </div>
    </div>
  );
}