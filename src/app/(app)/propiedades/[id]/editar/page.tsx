import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import EditPropertyForm from './EditPropertyForm';

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: property } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .eq('agent_id', user.id)
    .single();

  if (!property) notFound();

  return (
    <div className="max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href={`/propiedades/${id}`} className="text-sm font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 mb-2">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Volver
          </Link>
          <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-bold text-slate-900">Editar Propiedad</h2>
          <p className="text-slate-500 text-sm mt-1">{property.title}</p>
        </div>
      </div>

      <EditPropertyForm property={property} />
    </div>
  );
}
