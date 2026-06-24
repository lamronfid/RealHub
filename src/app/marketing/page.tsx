"use client";

import { useState } from "react";

export default function MarketingBoardPage() {
  const [activeTab, setActiveTab] = useState<"linkedin" | "instagram" | "whatsapp">("linkedin");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setToastMessage(`¡Copiado ${label} al portapapeles!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const linkedinCopy = `🚀 **El corretaje inmobiliario en Paraguay acaba de evolucionar.**

Si sos agente o director de una inmobiliaria, sabés lo caótico que es gestionar el "canje" de propiedades en grupos de WhatsApp. PDFs que no abren, links que se pierden y, lo peor, el riesgo constante de perder la relación directa con tu cliente.

Por eso creamos **RealHub**: la primera plataforma diseñada exclusivamente para potenciar el trabajo en equipo de forma segura, transparente y profesional.

**¿Qué podés hacer en RealHub?**
✅ **The Collection**: Accedé a un marketplace cerrado donde cada propiedad está lista para un canje 50/50 verificado.
✅ **Fichas Marca Blanca**: Compartí cualquier propiedad con tu cliente con un solo clic. Él verá la ficha interactiva únicamente con TUS datos de contacto.
✅ **Panel de Agencia**: Si tenés una inmobiliaria, monitoreá el inventario, los agentes y los matches del equipo en tiempo real.
✅ **Pagos Locales**: Suscribite de forma simple a planes locales en Guaraníes a través de Pagopar (tarjetas, bocas de cobranza y billeteras).

Dejá atrás el desorden de los chats y empezá a cerrar más operaciones en colaboración.

🔗 Registrate gratis hoy mismo en: **[Tu URL de Lanzamiento]**

#PropTech #RealEstateParaguay #BienesRaices #CoCorretaje #InmobiliariasParaguay #RealHub`;

  const instagramSlides = [
    {
      slide: "Slide 1: Portada",
      title: "Cómo duplicar tus cierres inmobiliarios en Paraguay",
      desc: "Diseño limpio con tipografía de alto impacto, colores oscuros (fondos premium) y detalles en dorado. Subtítulo: 'Sin gastar un guaraní de más en portales saturados.'",
    },
    {
      slide: "Slide 2: El Problema",
      title: "El caos de los PDFs y grupos de WhatsApp",
      desc: "Grupos saturados de PDFs de 20MB que nadie descarga, datos duplicados y el miedo constante a que te puenteen al cliente de toda la vida.",
    },
    {
      slide: "Slide 3: La Solución",
      title: "Fichas Interactivas Marca Blanca",
      desc: "Comparte propiedades con un clic. El cliente final recibe una ficha ultra veloz y estética que solo muestra tu nombre, foto y tu WhatsApp directo.",
    },
    {
      slide: "Slide 4: El Ecosistema",
      title: "Colabora de forma transparente y segura",
      desc: "Marketplace cerrado exclusivo para agentes profesionales. Sistema de matches automático cuando buscas una propiedad para tu cliente.",
    },
    {
      slide: "Slide 5: Call to Action",
      title: "Únete a la red inmobiliaria de Paraguay",
      desc: "Visita el enlace de la bio y regístrate gratis hoy mismo. Activa tu perfil verificado de RealHub.",
    },
  ];

  const whatsappScripts = [
    {
      id: "agentes",
      title: "Outreach para Agentes Independientes",
      subtitle: "Foco en el Canje Seguro y Fichas Marca Blanca",
      text: `¡Hola [Nombre], cómo estás! Te escribe [Tu Nombre] de RealHub. Estuve viendo tus propiedades en [Instagram/Portal] y tenés un portafolio espectacular.

Te escribo porque acabamos de lanzar RealHub, una comunidad exclusiva para agentes en Paraguay donde compartimos propiedades para canje (50/50) de forma segura.

Lo mejor de la plataforma es que podés generar un link marca blanca de cualquier propiedad del marketplace para enviárselo a tu cliente. El cliente solo verá tus datos de contacto, cuidando tu comisión al 100%.

Registrarse lleva menos de 2 minutos y podés empezar gratis. ¿Te gustaría que te pase el link para que lo pruebes?`,
    },
    {
      id: "directores",
      title: "Outreach para Directores de Inmobiliarias",
      subtitle: "Foco en el Panel de Agencia, Control y Matches de Equipo",
      text: `Estimado/a [Nombre], buenas tardes. Le escribe [Tu Nombre] de RealHub.

Me pongo en contacto porque estamos presentando a las principales inmobiliarias de Paraguay el nuevo Panel de Agencia de RealHub (/agencia).

Diseñamos esta herramienta para que los directores puedan centralizar el inventario de su equipo, ver en tiempo real qué propiedades publican sus agentes y recibir alertas automáticas cuando haya un 'Match' entre las búsquedas de sus clientes y las propiedades de otros colegas de la red.

Habilitamos una opción de registro corporativo para inmobiliarias. Si me permite 5 minutos, me encantaría enviarle una demo rápida para que vea cómo puede potenciar el corretaje de su equipo.`,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-16">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-indigo-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-indigo-400/30 animate-bounce">
          <span className="material-symbols-outlined text-white">check_circle</span>
          <span className="font-medium text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Hero Section */}
      <header className="relative overflow-hidden border-b border-slate-900 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full text-xs font-semibold uppercase tracking-wider">
                Marketing Board
              </span>
              <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-xs font-semibold uppercase tracking-wider">
                Creme de la Creme
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-heading font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent">
              RealHub Launch Kit
            </h1>
            <p className="text-slate-400 mt-2 max-w-xl text-base md:text-lg">
              Estrategia y material de lanzamiento para revolucionar el corretaje inmobiliario en Paraguay. Copia, publica y haz crecer el negocio.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl transition border border-slate-800 font-medium text-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">home</span>
              Volver a la App
            </a>
            <a
              href="https://app.notion.com/p/RealHub-Lanzamiento-Marketing-Board-389f8ff02a8d81c99851cd5f432ad933"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition font-medium text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              <span className="material-symbols-outlined text-sm">auto_stories</span>
              Ver en Notion
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Creative Gallery & Outreach Kits */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* Section 1: Creativos Visuales */}
          <section className="bg-slate-900/50 border border-slate-900 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl -z-10"></div>
            <h2 className="text-2xl font-heading font-bold text-white flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-amber-500">palette</span>
              Creativos de Alta Fidelidad
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Creative 1 */}
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 flex flex-col justify-between group hover:border-indigo-500/50 transition duration-300">
                <div>
                  <div className="relative aspect-square w-full bg-slate-900 rounded-lg overflow-hidden mb-4 border border-slate-800">
                    <img
                      src="/marketing/flyer_instagram.png"
                      alt="Instagram Flyer Canje Seguro"
                      className="object-cover w-full h-full group-hover:scale-105 transition duration-500"
                    />
                  </div>
                  <h3 className="font-heading font-bold text-slate-200 text-sm">Flyer Instagram</h3>
                  <p className="text-xs text-slate-500 mt-1">1:1 Square Post • Enfoque en Canje Seguro sin bypass.</p>
                </div>
                <a
                  href="/marketing/flyer_instagram.png"
                  download="realhub_flyer_instagram.png"
                  className="mt-4 w-full py-2 bg-slate-900 hover:bg-indigo-600 hover:text-white text-slate-300 text-xs font-semibold rounded-lg text-center transition flex items-center justify-center gap-2 border border-slate-800 hover:border-indigo-500"
                >
                  <span className="material-symbols-outlined text-xs">download</span>
                  Descargar
                </a>
              </div>

              {/* Creative 2 */}
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 flex flex-col justify-between group hover:border-indigo-500/50 transition duration-300">
                <div>
                  <div className="relative aspect-square w-full bg-slate-900 rounded-lg overflow-hidden mb-4 border border-slate-800">
                    <img
                      src="/marketing/banner_linkedin.png"
                      alt="LinkedIn Corporate Banner"
                      className="object-cover w-full h-full group-hover:scale-105 transition duration-500"
                    />
                  </div>
                  <h3 className="font-heading font-bold text-slate-200 text-sm">Banner LinkedIn</h3>
                  <p className="text-xs text-slate-500 mt-1">LinkedIn Banner • Enfoque corporativo B2B e inmobiliarias.</p>
                </div>
                <a
                  href="/marketing/banner_linkedin.png"
                  download="realhub_banner_linkedin.png"
                  className="mt-4 w-full py-2 bg-slate-900 hover:bg-indigo-600 hover:text-white text-slate-300 text-xs font-semibold rounded-lg text-center transition flex items-center justify-center gap-2 border border-slate-800 hover:border-indigo-500"
                >
                  <span className="material-symbols-outlined text-xs">download</span>
                  Descargar
                </a>
              </div>

              {/* Creative 3 */}
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 flex flex-col justify-between group hover:border-indigo-500/50 transition duration-300">
                <div>
                  <div className="relative aspect-square w-full bg-slate-900 rounded-lg overflow-hidden mb-4 border border-slate-800">
                    <img
                      src="/marketing/story_instagram.png"
                      alt="Instagram Story White Label"
                      className="object-cover w-full h-full group-hover:scale-105 transition duration-500"
                    />
                  </div>
                  <h3 className="font-heading font-bold text-slate-200 text-sm">Story / WhatsApp Status</h3>
                  <p className="text-xs text-slate-500 mt-1">9:16 Vertical Story • Promoción de Fichas Marca Blanca.</p>
                </div>
                <a
                  href="/marketing/story_instagram.png"
                  download="realhub_story_instagram.png"
                  className="mt-4 w-full py-2 bg-slate-900 hover:bg-indigo-600 hover:text-white text-slate-300 text-xs font-semibold rounded-lg text-center transition flex items-center justify-center gap-2 border border-slate-800 hover:border-indigo-500"
                >
                  <span className="material-symbols-outlined text-xs">download</span>
                  Descargar
                </a>
              </div>
            </div>
          </section>

          {/* Section 2: Copywriting & Outreach Kit */}
          <section className="bg-slate-900/50 border border-slate-900 rounded-2xl p-6">
            <h2 className="text-2xl font-heading font-bold text-white flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-indigo-400">campaign</span>
              Kit de Copywriting & Prospección
            </h2>

            {/* Tabs Header */}
            <div className="flex border-b border-slate-800 gap-2 mb-6">
              <button
                onClick={() => setActiveTab("linkedin")}
                className={`pb-3 px-2 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
                  activeTab === "linkedin"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="material-symbols-outlined text-xs">business_center</span>
                LinkedIn (B2B)
              </button>
              <button
                onClick={() => setActiveTab("instagram")}
                className={`pb-3 px-2 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
                  activeTab === "instagram"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="material-symbols-outlined text-xs">photo_camera</span>
                Instagram (Carrusel)
              </button>
              <button
                onClick={() => setActiveTab("whatsapp")}
                className={`pb-3 px-2 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
                  activeTab === "whatsapp"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="material-symbols-outlined text-xs">chat</span>
                WhatsApp Outreach
              </button>
            </div>

            {/* Tab content */}
            <div>
              {activeTab === "linkedin" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-300">Enfoque de Lanzamiento Profesional</h4>
                      <p className="text-xs text-slate-500">Ideal para directores de inmobiliarias, brókers y gestores.</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(linkedinCopy, "LinkedIn Post")}
                      className="px-3.5 py-1.5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-lg text-xs font-semibold border border-indigo-500/20 hover:border-indigo-500 transition flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-xs">content_copy</span>
                      Copiar Copy
                    </button>
                  </div>
                  <div className="bg-slate-950 border border-slate-900 rounded-xl p-5 text-sm text-slate-300 whitespace-pre-wrap font-sans max-h-96 overflow-y-auto leading-relaxed">
                    {linkedinCopy}
                  </div>
                </div>
              )}

              {activeTab === "instagram" && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-300">Estructura Estratégica del Carrusel</h4>
                  <p className="text-xs text-slate-500">Diseñado para retener la atención y guiar a la acción.</p>
                  
                  <div className="space-y-3">
                    {instagramSlides.map((item, idx) => (
                      <div key={idx} className="bg-slate-950 border border-slate-900 rounded-xl p-4 flex gap-4 items-start">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-bold text-amber-500">
                          {idx + 1}
                        </span>
                        <div>
                          <h5 className="text-sm font-bold text-slate-200">{item.slide}: {item.title}</h5>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "whatsapp" && (
                <div className="space-y-6">
                  {whatsappScripts.map((script) => (
                    <div key={script.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-slate-300">{script.title}</h4>
                          <p className="text-xs text-slate-500">{script.subtitle}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(script.text, script.title)}
                          className="px-3.5 py-1.5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-lg text-xs font-semibold border border-indigo-500/20 hover:border-indigo-500 transition flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-xs">content_copy</span>
                          Copiar Guion
                        </button>
                      </div>
                      <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 text-xs md:text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
                        {script.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Col: Viral Loops, Value Matrix & Guerrilla campaigns */}
        <div className="space-y-10">
          
          {/* Section 3: Crecimiento Viral */}
          <section className="bg-slate-900/50 border border-slate-900 rounded-2xl p-6">
            <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-emerald-400">sync_alt</span>
              Bucle Viral de Crecimiento
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              El producto crece orgánicamente a medida que los agentes cierran tratos reales.
            </p>

            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-3.5 flex items-center gap-3">
                <span className="w-6 h-6 rounded-md bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-xs font-bold">A</span>
                <span className="text-xs text-slate-300 font-medium">Agente A comparte propiedad Marca Blanca</span>
              </div>
              <div className="w-px h-4 bg-slate-800 mx-auto"></div>
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-3.5 flex items-center gap-3">
                <span className="w-6 h-6 rounded-md bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-xs font-bold">B</span>
                <span className="text-xs text-slate-300 font-medium">Cliente se enamora del diseño y contacta a A</span>
              </div>
              <div className="w-px h-4 bg-slate-800 mx-auto"></div>
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-3.5 flex items-center gap-3">
                <span className="w-6 h-6 rounded-md bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-xs font-bold">C</span>
                <span className="text-xs text-slate-300 font-medium">Agente B (dueño) ve el match de forma segura</span>
              </div>
              <div className="w-px h-4 bg-slate-800 mx-auto"></div>
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-3.5 flex items-center gap-3">
                <span className="w-6 h-6 rounded-md bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-xs font-bold">D</span>
                <span className="text-xs text-slate-300 font-medium">Ambos cierran el canje y lo festejan en redes</span>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-800">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Motor Viral Integrado</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cada ficha pública cuenta con un botón sutil que expone la plataforma a otros agentes: <em>&quot;Presentado de forma exclusiva por [Agente] a través de RealHub. ¿Sos agente? Unite.&quot;</em>
              </p>
            </div>
          </section>

          {/* Section 4: Campañas Guerrilla */}
          <section className="bg-slate-900/50 border border-slate-900 rounded-2xl p-6 space-y-6">
            <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-500">rocket_launch</span>
              Tácticas de Guerrilla
            </h2>

            <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200">El Reto del Canje 50/50</h3>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-bold">ACTIVO</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Desafía a los agentes a subir 3 propiedades exclusivas en la primera semana. Los primeros 50 ganan 1 mes gratis de Plan Élite Verificado.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200">Fichas que Venden Solas</h3>
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded text-[10px] font-bold">PREPARACIÓN</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pauta enfocada en la estética. Comparaciones gráficas de un PDF pesado tradicional frente al Link Interactivo Marca Blanca de RealHub en teléfonos.
              </p>
            </div>
          </section>
        </div>

      </main>
    </div>
  );
}
