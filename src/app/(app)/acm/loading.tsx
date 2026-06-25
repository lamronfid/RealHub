export default function AcmLoading() {
  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-24 animate-pulse font-sans">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-6">
        <div className="space-y-3 flex-1 max-w-xl">
          <div className="h-9 w-52 bg-slate-200 rounded-2xl" />
          <div className="h-4 w-4/5 bg-slate-100/80 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Skeleton */}
        <div className="lg:col-span-8 bg-white border border-slate-100 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
          <div className="h-6 w-48 bg-slate-200 rounded-xl" />
          <div className="h-px bg-slate-100" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="h-4 w-24 bg-slate-100 rounded-lg" />
              <div className="h-10 bg-slate-50 rounded-xl" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-24 bg-slate-100 rounded-lg" />
              <div className="h-10 bg-slate-50 rounded-xl" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-4 w-24 bg-slate-100 rounded-lg" />
            <div className="h-10 bg-slate-50 rounded-xl" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="h-4 w-16 bg-slate-100 rounded-lg" />
              <div className="h-10 bg-slate-50 rounded-xl" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-16 bg-slate-100 rounded-lg" />
              <div className="h-10 bg-slate-50 rounded-xl" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-16 bg-slate-100 rounded-lg" />
              <div className="h-10 bg-slate-50 rounded-xl" />
            </div>
          </div>

          <div className="h-14 bg-indigo-50 rounded-xl mt-6" />
        </div>

        {/* Sidebar/Recent Reports Skeleton */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="h-5 w-36 bg-slate-150 rounded-lg" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="p-3 border border-slate-50 rounded-xl flex items-center justify-between">
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 w-3/4 bg-slate-100 rounded-lg" />
                    <div className="h-3 w-1/2 bg-slate-100/50 rounded-lg" />
                  </div>
                  <div className="w-6 h-6 rounded-full bg-slate-100" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
