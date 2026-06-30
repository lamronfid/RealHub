'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [prospectsCount, setProspectsCount] = useState(0);
  const [feedback, setFeedback] = useState<any[]>([]);
  
  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<'agents' | 'feedback' | 'properties'>('agents');
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [feedbackFilter, setFeedbackFilter] = useState<string>('all');
  
  // Action spinners
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedbackUpdatingId, setFeedbackUpdatingId] = useState<string | null>(null);
  
  // Fetch platform data
  async function loadData() {
    try {
      setLoading(true);

      const fetchAgents = async () => {
        const resp = await fetch('/api/admin/agents');
        if (!resp.ok) throw new Error('Error al obtener agentes');
        return resp.json();
      };

      const [
        profilesData,
        { data: propertiesData },
        { count: totalProspects },
        { data: featureRequests },
      ] = await Promise.all([
        fetchAgents(),
        supabase.from('properties').select('*, agent_profiles(full_name)').order('created_at', { ascending: false }),
        supabase.from('prospects').select('*', { count: 'exact', head: true }),
        supabase.from('feature_requests').select('*, agent_profiles(full_name)').order('created_at', { ascending: false }),
      ]);

      setAgents(profilesData || []);
      setProperties(propertiesData || []);
      setProspectsCount(totalProspects || 0);
      setFeedback(featureRequests || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Update Agent tier
  const handleUpdateTier = async (agentId: string, newTier: string) => {
    setUpdatingId(agentId);
    try {
      const { error } = await supabase
        .from('agent_profiles')
        .update({ subscription_tier: newTier })
        .eq('id', agentId);
      
      if (error) throw error;
      
      // Update local state
      setAgents((prev) =>
        prev.map((a) => (a.id === agentId ? { ...a, subscription_tier: newTier } : a))
      );
    } catch (err) {
      alert('Error al actualizar el plan: ' + (err as any).message);
    } finally {
      setUpdatingId(null);
    }
  };

  // Toggle Verification status
  const handleToggleVerified = async (agentId: string, currentStatus: boolean) => {
    setUpdatingId(agentId);
    try {
      const { error } = await supabase
        .from('agent_profiles')
        .update({ is_verified: !currentStatus })
        .eq('id', agentId);
      
      if (error) throw error;
      
      // Update local state
      setAgents((prev) =>
        prev.map((a) => (a.id === agentId ? { ...a, is_verified: !currentStatus } : a))
      );
    } catch (err) {
      alert('Error al actualizar verificación: ' + (err as any).message);
    } finally {
      setUpdatingId(null);
    }
  };

  // Toggle Feedback status (Pending <-> Completed)
  const handleToggleFeedbackStatus = async (requestId: string, currentStatus: string) => {
    setFeedbackUpdatingId(requestId);
    const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    try {
      const { error } = await supabase
        .from('feature_requests')
        .update({ status: newStatus })
        .eq('id', requestId);
      
      if (error) throw error;
      
      // Update local state
      setFeedback((prev) =>
        prev.map((f) => (f.id === requestId ? { ...f, status: newStatus } : f))
      );
    } catch (err) {
      alert('Error al actualizar el estado del feedback: ' + (err as any).message);
    } finally {
      setFeedbackUpdatingId(null);
    }
  };

  // Stats summaries
  const pendingFeedbackCount = feedback.filter((f) => f.status === 'pending').length;
  const eliteAgentsCount = agents.filter((a) => a.subscription_tier === 'elite').length;
  
  const stats = [
    { label: 'Agentes Registrados', value: agents.length, icon: 'group', color: 'bg-indigo-50 text-indigo-650' },
    { label: 'Propiedades Totales', value: properties.length, icon: 'domain', color: 'bg-emerald-50 text-emerald-650' },
    { label: 'Prospectos Totales', value: prospectsCount, icon: 'people', color: 'bg-sky-50 text-sky-650' },
    { label: 'Sugerencias Pendientes', value: pendingFeedbackCount, icon: 'lightbulb', color: 'bg-amber-50 text-amber-650' },
  ];

  // Filtering Agentes
  const filteredAgents = agents.filter((agent) => {
    const matchesSearch = 
      agent.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.agency_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.phone?.includes(searchTerm);
    const matchesTier = tierFilter === 'all' || agent.subscription_tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  // Filtering Feedback
  const filteredFeedback = feedback.filter((item) => {
    if (feedbackFilter === 'all') return true;
    return item.status === feedbackFilter;
  });

  // Filtering Properties
  const filteredProperties = properties.filter((prop) => {
    return prop.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prop.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prop.agent_profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500 font-sans pb-16">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full">
            Superadministrador
          </span>
          <h1 className="text-2xl md:text-3xl font-black font-heading text-slate-900 mt-2">Panel del Propietario</h1>
          <p className="text-slate-500 text-sm mt-0.5">Control completo de la plataforma, agentes, propiedades y solicitudes.</p>
        </div>
        
        <button 
          onClick={loadData}
          className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 shadow-sm transition-all"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Recargar Datos
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-premium flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${stat.color}`}>
              <span className="material-symbols-outlined text-2xl">{stat.icon}</span>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs Layout */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-premium overflow-hidden">
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap border-b border-slate-100 bg-slate-50/50 px-4 pt-4 gap-2">
          <button
            onClick={() => { setActiveTab('agents'); setSearchTerm(''); }}
            className={`px-5 py-3 rounded-t-2xl font-heading text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${
              activeTab === 'agents' 
                ? 'bg-white border-indigo-600 text-indigo-600 shadow-sm' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-lg">group</span>
            Gestión de Agentes
            <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full ml-1">
              {agents.length}
            </span>
          </button>
          
          <button
            onClick={() => { setActiveTab('feedback'); setSearchTerm(''); }}
            className={`px-5 py-3 rounded-t-2xl font-heading text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${
              activeTab === 'feedback' 
                ? 'bg-white border-indigo-600 text-indigo-600 shadow-sm' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-lg">lightbulb</span>
            Sugerencias & Feedback
            {pendingFeedbackCount > 0 && (
              <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full ml-1">
                {pendingFeedbackCount}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('properties'); setSearchTerm(''); }}
            className={`px-5 py-3 rounded-t-2xl font-heading text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${
              activeTab === 'properties' 
                ? 'bg-white border-indigo-600 text-indigo-600 shadow-sm' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-lg">domain</span>
            Propiedades Creadas
            <span className="bg-slate-100 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-full ml-1">
              {properties.length}
            </span>
          </button>
        </div>

        {/* Tab Controls & Filters */}
        <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                activeTab === 'agents' 
                  ? 'Buscar agentes por nombre, inmobiliaria...' 
                  : activeTab === 'properties'
                  ? 'Buscar propiedades por título, ciudad o agente...'
                  : 'Buscar en feedback...'
              }
              className="w-full bg-slate-50/60 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-800 focus:outline-none placeholder-slate-400 transition-all"
            />
          </div>

          {activeTab === 'agents' && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Filtrar por Plan:</span>
              <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200/50">
                {['all', 'free', 'entrada', 'pro', 'elite'].map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setTierFilter(tier)}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${
                      tierFilter === tier 
                        ? 'bg-white text-indigo-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Estado:</span>
              <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200/50">
                {[
                  { value: 'all', label: 'Todos' },
                  { value: 'pending', label: 'Pendientes' },
                  { value: 'completed', label: 'Completados' }
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setFeedbackFilter(item.value)}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                      feedbackFilter === item.value 
                        ? 'bg-white text-indigo-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tab Body Contents */}
        <div className="p-0">
          {loading ? (
            <div className="p-16 text-center text-slate-400 space-y-3">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold">Cargando información del servidor...</p>
            </div>
          ) : activeTab === 'agents' ? (
            /* 👥 AGENTS TABLE VIEW */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 border-b border-slate-100">
                    <th className="px-6 py-4">Agente</th>
                    <th className="px-6 py-4">Contacto</th>
                    <th className="px-6 py-4">Agencia & Exp</th>
                    <th className="px-6 py-4">Plan (Nivel)</th>
                    <th className="px-6 py-4">Verificado</th>
                    <th className="px-6 py-4 text-center">Registrado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredAgents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400">
                        <span className="material-symbols-outlined text-4xl block mb-2 text-slate-200">person_off</span>
                        No se encontraron agentes registrados.
                      </td>
                    </tr>
                  ) : (
                    filteredAgents.map((agent) => {
                      const agentPropsCount = properties.filter((p) => p.agent_id === agent.id).length;
                      
                      return (
                        <tr key={agent.id} className="hover:bg-slate-50/50 transition-colors">
                          {/* Profile */}
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              {agent.avatar_url ? (
                                <img src={agent.avatar_url} alt={agent.full_name} className="w-9 h-9 rounded-full object-cover border border-slate-100 ring-2 ring-indigo-50" />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                                  <span className="text-[10px] font-bold text-indigo-650">
                                    {agent.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                  </span>
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-slate-800 flex items-center gap-1">
                                  {agent.full_name}
                                  {agent.is_verified && (
                                    <span className="material-symbols-outlined text-indigo-500 text-[14px] fill-current" title="Verificado">verified</span>
                                  )}
                                </p>
                                {agent.email && (
                                  <p className="text-[10px] text-slate-500 font-medium leading-none mt-0.5 select-all">
                                    {agent.email}
                                  </p>
                                )}
                                <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
                                  {agent.role === 'admin' ? 'Administrador' : 'Agente'}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Contact */}
                          <td className="px-6 py-5 font-medium">
                            <div className="space-y-1">
                              {agent.phone && (
                                <p className="flex items-center gap-1.5 text-slate-600">
                                  <span className="material-symbols-outlined text-sm text-slate-400">phone</span>
                                  {agent.phone}
                                </p>
                              )}
                              {agent.whatsapp && (
                                <a 
                                  href={`https://wa.me/${agent.whatsapp.replace(/\D/g, '')}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700"
                                >
                                  <span className="material-symbols-outlined text-sm">chat</span>
                                  WhatsApp
                                </a>
                              )}
                            </div>
                          </td>

                          {/* Agency */}
                          <td className="px-6 py-5 font-semibold text-slate-600">
                            <div className="space-y-0.5">
                              <p className="text-slate-800 font-medium">{agent.agency_name || 'Individual'}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                {agent.experience_years ? `${agent.experience_years} años de experiencia` : 'Sin exp.'}
                              </p>
                              <p className="text-[9px] text-indigo-500 font-semibold mt-1 bg-indigo-50/50 inline-block px-2 py-0.5 rounded border border-indigo-100/40">
                                {agentPropsCount} {agentPropsCount === 1 ? 'propiedad' : 'propiedades'}
                              </p>
                            </div>
                          </td>

                          {/* Tier Selector */}
                          <td className="px-6 py-5">
                            <div className="relative inline-block w-32">
                              <select
                                value={agent.subscription_tier || 'free'}
                                disabled={updatingId === agent.id}
                                onChange={(e) => handleUpdateTier(agent.id, e.target.value)}
                                className={`w-full bg-slate-50 border border-slate-200 hover:border-slate-350 focus:border-indigo-500 text-[10px] font-black uppercase tracking-wider rounded-xl py-2 px-3 focus:outline-none appearance-none cursor-pointer ${
                                  agent.subscription_tier === 'elite' ? 'text-indigo-700 bg-indigo-50/40 border-indigo-200' :
                                  agent.subscription_tier === 'pro' ? 'text-violet-700 bg-violet-50/40 border-violet-200' :
                                  agent.subscription_tier === 'entrada' ? 'text-sky-700 bg-sky-50/40 border-sky-200' :
                                  'text-slate-500'
                                }`}
                              >
                                <option value="free">FREE</option>
                                <option value="entrada">ENTRADA</option>
                                <option value="pro">PRO</option>
                                <option value="elite">ÉLITE</option>
                              </select>
                              <span className="material-symbols-outlined text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none">unfold_more</span>
                            </div>
                          </td>

                          {/* Verification Toggle */}
                          <td className="px-6 py-5">
                            <button
                              onClick={() => handleToggleVerified(agent.id, !!agent.is_verified)}
                              disabled={updatingId === agent.id}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-1.5 ${
                                agent.is_verified
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/50'
                                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <span className="material-symbols-outlined text-sm">
                                {agent.is_verified ? 'verified_user' : 'gpp_maybe'}
                              </span>
                              {agent.is_verified ? 'Verificado' : 'No verificado'}
                            </button>
                          </td>

                          {/* Registered Date */}
                          <td className="px-6 py-5 text-center text-slate-400 font-semibold">
                            {agent.created_at ? formatDistanceToNow(new Date(agent.created_at), { addSuffix: true, locale: es }) : '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'feedback' ? (
            /* 💡 FEEDBACK AND FEATURE REQUESTS VIEW */
            <div className="divide-y divide-slate-100">
              {filteredFeedback.length === 0 ? (
                <div className="p-16 text-center text-slate-400">
                  <span className="material-symbols-outlined text-4xl block mb-2 text-slate-200">check_circle</span>
                  No hay solicitudes de funciones en este estado.
                </div>
              ) : (
                filteredFeedback.map((req) => (
                  <div key={req.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-6">
                      <div className="space-y-2">
                        <p className="text-slate-800 font-semibold text-xs leading-relaxed whitespace-pre-wrap">{req.description}</p>
                        
                        <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 font-semibold">
                          <span className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm text-slate-400">person</span>
                            {req.agent_profiles?.full_name || 'Agente Desconocido'}
                          </span>
                          <span className="w-1 h-1 bg-slate-350 rounded-full" />
                          <span className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm text-slate-400">schedule</span>
                            {formatDistanceToNow(new Date(req.created_at), { addSuffix: true, locale: es })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                          req.status === 'pending'
                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        }`}>
                          {req.status === 'pending' ? 'Pendiente' : 'Completado'}
                        </span>
                        
                        <button
                          onClick={() => handleToggleFeedbackStatus(req.id, req.status)}
                          disabled={feedbackUpdatingId === req.id}
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors"
                          title={req.status === 'pending' ? 'Marcar como Resuelto' : 'Marcar como Pendiente'}
                        >
                          <span className="material-symbols-outlined text-base">
                            {req.status === 'pending' ? 'check' : 'settings_backup_restore'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* 🏠 PROPERTIES VIEW */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 border-b border-slate-100">
                    <th className="px-6 py-4">Propiedad</th>
                    <th className="px-6 py-4">Agente</th>
                    <th className="px-6 py-4">Ubicación</th>
                    <th className="px-6 py-4">Precio</th>
                    <th className="px-6 py-4">Visibilidad</th>
                    <th className="px-6 py-4 text-center">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredProperties.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400">
                        <span className="material-symbols-outlined text-4xl block mb-2 text-slate-200">landscape</span>
                        No hay propiedades creadas en la plataforma.
                      </td>
                    </tr>
                  ) : (
                    filteredProperties.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* Title and Thumbnail */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {p.photos && p.photos.length > 0 ? (
                              <img src={p.photos[0]} alt={p.title} className="w-10 h-7 rounded object-cover border border-slate-100 shrink-0" />
                            ) : (
                              <div className="w-10 h-7 rounded bg-slate-50 border border-slate-150 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-sm text-slate-350">landscape</span>
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-slate-800 line-clamp-1">{p.title}</p>
                              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold mt-0.5">
                                {p.property_type}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Agent */}
                        <td className="px-6 py-4 font-medium text-slate-650">
                          {p.agent_profiles?.full_name || 'Desconocido'}
                        </td>

                        {/* Location */}
                        <td className="px-6 py-4 font-semibold text-slate-600">
                          {[p.neighborhood, p.city].filter(Boolean).join(', ')}
                        </td>

                        {/* Price */}
                        <td className="px-6 py-4 font-bold text-slate-800">
                          {p.transaction_type === 'ambos' ? (
                            <div className="flex flex-col text-right">
                              <span>V: {p.currency} {p.sale_price?.toLocaleString('es-PY')}</span>
                              <span className="text-[9px] text-slate-400 font-medium">A: {p.currency} {p.rent_price?.toLocaleString('es-PY')}/mes</span>
                            </div>
                          ) : (
                            <span>
                              {p.currency} {p.transaction_type === 'alquiler' ? p.rent_price?.toLocaleString('es-PY') : p.sale_price?.toLocaleString('es-PY')}
                              {p.transaction_type === 'alquiler' && <span className="text-[10px] text-slate-400 font-normal">/mes</span>}
                            </span>
                          )}
                        </td>

                        {/* Visibility Badge */}
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                            p.visibility === 'marketplace'
                              ? 'bg-violet-50 text-violet-700 border-violet-100'
                              : 'bg-slate-50 text-slate-400 border-slate-200'
                          }`}>
                            {p.visibility === 'marketplace' ? 'Marketplace' : 'Privada'}
                          </span>
                        </td>

                        {/* Action link */}
                        <td className="px-6 py-4 text-center">
                          <Link
                            href={`/propiedades/${p.id}`}
                            className="inline-flex items-center justify-center p-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors"
                          >
                            <span className="material-symbols-outlined text-base">visibility</span>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
