export default function MatchesList({ matches }: { matches: any[] }) {
  const potenciales = matches.filter(m => m.match_score >= 60);
  const otras = matches.filter(m => m.match_score >= 50 && m.match_score < 60);

  if (!matches || matches.length === 0) {
    return (
      <div className="bg-slate-50 rounded-2xl p-8 text-center border border-dashed border-slate-200">
        <span className="material-symbols-outlined text-4xl text-slate-300 mb-2 block">search_off</span>
        <p className="text-slate-500 font-medium">No hay prospectos compatibles actualmente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative z-10">
      {potenciales.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Potenciales (Match &gt;= 60)
          </h3>
          {potenciales.map((m: any) => <MatchCard key={m.prospect_id} match={m} />)}
        </div>
      )}
      {otras.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-amber-600 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> Otras Opciones (50-59)
          </h3>
          {otras.map((m: any) => <MatchCard key={m.prospect_id} match={m} />)}
        </div>
      )}
    </div>
  );
}

function MatchCard({ match }: { match: any }) {
  const isHighMatch = match.match_score >= 60;
  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex items-center gap-4 hover:border-indigo-200 hover:shadow-sm transition-all">
      <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-white border-2 border-slate-100"
           style={{ borderColor: isHighMatch ? '#d1fae5' : '#fef3c7' }}>
        <span className={`font-bold ${isHighMatch ? 'text-emerald-600' : 'text-amber-600'}`}>
          {match.match_score}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-slate-900 truncate">{match.prospect_name}</h4>
        <p className="text-xs text-slate-500 truncate">Agente: {match.agent_name}</p>
      </div>
      <button className="shrink-0 w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-slate-600 cursor-pointer">
        <span className="material-symbols-outlined text-[20px]">chat</span>
      </button>
    </div>
  );
}
