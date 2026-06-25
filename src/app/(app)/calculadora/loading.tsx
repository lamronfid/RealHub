export default function CalculadoraLoading() {
  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 animate-pulse font-sans">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-3">
          <div className="h-4 w-32 bg-slate-100 rounded-lg" />
          <div className="h-9 w-64 bg-slate-200 rounded-2xl" />
        </div>
        <div className="h-16 w-60 bg-slate-100 rounded-2xl shrink-0" />
      </div>

      {/* Tabs */}
      <div className="h-12 w-80 bg-slate-100 rounded-2xl" />

      {/* Split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Inputs Panel */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6">
          <div className="h-6 w-44 bg-slate-200 rounded-lg" />
          <div className="h-px bg-slate-100" />
          
          <div className="space-y-4">
            <div className="h-4 w-36 bg-slate-100 rounded-lg" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 bg-slate-50 rounded-xl" />
              <div className="h-10 bg-slate-50 rounded-xl" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-4 w-32 bg-slate-100 rounded-lg" />
            <div className="h-10 bg-slate-50 rounded-xl" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="h-14 bg-slate-50 rounded-xl" />
            <div className="h-14 bg-slate-50 rounded-xl" />
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-indigo-950/90 rounded-3xl p-6 md:p-8 h-[400px] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="h-5 w-32 bg-indigo-900 rounded-lg" />
              <div className="h-4 w-44 bg-indigo-900/50 rounded-lg" />
              <div className="h-10 w-3/4 bg-indigo-900/80 rounded-xl" />
            </div>
            <div className="h-16 w-full bg-indigo-900/40 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
