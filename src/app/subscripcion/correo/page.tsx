'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense } from 'react';

function CorreoSimuladorPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const plan = searchParams.get('plan') || 'elite';
  
  const [emailOpen, setEmailOpen] = useState(true);

  const handleActivate = () => {
    router.push(`/subscripcion/checkout?plan=${plan}`);
  };

  return (
    <div className="min-h-[85vh] bg-[#080B16] text-slate-200 rounded-3xl overflow-hidden border border-slate-900 shadow-2xl flex flex-col font-sans">
      
      {/* Top Bar of Email Client */}
      <div className="bg-[#0E1325] border-b border-slate-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
          <span className="text-xs text-slate-400 font-bold ml-3 uppercase tracking-widest font-heading">
            Superhuman Mail Simulator
          </span>
        </div>
        <div className="flex bg-[#070911] rounded-lg p-0.5 border border-slate-800 text-xs font-semibold text-slate-500">
          <span className="px-3 py-1 rounded bg-[#161D35] text-indigo-400">localhost_sandbox</span>
        </div>
      </div>

      {/* Main workspace */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-[500px]">
        
        {/* Left Mailbox Sidebar */}
        <aside className="w-full lg:w-64 bg-[#0A0E1C] border-b lg:border-b-0 lg:border-r border-slate-900 p-4 space-y-6">
          <button className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-950/50">
            <span className="material-symbols-outlined text-sm">edit</span> Redactar
          </button>
          
          <nav className="space-y-1">
            <button className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.04] text-white text-xs font-semibold">
              <span className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-indigo-400 text-base">inbox</span> Recibidos
              </span>
              <span className="bg-indigo-500/20 text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full">1</span>
            </button>
            <button className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-500 hover:bg-white/[0.02] hover:text-slate-300 text-xs font-semibold text-left">
              <span className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-base">send</span> Enviados
              </span>
            </button>
            <button className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-500 hover:bg-white/[0.02] hover:text-slate-300 text-xs font-semibold text-left">
              <span className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-base">draft</span> Borradores
              </span>
            </button>
            <button className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-500 hover:bg-white/[0.02] hover:text-slate-300 text-xs font-semibold text-left">
              <span className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-base">report</span> Spam
              </span>
            </button>
          </nav>
        </aside>

        {/* Email list */}
        <section className="w-full lg:w-80 bg-[#070912] border-b lg:border-b-0 lg:border-r border-slate-900 overflow-y-auto">
          <div className="p-4 border-b border-slate-900/60 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hoy</span>
            <span className="text-[10px] text-slate-500 font-medium">1 mensaje</span>
          </div>

          <div
            onClick={() => setEmailOpen(true)}
            className={`p-4 border-b border-slate-900 transition-all cursor-pointer ${
              emailOpen ? 'bg-indigo-950/20 border-l-4 border-l-indigo-500' : 'hover:bg-white/[0.01]'
            }`}
          >
            <div className="flex justify-between items-start mb-1">
              <span className="text-xs font-bold text-white">Facturación RealHub</span>
              <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">Hace 1 min</span>
            </div>
            <h4 className="text-xs font-semibold text-slate-300 truncate mb-1">
              ⚡ Activa tu cuenta premium en RealHub
            </h4>
            <p className="text-[11px] text-slate-500 line-clamp-2">
              Hola, estás a un paso de activar tu suscripción Élite y obtener acceso al scraper ilimitado...
            </p>
          </div>
        </section>

        {/* Email Content Panel */}
        <main className="flex-1 bg-[#090C19] p-6 lg:p-10 flex flex-col justify-between overflow-y-auto relative">
          
          {/* Top glow */}
          <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

          {emailOpen ? (
            <div className="space-y-8 max-w-2xl mx-auto w-full relative z-10">
              {/* Email header */}
              <div className="border-b border-white/[0.05] pb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-heading text-xl font-bold text-white">
                    ⚡ Activa tu cuenta premium en RealHub
                  </h2>
                  <div className="flex items-center gap-1 bg-[#25D366]/10 text-[#25D366] text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border border-[#25D366]/20">
                    Verificado
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <p>De: <span className="text-slate-200 font-semibold">RealHub Billing</span> &lt;billing@realhub.com.py&gt;</p>
                  <p>Para: <span className="text-slate-200 font-semibold">mibaul@gmail.com</span></p>
                </div>
              </div>

              {/* Sleek HTML Email body representation */}
              <div className="bg-[#0B0F24] border border-white/[0.06] rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl">
                
                {/* Logo and Greeting */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                      <span className="text-white font-black text-xs">R</span>
                    </div>
                    <span className="font-heading font-bold text-white text-sm">RealHub</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Activación de Cuenta</span>
                </div>

                <div className="space-y-4">
                  <h3 className="font-heading text-lg md:text-xl font-black text-white">
                    Estás a un solo clic de la excelencia inmobiliaria.
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Hola,<br />
                    Gracias por confiar en <strong>RealHub</strong>. Hemos recibido tu solicitud para activar el <span className="text-indigo-400 font-semibold uppercase">Plan {plan}</span> en tu cuenta de agente.
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Al activar este plan, desbloquearás la insignia de verificación holográfica, el Scraper ilimitado de portales externos, y podrás destacar tus propiedades principales en nuestro Marketplace nacional sin límites.
                  </p>
                </div>

                {/* Offer details Box */}
                <div className="bg-[#121834] rounded-2xl p-4 border border-indigo-500/20 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-300">Plan Seleccionado</span>
                    <span className="font-extrabold text-indigo-400 uppercase">Plan {plan}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-300">Costo Mensual</span>
                    <span className="font-extrabold text-white">{plan === 'elite' ? '$100 / mes' : plan === 'pro' ? '$30 / mes' : '$15 / mes'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-300">Beneficios Clave</span>
                    <span className="text-slate-400 text-[10px] font-medium text-right">Insignia + Scraper + Destacados</span>
                  </div>
                </div>

                <button
                  onClick={handleActivate}
                  className="w-full py-3.5 bg-gradient-to-r from-sky-400 via-indigo-500 to-pink-500 text-white font-extrabold text-xs uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(99,102,241,0.25)] rounded-2xl flex items-center justify-center gap-1.5"
                >
                  Confirmar y Completar Activación <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>

                <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                  Si no solicitaste esta activación, puedes ignorar este correo. Este es un correo automático enviado por el sandbox del simulador de RealHub.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-5xl text-slate-700 mb-3">mail</span>
              <p className="text-slate-500 text-xs font-semibold">Selecciona un correo de la lista para leerlo</p>
            </div>
          )}
          
          <div className="mt-8 border-t border-white/[0.05] pt-6 flex items-center justify-between text-xs text-slate-500 relative z-10">
            <span>RealHub Sandbox Mailer</span>
            <button onClick={() => router.push('/subscripcion/planes')} className="hover:text-slate-300 flex items-center gap-1 transition-colors">
              <span className="material-symbols-outlined text-sm">arrow_back</span> Volver a planes
            </button>
          </div>

        </main>
      </div>

    </div>
  );
}

export default function CorreoSimuladorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[85vh] bg-[#080B16] text-slate-200 rounded-3xl overflow-hidden border border-slate-900 shadow-2xl flex flex-col font-sans justify-center items-center font-sans">
        <p className="text-slate-500 text-xs font-semibold">Cargando simulador de correo...</p>
      </div>
    }>
      <CorreoSimuladorPageContent />
    </Suspense>
  );
}
