export default function MatchesList({ matches, property }: { matches: any[]; property: any }) {
  const potenciales = matches.filter(m => m.match_score >= 60);
  const otras = matches.filter(m => m.match_score >= 50 && m.match_score < 60);

  if (!matches || matches.length === 0) {
    return (
      <div className="bg-slate-50 rounded-2xl p-8 text-center border border-dashed border-slate-200 font-sans">
        <span className="material-symbols-outlined text-4xl text-slate-300 mb-2 block">search_off</span>
        <p className="text-slate-500 font-medium">No hay prospectos compatibles actualmente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative z-10 font-sans">
      {potenciales.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Potenciales (Match &gt;= 60%)
          </h3>
          {potenciales.map((m: any) => (
            <MatchCard key={m.prospect_id} match={m} property={property} />
          ))}
        </div>
      )}
      {otras.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-amber-600 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> Otras Opciones (50-59%)
          </h3>
          {otras.map((m: any) => (
            <MatchCard key={m.prospect_id} match={m} property={property} />
          ))}
        </div>
      )}
    </div>
  );
}

function MatchCard({ match, property }: { match: any; property: any }) {
  const isHighMatch = match.match_score >= 60;
  
  // Clean phone number (leave only digits) and build WhatsApp link
  const rawPhone = match.agent_phone || '';
  const cleanPhone = rawPhone.replace(/\D/g, '');
  
  const pType = property.property_type || 'propiedad';
  const pNeighborhood = property.neighborhood ? `en ${property.neighborhood}` : '';
  const pCity = property.city ? `en ${property.city}` : '';
  const locationText = pNeighborhood || pCity;
  
  const textMessage = `Hola ${match.agent_name}, vi en RealHub que tu cliente "${match.prospect_name}" busca un ${pType} ${locationText} y coincide con mi propiedad: "${property.title}". ¿Te interesa que coordinemos una visita y compartamos comisión (co-broke 50/50)?`;
  
  const waLink = cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMessage)}` 
    : null;

  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex items-center gap-4 hover:border-indigo-200 hover:shadow-sm transition-all duration-300">
      <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-white border-2"
           style={{ borderColor: isHighMatch ? '#d1fae5' : '#fef3c7' }}>
        <span className={`font-bold ${isHighMatch ? 'text-emerald-600' : 'text-amber-600'}`}>
          {match.match_score}%
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-slate-900 truncate">{match.prospect_name}</h4>
        <p className="text-xs text-slate-500 truncate flex items-center gap-1 font-medium">
          <span className="material-symbols-outlined text-[14px]">support_agent</span>
          Agente: {match.agent_name}
        </p>
      </div>
      {waLink ? (
        <a 
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:border-emerald-500 hover:bg-emerald-50/50 hover:text-emerald-600 transition-colors text-slate-650 cursor-pointer shadow-xs"
          title="Contactar por WhatsApp para Co-Broke"
        >
          <span className="material-symbols-outlined text-[20px] font-bold text-emerald-600">chat</span>
        </a>
      ) : (
        <button 
          disabled
          className="shrink-0 w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 cursor-not-allowed"
          title="Agente sin teléfono registrado"
        >
          <span className="material-symbols-outlined text-[20px]">chat_bubble_outline</span>
        </button>
      )}
    </div>
  );
}
