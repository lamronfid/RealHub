import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // 1. Authenticate the requesting user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Verify that this user is an administrator
  const adminEmails = ['lamronfidd@gmail.com', 'jonyocampos@gmail.com', 'lamronfid@gmail.com'];
  const isAdminEmail = user.email ? adminEmails.includes(user.email.toLowerCase()) : false;

  const { data: profile } = await supabase
    .from('agent_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = isAdminEmail || profile?.role === 'admin';

  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // 3. Create the service role client to fetch from auth schema
    const serviceClient = createServiceClient();

    const { data: profiles, error: profilesError } = await serviceClient
      .from('agent_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // Fetch all users from Supabase auth admin API
    const { data: { users }, error: usersError } = await serviceClient.auth.admin.listUsers();

    if (usersError) {
      // Fallback: if auth list fails (e.g. key missing in dev), return profiles without email
      console.error('Error listing auth users:', usersError);
      return NextResponse.json(profiles);
    }

    // 4. Map the email from auth.users to agent_profiles
    const enrichedAgents = profiles.map((p: any) => {
      const authUser = users.find((u: any) => u.id === p.id);
      return {
        ...p,
        email: authUser?.email || null,
      };
    });

    return NextResponse.json(enrichedAgents);
  } catch (err: any) {
    console.error('Admin agents endpoint error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
