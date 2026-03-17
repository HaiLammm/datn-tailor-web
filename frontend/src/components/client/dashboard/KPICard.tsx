"use client";

interface KPICardProps {
  title: string;
  value: string;
  trend: number;
  subtitle?: string;
  onClick?: () => void;
}

export default function KPICard({ title, value, trend, subtitle, onClick }: KPICardProps) {
  const isPositive = trend >= 0;

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-4 text-left hover:shadow-md hover:border-indigo-200 transition-all w-full"
    >
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
      <p className="text-2xl font-semibold text-[#1A1A2E] mt-1">{value}</p>
      <div className="flex items-center gap-1.5 mt-2">
        <span
          className={`inline-flex items-center text-xs font-medium ${
            isPositive ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {isPositive ? (
            <svg className="w-3.5 h-3.5 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
          {Math.abs(trend)}%
        </span>
        {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
      </div>
    </button>
  );
}
