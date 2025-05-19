'use client'

import PageLayout from "@/components/PageLayout"
import { React, useState } from 'react'
import { Calendar } from "@/components/ui/calendar"
import { Calendar as BigCalendar, momentLocalizer, dateFnsLocalizer } from 'react-big-calendar'
import moment from 'moment';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import 'react-big-calendar/lib/css/react-big-calendar.css';

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

// Contoh data dari to-do yang akan ditampilkan di calendar
const exampleTasks = [
  { id: 1, title: 'Finish report', deadline: '2025-05-20T17:00:00' },
  { id: 2, title: 'Team meeting prep', deadline: '2025-05-22T09:00:00' },
  { id: 3, title: 'Code review', deadline: '2025-05-25T14:30:00' },
  { id: 4, title: 'Tugas CC', deadline: '2025-05-20T14:30:00' },
  { id: 5, title: 'Tugas CC 2', deadline: new Date(moment().add(3, "days")) },
];

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState(exampleTasks);
  console.log(tasks[1])
  const bigEvents = Array.isArray(tasks)
    ? tasks.map(task => ({
        id: task.id,
        title: task.title,
        start: new Date(task.deadline),
        end: new Date(task.deadline),
      }))
    : [];

  return (
    <PageLayout title="CALENDAR">
      <div className="flex flex-col items-center justify-center mb-2 min-[994px]:justify-start min-[994px]:items-start min-[994px]:mb-0 min-[994px]:flex-row w-full">
        <div className="flex flex-col gap-2 text-center">
          <Calendar
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