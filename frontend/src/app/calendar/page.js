'use client'

import PageLayout from "@/components/PageLayout"
import { React, useState, useEffect } from 'react'
import { Calendar as ShadCalendar } from "@/components/ui/calendar"
import { Calendar as BigCalendar, momentLocalizer, dateFnsLocalizer } from 'react-big-calendar'
import moment from 'moment';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { supabase } from '@/lib/supabaseClient'

// Lokalisasi ke time indonesia
moment.locale("idn");

const locales = momentLocalizer(moment);
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

async function fetchTasks() {
  // Get user id from supabase auth
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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
      const loadTasks = async () => {
        setIsLoading(true);
        const data = await fetchTasks();
        setTasks(data || []);
        setIsLoading(false);
      };
      loadTasks();
    }, []);

  const bigEvents = Array.isArray(tasks)
    ? tasks.map(task => {
        // Combine date and hour if both exist
        let startDateTime;
        if (task.deadline && task.hour) {
          // Assume task.deadline is 'YYYY-MM-DD' and task.hour is 'HH:mm'
          startDateTime = new Date(`${task.deadline}T${task.hour}`);
        } else if (task.deadline) {
          startDateTime = new Date(task.deadline);
        } else {
          startDateTime = new Date(); // fallback
        }
        return {
          id: task.id,
          title: task.name,
          start: startDateTime,
          end: startDateTime,
        };
      })
    : [];

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
          <BigCalendar
            localizer={localizer}
            events={bigEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ backgroundColor: 'white' }}
          />
        </div>
      </div>
    </PageLayout>
  )
}