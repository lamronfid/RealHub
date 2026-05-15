'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabaseRef = useRef(createClient());

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch initial notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      const supabase = supabaseRef.current;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.read).length);
      }
    };
    fetchNotifications();
  }, []);

  const markAllAsRead = useCallback(async () => {
    const supabase = supabaseRef.current;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'match': return <span className="material-symbols-outlined text-indigo-500">favorite</span>;
      case 'message': return <span className="material-symbols-outlined text-emerald-500">chat</span>;
      default: return <span className="material-symbols-outlined text-slate-500">notifications</span>;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
      >
        <span className="material-symbols-outlined text-slate-600">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white shadow-sm" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-[0_10px_40px_rgb(0,0,0,0.1)] border border-slate-100 overflow-hidden z-50">
          <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">Notificaciones</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                Marcar leídas
              </button>
            )}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2 font-light">notifications_off</span>
                <p className="text-sm">No tienes notificaciones</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {notifications.map(n => (
                  <Link href={n.link || '#'} key={n.id} onClick={() => setIsOpen(false)}
                    className={`flex items-start gap-3 p-4 hover:bg-slate-50 transition-colors ${!n.read ? 'bg-indigo-50/30' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${!n.read ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                    </div>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-2" />}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
