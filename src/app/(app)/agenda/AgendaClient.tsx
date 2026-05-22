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
    
    return (
      <div className="relative pl-6 sm:pl-8 pb-8 group">
        <div className="absolute left-2 sm:left-3 top-2 bottom-0 w-px bg-slate-100 group-last:bg-transparent" />
        <div className={`absolute left-0 sm:left-1 top-2 w-4 h-4 rounded-full border-4 border-white shadow-sm z-10 ${
          item.status === 'completed' ? 'bg-emerald-500' : 
          item.event_type === 'visit' ? 'bg-amber-500' : 'bg-indigo-500'
        }`} />

        <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 hover:shadow-lg hover:border-slate-200 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-[16px] text-slate-400">schedule</span>
                <span className="text-xs font-bold text-slate-500">
                  {format(date, "HH:mm 'hs'", { locale: es })}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  item.event_type === 'visit' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-500'
                }`}>
                  {item.event_type === 'visit' ? 'Visita' : item.interval_label || 'Seguimiento'}
                </span>
              </div>
              
              <h4 className="text-lg font-bold text-slate-900 mt-2">{prospect?.full_name || 'Prospecto Desconocido'}</h4>
              <p className="text-sm text-slate-500 mt-1">
                {prospect?.transaction_type === 'compra' ? 'Buscando comprar' : 'Buscando alquilar'}
              </p>
              
              {item.properties && (
                <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-3">
                  {item.properties.photos && item.properties.photos[0] ? (
                    <img src={item.properties.photos[0]} alt="Prop" className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center">
                      <span className="material-symbols-outlined text-slate-400">home</span>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Propiedad a Visitar</p>
                    <p className="text-sm font-bold text-slate-700 truncate max-w-[200px]">{item.properties.title}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              {prospect?.phone && (
                <a href={`https://wa.me/${prospect.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">chat</span>
                </a>
              )}
              {item.status !== 'completed' && (
                <button 
                  onClick={async () => {
                    try {
                      await completeAgendaEvent(item.id);
                      window.location.reload();
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-600 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">check</span>
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
        <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 self-start sticky top-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-heading text-xl font-bold text-slate-900 capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: es })}
            </h3>
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <span className="material-symbols-outlined text-slate-500">chevron_left</span>
              </button>
              <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <span className="material-symbols-outlined text-slate-500">chevron_right</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map(day => (
              <div key={day} className="text-xs font-bold text-slate-400 uppercase tracking-widest py-2">
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
                  className={`relative p-2 h-12 rounded-xl flex flex-col items-center justify-center transition-all ${
                    isSelected ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30' : 
                    isCurrentDay ? 'bg-indigo-50 text-indigo-700 font-bold' : 
                    'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="text-sm">{format(day, 'd')}</span>
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
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="font-heading text-2xl font-bold text-slate-900 tracking-tight">
                {isToday(selectedDate) ? 'Hoy' : format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
              </h2>
              <p className="text-slate-500 mt-1">
                {selectedEvents.length} eventos programados
              </p>
            </div>
            <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20">
              <span className="material-symbols-outlined">add</span>
              Nuevo Evento
            </button>
          </div>

          {selectedEvents.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-4xl text-slate-300">event_busy</span>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Sin eventos</h3>
              <p className="text-slate-400">No hay nada programado para este día.</p>
            </div>
          ) : (
            <div className="mt-8">
              {selectedEvents.map(item => <EventCard key={item.id} item={item} />)}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold font-heading text-slate-900">Nuevo Evento</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Tipo de Evento</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setEventType('visit')} className={`py-2 px-4 rounded-xl text-sm font-bold border transition-colors ${eventType === 'visit' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Visita</button>
                  <button type="button" onClick={() => setEventType('follow_up')} className={`py-2 px-4 rounded-xl text-sm font-bold border transition-colors ${eventType === 'follow_up' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Seguimiento</button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Hora</label>
                <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Prospecto</label>
                <select required value={prospectId} onChange={(e) => setProspectId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                  <option value="">Selecciona un prospecto</option>
                  {options.prospects.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name}</option>
                  ))}
                </select>
              </div>

              {eventType === 'visit' && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Propiedad a visitar</label>
                  <select required value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                    <option value="">Selecciona una propiedad</option>
                    {options.properties.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {eventType !== 'visit' && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Asunto / Razón</label>
                  <input type="text" placeholder="Ej. Llamada de seguimiento" value={intervalLabel} onChange={(e) => setIntervalLabel(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                </div>
              )}

              <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-3 font-bold transition-colors disabled:opacity-50 mt-6">
                {isSubmitting ? 'Guardando...' : 'Guardar Evento'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
