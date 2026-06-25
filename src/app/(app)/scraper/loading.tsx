export default function ScraperLoading() {
  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-24 animate-pulse font-sans">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-6">
        <div className="space-y-3 flex-1 max-w-xl">
          <div className="h-9 w-40 bg-slate-200 rounded-2xl" />
          <div className="h-4 w-5/6 bg-slate-100/80 rounded-xl" />
        </div>
        <div className="h-14 w-72 bg-slate-100 rounded-2xl shrink-0" />
      </div>

      {/* Main Scraper Control panel skeleton */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
        <div className="h-6 w-48 bg-slate-200 rounded-xl" />
        <div className="h-12 w-full bg-slate-50 rounded-2xl" />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="h-10 bg-slate-100 rounded-xl" />
          <div className="h-10 bg-slate-100 rounded-xl" />
          <div className="h-10 bg-indigo-50 rounded-xl" />
        </div>
      </div>

      {/* Table/List Skeleton */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div className="h-5 w-32 bg-slate-150 rounded-lg" />
          <div className="h-5 w-20 bg-slate-100 rounded-lg" />
        </div>
        
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="flex gap-4 p-4 border border-slate-50 rounded-2xl items-center justify-between">
              <div className="flex gap-4 items-center flex-1">
                <div className="w-16 h-12 bg-slate-100 rounded-xl shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-2/3 bg-slate-150 rounded-lg" />
                  <div className="h-3.5 w-1/3 bg-slate-100 rounded-lg" />
                </div>
              </div>
              <div className="h-8 w-24 bg-slate-100 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
