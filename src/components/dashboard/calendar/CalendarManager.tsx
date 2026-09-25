"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, isBefore, startOfDay, parseISO, isSameYear } from "date-fns";
import { ChevronDown, ChevronUp, Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import EventFormModal from "./EventFormModal";

interface CalendarManagerProps {
  schoolId: string;
  initialSchedules: any[]; 
}

const TYPE_COLORS: Record<string, string> = {
  EXAM: "bg-red-500",
  HOLIDAY: "bg-emerald-500",
  EVENT: "bg-blue-500",
};

const TYPE_BG_COLORS: Record<string, string> = {
  EXAM: "bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900 text-red-900 dark:text-red-100",
  HOLIDAY: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900 text-emerald-900 dark:text-emerald-100",
  EVENT: "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900 text-blue-900 dark:text-blue-100",
};

export default function CalendarManager({ schoolId, initialSchedules }: CalendarManagerProps) {
  const [currentDate, setCurrentDate] = useState(new Date()); // Controls the mini-calendar grid
  const [schedules, setSchedules] = useState(initialSchedules);
  
  // UI States
  const [isCalendarOpen, setIsCalendarOpen] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedDateForNew, setSelectedDateForNew] = useState<Date | null>(null);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const agendaContainerRef = useRef<HTMLDivElement>(null);
  const dateRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Group events by date string YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    schedules.forEach(ev => {
      const dateStr = new Date(ev.date).toISOString().split('T')[0];
      if (!map.has(dateStr)) map.set(dateStr, []);
      map.get(dateStr)!.push(ev);
    });
    return map;
  }, [schedules]);

  // Sorted list of unique dates that have events
  const agendaDates = useMemo(() => {
    return Array.from(eventsByDate.keys()).sort();
  }, [eventsByDate]);

  // Generate days for grid
  const daysInGrid = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // Handle Agenda Scroll to update Header Month
  const handleScroll = () => {
    if (!agendaContainerRef.current) return;
    
    // Auto-close mini calendar on scroll for premium UX
    if (isCalendarOpen) {
      setIsCalendarOpen(false);
    }

    const container = agendaContainerRef.current;
    
    // Find the date element closest to the top of the container
    let closestDateStr = null;
    let minDistance = Infinity;

    for (const dateStr of agendaDates) {
      const el = dateRefs.current[dateStr];
      if (el) {
        // Distance from top of the scroll container
        const distance = Math.abs(el.offsetTop - container.scrollTop);
        if (distance < minDistance) {
          minDistance = distance;
          closestDateStr = dateStr;
        }
      }
    }

    if (closestDateStr && minDistance < 200) { // Only update if it's reasonably close
      const date = parseISO(closestDateStr);
      if (!isSameMonth(date, currentDate) || !isSameYear(date, currentDate)) {
        setCurrentDate(date);
      }
    }
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setCurrentDate(day); 
    
    const dateStr = format(day, 'yyyy-MM-dd');
    if (eventsByDate.has(dateStr)) {
      // Scroll agenda to this date
      const el = dateRefs.current[dateStr];
      if (el && agendaContainerRef.current) {
        agendaContainerRef.current.scrollTo({
          top: el.offsetTop, 
          behavior: 'smooth'
        });
      }
    } else {
      // Prompt quick add
      setSelectedDateForNew(day);
      setShowFormModal(true);
    }
  };

  const handleAddNewClick = () => {
    setSelectedDateForNew(selectedDate);
    setEditingEvent(null);
    setShowFormModal(true);
  };

  const handleEventSaved = (savedEvent: any) => {
    setSchedules(prev => {
      const exists = prev.find(e => e.id === savedEvent.id);
      if (exists) {
        return prev.map(e => e.id === savedEvent.id ? savedEvent : e);
      }
      return [...prev, savedEvent].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });
  };

  const handleMultiEventsSaved = (newEventsCount: number) => {
    window.location.reload(); 
  };

  const handleEventDeleted = (id: string) => {
    setSchedules(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div className="flex justify-center h-[calc(100vh-100px)]">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden relative">
        
        {/* Top Sticky Header */}
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex justify-between items-center">
          <Button 
            variant="ghost" 
            className="text-xl sm:text-2xl font-bold px-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
          >
            {format(currentDate, 'MMMM yyyy')}
            {isCalendarOpen ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
          </Button>
          <div className="flex gap-2">
             <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                <ChevronLeft className="w-5 h-5" />
             </Button>
             <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                <ChevronRight className="w-5 h-5" />
             </Button>
          </div>
        </div>

        {/* Collapsible Mini Calendar */}
        <div 
          className={`transition-all duration-300 ease-in-out overflow-hidden bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 ${isCalendarOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 border-transparent'}`}
        >
          <div className="p-4 sm:px-8 pb-6">
            {/* Grid Header */}
            <div className="grid grid-cols-7 mb-3">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="text-center text-xs font-semibold text-slate-400 py-1 uppercase">
                  {day}
                </div>
              ))}
            </div>

            {/* Mini Calendar Grid */}
            <div className="grid grid-cols-7 gap-y-3">
              {daysInGrid.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayEvents = eventsByDate.get(dateStr) || [];
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());
                const isSelected = isSameDay(day, selectedDate);

                return (
                  <div key={day.toISOString()} className="flex flex-col items-center justify-start h-10 cursor-pointer group" onClick={() => handleDayClick(day)}>
                    <div className={`
                      w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-all
                      ${!isCurrentMonth ? 'text-slate-300 dark:text-slate-700' : 'text-slate-700 dark:text-slate-200'}
                      ${isSelected && !isToday ? 'bg-primary/20 text-primary font-bold' : ''}
                      ${isToday ? 'bg-primary text-white font-bold shadow-md' : ''}
                      ${!isSelected && !isToday && isCurrentMonth ? 'group-hover:bg-slate-200 dark:group-hover:bg-slate-800' : ''}
                    `}>
                      {format(day, 'd')}
                    </div>
                    
                    {/* Event Dots underneath */}
                    <div className="flex gap-0.5 mt-1">
                      {dayEvents.slice(0, 3).map((ev, i) => (
                        <div key={i} className={`w-1 h-1 rounded-full ${TYPE_COLORS[ev.type]}`} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Agenda List View */}
        <div 
          ref={agendaContainerRef} 
          onScroll={handleScroll}
          className="flex-1 relative overflow-y-auto p-4 sm:p-8 space-y-10 scroll-smooth pb-32"
        >
          {agendaDates.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No upcoming events.</p>
            </div>
          ) : (
            agendaDates.map((dateStr) => {
              const day = parseISO(dateStr);
              const dayEvents = eventsByDate.get(dateStr)!;
              const isPast = isBefore(day, startOfDay(new Date()));
              const isToday = isSameDay(day, new Date());

              return (
                <div 
                  key={dateStr} 
                  ref={(el) => { dateRefs.current[dateStr] = el; }}
                  className={`flex flex-row gap-4 sm:gap-6 ${isPast ? 'opacity-50' : ''}`}
                >
                  {/* Date Left Column */}
                  <div className="w-12 sm:w-16 shrink-0 flex flex-col items-center pt-2">
                    <span className={`text-xs font-semibold uppercase tracking-widest ${isToday ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}>
                      {format(day, 'EEE')}
                    </span>
                    <span className={`text-2xl sm:text-3xl font-light mt-0.5 ${isToday ? 'text-primary font-bold bg-primary/10 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full' : 'text-slate-800 dark:text-slate-200'}`}>
                      {format(day, 'd')}
                    </span>
                  </div>
                  
                  {/* Events Right Column */}
                  <div className="flex-1 space-y-3 pt-2">
                    {dayEvents.map(ev => (
                      <div 
                        key={ev.id} 
                        onClick={() => {
                          setEditingEvent(ev);
                          setShowFormModal(true);
                        }}
                        className={`p-4 rounded-2xl border cursor-pointer hover:shadow-md transition-all ${TYPE_BG_COLORS[ev.type]}`}
                      >
                        <h4 className="font-semibold text-base mb-1">{ev.title}</h4>
                        {ev.description && (
                          <p className="text-sm opacity-80 line-clamp-2">
                            {ev.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Floating Action Button (FAB) */}
        <div className="absolute bottom-6 right-6 z-20">
          <Button 
            size="icon" 
            className="w-14 h-14 rounded-full shadow-xl hover:shadow-2xl transition-all bg-primary text-white"
            onClick={handleAddNewClick}
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>

      </div>

      {showFormModal && (
        <EventFormModal
          schoolId={schoolId}
          initialData={editingEvent}
          prefillDate={selectedDateForNew}
          onClose={() => setShowFormModal(false)}
          onSaved={handleEventSaved}
          onMultiSaved={handleMultiEventsSaved}
          onDeleted={handleEventDeleted}
        />
      )}
    </div>
  );
}
