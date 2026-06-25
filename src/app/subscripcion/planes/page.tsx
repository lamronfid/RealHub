'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PlanesPage() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setIsAuthenticated(!!user);
      } catch (e) {
        console.error('Error checking auth state:', e);
      }
    }
    checkAuth();
  }, []);

  const handleSelectPlan = (plan: 'entrada' | 'pro' | 'elite') => {
    if (!isAuthenticated) {
      router.push(`/registrar?plan=${plan}&cycle=${billingCycle}`);
    } else {
      router.push(`/subscripcion/checkout?plan=${plan}&cycle=${billingCycle}`);
    }
  };

  // Pricing calculations
  const plans = {
    entrada: {
      name: 'Plan Entrada',
      subtitle: 'Para agentes individuales que inician',
      monthlyPrice: 15,
      annualPrice: 12,
      yearlyTotal: 144,
      features: [
        'Hasta 10 propiedades publicadas',
        'Marketplace nacional ilimitado',
        'Sistema de Coincidencias en tiempo real',
      ],
      disabledFeatures: [
        'Extractor externo de propiedades (Scraper)',
        'Insignia de verificación holográfica',
        'Soporte prioritario',
      ]
    },
    pro: {
      name: 'Plan Pro',
      subtitle: 'Mayor alcance y herramientas de búsqueda',
      monthlyPrice: 30,
      annualPrice: 24,
      yearlyTotal: 288,
      features: [
        'Hasta 25 propiedades publicadas',
        'Marketplace nacional ilimitado',
        'Sistema de Coincidencias en tiempo real',
        'Scraper de propiedades (100 búsquedas/mes)',
      ],
      disabledFeatures: [
        'Insignia de verificación holográfica',
        'Soporte prioritario VIP',
      ]
    },
    elite: {
      name: 'Plan Élite',
      subtitle: 'El estándar de oro para líderes del mercado',
      monthlyPrice: 100,
      annualPrice: 80,
      yearlyTotal: 960,
      features: [
        'Propiedades publicadas ilimitadas',
        'Marketplace nacional ilimitado',
        'Sistema de Coincidencias en tiempo real',
        'Scraper de propiedades ilimitado',
        '3 Propiedades destacadas al mes',
        'Insignia Élite de verificación holográfica',
        'Soporte VIP 24/7 y herramientas avanzadas',
      ],
      disabledFeatures: []
    }
  };

  const faqs = [
    {
      q: '¿Puedo cambiar de plan más adelante?',
      a: 'Sí, puedes subir o bajar de categoría de plan en cualquier momento desde los ajustes de tu perfil. Si cambias a un plan anual, la diferencia se calculará a prorrata de manera automática.'
    },
    {
      q: '¿Qué formas de pago aceptan?',
      a: 'Aceptamos tarjetas de crédito/débito locales e internacionales, transferencias bancarias en Paraguay (Guaraníes o Dólares) y pagos a través de redes locales como Pago Móvil o bocas de cobranza.'
    },
    {
      q: '¿Cómo funciona el extractor (scraper)?',
      a: 'Te permite pegar el enlace de cualquier propiedad en InfoCasas o Clasipar y rellenar automáticamente la ficha técnica (fotos, m2, descripción, precio y características) en 3 segundos sin tener que escribir nada.'
    },
    {
      q: '¿Tengo algún compromiso de permanencia?',
      a: 'No. Los planes mensuales se pueden cancelar en cualquier momento desde tu panel y no se te cobrará nada más. Los planes anuales se facturan por adelantado y te garantizan un descuento permanente del 20%.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 rounded-3xl p-6 md:p-12 pt-24 md:pt-32 relative overflow-hidden border border-slate-200 shadow-2xl flex flex-col justify-start font-sans">
      
      {/* Top Header Navigation */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/10 group-hover:scale-105 transition-all">
            <span className="material-symbols-outlined text-white text-lg font-bold">domain</span>
          </div>
          <span className="font-heading font-black text-base tracking-wider text-slate-900 group-hover:text-indigo-600 transition-all">
            Real<span className="text-indigo-600 font-extrabold">Hub</span>
          </span>
        </Link>
        
        {!isAuthenticated ? (
          <Link 
            href="/login"
            id="public-login-btn"
            className="px-6 py-2.5 bg-white/80 hover:bg-slate-900 text-slate-700 hover:text-white border border-slate-200 hover:border-slate-900 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-sm flex items-center gap-1.5 backdrop-blur-md"
          >
            <span className="material-symbols-outlined text-sm">login</span>
            Iniciar Sesión
          </Link>
        ) : (
          <Link 
            href="/"
            className="px-6 py-2.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-100 hover:border-indigo-600 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-sm flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">space_dashboard</span>
            Panel de Agente
          </Link>
        )}
      </div>
      


      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-4 mb-10 relative z-10">
        <span className="bg-indigo-50 text-indigo-650 border border-indigo-100 text-[10px] font-extrabold uppercase tracking-widest px-4 py-1.5 rounded-full inline-block">
          Suscripciones RealHub
        </span>
        <h1 className="font-heading text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-none">
          Eleva tu Negocio al <span className="text-indigo-650">Máximo Nivel</span>
        </h1>
        <p className="text-slate-500 text-sm leading-relaxed max-w-lg mx-auto font-semibold">
          Publica propiedades sin límites, automatiza tus cargas con Inteligencia Artificial y destaca tu portafolio en Paraguay.
        </p>

        {/* Banner de Acceso Gratuito Élite */}
        <div className="bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-pink-500/10 border border-indigo-100/60 p-5 rounded-2xl text-left max-w-xl mx-auto mt-6 relative overflow-hidden shadow-sm">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-indigo-600 text-2xl shrink-0 mt-0.5">verified_user</span>
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Acceso Élite Habilitado de forma Gratuita</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed font-semibold mt-1">
                Durante esta fase de lanzamiento, hemos habilitado de forma gratuita los beneficios del **Plan Élite** para todos los usuarios. No es necesario realizar ningún pago para publicar propiedades ilimitadas, usar el scraper o tener tu cuenta verificada.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 🔄 BILLING CYCLE TOGGLE */}
      <div className="flex flex-col items-center justify-center relative z-10 mb-12 space-y-3">
        <div className="flex items-center bg-slate-200/60 border border-slate-300/40 p-1.5 rounded-2xl relative shadow-inner">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all relative z-10 ${
              billingCycle === 'monthly' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Mensual
          </button>
          
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all relative z-10 flex items-center gap-1.5 ${
              billingCycle === 'annual' ? 'bg-white text-indigo-650 shadow-md' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Anual
            <span className="bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md">
              -20%
            </span>
          </button>
        </div>
        
        {billingCycle === 'annual' && (
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest animate-bounce">
            🎉 Ahorras hasta $240 dólares al año facturando anualmente
          </p>
        )}
      </div>

      {/* Planes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto w-full relative z-10 mb-16 items-stretch">
        
        {/* Plan Entrada */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col justify-between hover:border-slate-350 transition-all duration-500 hover:scale-[1.01] hover:shadow-[0_12px_40px_rgba(15,23,42,0.04)] relative group">
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-heading text-xl font-black text-slate-855 tracking-tight">{plans.entrada.name}</h3>
                <p className="text-xs text-slate-400 font-semibold mt-1">{plans.entrada.subtitle}</p>
              </div>
            </div>
            
            <div className="mb-6">
              <div className="flex items-baseline gap-1.5">
                <span className="font-heading text-6xl font-black text-slate-900 tracking-tight transition-all duration-300">
                  ${billingCycle === 'monthly' ? plans.entrada.monthlyPrice : plans.entrada.annualPrice}
                </span>
                <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">/ mes</span>
              </div>
              {billingCycle === 'annual' && (
                <p className="text-[10px] font-bold text-slate-400 mt-1">Facturado anualmente (${plans.entrada.yearlyTotal}/año)</p>
              )}
            </div>

            <hr className="border-slate-100 my-6" />

            <ul className="space-y-4 text-xs text-slate-650 font-medium">
              {plans.entrada.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-indigo-600 text-lg">check</span>
                  {f}
                </li>
              ))}
              {plans.entrada.disabledFeatures.map((f, i) => (
                <li key={i} className="flex items-center gap-2.5 text-slate-300 line-through">
                  <span className="material-symbols-outlined text-slate-300 text-lg">close</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          
          <button 
            onClick={() => handleSelectPlan('entrada')}
            className="w-full mt-8 py-3.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-900 hover:text-white hover:border-slate-900 text-slate-800 font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-sm active:scale-[0.98]"
          >
            Obtener Plan Entrada
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col justify-between hover:border-slate-300 transition-all duration-500 relative group">
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-heading text-xl font-black text-slate-855 tracking-tight">{plans.pro.name}</h3>
                <p className="text-xs text-slate-400 font-semibold mt-1">{plans.pro.subtitle}</p>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1.5">
                <span className="font-heading text-6xl font-black text-slate-900 tracking-tight transition-all duration-300">
                  ${billingCycle === 'monthly' ? plans.pro.monthlyPrice : plans.pro.annualPrice}
                </span>
                <span className="text-xs text-slate-455 font-bold uppercase tracking-wider">/ mes</span>
              </div>
              {billingCycle === 'annual' && (
                <p className="text-[10px] font-bold text-slate-400 mt-1">Facturado anualmente (${plans.pro.yearlyTotal}/año)</p>
              )}
            </div>

            <hr className="border-slate-100 my-6" />

            <ul className="space-y-4 text-xs text-slate-655 font-medium">
              {plans.pro.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-indigo-600 text-lg">check</span>
                  {f}
                </li>
              ))}
              {plans.pro.disabledFeatures.map((f, i) => (
                <li key={i} className="flex items-center gap-2.5 text-slate-300 line-through">
                  <span className="material-symbols-outlined text-slate-300 text-lg">close</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          
          <button 
            onClick={() => handleSelectPlan('pro')}
            className="w-full mt-8 py-3.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-900 hover:text-white hover:border-slate-900 text-slate-805 font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-sm active:scale-[0.98]"
          >
            Obtener Plan Pro
          </button>
        </div>

        <div className="bg-white border-2 border-indigo-600 rounded-3xl p-8 flex flex-col justify-between hover:border-indigo-700 transition-all duration-500 relative hover:scale-[1.02] overflow-hidden">
          {/* Top Banner Tag */}
          <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest py-1.5 px-6 rounded-bl-2xl">
            Recomendado
          </div>
          
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-heading text-xl font-black text-indigo-650 flex items-center gap-1.5">
                  Plan Élite <span className="material-symbols-outlined text-indigo-600 text-lg">workspace_premium</span>
                </h3>
                <p className="text-xs text-slate-400 font-semibold mt-1">{plans.elite.subtitle}</p>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1.5">
                <span className="font-heading text-6xl font-black text-slate-900 tracking-tight transition-all duration-300">
                  ${billingCycle === 'monthly' ? plans.elite.monthlyPrice : plans.elite.annualPrice}
                </span>
                <span className="text-xs text-slate-455 font-bold uppercase tracking-wider">/ mes</span>
              </div>
              {billingCycle === 'annual' && (
                <p className="text-[10px] font-bold text-slate-455 mt-1">Facturado anualmente (${plans.elite.yearlyTotal}/año)</p>
              )}
            </div>

            <hr className="border-indigo-100 my-6" />

            <ul className="space-y-4 text-xs text-slate-655 font-semibold">
              {plans.elite.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          
          <button 
            onClick={() => handleSelectPlan('elite')}
            className="w-full mt-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-widest active:scale-[0.98] transition-all"
          >
            Obtener Plan Élite
          </button>
        </div>

      </div>

      {/* 📊 INTERACTIVE FEATURES COMPARISON DRAWER */}
      <div className="max-w-4xl mx-auto w-full relative z-10 mb-16">
        <button
          onClick={() => setShowComparison(!showComparison)}
          className="w-full py-4 px-6 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs font-black uppercase tracking-widest text-indigo-650 transition-all shadow-sm"
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">view_list</span>
            {showComparison ? 'Ocultar Comparativa Detallada' : 'Comparar todas las características'}
          </span>
          <span className="material-symbols-outlined transition-transform duration-300" style={{ transform: showComparison ? 'rotate(180deg)' : 'rotate(0)' }}>
            expand_more
          </span>
        </button>

        {showComparison && (
          <div className="mt-4 bg-white border border-slate-100 rounded-3xl p-6 shadow-premium overflow-x-auto animate-fade-in">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  <th className="py-3 px-4">Características</th>
                  <th className="py-3 px-4 text-center">Entrada</th>
                  <th className="py-3 px-4 text-center">Pro</th>
                  <th className="py-3 px-4 text-center">Élite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700 font-semibold">
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-800">Publicaciones Máximas</td>
                  <td className="py-3.5 px-4 text-center text-slate-600">10 propiedades</td>
                  <td className="py-3.5 px-4 text-center text-slate-600">25 propiedades</td>
                  <td className="py-3.5 px-4 text-center text-indigo-600 font-black">Ilimitadas</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-800">Marketplace Nacional</td>
                  <td className="py-3.5 px-4 text-center text-emerald-500"><span className="material-symbols-outlined text-lg">check_circle</span></td>
                  <td className="py-3.5 px-4 text-center text-emerald-500"><span className="material-symbols-outlined text-lg">check_circle</span></td>
                  <td className="py-3.5 px-4 text-center text-emerald-500"><span className="material-symbols-outlined text-lg">check_circle</span></td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-800">Coincidencias en tiempo real</td>
                  <td className="py-3.5 px-4 text-center text-emerald-500"><span className="material-symbols-outlined text-lg">check_circle</span></td>
                  <td className="py-3.5 px-4 text-center text-emerald-500"><span className="material-symbols-outlined text-lg">check_circle</span></td>
                  <td className="py-3.5 px-4 text-center text-emerald-500"><span className="material-symbols-outlined text-lg">check_circle</span></td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-800">Extractor Automático (Scraper)</td>
                  <td className="py-3.5 px-4 text-center text-slate-350"><span className="material-symbols-outlined text-lg">cancel</span></td>
                  <td className="py-3.5 px-4 text-center text-slate-600">100 búsquedas / mes</td>
                  <td className="py-3.5 px-4 text-center text-indigo-600 font-black">Búsquedas Ilimitadas</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-800">Insignia holográfica de Verificado</td>
                  <td className="py-3.5 px-4 text-center text-slate-350"><span className="material-symbols-outlined text-lg">cancel</span></td>
                  <td className="py-3.5 px-4 text-center text-slate-350"><span className="material-symbols-outlined text-lg">cancel</span></td>
                  <td className="py-3.5 px-4 text-center text-emerald-500"><span className="material-symbols-outlined text-lg">check_circle</span></td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-800">Propiedades Destacadas</td>
                  <td className="py-3.5 px-4 text-center text-slate-350">Ninguna</td>
                  <td className="py-3.5 px-4 text-center text-slate-350">Ninguna</td>
                  <td className="py-3.5 px-4 text-center text-slate-600">3 al mes (1 semana c/u)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-800">Soporte Tecnológico</td>
                  <td className="py-3.5 px-4 text-center text-slate-600">Por email (Estándar)</td>
                  <td className="py-3.5 px-4 text-center text-slate-600">Prioritario (WhatsApp)</td>
                  <td className="py-3.5 px-4 text-center text-indigo-600 font-black">VIP Exclusivo 24/7</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ❓ INTERACTIVE FAQ SECTION */}
      <div className="max-w-3xl mx-auto w-full relative z-10 space-y-4">
        <h3 className="font-heading text-xl font-black text-slate-900 text-center mb-6">Preguntas Frecuentes</h3>
        
        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div 
                key={index} 
                className="bg-white border border-slate-150 rounded-2xl overflow-hidden shadow-sm transition-all"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full py-4 px-5 flex items-center justify-between text-left font-bold text-xs uppercase tracking-wider text-slate-850 focus:outline-none hover:bg-slate-50 transition-colors"
                >
                  <span>{faq.q}</span>
                  <span className="material-symbols-outlined transition-transform duration-300" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>
                    expand_more
                  </span>
                </button>
                
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs text-slate-500 font-semibold leading-relaxed animate-fade-in border-t border-slate-50 mt-1">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
