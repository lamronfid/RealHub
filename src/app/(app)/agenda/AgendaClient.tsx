'use client';

import { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { getAgendaOptions, createAgendaEvent, completeAgendaEvent } from './actions';

export default function AgendaClient({ events }: { events: any[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [options, setOptions] = useState<{ prospects: any[], properties: any[] }>({ prospects: [], properties: [] });
  
  // Form state
  const [eventType, setEventType] = useState('visit');
  const [prospectId, setProspectId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [time, setTime] = useState('10:00');
  const [intervalLabel, setIntervalLabel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isModalOpen && options.prospects.length === 0) {
      getAgendaOptions().then(setOptions);
    }
  }, [isModalOpen]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prospectId) return;
    setIsSubmitting(true);
    
    try {
      const scheduledAt = new Date(selectedDate);
      const [hours, minutes] = time.split(':');
      scheduledAt.setHours(parseInt(hours), parseInt(minutes));

      await createAgendaEvent({
        prospect_id: prospectId,
        property_id: eventType === 'visit' ? propertyId : null,
        event_type: eventType,
        scheduled_at: scheduledAt.toISOString(),
        interval_label: intervalLabel || (eventType === 'visit' ? 'Visita' : 'Llamada')
      });
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Error creating event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Add empty cells for padding before the 1st of the month
  const startDayOfWeek = monthStart.getDay(); // 0 is Sunday
  const paddingDays = Array.from({ length: startDayOfWeek }).map((_, i) => null);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  // Get events for selected date
  const selectedEvents = events.filter(e => isSameDay(parseISO(e.scheduled_at), selectedDate));

  const EventCard = ({ item }: { item: any }) => {
    const prospect = item.prospects;
    const date = parseISO(item.scheduled_at);
    const isCompleted = item.status === 'completed';
    
    return (
      <div className="relative pl-6 sm:pl-9 pb-8 group">
        <div className="absolute left-2.5 sm:left-3.5 top-2.5 bottom-0 w-px bg-slate-100/90 group-last:bg-transparent" />
        <div className={`absolute left-0.5 sm:left-1.5 top-2.5 w-4 h-4 rounded-full border-4 border-white shadow-md z-10 transition-all duration-300 ${
          isCompleted ? 'bg-emerald-500 ring-4 ring-emerald-500/10' : 
          item.event_type === 'visit' ? 'bg-amber-500 ring-4 ring-amber-500/10' : 'bg-indigo-500 ring-4 ring-indigo-500/10'
        }`} />

        <div className="bg-white/95 hover:bg-white rounded-2xl border border-slate-100 hover:border-slate-200/80 p-5 hover:shadow-premium shadow-sm transition-all duration-300 flex flex-col justify-between group-hover:-translate-y-0.5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px] font-bold">schedule</span>
                  {format(date, "HH:mm 'hs'", { locale: es })}
                </span>
                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                  item.event_type === 'visit' 
                    ? 'bg-amber-50 border-amber-100/60 text-amber-700' 
                    : 'bg-indigo-50 border-indigo-100/60 text-indigo-700'
                }`}>
                  {item.event_type === 'visit' ? 'Visita' : item.interval_label || 'Seguimiento'}
                </span>
                {isCompleted && (
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border bg-emerald-50 border-emerald-100/60 text-emerald-700">
                    Completado
                  </span>
                )}
              </div>
              
              <h4 className="text-base font-bold font-heading text-slate-800 tracking-tight">
                {prospect?.full_name || 'Prospecto Desconocido'}
              </h4>
              <p className="text-xs text-slate-400 font-semibold mt-0.5 flex items-center gap-1">
                <span className={`inline-block px-1 rounded text-[8px] font-black uppercase ${
                  prospect?.transaction_type === 'compra' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50' : 'bg-sky-50 text-sky-650 border border-sky-100/50'
                }`}>
                  {prospect?.transaction_type === 'compra' ? 'Compra' : 'Alquiler'}
                </span>
                · {prospect?.transaction_type === 'compra' ? 'Buscando comprar' : 'Buscando alquilar'}
              </p>
              
              {item.properties && (
                <div className="mt-3.5 bg-slate-50/60 p-3.5 rounded-xl border border-slate-100/70 flex items-center gap-3.5">
                  {item.properties.photos && item.properties.photos[0] ? (
                    <img src={item.properties.photos[0]} alt="Prop" className="w-11 h-11 rounded-lg object-cover border border-slate-100 shadow-sm" />
                  ) : (
                    <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-100 flex items-center justify-center">
                      <span className="material-symbols-outlined text-slate-400 text-[18px]">home</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Propiedad a Visitar</p>
                    <p className="text-xs font-bold text-slate-700 truncate leading-snug">{item.properties.title}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-2 sm:mt-0 shrink-0 self-end sm:self-start">
              {prospect?.phone && (
                <a href={`https://wa.me/${prospect.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center w-10 h-10 bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white border border-emerald-100/60 rounded-xl transition-all duration-350 shadow-sm hover:shadow-md hover:scale-[0.98] active:scale-[0.94]"
                  title="Enviar mensaje por WhatsApp"
                >
                  <span className="material-symbols-outlined text-[20px] font-bold">chat</span>
                </a>
              )}
              {!isCompleted && (
                <button 
                  onClick={async () => {
                    try {
                      await completeAgendaEvent(item.id);
                      window.location.reload();
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-600 border border-indigo-150/40 text-indigo-700 hover:text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-350 shadow-sm hover:shadow-md hover:scale-[0.98] active:scale-[0.94]"
                >
                  <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                  Completar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Calendar Section */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white/70 backdrop-blur-md rounded-3xl p-6 shadow-premium border border-slate-100/80 self-start sticky top-8">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
            <h3 className="font-heading text-lg font-bold text-slate-800 capitalize leading-none">
              {format(currentDate, 'MMMM yyyy', { locale: es })}
            </h3>
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-xl p-0.5">
              <button onClick={prevMonth} className="p-1.5 hover:bg-white rounded-lg transition-all hover:shadow-sm text-slate-500 hover:text-slate-800 active:scale-90">
                <span className="material-symbols-outlined text-base">chevron_left</span>
              </button>
              <button onClick={nextMonth} className="p-1.5 hover:bg-white rounded-lg transition-all hover:shadow-sm text-slate-500 hover:text-slate-800 active:scale-90">
                <span className="material-symbols-outlined text-base">chevron_right</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-3">
            {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map(day => (
              <div key={day} className="text-[10px] font-black text-slate-400 uppercase tracking-widest py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {paddingDays.map((_, i) => <div key={`pad-${i}`} className="p-2" />)}
            {daysInMonth.map(day => {
              const dayEvents = events.filter(e => isSameDay(parseISO(e.scheduled_at), day));
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentDay = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`relative p-2 h-12 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/35 ring-2 ring-indigo-600 ring-offset-2' 
                      : isCurrentDay 
                      ? 'bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold shadow-sm' 
                      : 'hover:bg-slate-50 text-slate-750 font-semibold'
                  }`}
                >
                  <span className="text-xs md:text-sm">{format(day, 'd')}</span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-1">
                      {dayEvents.slice(0, 3).map((e, i) => (
                        <div key={i} className={`w-1 h-1 rounded-full ${
                          isSelected ? 'bg-white/80' : 
                          e.event_type === 'visit' ? 'bg-amber-500' : 'bg-indigo-500'
                        }`} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Events Section */}
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-heading text-2xl font-bold text-slate-800 tracking-tight capitalize leading-tight">
                {isToday(selectedDate) ? 'Hoy' : format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
              </h2>
              <p className="text-xs text-slate-450 font-bold uppercase tracking-widest mt-1 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-550 animate-pulse" />
                {selectedEvents.length} eventos programados
              </p>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)} 
              className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-widest px-5 py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">add</span>
              Nuevo Evento
            </button>
          </div>

          {selectedEvents.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-100/90 p-16 text-center shadow-premium">
              <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-5 text-slate-350">
                <span className="material-symbols-outlined text-2xl">event_busy</span>
              </div>
              <h3 className="text-sm font-black font-heading text-slate-700 uppercase tracking-wider mb-1">Sin actividades</h3>
              <p className="text-xs text-slate-400 font-medium">No hay llamadas ni visitas programadas para este día.</p>
            </div>
          ) : (
            <div className="mt-6 space-y-2">
              {selectedEvents.map(item => <EventCard key={item.id} item={item} />)}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md border border-slate-100 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold font-heading text-slate-800">Programar Evento</h2>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                <span className="material-symbols-outlined text-base font-bold">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 font-heading">Tipo de Evento</label>
                <div className="grid grid-cols-2 gap-2 p-0.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <button 
                    type="button" 
                    onClick={() => setEventType('visit')} 
                    className={`py-2.5 px-4 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      eventType === 'visit' 
                        ? 'bg-white text-indigo-700 shadow-sm border border-slate-100' 
                        : 'text-slate-500 hover:text-slate-800 border border-transparent'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">home</span>
                    Visita
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setEventType('follow_up')} 
                    className={`py-2.5 px-4 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      eventType === 'follow_up' 
                        ? 'bg-white text-indigo-700 shadow-sm border border-slate-100' 
                        : 'text-slate-500 hover:text-slate-800 border border-transparent'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">phone</span>
                    Seguimiento
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-heading">Hora</label>
                <input 
                  type="time" 
                  required 
                  value={time} 
                  onChange={(e) => setTime(e.target.value)} 
                  className="w-full bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 focus:outline-none transition-all" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-heading">Prospecto</label>
                <select 
                  required 
                  value={prospectId} 
                  onChange={(e) => setProspectId(e.target.value)} 
                  className="w-full bg-slate-50/50 border border-slate-205 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3.5 text-xs font-semibold text-slate-850 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="">Selecciona un prospecto</option>
                  {options.prospects.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name}</option>
                  ))}
                </select>
              </div>

              {eventType === 'visit' && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-heading">Propiedad a visitar</label>
                  <select 
                    required 
                    value={propertyId} 
                    onChange={(e) => setPropertyId(e.target.value)} 
                    className="w-full bg-slate-50/50 border border-slate-205 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3.5 text-xs font-semibold text-slate-850 focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="">Selecciona una propiedad</option>
                    {options.properties.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {eventType !== 'visit' && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-heading">Asunto / Razón</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Llamada de seguimiento" 
                    value={intervalLabel} 
                    onChange={(e) => setIntervalLabel(e.target.value)} 
                    className="w-full bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 focus:outline-none transition-all" 
                  />
                </div>
              )}

              <button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-3.5 font-extrabold text-xs uppercase tracking-widest transition-all disabled:opacity-50 mt-6 active:scale-[0.98] shadow-md hover:shadow-lg cursor-pointer"
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Evento'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
