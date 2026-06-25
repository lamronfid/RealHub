export default function MarketplaceLoading() {
  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-24 animate-pulse font-sans">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3 flex-1 max-w-xl">
          <div className="h-9 w-48 bg-slate-200 rounded-2xl" />
          <div className="h-4 w-full bg-slate-100 rounded-xl" />
          <div className="h-4 w-2/3 bg-slate-100/80 rounded-xl" />
        </div>
        <div className="h-12 w-64 bg-slate-100 rounded-2xl shrink-0" />
      </div>

      {/* Filter Bar Skeleton */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-2xl border border-slate-100 p-4">
        <div className="h-10 flex-1 min-w-[200px] bg-slate-100 rounded-xl" />
        <div className="h-10 w-36 bg-slate-50 rounded-xl" />
        <div className="h-10 w-36 bg-slate-55 rounded-xl" />
        <div className="h-4 w-20 bg-slate-100 rounded-xl ml-auto" />
      </div>

      {/* Card Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={idx} className="bg-white border border-slate-100 rounded-3xl overflow-hidden flex flex-col h-[400px]">
            {/* Image Area */}
            <div className="aspect-[4/3] bg-slate-100" />
            
            {/* Info Ribbon */}
            <div className="h-8 bg-slate-50/80 border-b border-slate-100 px-5 flex items-center gap-3">
              <div className="h-3 w-16 bg-slate-100 rounded-lg" />
              <div className="h-3 w-16 bg-slate-100 rounded-lg" />
            </div>

            {/* Content Area */}
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="h-5 w-5/6 bg-slate-200 rounded-xl" />
                <div className="h-5 w-2/3 bg-slate-200/80 rounded-xl" />
                <div className="h-4 w-1/3 bg-slate-100 rounded-lg mt-3" />
              </div>
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100" />
                  <div className="space-y-1">
                    <div className="h-3.5 w-24 bg-slate-150 rounded-lg" />
                    <div className="h-2 w-16 bg-slate-100 rounded-lg" />
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-100" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
