import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Protect all routes except login, registrar, subscription simulator, shared properties, and public assets
  const isPublicPage = 
    request.nextUrl.pathname === '/login' || 
    request.nextUrl.pathname === '/registrar' ||
    request.nextUrl.pathname.startsWith('/subscripcion') ||
    request.nextUrl.pathname.startsWith('/p/');

  const isPublicApi =
    request.nextUrl.pathname === '/api/subscripcion/webhook' ||
    request.nextUrl.pathname === '/api/scraper/cron';

  const isPublicAsset = 
    request.nextUrl.pathname.startsWith('/_next') ||
    isPublicApi ||
    request.nextUrl.pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/);

  // If unauthenticated and trying to access a protected route
  if (!user && !isPublicPage && !isPublicAsset) {
    // If it's a backend API endpoint, return 401 Unauthorized directly instead of redirecting
    if (request.nextUrl.pathname.startsWith('/api')) {
      return new NextResponse(
        JSON.stringify({ error: 'No autorizado. Inicie sesión.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const url = request.nextUrl.clone();
    url.pathname = '/subscripcion/planes';
    return NextResponse.redirect(url);
  }

  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/registrar')) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
