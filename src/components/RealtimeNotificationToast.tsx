'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface ToastMessage {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
}

export default function RealtimeNotificationToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    let channel: any;
    let isMounted = true;

    async function setupSubscription() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMounted) return;

      const channelName = `realtime-notifications-${user.id}`;

      // Clean up any existing channel with the same name from cache to avoid duplicate registration
      const existingChannel = supabase.getChannels().find((c) => c.topic === channelName || c.topic.endsWith(channelName));
      if (existingChannel) {
        await supabase.removeChannel(existingChannel);
      }

      if (!isMounted) return;

      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotif = payload.new as any;
            
            // Add new toast to list
            const toastId = newNotif.id || String(Date.now());
            setToasts((prev) => [
              ...prev,
              {
                id: toastId,
                title: newNotif.title || 'Nuevo Match Encontrado',
                body: newNotif.body || 'Se ha detectado coincidencia con un prospecto.',
                link: newNotif.link || null,
              },
            ]);

            // Auto-remove toast after 6 seconds
            setTimeout(() => {
              if (isMounted) {
                setToasts((prev) => prev.filter((t) => t.id !== toastId));
              }
            }, 6000);
          }
        );

      channel.subscribe();
    }

    setupSubscription();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleToastClick = (toast: ToastMessage) => {
    removeToast(toast.id);
    if (toast.link) {
      router.push(toast.link);
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto w-full bg-slate-900/90 backdrop-blur-xl border border-slate-800 text-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.25)] p-4 flex gap-3.5 transform transition-all duration-300 animate-in slide-in-from-right-10 duration-200"
        >
          {/* Glowing Indicator Icon */}
          <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-550/30">
            <span className="material-symbols-outlined text-[20px] animate-bounce">
              notifications_active
            </span>
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-extrabold text-white tracking-tight line-clamp-1">
              {toast.title}
            </h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">
              {toast.body}
            </p>

            {toast.link && (
              <button
                onClick={() => handleToastClick(toast)}
                className="mt-3 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-wider flex items-center gap-1"
              >
                <span>Ver Detalles</span>
                <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
              </button>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 text-slate-500 hover:text-slate-350 self-start p-0.5 rounded-lg hover:bg-slate-800/50 transition"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>

          {/* Custom Timeout Progress Bar animation */}
          <div className="absolute bottom-0 left-0 h-1 bg-indigo-500 rounded-b-2xl animate-toast-progress" />
        </div>
      ))}
    </div>
  );
}
