'use client';

import { useState } from 'react';

type UploadZoneProps = {
  onFileSelect: (file: File) => void;
};

export default function UploadZone({ onFileSelect }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.csv')) {
      onFileSelect(file);
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`rounded-[28px] border border-dashed p-10 text-center transition ${
        isDragging
          ? 'border-[#29F0BA]/60 bg-[#29F0BA]/10 shadow-[0_0_0_1px_rgba(41,240,186,0.15),0_0_40px_rgba(41,240,186,0.15)]'
          : 'border-white/10 bg-white/[0.03]'
      }`}
    >
      <div className="mx-auto max-w-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#29F0BA]/20 bg-[#29F0BA]/10 text-[#29F0BA]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-7 w-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0 4 4m-4-4-4 4M5 16v1a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-1" />
          </svg>
        </div>

        <h2 className="text-2xl font-semibold text-white md:text-3xl">
          Upload your CSV
        </h2>

        <p className="mt-3 text-sm leading-6 text-white/60 md:text-base">
          Drop in sales, marketing, finance, sports, or operations data and generate a dashboard with real KPIs, filters, and charts.
        </p>

        <div className="mt-8 flex justify-center">
          <label className="cursor-pointer rounded-2xl bg-[#29F0BA] px-5 py-3 text-sm font-semibold text-[#04110d] transition hover:brightness-95">
            Choose CSV
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFileSelect(file);
              }}
            />
          </label>
        </div>

        <p className="mt-4 text-sm text-white/40">or drag and drop it here</p>

        <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-white/35">
          {['date', 'region', 'category', 'revenue', 'orders'].map((item) => (
            <span
              key={item}
              className="rounded-full border border-white/10 bg-black/20 px-3 py-1"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}