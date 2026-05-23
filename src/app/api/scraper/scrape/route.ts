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

    if (!url) {
      return NextResponse.json({ error: 'Se requiere la URL de la propiedad.' }, { status: 400 });
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

    const tier = profile.subscription_tier || 'free';
    const searchesUsed = profile.scraper_searches_used || 0;

    // 4. Access Control Gates
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

    // =========================================================================
    // TODO PARA TU AMIGO (INTEGRACIÓN DEL SCRAPER REAL):
    // 
    // 1. Aquí recibes la variable `url` (ej: 'https://www.infocasas.com.py/departamento-en-alquiler...')
    // 2. Puedes realizar un fetch/axios a esa URL, parsear el HTML usando Cheerio/JS o llamar
    //    a tu propio microservicio de scraping.
    // 3. Extrae la información relevante de la página.
    // 4. Mapea tus variables al formato JSON de retorno (el objeto `mockScrapedData` de abajo).
    // =========================================================================

    // Simulador de retraso de red / procesamiento de scraping (2 segundos)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Generador de datos simulados según la URL ingresada
    const isClasipar = url.includes('clasipar.com.py');
    const isInfoCasas = url.includes('infocasas.com.py');

    let scrapedData = {
      title: 'Departamento Moderno Amoblado de 2 Dormitorios',
      description: 'Espectacular departamento totalmente amoblado y equipado en el corazón de Villa Morra. Cuenta con 2 dormitorios (1 en suite), amplia sala de estar con salida al balcón, parrilla a carbón, cocina equipada con electrodomésticos de acero inoxidable, cochera para 1 vehículo. Amenities del edificio de primer nivel: piscina con borde infinito, quincho climatizado, gimnasio y seguridad 24 horas.',
      transaction_type: 'alquiler',
      property_type: 'departamento',
      sale_price: null as number | null,
      rent_price: 1100 as number | null,
      currency: 'USD',
      department: 'Asunción',
      city: 'Asunción',
      neighborhood: 'Villa Morra',
      bedrooms: 2,
      bathrooms: 2,
      garages: 1,
      m2_terrain: 95,
      m2_built: 95,
      amenities: ['Piscina', 'Quincho', 'Gimnasio', 'Seguridad 24hs', 'Balcón'],
      photos: [
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80'
      ],
      original_url: url,
      source: isClasipar ? 'Clasipar' : isInfoCasas ? 'InfoCasas' : 'Web Externa'
    };

    // Personalizar datos simulados para dar variedad si el usuario busca algo de venta o casa
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('venta') || lowerUrl.includes('comprar')) {
      scrapedData.title = 'Residencia de Lujo con Piscina en Carmelitas';
      scrapedData.description = 'Hermosa casa de estilo moderno en Barrio Carmelitas. Planta Baja: Amplio living social, comedor independiente, escritorio, baño social, cocina equipada con desayunador, depósito, área de servicio completa. Galería techada con parrilla, amplio patio empastado con piscina. Planta Alta: 3 dormitorios en suite, el principal con vestidor y jacuzzi. Cochera cerrada para 3 vehículos.';
      scrapedData.transaction_type = 'compra';
      scrapedData.property_type = 'casa';
      scrapedData.sale_price = 450000;
      scrapedData.rent_price = null;
      scrapedData.neighborhood = 'Carmelitas';
      scrapedData.bedrooms = 3;
      scrapedData.bathrooms = 4;
      scrapedData.garages = 3;
      scrapedData.m2_terrain = 420;
      scrapedData.m2_built = 380;
      scrapedData.amenities = ['Piscina', 'Quincho', 'Jardín', 'Seguridad 24hs'];
      scrapedData.photos = [
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80'
      ];
    } else if (lowerUrl.includes('terreno') || lowerUrl.includes('lote')) {
      scrapedData.title = 'Terreno Amplio Listo para Desarrollar en Luque';
      scrapedData.description = 'Excelente oportunidad para inversionistas o desarrolladores. Terreno regular, totalmente plano y limpio, ubicado en zona estratégica de Luque (Barrio Rakiura). Cuenta con fácil acceso pavimentado, todos los servicios públicos instalados (agua, luz, fibra óptica). Ideal para construcción de dúplex o residencia unifamiliar.';
      scrapedData.transaction_type = 'compra';
      scrapedData.property_type = 'terreno';
      scrapedData.sale_price = 85000;
      scrapedData.rent_price = null;
      scrapedData.currency = 'USD';
      scrapedData.city = 'Luque';
      scrapedData.neighborhood = 'Rakiura';
      scrapedData.bedrooms = 0;
      scrapedData.bathrooms = 0;
      scrapedData.garages = 0;
      scrapedData.m2_terrain = 360;
      scrapedData.m2_built = 0;
      scrapedData.amenities = [];
      scrapedData.photos = [
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80'
      ];
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
