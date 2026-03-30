import DashboardBuilder from '@/components/dashboard-builder';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <div className="inline-flex items-center rounded-full border border-[#29F0BA]/20 bg-[#29F0BA]/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-[#29F0BA]">
            SnapDash
          </div>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            Turn any CSV into a polished dashboard
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-7 text-white/65 md:text-lg">
            Upload a dataset, generate KPIs, charts, filters, and export a clean dashboard view.
          </p>
        </div>

        <DashboardBuilder />
      </div>
    </main>
  );
}