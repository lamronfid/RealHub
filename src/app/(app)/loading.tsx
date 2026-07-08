export default function AppLoading() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-24 animate-pulse font-sans">
      {/* Welcome Banner Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-44 bg-slate-100 rounded-3xl border border-slate-200/40 p-6 md:p-8 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="h-4 w-28 bg-slate-200 rounded-full" />
            <div className="h-8 w-3/4 bg-slate-200 rounded-2xl" />
            <div className="h-4 w-1/2 bg-slate-150 rounded-xl" />
          </div>
        </div>
        <div className="h-44 bg-white border border-slate-100 rounded-3xl p-6 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="h-3 w-32 bg-slate-100 rounded-full" />
            <div className="h-5 w-24 bg-slate-200 rounded-xl" />
          </div>
          <div className="space-y-1">
            <div className="h-3 w-full bg-slate-100 rounded-full" />
            <div className="h-2 w-full bg-slate-100 rounded-full" />
          </div>
        </div>
      </div>

      {/* Grid of KPIs Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between h-32">
            <div className="w-10 h-10 rounded-xl bg-slate-100" />
            <div className="space-y-2">
              <div className="h-6 w-12 bg-slate-200 rounded-lg" />
              <div className="h-3 w-20 bg-slate-100 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts / List Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-5 w-48 bg-slate-200 rounded-lg" />
            <div className="h-4 w-16 bg-slate-150 rounded-lg" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-200 shrink-0" />
                <div className="h-4 w-32 bg-slate-150 rounded-lg shrink-0" />
                <div className="flex-1 h-2 bg-slate-100 rounded-full" />
                <div className="h-4 w-8 bg-slate-200 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-5">
          <div className="h-5 w-40 bg-slate-200 rounded-lg" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-3 border border-slate-50 rounded-xl flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-3/4 bg-slate-150 rounded-lg" />
                  <div className="h-3 w-1/2 bg-slate-100 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
