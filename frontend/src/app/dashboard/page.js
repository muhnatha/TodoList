// app/dashboard/page.jsx
'use client'
import React, { useState, useEffect } from 'react';
import PageLayout from "@/components/PageLayout";
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { Button } from "@/components/ui/button"; // Make sure this is imported

// Import Lucide Icons
import {
  BarChart3, CheckCircle2, AlertTriangle, CalendarClock, Tag as TagIcon,
  Zap, DollarSign, ListChecks, PlusCircle, ListTodo, Users, TrendingUp,
  Archive, LayoutGrid
} from 'lucide-react';

// Import Recharts components
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// --- Helper Functions (isToday, isOverdue, isThisWeek, formatDate - keep them as they are) ---
const formatDate = (dateString, options) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';
  const defaultOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString(undefined, options || defaultOptions);
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

const isThisWeek = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;
    const today = new Date();
    const currentDay = today.getDay();
    const firstDayEpoch = today.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
    const firstDayOfWeek = new Date(firstDayEpoch);
    firstDayOfWeek.setHours(0, 0, 0, 0);
    const lastDayOfWeek = new Date(firstDayOfWeek);
    lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
    lastDayOfWeek.setHours(23, 59, 59, 999);
    return date >= firstDayOfWeek && date <= lastDayOfWeek;
};

async function fetchDashboardDataForUser() {
  const { data: authData, error: userError } = await supabase.auth.getUser();
  if (userError || !authData || !authData.user) {
    console.error("Dashboard: Error fetching user session:", userError?.message || "No user session");
    return { tasks: [], quota: 5, user: null };
  }
  const user = authData.user;

  const { data: tasksData, error: tasksError } = await supabase
    .from('task')
    .select('id, created_at, deadline, tag, status, completed_at')
    .eq('user_id', user.id);
  if (tasksError) console.error("Dashboard: Error fetching tasks:", tasksError.message);

  let userQuota = 5;
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('todo_count')
    .eq('id', user.id)
    .single();
  if (profileError && profileError.code !== 'PGRST116') {
    console.error("Dashboard: Error fetching profile for quota:", profileError.message);
  } else if (profile) {
    userQuota = profile.todo_count ?? 5;
  }
  return { tasks: tasksData || [], quota: userQuota, user };
}

async function fetchTotalCompletedTasks() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("Error fetching user:", userError?.message || "No user session");
    return [];
  }

  const { data: completedTasks, error: completedTasksError } = await supabase
    .from('task_completion_log')
    .select('id, completed_task_count, updated_at')
    .eq('user_id', user.id);

  if (completedTasksError) {
    console.error("Error fetching completed tasks:", completedTasksError.message);
    return [];
  }

  return completedTasks;
}

export default function DashboardPage() {
  const [dashboardStats, setDashboardStats] = useState({
    activeTodoCount: 0,
    totalCompletedCount: 0,
    dueTodayCount: 0,
    overdueCount: 0,
    completedTodayCount: 0,
    completedThisWeekCount: 0,
    addedTodayCount: 0,
    quota: 5,
    quotaUsage: 0,
    quotaPercentage: 0,
    isOverQuota: false,
    tagSummary: {},
  });
  const [completionGraphData, setCompletionGraphData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [completedTasks, setCompletedTasks] = useState(0); 

  useEffect(() => {
    async function loadDashboard() {
      setIsLoading(true);
      const { tasks: allTasks, quota, user } = await fetchDashboardDataForUser();
      const taskLogData = await fetchTotalCompletedTasks();

      if (user) {
        setUserName(user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : '') || 'User');
      } else {
        setUserName('Guest');
      }

      const activeTodos = allTasks.filter(t => t.status === 'todo');
      const actualTotalCompletedCount = (taskLogData && taskLogData.length > 0 && taskLogData[0].completed_task_count) 
                                        ? taskLogData[0].completed_task_count 
                                        : 0;
      const trulyCompletedTasks = allTasks.filter(t => t.status === 'completed' && t.completed_at);

      const dueToday = activeTodos.filter(t => t.deadline && isToday(t.deadline)).length;
      const overdue = activeTodos.filter(t => t.deadline && isOverdue(t.deadline) && !isToday(t.deadline)).length;
      
      const completedToday = trulyCompletedTasks.filter(t => isToday(t.completed_at)).length;
      const completedThisWeek = trulyCompletedTasks.filter(t => isThisWeek(t.completed_at)).length;
      
      const addedToday = allTasks.filter(t => t.created_at && isToday(t.created_at)).length;
      const currentQuotaUsage = activeTodos.length;
      const calculatedQuotaPercentage = quota > 0 ? Math.min((currentQuotaUsage / quota) * 100, 100) : 0;
      const tags = activeTodos.reduce((acc, task) => {
        const tagName = task.tag || 'Untagged';
        acc[tagName] = (acc[tagName] || 0) + 1;
        return acc;
      }, {});

      setDashboardStats({
        activeTodoCount: activeTodos.length,
        totalCompletedCount: actualTotalCompletedCount,
        dueTodayCount: dueToday,
        overdueCount: overdue,
        completedTodayCount: completedToday,        
        completedThisWeekCount: completedThisWeek,   
        addedTodayCount: addedToday,
        quota: quota,
        quotaUsage: currentQuotaUsage,
        quotaPercentage: calculatedQuotaPercentage,
        isOverQuota: currentQuotaUsage >= quota,
        tagSummary: tags,
      });

      const last7Days = [];
      const dayMap = new Map();
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0,0,0,0);
        const dateString = d.toISOString().split('T')[0];
        const dayName = formatDate(d.toISOString(), { weekday: 'short' });
        last7Days.push({ date: dateString, name: `${dayName} (${d.getDate()})`, completed: 0 });
        dayMap.set(dateString, last7Days[last7Days.length-1]);
      }

      trulyCompletedTasks.forEach(task => {
        if (task.completed_at) { 
          const completedDate = new Date(task.completed_at);
          completedDate.setHours(0,0,0,0);
          const completedDateString = completedDate.toISOString().split('T')[0];
          if (dayMap.has(completedDateString)) {
            dayMap.get(completedDateString).completed++;
          }
        }
      });
      setCompletionGraphData(last7Days);
      setIsLoading(false);
    }
    loadDashboard();
  }, []);
  

  const statCards = [
    { title: "Active 'To Do'", value: dashboardStats.activeTodoCount, icon: ListTodo, color: "text-sky-500", bgColor: "bg-sky-50 dark:bg-sky-900/30" },
    { title: "Tasks Due Today", value: dashboardStats.dueTodayCount, icon: CalendarClock, color: "text-amber-500", bgColor: "bg-amber-50 dark:bg-amber-900/30" },
    { title: "Overdue Tasks", value: dashboardStats.overdueCount, icon: AlertTriangle, color: "text-red-500", bgColor: "bg-red-50 dark:bg-red-900/30" },
    { title: "Total Completed", value: dashboardStats.totalCompletedCount, icon: CheckCircle2, color: "text-green-500", bgColor: "bg-green-50 dark:bg-green-900/30" },
  ];

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
        {/* Stat Cards Section (same as before) */}
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

        {/* NEW: Completion Graph Section */}
        <section className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-1">
            Completed Tasks (Last 7 Days)
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Overview of tasks you've marked as completed recently.
          </p>
          {completionGraphData.length > 0 ? (
            <div style={{ width: '100%', height: 300 }}> {/* ResponsiveContainer needs a sized parent */}
              <ResponsiveContainer>
                <BarChart
                  data={completionGraphData}
                  margin={{ top: 5, right: 20, left: -20, bottom: 5 }} // Adjusted left margin for YAxis
                >
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} className="dark:stroke-slate-600" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'rgb(100 116 139 / var(--tw-text-opacity))' }} className="dark:fill-slate-400" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'rgb(100 116 139 / var(--tw-text-opacity))' }} className="dark:fill-slate-400" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.9)', // White with opacity
                      borderRadius: '0.5rem', // Rounded corners
                      border: '1px solid #e2e8f0', // Light gray border
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -2px rgba(0,0,0,.1)', // Subtle shadow
                      color: '#334155' // Dark slate text
                    }}
                    labelStyle={{ fontWeight: 'bold', color: '#0f172a' }} // Darker label
                    formatter={(value, name) => [`${value} tasks`, 'Completed']} // Custom tooltip text
                  />
                  <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }} />
                  <Bar dataKey="completed" fill="#38bdf8" name="Tasks Completed" radius={[4, 4, 0, 0]} /> {/* Sky blue fill from Tailwind sky-500 */}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-60">
              <p className="text-slate-500 dark:text-slate-400">No completion data available for the last 7 days.</p>
            </div>
          )}
        </section>

        {/* Quota & Recent Activity Section (same as before, but maybe placed after graph) */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quota Card */}
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
                You are over your task quota. Some features may be limited.
              </p>
            )}
            <Link href="/settings/billing">
              <Button variant="outline" className="hover:cursor-pointer w-full text-sky-600 border-sky-500 hover:bg-sky-50 dark:text-sky-400 dark:border-sky-600 dark:hover:bg-sky-700/50">
                <DollarSign className="h-4 w-4 mr-2" /> Manage Quota / Upgrade
              </Button>
            </Link>
          </div>

          {/* Recent Activity Card */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border dark:border-slate-700">
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

        {/* Tag Breakdown & Quick Links Section (same as before) */}
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

          {/* Quick Links Card */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Quick Links</h3>
            <div className="space-y-3">
              <Link href="/todo">
                <Button variant="default" className="hover:cursor-pointer w-full bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600">
                  <ListChecks className="h-4 w-4 mr-2" /> View My To-Do List
                </Button>
              </Link>
            </div>
          </div>
        </section>
        <div className="mt-10 h-20"></div> {/* Scroll test placeholder */}
      </div>
    </PageLayout>
  );
}