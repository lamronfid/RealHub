'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { setSubscriptionState } from '@/lib/subscription';
import Link from 'next/link';

function CheckoutPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const plan = searchParams.get('plan') || 'elite';
  
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [profile, setProfile] = useState<any>(null);
  
  // Card input states
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [activeInput, setActiveInput] = useState('');

  // Payment progress states
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'verifying' | 'activating' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [progressText, setProgressText] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Load user profile
  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          const { data: prof } = await supabase
            .from('agent_profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          if (prof) {
            setProfile(prof);
          }
        }
      } catch (e) {
        console.error('Error loading user profile in checkout:', e);
      }
    }
    loadUser();
  }, []);

  // Format Card Number (adds spaces every 4 digits)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 16) value = value.slice(0, 16);
    const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  // Format Expiry Date (adds '/' after 2 digits)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length >= 2) {
      value = value.slice(0, 2) + '/' + value.slice(2);
    }
    setCardExpiry(value);
  };

  // Format CVV (max 3/4 digits)
  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setCardCvv(value.slice(0, 4));
  };

  // Autofill test credentials
  const handleAutoFill = () => {
    setCardNumber('4242 4242 4242 4242');
    setCardName(profile?.full_name?.toUpperCase() || 'MIGUEL ANGEL AGENTE');
    setCardExpiry('12/30');
    setCardCvv('123');
    setIsFlipped(false);
  };

  // Confetti particles generator
  const startConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#38bdf8', '#6366f1', '#ec4899', '#f59e0b', '#10b981'];
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
      rotation: number;
      rotationSpeed: number;
    }> = [];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: Math.random() * 4 - 2,
        speedY: Math.random() * 6 + 4,
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 4 - 2,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let activeCount = 0;

      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotationSpeed;

        if (p.y < canvas.height) {
          activeCount++;
        } else if (p.y >= canvas.height && Math.random() > 0.3) {
          // Recycle particles to top for continuous success effect
          p.y = -20;
          p.x = Math.random() * canvas.width;
          activeCount++;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      if (activeCount > 0) {
        animationFrameId.current = requestAnimationFrame(animate);
      }
    };

    animate();
  };

  useEffect(() => {
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  // Handle Form Submit (Simulate Stripe payment)
  // Handle real Stripe Checkout redirection
  // Handle real Pagopar Checkout redirection
  const handlePagoparCheckout = async () => {
    try {
      setErrorMessage('');
      setPaymentStatus('processing');
      setProgressText('Generando orden de pago en Pagopar...');
      
      const cycle = searchParams.get('cycle') || 'monthly';
      
      const response = await fetch('/api/subscripcion/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan, cycle }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al iniciar transacción de Pagopar.');
      }
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No se recibió la URL de redirección de Pagopar.');
      }
    } catch (err: any) {
      console.error('Pagopar error:', err);
      setErrorMessage(err.message || 'Error al iniciar la pasarela de Pagopar.');
      setPaymentStatus('error');
    }
  };

  // Handle Form Submit (Simulate Stripe payment)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cardNumber.replace(/\s/g, '') !== '4242424242424242') {
      setErrorMessage('Usa el número de tarjeta de pruebas de Stripe para la demostración (4242 4242 4242 4242).');
      setPaymentStatus('error');
      return;
    }
    if (cardExpiry.length < 5 || cardCvv.length < 3 || !cardName) {
      setErrorMessage('Por favor completa todos los campos del checkout.');
      setPaymentStatus('error');
      return;
    }

    setErrorMessage('');
    setPaymentStatus('processing');
    setProgressText('Procesando pago en pasarela Stripe...');

    // Stage 1: Processing
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setPaymentStatus('verifying');
    setProgressText('Confirmando fondos con entidad bancaria...');

    // Stage 2: Verification
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setPaymentStatus('activating');
    setProgressText('Activando tu suscripción y Scraper...');

    // Stage 3: Activation
    const tier = plan === 'elite' ? 'elite' : plan === 'pro' ? 'pro' : 'standard';
    const success = await setSubscriptionState(tier, true, userId);
    
    await new Promise((resolve) => setTimeout(resolve, 1200));
    
    setPaymentStatus('success');
    setTimeout(() => {
      startConfetti();
    }, 100);
  };

  const planPrice = plan === 'elite' ? 100 : plan === 'pro' ? 30 : 15;
  const planName = plan === 'elite' ? 'Plan Élite' : plan === 'pro' ? 'Plan Pro' : 'Plan Entrada';
  
  const cycle = searchParams.get('cycle') || 'monthly';
  const planGsPrice = plan === 'elite' 
    ? (cycle === 'annual' ? 'Gs. 7.000.000' : 'Gs. 730.000') 
    : plan === 'pro' 
      ? (cycle === 'annual' ? 'Gs. 2.100.000' : 'Gs. 220.000') 
      : (cycle === 'annual' ? 'Gs. 1.050.000' : 'Gs. 110.000');

  return (
    <div className="min-h-[85vh] bg-[#070913] text-slate-100 rounded-3xl p-6 md:p-12 pt-24 md:pt-32 relative overflow-hidden border border-slate-900 shadow-2xl flex flex-col items-center justify-center font-sans">
      
      {/* Top Header Navigation */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
        <Link href="/subscripcion/planes" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-400 via-indigo-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-all">
            <span className="material-symbols-outlined text-white text-lg font-bold">domain</span>
          </div>
          <span className="font-heading font-black text-base tracking-wider bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent group-hover:text-white transition-all">
            Real<span className="text-indigo-400 font-extrabold">Hub</span>
          </span>
        </Link>
        
        {!userId ? (
          <Link 
            href="/login"
            className="px-6 py-2.5 bg-white/10 hover:bg-white text-slate-100 hover:text-slate-950 border border-white/10 hover:border-white rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-md shadow-black/20 flex items-center gap-1.5 backdrop-blur-md"
          >
            <span className="material-symbols-outlined text-sm">login</span>
            Log in
          </Link>
        ) : (
          <Link 
            href="/"
            className="px-6 py-2.5 bg-indigo-500/20 hover:bg-indigo-500 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-md shadow-indigo-950/20 flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">space_dashboard</span>
            Panel de Agente
          </Link>
        )}
      </div>
      
      {/* Confetti canvas */}
      {paymentStatus === 'success' && (
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-50 rounded-3xl" />
      )}

      {/* Decorative Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-pink-500/10 rounded-full blur-[120px] pointer-events-none" />

      {paymentStatus === 'success' ? (
        // SUCCESS STATE SCREEN
        <div className="max-w-md w-full bg-white/[0.02] border border-white/[0.08] backdrop-blur-2xl rounded-3xl p-8 text-center space-y-6 relative z-10 shadow-2xl animate-fade-in">
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            <span className="material-symbols-outlined text-4xl animate-bounce">check_circle</span>
          </div>

          <div className="space-y-2">
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
              ¡Activación Exitosa!
            </span>
            <h2 className="font-heading text-2xl font-black text-white">
              ¡Élite Desbloqueado!
            </h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              Tu cuenta de RealHub ha sido actualizada con éxito al <strong className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">Plan Élite</strong>.
            </p>
          </div>

          <div className="bg-slate-950/30 border border-white/[0.04] rounded-2xl p-4 text-left space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <span className="material-symbols-outlined text-indigo-400 text-sm">workspace_premium</span>
              <span>Nuevos beneficios activos:</span>
            </div>
            <ul className="text-[11px] text-slate-400 space-y-1.5 ml-1">
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-400">✓</span> Insignia holográfica verificada en todo el portal.
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-400">✓</span> Scraper de propiedades de InfoCasas y Clasipar ilimitado.
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-400">✓</span> Capacidad de destacar propiedades en la parte superior.
              </li>
            </ul>
          </div>

          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/marketplace';
              } else {
                router.push('/marketplace');
              }
            }}
            className="w-full py-3.5 bg-gradient-to-r from-sky-400 via-indigo-500 to-pink-500 text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl hover:brightness-110 shadow-lg shadow-indigo-950/50 transition-all flex items-center justify-center gap-2"
          >
            <span>Ir al Marketplace</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      ) : paymentStatus === 'processing' || paymentStatus === 'verifying' || paymentStatus === 'activating' ? (
        // LOADER SCREEN
        <div className="max-w-md w-full bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl rounded-3xl p-12 text-center space-y-6 relative z-10 shadow-2xl">
          <div className="relative w-20 h-20 mx-auto">
            {/* Spinning gradient rings */}
            <div className="absolute inset-0 rounded-full border-4 border-slate-900" />
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-pink-500 border-b-sky-400 border-l-transparent animate-spin" />
            <div className="absolute inset-2 rounded-full bg-[#080B15] flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl text-indigo-400 animate-pulse">lock</span>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-heading text-lg font-bold text-white">Seguridad Bancaria Activa</h3>
            <p className="text-indigo-400 font-extrabold text-[10px] uppercase tracking-widest animate-pulse">{progressText}</p>
            <p className="text-slate-500 text-[10px]">No cierres ni refresques esta pestaña.</p>
          </div>
        </div>
      ) : (
        // MAIN CHECKOUT FORM AND CARD
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          
          {/* Left Column: Visual Card and info */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center space-y-8">
            <div className="text-center lg:text-left w-full space-y-2">
              <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                Stripe Gateway 3D
              </span>
              <h2 className="font-heading text-2xl md:text-3xl font-black text-white leading-tight">
                Completa tu Activación
              </h2>
              <p className="text-slate-400 text-xs">
                Estás adquiriendo el <strong className="text-white">{planName}</strong>. Cancela en cualquier momento con un clic.
              </p>
            </div>

            {/* 3D Payment Card Container */}
            <div className="w-full max-w-[340px] aspect-[1.586/1] [perspective:1000px] group cursor-pointer">
              <div 
                className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${
                  isFlipped ? '[transform:rotateY(180deg)]' : ''
                }`}
              >
                {/* Front Face */}
                <div className="absolute inset-0 w-full h-full rounded-2xl p-6 bg-gradient-to-br from-indigo-900/90 via-slate-900 to-[#10142A] border border-white/10 backdrop-blur-xl shadow-2xl flex flex-col justify-between [backface-visibility:hidden]">
                  {/* Glassmorphic shiny reflection */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent rounded-2xl pointer-events-none" />
                  
                  {/* Top row */}
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="font-heading text-[10px] uppercase tracking-widest text-slate-400 font-bold">RealHub {planName}</span>
                      <span className="text-[7px] text-indigo-400 font-medium uppercase tracking-widest">Premium Partner</span>
                    </div>
                    {/* Mock Chip */}
                    <div className="w-9 h-7 bg-gradient-to-br from-yellow-300 via-amber-400 to-amber-600 rounded-md border border-white/10 relative shadow-md">
                      <div className="absolute inset-x-0 top-1/2 h-[1px] bg-slate-800/40" />
                      <div className="absolute inset-y-0 left-1/2 w-[1px] bg-slate-800/40" />
                    </div>
                  </div>

                  {/* Card Number */}
                  <div className="my-auto font-mono text-[17px] tracking-[0.18em] text-white font-bold drop-shadow-md">
                    {cardNumber || '•••• •••• •••• ••••'}
                  </div>

                  {/* Bottom row */}
                  <div className="flex justify-between items-end">
                    <div className="space-y-0.5 max-w-[70%]">
                      <span className="text-[7px] text-slate-400 uppercase tracking-widest block font-bold">Titular</span>
                      <p className="text-[10px] text-white uppercase font-bold tracking-wider truncate drop-shadow-sm">
                        {cardName || 'MIGUEL ANGEL AGENTE'}
                      </p>
                    </div>
                    <div className="space-y-0.5 text-right">
                      <span className="text-[7px] text-slate-400 uppercase tracking-widest block font-bold">Vence</span>
                      <p className="text-[10px] text-white font-bold tracking-wider drop-shadow-sm">
                        {cardExpiry || 'MM/AA'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Back Face */}
                <div className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-br from-slate-900 via-[#0B0F24] to-indigo-950/90 border border-white/10 backdrop-blur-xl shadow-2xl flex flex-col justify-between py-6 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  {/* Magnetic strip */}
                  <div className="w-full h-10 bg-slate-950/90" />

                  {/* Signature and CVV box */}
                  <div className="px-6 flex items-center gap-3">
                    <div className="flex-1 h-7 bg-white/5 rounded border border-white/10 flex items-center px-2 font-mono text-[8px] italic text-slate-400 select-none">
                      Firma autorizada
                    </div>
                    <div className="bg-white rounded h-7 w-12 flex items-center justify-center font-mono text-xs text-slate-900 font-extrabold tracking-widest shadow-inner">
                      {cardCvv || '•••'}
                    </div>
                  </div>

                  {/* Info footer */}
                  <div className="px-6 text-[7px] text-slate-500 leading-normal">
                    Tarjeta de demostración de entorno de pruebas de RealHub. No se realizarán cargos reales a ninguna entidad financiera.
                  </div>
                </div>
              </div>
            </div>

            {/* Quick action: Pre-fill test credentials */}
            <button
              type="button"
              onClick={handleAutoFill}
              className="w-full max-w-[340px] py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-xs">auto_fix_high</span>
              Llenar datos de prueba Stripe
            </button>
          </div>

          {/* Right Column: Checkout Form */}
          <div className="lg:col-span-7">
            <div className="bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative">
              
              {errorMessage && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-4 py-3 rounded-2xl flex items-center gap-2">
                  <span className="material-symbols-outlined text-base shrink-0">error</span>
                  <p>{errorMessage}</p>
                </div>
              )}

              {/* Option 1: Official Pagopar Checkout */}
              <div className="space-y-4 pb-6 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-black">1</span>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">Método Recomendado (Pagopar)</h3>
                </div>
                <button
                  type="button"
                  onClick={handlePagoparCheckout}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs md:text-sm uppercase tracking-wider rounded-2xl active:scale-[0.99] transition-all shadow-[0_4px_20px_rgba(99,102,241,0.25)] flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm md:text-base font-bold">payment</span>
                  Pagar de forma segura con Pagopar ({planGsPrice})
                </button>
                <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                  Redirige al checkout oficial de Pagopar en Paraguay. Soporta tarjetas locales de crédito/débito, bocas de cobranza (Pago Móvil, Aquí Pago) y billeteras electrónicas.
                </p>
              </div>

              {/* Option 2: Card Simulator */}
              <form onSubmit={handleSubmit} className="space-y-6 pt-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-slate-500/20 text-slate-400 flex items-center justify-center text-xs font-black">2</span>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">Simulador Local (Pruebas Rápidas)</h3>
                </div>

              {/* Cardholder Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Nombre del Titular</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">person</span>
                  <input
                    type="text"
                    required
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value.toUpperCase())}
                    onFocus={() => {
                      setIsFlipped(false);
                      setActiveInput('name');
                    }}
                    placeholder="MIGUEL ANGEL AGENTE"
                    className="w-full bg-[#04060C] border border-white/[0.08] focus:border-indigo-500/50 rounded-2xl py-3 pl-11 pr-4 text-xs font-semibold text-white focus:outline-none placeholder-slate-600 transition-colors"
                  />
                </div>
              </div>

              {/* Card Number */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Número de Tarjeta</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">credit_card</span>
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    onFocus={() => {
                      setIsFlipped(false);
                      setActiveInput('number');
                    }}
                    placeholder="4242 4242 4242 4242"
                    className="w-full bg-[#04060C] border border-white/[0.08] focus:border-indigo-500/50 rounded-2xl py-3 pl-11 pr-4 text-xs font-semibold text-white focus:outline-none placeholder-slate-600 transition-colors font-mono"
                  />
                </div>
              </div>

              {/* Expiry and CVV Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Expiración</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">calendar_month</span>
                    <input
                      type="text"
                      required
                      value={cardExpiry}
                      onChange={handleExpiryChange}
                      onFocus={() => {
                        setIsFlipped(false);
                        setActiveInput('expiry');
                      }}
                      placeholder="MM/AA"
                      className="w-full bg-[#04060C] border border-white/[0.08] focus:border-indigo-500/50 rounded-2xl py-3 pl-11 pr-4 text-xs font-semibold text-white focus:outline-none placeholder-slate-600 transition-colors font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">CVV</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">lock</span>
                    <input
                      type="password"
                      required
                      value={cardCvv}
                      onChange={handleCvvChange}
                      onFocus={() => {
                        setIsFlipped(true);
                        setActiveInput('cvv');
                      }}
                      onBlur={() => {
                        setIsFlipped(false);
                      }}
                      placeholder="•••"
                      className="w-full bg-[#04060C] border border-white/[0.08] focus:border-indigo-500/50 rounded-2xl py-3 pl-11 pr-4 text-xs font-semibold text-white focus:outline-none placeholder-slate-600 transition-colors font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Price break-down / summary */}
              <div className="bg-[#05070F] rounded-2xl p-4 border border-white/[0.04] space-y-3 font-sans">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Suscripción RealHub {planName.replace('Plan ', '')}</span>
                  <span className="text-white font-bold">${planPrice}.00 / {searchParams.get('cycle') === 'annual' ? 'año' : 'mes'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Equivalente en Guaraníes</span>
                  <span className="text-indigo-400 font-bold">{planGsPrice} Gs.</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Impuestos / I.V.A (0%)</span>
                  <span className="text-slate-500">Gs. 0</span>
                </div>
                <div className="h-[1px] bg-white/[0.04]" />
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-350 font-bold">Total a pagar</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400 font-black text-sm">{planGsPrice} Gs.</span>
                </div>
              </div>

              {/* Action submit button */}
              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-sky-400 via-indigo-500 to-pink-500 hover:brightness-110 text-white font-black text-xs uppercase tracking-widest rounded-2xl active:scale-[0.99] transition-all shadow-[0_4px_25px_rgba(99,102,241,0.3)] flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">enhanced_encryption</span>
                Simular Pago y Desbloquear {planName.replace('Plan ', '')}
              </button>

              <div className="text-[10px] text-slate-500 text-center flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-xs">verified_user</span>
                <span>Conexión cifrada SSL de Pagopar. RealHub no almacena tus datos de pago.</span>
              </div>
            </form>
          </div>
        </div>

        </div>
      )}

    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[85vh] bg-[#070913] text-slate-100 rounded-3xl p-6 md:p-12 pt-24 md:pt-32 relative overflow-hidden border border-slate-900 shadow-2xl flex flex-col items-center justify-center font-sans">
        <div className="max-w-md w-full bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl rounded-3xl p-12 text-center space-y-6 relative z-10 shadow-2xl">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-slate-900" />
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-pink-500 border-b-sky-400 border-l-transparent animate-spin" />
            <div className="absolute inset-2 rounded-full bg-[#080B15] flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl text-indigo-400 animate-pulse">lock</span>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-heading text-lg font-bold text-white">Seguridad Bancaria Activa</h3>
            <p className="text-indigo-400 font-extrabold text-[10px] uppercase tracking-widest animate-pulse">Cargando pasarela...</p>
          </div>
        </div>
      </div>
    }>
      <CheckoutPageContent />
    </Suspense>
  );
}
