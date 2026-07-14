import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Authentication Check
    if (!user) {
      return NextResponse.json({ error: 'No autorizado. Inicie sesión.' }, { status: 401 });
    }

    // 2. Read request body
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Se requiere la URL de la propiedad.' }, { status: 400 });
    }

    // SSRF and input validation: ensure it's a valid http/https URL pointing to a allowed/known domain
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return NextResponse.json({ error: 'Esquema de URL no válido. Solo se permiten http o https.' }, { status: 400 });
      }
      
      // Simple sanity checks: avoid localhost or loopback requests
      const hostname = parsedUrl.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.16.') ||
        hostname.startsWith('169.254.')
      ) {
        return NextResponse.json({ error: 'Acceso a direcciones locales o privadas no permitido.' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'La URL proporcionada no es válida.' }, { status: 400 });
    }

    // 3. Get User Profile and Subscription Limits
    const { data: profile, error: profileError } = await supabase
      .from('agent_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'No se pudo cargar el perfil del agente.' }, { status: 500 });
    }

    const adminEmails = ['lamronfidd@gmail.com', 'jonyocampos@gmail.com', 'lamronfid@gmail.com'];
    const isAdminOrOwner = 
      profile.role === 'admin' || 
      profile.role === 'superadmin' || 
      profile.role === 'owner' ||
      (user.email && adminEmails.includes(user.email.toLowerCase()));
      
    const tier = profile.subscription_tier || 'free';
    const searchesUsed = profile.scraper_searches_used || 0;

    // 4. Access Control Gates - Bypassed for free launch phase
    /* 
    if (!isAdminOrOwner) {
      if (tier === 'free' || tier === 'standard') {
        return NextResponse.json({ 
          error: 'Función bloqueada. El Scraper requiere una suscripción Plan Pro o Plan Élite.',
          code: 'TIER_LOCKED'
        }, { status: 403 });
      }

      if (tier === 'pro' && searchesUsed >= 100) {
        return NextResponse.json({ 
          error: 'Límite mensual excedido. Has utilizado tus 100 búsquedas del Plan Pro. Súbete al Plan Élite para búsquedas ilimitadas.',
          code: 'LIMIT_EXCEEDED'
        }, { status: 403 });
      }
    }
    */

    // =========================================================================
    // INTEGRACIÓN DEL SCRAPER REAL:
    // =========================================================================
    let scrapedData: any = null;

    const PROPSEARCH_URL = process.env.PROPSEARCH_URL || '';
    const PROPSEARCH_SECRET = process.env.PROPSEARCH_SECRET || '';

    if (PROPSEARCH_URL) {
      console.log('Fetching scraper microservice on Railway:', PROPSEARCH_URL);
      try {
        const res = await fetch(`${PROPSEARCH_URL}/scrape-url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${PROPSEARCH_SECRET}`,
          },
          body: JSON.stringify({ url }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP error ${res.status}`);
        }

        const resJson = await res.json();
        scrapedData = resJson;
      } catch (err: any) {
        console.error('Error fetching Railway scraper microservice:', err);
        return NextResponse.json({ error: `Error en microservicio: ${err.message}` }, { status: 502 });
      }
    } else {
      // Local development child_process fallback
      console.log('No PROPSEARCH_URL environment variable found. Falling back to local python execution...');
      try {
        const { spawn } = require('child_process');
        const path = require('path');
        const propsearchPath = path.join(process.cwd(), 'scraper');
        
        // Python code executed via -c argument. Safe because we don't pass arguments through shell.
        const pythonCode = `import sys, asyncio, json; sys.path.append(sys.argv[1]); from single_scraper import scrape_single_url; sys.stdout.reconfigure(encoding='utf-8'); res = asyncio.run(scrape_single_url(sys.argv[2])); sys.stdout.write(json.dumps(res, ensure_ascii=False))`;
        
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
        
        // Use Promise to run spawn asynchronously and safely (shell: false)
        scrapedData = await new Promise((resolve, reject) => {
          const child = spawn(pythonCmd, ['-c', pythonCode, propsearchPath, url], {
            cwd: propsearchPath,
            shell: false,
          });
          
          let stdout = '';
          let stderr = '';
          
          child.stdout.on('data', (d: Buffer) => {
            stdout += d.toString();
          });
          
          child.stderr.on('data', (d: Buffer) => {
            stderr += d.toString();
          });
          
          child.on('close', (code: number) => {
            if (code !== 0) {
              reject(new Error(`Python process exited with code ${code}. Error: ${stderr}`));
            } else {
              try {
                resolve(JSON.parse(stdout));
              } catch (e) {
                reject(new Error(`Failed to parse Python output: ${stdout}`));
              }
            }
          });
          
          child.on('error', (err: any) => {
            reject(err);
          });
        });
      } catch (err: any) {
        console.error('Error running local Python scraper:', err);
        return NextResponse.json({ 
          error: `Error al ejecutar scraper local: ${err.message}. Asegúrese de tener Python, playwright y dependencias instaladas.` 
        }, { status: 500 });
      }
    }

    // 5. Incrementar el contador de búsquedas del agente en la base de datos
    const { error: updateError } = await supabase
      .from('agent_profiles')
      .update({ scraper_searches_used: searchesUsed + 1 })
      .eq('id', user.id);

    if (updateError) {
      console.warn('Error al actualizar el contador de búsquedas:', updateError.message);
    }

    return NextResponse.json({ 
      success: true, 
      data: scrapedData,
      usage: {
        used: searchesUsed + 1,
        limit: tier === 'elite' ? null : 100
      }
    });

  } catch (error: any) {
    console.error('Error in API scraper endpoint:', error);
    return NextResponse.json({ error: 'Ocurrió un error inesperado al procesar la extracción.' }, { status: 500 });
  }
}
