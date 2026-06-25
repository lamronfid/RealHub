export default function PropiedadesLoading() {
  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-24 animate-pulse font-sans">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-6">
        <div className="space-y-3 flex-1 max-w-xl">
          <div className="h-9 w-44 bg-slate-200 rounded-2xl" />
          <div className="h-4 w-2/3 bg-slate-100/80 rounded-xl" />
        </div>
        <div className="h-12 w-44 bg-indigo-50 rounded-2xl shrink-0" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={idx} className="bg-white border border-slate-100 rounded-3xl overflow-hidden flex flex-col h-[380px]">
            {/* Image Area */}
            <div className="aspect-[4/3] bg-slate-100" />
            
            {/* Ribbon */}
            <div className="h-8 bg-slate-50/80 border-b border-slate-100 px-5 flex items-center gap-3">
              <div className="h-3 w-16 bg-slate-100 rounded-lg" />
              <div className="h-3 w-16 bg-slate-100 rounded-lg" />
            </div>

            {/* Content Area */}
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="h-5 w-5/6 bg-slate-200 rounded-xl" />
                <div className="h-4 w-1/3 bg-slate-100 rounded-lg mt-2" />
              </div>
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-50">
                <div className="h-6 w-20 bg-slate-150 rounded-lg" />
                <div className="h-6 w-16 bg-slate-100 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
