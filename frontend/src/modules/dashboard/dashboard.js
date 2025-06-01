// app/dashboard/page.jsx
'use client'
import React, { useState, useEffect } from 'react';
import PageLayout from "@/components/PageLayout";
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { Button } from "@/components/ui/button";

// Import Lucide Icons
import {
  BarChart3, CheckCircle2, AlertTriangle, CalendarClock, Tag as TagIcon,
  Zap, DollarSign, ListChecks, PlusCircle, ListTodo, Users, TrendingUp,
  Archive, LayoutGrid, StickyNote
} from 'lucide-react';

// Import Recharts components
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const FREE_NOTES_QUOTA_BASE = 3;
const FREE_TODOS_QUOTA_BASE = 5;

// --- Helper Functions ---
const formatDate = (dateString, options) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';
  const defaultOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString(undefined, options || defaultOptions);
};

const toYYYYMMDD = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const isToday = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return false;
  const today = new Date();
  return date.getFullYear() === today.getFullYear() &&
         date.getMonth() === today.getMonth() &&
         date.getDate() === today.getDate();
};

const isOverdue = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

// Fetches data from 'task' table for active tasks, quota etc.
async function fetchDashboardDataForUser(userId) {
  if (!userId) {
    console.error("Dashboard (Tasks): User ID not provided.");
    return { tasks: [], quota: FREE_TODOS_QUOTA_BASE };
  }

  const { data: tasksData, error: tasksError } = await supabase
    .from('task')
    .select('id, created_at, deadline, tag, status, completed_at')
    .eq('user_id', userId);
  if (tasksError) console.error("Dashboard: Error fetching tasks:", tasksError.message);

  let userTaskQuota = FREE_TODOS_QUOTA_BASE;
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('todos_current_total_quota')
    .eq('id', userId)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    console.error("Dashboard: Error fetching profile for task quota:", profileError.message);
  } else if (profile) {
    userTaskQuota = profile.todos_current_total_quota ?? FREE_TODOS_QUOTA_BASE;
  }
  return { tasks: tasksData || [], quota: userTaskQuota };
}

// Fetches total completed tasks count from 'task_completion_log'
async function fetchTotalCompletedTasks(userId) {
  if (!userId) {
    console.error("Dashboard (Task Log): User ID not provided.");
    return []; // Return empty array if no user ID
  }
  const { data: completedTasksLog, error: completedTasksError } = await supabase
    .from('task_completion_log')
    .select('completed_task_count') // Only need the count
    .eq('user_id', userId)
    .order('updated_at', { ascending: false }) // In case there are multiple, take the latest
    .limit(1); // Expecting one row per user or the latest meaningful row

  if (completedTasksError) {
    console.error("Error fetching completed tasks log:", completedTasksError.message);
    return []; // Return empty array on error
  }
  return completedTasksLog || [];
}

// Fetches daily completion summaries for a given date range
async function fetchDailySummaryForRange(userId, startDateStr, endDateStr) {
    if (!userId) {
        console.error("Dashboard (Daily Summary Range): User ID not provided.");
        return [];
    }
    const { data, error } = await supabase
        .from('daily_task_completion_summary')
        .select('completion_date, tasks_completed_today')
        .eq('user_id', userId)
        .gte('completion_date', startDateStr)
        .lte('completion_date', endDateStr)
        .order('completion_date', { ascending: true });

    if (error) {
        console.error("Error fetching daily task completion summary for range:", error.message);
        return [];
    }
    return data || [];
}

// Fetches recent notes data (implementation from your provided code)
async function fetchRecentNotesData(userId) {
  if (!userId) {
    console.error("Dashboard (Notes): User ID not provided.");
    return { recentNotes: [], currentNotesCount: 0, quota: FREE_NOTES_QUOTA_BASE };
  }
  const { data: recentNotesData, error: notesError } = await supabase
    .from('notes')
    .select('id, title, content, created_at, date')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(3);
  if (notesError) console.error("Dashboard: Error fetching recent notes:", notesError.message);

  const { count: totalNotes, error: countError } = await supabase
    .from('notes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (countError) console.error("Dashboard: Error fetching total notes count:", countError.message);

  let userNotesQuota = FREE_NOTES_QUOTA_BASE;
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('notes_current_total_quota')
    .eq('id', userId)
    .single();
  if (profileError && profileError.code !== 'PGRST116') {
    console.error("Dashboard: Error fetching profile for notes quota:", profileError.message);
  } else if (profile) {
    userNotesQuota = profile.notes_current_total_quota ?? FREE_NOTES_QUOTA_BASE;
  }
  return {
    recentNotes: recentNotesData || [],
    currentNotesCount: totalNotes || 0,
    quota: userNotesQuota
  };
}


export default function DashboardPage() {
  const [dashboardStats, setDashboardStats] = useState({
    activeTodoCount: 0,
    totalCompletedCount: 0,     // To be sourced from task_completion_log
    dueTodayCount: 0,
    overdueCount: 0,
    completedTodayCount: 0,     // To be sourced from daily_task_completion_summary
    completedThisWeekCount: 0,  // To be sourced from daily_task_completion_summary
    addedTodayCount: 0,
    quota: FREE_TODOS_QUOTA_BASE,
    quotaUsage: 0,
    quotaPercentage: 0,
    isOverQuota: false,
    tagSummary: {},
  });

  const [notesStats, setNotesStats] = useState({
    totalNotesCount: 0,
    notesQuota: FREE_NOTES_QUOTA_BASE,
    notesQuotaUsage: 0,
    notesQuotaPercentage: 0,
    isOverNotesQuota: false,
    recentNotes: [],
  });

  const [completionGraphData, setCompletionGraphData] = useState([]); // Sourced from daily_task_completion_summary
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    async function loadDashboard() {
      setIsLoading(true);
      const { data: authDataResult, error: authUserError } = await supabase.auth.getUser();

      if (authUserError || !authDataResult?.user) {
        console.error("Dashboard: Error fetching user session:", authUserError?.message || "No user session");
        setUserName('Guest');
        // Reset stats to default for no user
        setDashboardStats(prev => ({ ...prev, activeTodoCount: 0, totalCompletedCount: 0, dueTodayCount: 0, overdueCount: 0, completedTodayCount: 0, completedThisWeekCount: 0, addedTodayCount: 0, quota: FREE_TODOS_QUOTA_BASE, quotaUsage: 0, quotaPercentage: 0, isOverQuota: false, tagSummary: {} }));
        setNotesStats(prev => ({ ...prev, totalNotesCount: 0, notesQuota: FREE_NOTES_QUOTA_BASE, notesQuotaUsage: 0, notesQuotaPercentage: 0, isOverNotesQuota: false, recentNotes: [] }));
        setCompletionGraphData([]);
        setIsLoading(false);
        return;
      }
      const user = authDataResult.user;
      setUserName(user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : '') || 'User');

      // --- Determine Date Ranges for Daily Summaries ---
      const today = new Date();
      const todayStr = toYYYYMMDD(today);

      const chartStartDate = new Date(); // For 7-day chart
      chartStartDate.setDate(today.getDate() - 6);

      const currentDayOfWeek = today.getDay(); // 0=Sun, 1=Mon
      const weekStartDate = new Date(today); // For "this week" calculation
      weekStartDate.setDate(today.getDate() - (currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1));

      const earliestFetchDateForDailySummary = new Date(Math.min(chartStartDate.getTime(), weekStartDate.getTime()));
      const earliestFetchDateStr = toYYYYMMDD(earliestFetchDateForDailySummary);

      // --- Fetch All Data Concurrently ---
      const [
        taskRelatedData,         // From 'task' table
        taskLogEntries,          // From 'task_completion_log' for total completed
        rangedDailySummaries,    // From 'daily_task_completion_summary' for chart & weekly/daily counts
        notesRelatedData         // For notes
      ] = await Promise.all([
        fetchDashboardDataForUser(user.id),
        fetchTotalCompletedTasks(user.id),
        fetchDailySummaryForRange(user.id, earliestFetchDateStr, todayStr),
        fetchRecentNotesData(user.id)
      ]);

      // --- Process Total Completed Tasks (from task_completion_log) ---
      let actualTotalCompletedCount = 0;
      if (taskLogEntries && taskLogEntries.length > 0 && typeof taskLogEntries[0].completed_task_count === 'number') {
        actualTotalCompletedCount = taskLogEntries[0].completed_task_count;
      }
      // Optional: Fallback if task_completion_log is empty but there are completed tasks in 'task' table (less ideal if tasks are deleted)
      // else if (taskRelatedData.tasks) {
      //   actualTotalCompletedCount = taskRelatedData.tasks.filter(t => t.status === 'completed').length;
      // }


      // --- Process Ranged Daily Summaries (for chart, today's/week's completions) ---
      const dailySummaryMap = new Map();
      if (rangedDailySummaries) {
        rangedDailySummaries.forEach(summary => {
          if (summary.completion_date && typeof summary.tasks_completed_today === 'number') {
            dailySummaryMap.set(summary.completion_date, summary.tasks_completed_today);
          }
        });
      }

      const newCompletedTodayCount = dailySummaryMap.get(todayStr) || 0;

      let newCompletedThisWeekCount = 0;
      for (let i = 0; i < 7; i++) {
        const dayInCycle = new Date(weekStartDate);
        dayInCycle.setDate(weekStartDate.getDate() + i);
        if (dayInCycle > today) break;
        newCompletedThisWeekCount += dailySummaryMap.get(toYYYYMMDD(dayInCycle)) || 0;
      }

      const newCompletionGraphData = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateString = toYYYYMMDD(d);
        const dayNameFormatted = formatDate(d.toISOString(), { weekday: 'short' });
        newCompletionGraphData.push({
          date: dateString,
          name: `${dayNameFormatted} (${d.getDate()})`,
          completed: dailySummaryMap.get(dateString) || 0
        });
      }
      setCompletionGraphData(newCompletionGraphData);

      // --- Process Active Tasks Data (from 'task' table) ---
      const allTasks = taskRelatedData.tasks;
      const taskQuotaFromProfile = taskRelatedData.quota;
      const activeTodos = allTasks.filter(t => t.status === 'todo');
      const dueToday = activeTodos.filter(t => t.deadline && isToday(t.deadline)).length;
      const overdue = activeTodos.filter(t => t.deadline && isOverdue(t.deadline) && !isToday(t.deadline)).length;
      const addedToday = allTasks.filter(t => t.created_at && isToday(t.created_at)).length;
      
      const currentTaskQuotaUsage = activeTodos.length;
      const calculatedTaskQuotaPercentage = taskQuotaFromProfile > 0 ? Math.min((currentTaskQuotaUsage / taskQuotaFromProfile) * 100, 100) : 0;
      const tags = activeTodos.reduce((acc, task) => {
        const tagName = task.tag || 'Untagged';
        acc[tagName] = (acc[tagName] || 0) + 1;
        return acc;
      }, {});

      // --- Update Dashboard Stats State ---
      setDashboardStats({
        activeTodoCount: activeTodos.length,
        totalCompletedCount: actualTotalCompletedCount, // Sourced from task_completion_log
        dueTodayCount: dueToday,
        overdueCount: overdue,
        completedTodayCount: newCompletedTodayCount,     // Sourced from daily_task_completion_summary
        completedThisWeekCount: newCompletedThisWeekCount, // Sourced from daily_task_completion_summary
        addedTodayCount: addedToday,
        quota: taskQuotaFromProfile,
        quotaUsage: currentTaskQuotaUsage,
        quotaPercentage: calculatedTaskQuotaPercentage,
        isOverQuota: currentTaskQuotaUsage >= taskQuotaFromProfile && taskQuotaFromProfile > 0,
        tagSummary: tags,
      });

      // --- Process Notes Data ---
      const notesCurrentQuotaUsage = notesRelatedData.currentNotesCount;
      const calculatedNotesQuotaPercentage = notesRelatedData.quota > 0 ? Math.min((notesCurrentQuotaUsage / notesRelatedData.quota) * 100, 100) : 0;
      setNotesStats({
        totalNotesCount: notesRelatedData.currentNotesCount,
        notesQuota: notesRelatedData.quota,
        notesQuotaUsage: notesCurrentQuotaUsage,
        notesQuotaPercentage: calculatedNotesQuotaPercentage,
        isOverNotesQuota: notesCurrentQuotaUsage >= notesRelatedData.quota && notesRelatedData.quota > 0,
        recentNotes: notesRelatedData.recentNotes,
      });

      setIsLoading(false);
    }
    loadDashboard();
  }, []);
  
  const statCards = [
    { title: "Active 'To Do'", value: dashboardStats.activeTodoCount, icon: ListTodo, color: "text-sky-500", bgColor: "bg-sky-50 dark:bg-sky-900/30" },
    { title: "Total Notes", value: notesStats.totalNotesCount, icon: StickyNote, color: "text-purple-500", bgColor: "bg-purple-50 dark:bg-purple-900/30" },
    { title: "Overdue Tasks", value: dashboardStats.overdueCount, icon: AlertTriangle, color: "text-red-500", bgColor: "bg-red-50 dark:bg-red-900/30" },
    { title: "Total Completed Tasks", value: dashboardStats.totalCompletedCount, icon: CheckCircle2, color: "text-green-500", bgColor: "bg-green-50 dark:bg-green-900/30" },
  ];

  // ... (Rest of the JSX for UI rendering remains the same as your provided code)
  if (isLoading) {
    return (
      <PageLayout title="DASHBOARD OVERVIEW">
        <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center">
            <LayoutGrid className="h-12 w-12 text-slate-400 animate-spin mb-4" />
            <p className="text-lg text-slate-600 dark:text-slate-400">Loading your dashboard...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={`Welcome back, ${userName}!`}>
      <div className="space-y-8">
        {/* Stat Cards Section */}
        <section>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">At a Glance</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((card) => (
              <div key={card.title} className={`p-5 rounded-xl shadow-lg flex items-start space-x-4 ${card.bgColor} border border-opacity-20 ${card.color.replace('text-', 'border-')}`}>
                <div className={`p-3 rounded-lg ${card.bgColor.replace('bg-', 'dark:bg-opacity-50 bg-opacity-50')} ${card.color}`}>
                  <card.icon className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">{card.value}</p>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{card.title}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Completion Graph Section */}
        <section className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-1">
            Completed Tasks (Last 7 Days)
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Overview of tasks you've marked as completed recently.
          </p>
          {completionGraphData.length > 0 ? (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart
                  data={completionGraphData}
                  margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} className="dark:stroke-slate-600" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'rgb(100 116 139 / var(--tw-text-opacity))' }} className="dark:fill-slate-400" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'rgb(100 116 139 / var(--tw-text-opacity))' }} className="dark:fill-slate-400" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      borderRadius: '0.5rem',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -2px rgba(0,0,0,.1)',
                      color: '#334155'
                    }}
                    itemStyle={{ color: '#38bdf8' }}
                    labelStyle={{ fontWeight: 'bold', color: '#0f172a' }}
                    formatter={(value) => [`${value} tasks`, 'Completed']}
                  />
                  <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }} />
                  <Bar dataKey="completed" fill="#38bdf8" name="Tasks Completed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-60">
              <p className="text-slate-500 dark:text-slate-400">No completion data available for the last 7 days.</p>
            </div>
          )}
        </section>

        {/* Quota & Recent Activity Section */}
         <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-1">Task Quota Usage</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                    You've used {dashboardStats.quotaUsage} of your {dashboardStats.quota} task limit.
                </p>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 mb-1">
                    <div
                        className={`h-3 rounded-full transition-all duration-500 ease-out ${dashboardStats.isOverQuota ? 'bg-red-500' : 'bg-sky-500'}`}
                        style={{ width: `${dashboardStats.quotaPercentage}%` }}
                    ></div>
                </div>
                <p className="text-xs text-right text-slate-500 dark:text-slate-400 mb-4">{Math.round(dashboardStats.quotaPercentage)}% Used</p>
                {dashboardStats.isOverQuota && (
                    <p className="text-xs text-red-500 dark:text-red-400 mb-3 text-center">
                        You are over your task quota.
                    </p>
                )}
                <Link href="/settings/billing">
                    <Button variant="outline" className="hover:cursor-pointer w-full text-sky-600 border-sky-500 hover:bg-sky-50 dark:text-sky-400 dark:border-sky-600 dark:hover:bg-sky-700/50">
                        <DollarSign className="h-4 w-4 mr-2" /> Manage Task Quota
                    </Button>
                </Link>
            </div>
            <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-1">Notes Quota Usage</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                    You've used {notesStats.notesQuotaUsage} of your {notesStats.notesQuota} notes limit.
                </p>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 mb-1">
                    <div
                        className={`h-3 rounded-full transition-all duration-500 ease-out ${notesStats.isOverNotesQuota ? 'bg-red-500' : 'bg-purple-500'}`}
                        style={{ width: `${notesStats.notesQuotaPercentage}%` }}
                    ></div>
                </div>
                <p className="text-xs text-right text-slate-500 dark:text-slate-400 mb-4">{Math.round(notesStats.notesQuotaPercentage)}% Used</p>
                {notesStats.isOverNotesQuota && (
                    <p className="text-xs text-red-500 dark:text-red-400 mb-3 text-center">
                        You are over your notes quota.
                    </p>
                )}
                <Link href="/settings/billing">
                    <Button variant="outline" className="hover:cursor-pointer w-full text-purple-600 border-purple-500 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-600 dark:hover:bg-purple-700/50">
                        <DollarSign className="h-4 w-4 mr-2" /> Manage Notes Quota
                    </Button>
                </Link>
            </div>
            <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Recent Activity</h3>
                <ul className="space-y-3">
                    <li className="flex items-center text-sm text-slate-700 dark:text-slate-300">
                        <PlusCircle className="h-5 w-5 mr-3 text-blue-500" />
                        <span><strong className="font-semibold text-slate-800 dark:text-slate-100">{dashboardStats.addedTodayCount}</strong> tasks added today.</span>
                    </li>
                    <li className="flex items-center text-sm text-slate-700 dark:text-slate-300">
                        <CheckCircle2 className="h-5 w-5 mr-3 text-green-500" />
                        <span><strong className="font-semibold text-slate-800 dark:text-slate-100">{dashboardStats.completedTodayCount}</strong> tasks completed today.</span>
                    </li>
                    <li className="flex items-center text-sm text-slate-700 dark:text-slate-300">
                        <TrendingUp className="h-5 w-5 mr-3 text-indigo-500" />
                        <span><strong className="font-semibold text-slate-800 dark:text-slate-100">{dashboardStats.completedThisWeekCount}</strong> tasks completed this week.</span>
                    </li>
                </ul>
            </div>
        </section>

        {/* Recent Notes Section */}
        <section className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border dark:border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              Recent Notes
            </h3>
            <Link href="/notes">
              <Button variant="ghost" size="sm" className="text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-700/50 hover:cursor-pointer">
                View All Notes
              </Button>
            </Link>
          </div>
          {notesStats.recentNotes.length > 0 ? (
            <ul className="space-y-3">
              {notesStats.recentNotes.map(note => (
                <li key={note.id} className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-700/30 dark:border-slate-600 hover:shadow-sm transition-shadow group">
                  <Link href={`/notes?noteId=${note.id}`} className="block">
                    <h4 className="font-medium text-slate-700 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 truncate">{note.title || "Untitled Note"}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                      {note.date ? formatDate(note.date) : (note.created_at ? `Created: ${formatDate(note.created_at)}` : 'No date')}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 overflow-hidden">
                      {note.content || "No content..."}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <StickyNote className="h-10 w-10 text-slate-400 mb-3" />
              <p className="text-slate-500 dark:text-slate-400 mb-3">You haven't created any notes yet.</p>
              <Link href="/notes">
                  <Button variant="outline" size="sm" className='hover:cursor-pointer'>
                    <PlusCircle className="h-4 w-4 mr-2" /> Create Your First Note
                  </Button>
              </Link>
            </div>
          )}
        </section>

        {/* Tag & Quick Links Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border dark:border-slate-700">
           <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Task Tags Overview</h3>
           {Object.keys(dashboardStats.tagSummary).length > 0 ? (
             <div className="flex flex-wrap gap-3">
               {Object.entries(dashboardStats.tagSummary).map(([tag, count]) => (
                 <div key={tag} className="bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-md text-sm">
                   <TagIcon className="h-3.5 w-3.5 mr-1.5 inline-block text-slate-500 dark:text-slate-400" />
                   <span className="font-medium text-slate-700 dark:text-slate-300">{tag}: </span>
                   <span className="text-slate-600 dark:text-slate-400">{count}</span>
                 </div>
               ))}
             </div>
           ) : (
             <p className="text-sm text-slate-500 dark:text-slate-400">No tasks with tags found.</p>
           )}
           </div>
           <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border dark:border-slate-700">
             <h3 className="text-lg gap-2 font-semibold text-slate-800 dark:text-slate-200 mb-4">Quick Links</h3>
             <div className='flex flex-col gap-3'>
                 <Link href="/todo">
                   <Button variant="default" className="hover:cursor-pointer w-full bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600">
                     <ListChecks className="h-4 w-4 mr-2" /> View My To-Do List
                   </Button>
                 </Link>
                 <Link href="/notes">
                   <Button variant="default" className="hover:cursor-pointer w-full bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600">
                     <StickyNote className="h-4 w-4 mr-2" /> View My Notes
                   </Button>
                 </Link>
             </div>
           </div>
        </section>
        <div className="mt-10 h-20"></div>
      </div>
    </PageLayout>
  );
}