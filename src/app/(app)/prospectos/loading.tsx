export default function ProspectosLoading() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-pulse font-sans">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div className="space-y-3">
          <div className="h-9 w-52 bg-slate-200 rounded-2xl" />
          <div className="h-4 w-32 bg-slate-100 rounded-lg" />
        </div>
        <div className="h-12 w-40 bg-indigo-50 rounded-2xl shrink-0" />
      </div>

      {/* Board Columns Skeleton */}
      <div className="flex gap-4 overflow-x-auto pb-4 h-[70vh]">
        {Array.from({ length: 5 }).map((_, colIdx) => (
          <div key={colIdx} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 w-72 shrink-0 flex flex-col h-full space-y-4">
            {/* Column Header */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-150">
              <div className="h-4 w-28 bg-slate-200 rounded-lg" />
              <div className="h-4 w-6 bg-slate-100 rounded-lg" />
            </div>

            {/* Column Cards */}
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {Array.from({ length: 3 }).map((_, cardIdx) => (
                <div key={cardIdx} className="bg-white border border-slate-100 rounded-xl p-4 space-y-3 shadow-xs">
                  <div className="h-4 w-4/5 bg-slate-150 rounded-lg" />
                  <div className="h-3 w-3/5 bg-slate-100 rounded-lg" />
                  <div className="h-6 w-20 bg-slate-50 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
