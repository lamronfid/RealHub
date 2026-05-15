import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import EditProspectForm from './EditProspectForm';

export default async function EditProspectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: prospect } = await supabase
    .from('prospects')
    .select('*')
    .eq('id', id)
    .eq('agent_id', user.id)
    .single();

  if (!prospect) notFound();

  return (
    <div className="max-w-4xl mx-auto pb-24">
      <div className="mb-6">
        <Link href="/prospectos" className="text-sm font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 mb-2">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Volver
        </Link>
        <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-bold text-slate-900">Editar Prospecto</h2>
        <p className="text-slate-500 text-sm mt-1">{prospect.full_name}</p>
      </div>

      <EditProspectForm prospect={prospect} />
    </div>
  );
}
