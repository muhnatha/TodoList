'use client'

import PageLayout from "@/components/PageLayout"
import { React, useState, useEffect } from 'react'
import { Calendar as ShadCalendar } from "@/components/ui/calendar"
// Import Views from react-big-calendar
import { Calendar as BigCalendar, momentLocalizer, dateFnsLocalizer, Views } from 'react-big-calendar'
import moment from 'moment';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { supabase } from '@/lib/supabaseClient'

// Import date-fns locale if you want specific localization, e.g., Indonesian
import { id as indonesianLocale } from 'date-fns/locale/id'; // For Indonesian

// Lokalisasi ke time indonesia (for moment.js if used elsewhere)
moment.locale("idn");

// Corrected dateFnsLocalizer setup
const dateFnsLocales = {
  'id': indonesianLocale, // Use 'id' for Indonesian, or your desired locale
  // You can add more locales here, e.g., 'en-US': enUS
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: dateFnsLocales, // Pass the date-fns locale object here
});

async function fetchTasks() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("Error fetching user:", userError);
    return [];
  }

  const { data, error } = await supabase
    .from('task')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'todo')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }
  console.log("Fetched tasks:", data);
  return data;
}

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(new Date()); // For ShadCalendar
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // State for BigCalendar's date and view
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState(Views.MONTH); // Default to month view (e.g., Views.MONTH)

  useEffect(() => {
    const loadTasks = async () => {
      setIsLoading(true);
      const data = await fetchTasks();
      setTasks(data || []);
      setIsLoading(false);
    };
    loadTasks();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      setCalendarDate(selectedDate);
    }
  }, [selectedDate]);

  const bigEvents = Array.isArray(tasks)
    ? tasks.map(task => {
        let startDateTime;
        if (task.deadline && task.hour) {
          startDateTime = new Date(`${task.deadline}T${task.hour}`);
        } else if (task.deadline) {
          startDateTime = new Date(task.deadline);
          const [year, month, day] = task.deadline.split('-').map(Number);
          startDateTime = new Date(year, month - 1, day);
        } else {
          startDateTime = new Date(); // fallback
        }
        return {
          id: task.id,
          title: task.name,
          start: startDateTime,
          end: startDateTime, // For all-day events or single point events, start and end can be the same
        };
      })
    : [];

  // Handler for BigCalendar navigation
  const handleNavigate = (newDate) => {
    setCalendarDate(newDate);
  };

  // Handler for BigCalendar view changes
  const handleViewChange = (newView) => {
    setCalendarView(newView);
  };

  return (
    <PageLayout title="CALENDAR">
      <div className="flex flex-col items-center justify-center mb-2 min-[994px]:justify-start min-[994px]:items-start min-[994px]:mb-0 min-[994px]:flex-row w-full">
        <div className="flex flex-col gap-2 text-center">
          <ShadCalendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date) {
                setSelectedDate(date);
                // setCalendarDate(date); // BigCalendar will also update via useEffect
              }
            }}
            className={`min-[994px]:mr-2 p-3 rounded-lg shadow-md`}
            classNames={{
              day_selected: 'bg-[#0C41FF] text-white rounded-md hover:text-black hover:font-light focus:outline-none focus:ring-2 focus:ring-blue-400',
              day_today: 'font-bold text-blue-700 border border-[#0C41FF] rounded-md',
              day: 'hover:bg-blue-50 rounded-md w-10 h-10 flex items-center justify-center',
            }}
          />
        </div>
        <div className="border-t-2 pt-2 min-[994px]:border-t-0 min-[994px]:pl-4 min-[994px]:pt-0 min-[994px]:border-l-1 w-full h-screen">
          {isLoading ? (
            <div>Loading tasks...</div>
          ) : (
            <BigCalendar
              localizer={localizer}
              events={bigEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ backgroundColor: 'white' }}
              // ---- Add these props for interactivity ----
              date={calendarDate}         // Control the current date
              view={calendarView}         // Control the current view
              onNavigate={handleNavigate} // Handle date navigation (Back, Next, Today buttons)
              onView={handleViewChange}   // Handle view changes (Month, Week, Day, Agenda buttons)
              onDrillDown={(date, view) => { setCalendarDate(date); setCalendarView(Views.DAY); }}
            />
          )}
        </div>
      </div>
    </PageLayout>
  )
}