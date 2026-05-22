import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { PIPELINE_STAGES, STAGE_LABELS, STAGE_COLORS, type PipelineStage } from '@/lib/types';
import PipelineBoard from '@/components/PipelineBoard';

export default async function ProspectosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: prospects } = await supabase
    .from('prospects')
    .select('*')
    .eq('agent_id', user.id)
    .order('stage_updated_at', { ascending: false });

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold text-slate-900">Pipeline de Prospectos</h2>
          <p className="text-slate-500 text-sm mt-1">{prospects?.length || 0} prospectos</p>
        </div>
        <Link href="/prospectos/nuevo"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-5 py-3 rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-indigo-200 transition-all"
        >
          <span className="material-symbols-outlined text-lg">person_add</span>
          Nuevo Prospecto
        </Link>
      </div>

      {(!prospects || prospects.length === 0) ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <span className="material-symbols-outlined text-6xl text-slate-200 mb-4 block">people</span>
          <h3 className="text-xl font-bold text-slate-700 mb-2">Sin prospectos</h3>
          <p className="text-slate-400 mb-6">Agrega tu primer prospecto para activar el pipeline.</p>
          <Link href="/prospectos/nuevo"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium text-sm hover:bg-indigo-700 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">person_add</span>
            Agregar Prospecto
          </Link>
        </div>
      ) : (
        <PipelineBoard prospects={prospects} />
      )}
    </div>
  );
}
