'use client'

import PageLayout from "@/components/PageLayout"
import { React,useState } from 'react'
import { Calendar } from "@/components/ui/calendar"

export default function CalendarPage() {
  const [date, setDate] = useState(new Date());

  return (
    <PageLayout title="CALENDAR">
      <div className="flex w-full">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="mr-2"
        />
        <div className="border-l-1 w-full">
          <h1 className="ml-2">Tes</h1>
        </div>
      </div>
    </PageLayout>
  )
}