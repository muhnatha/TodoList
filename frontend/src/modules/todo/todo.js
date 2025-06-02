'use client'
import React, { useState, useEffect, useRef } from 'react'
import PageLayout from "@/components/PageLayout"
import { Button } from "@/components/ui/button"
import { CardContent } from "@/components/ui/card"
import { addTask } from '@/app/action'
import { useActionState } from 'react'
import { CirclePlus, Calendar, Tag, Clock, Edit3, Trash2, CheckCircle, XCircle, AlertTriangle, BadgeCheck } from "lucide-react"
import TaskForm from '@/components/TaskForm'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

const FREE_TODOS_QUOTA_BASE = 5;

const initialActionState = {
  message: '',
  success: false,
  task: null
};

const toYYYYMMDD = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-');
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  }
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

async function fetchTasks(userId) {
  if (!userId) {
    console.error("User ID not provided to fetchTasks");
    return [];
  }
  const { data, error } = await supabase
    .from('task')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching tasks:", error.message);
    return [];
  }
  return data || [];
}

async function updateUserQuotaAndHandleExpiryForTodos(userId, setTaskCountQuotaHook, setIsLoadingQuotaHook) {
  if (!userId) {
    setIsLoadingQuotaHook(false);
    setTaskCountQuotaHook(FREE_TODOS_QUOTA_BASE);
    console.error("User ID not provided");
    return FREE_TODOS_QUOTA_BASE;
  }
  setIsLoadingQuotaHook(true);
  const now = new Date().toISOString();

  const { error: expiryUpdateError } = await supabase
    .from('quota_packages')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('package_type', 'todos')
    .eq('is_active', true)
    .lt('expires_at', now);
  if (expiryUpdateError) console.error("Error deactivating expired todos packages:", expiryUpdateError.message);

  const { data: activePackages, error: fetchActiveError } = await supabase
    .from('quota_packages')
    .select('items_added')
    .eq('user_id', userId)
    .eq('package_type', 'todos')
    .eq('is_active', true);

  let currentTotalTodosQuota = FREE_TODOS_QUOTA_BASE;
  if (fetchActiveError) {
    console.error("Error fetching active todos packages:", fetchActiveError.message);
  } else if (activePackages) {
    currentTotalTodosQuota = FREE_TODOS_QUOTA_BASE + activePackages.reduce((sum, pkg) => sum + pkg.items_added, 0);
  }

  const { error: updateProfileError } = await supabase
    .from('profiles')
    .update({ todos_current_total_quota: currentTotalTodosQuota })
    .eq('id', userId);
  if (updateProfileError) console.warn("Could not update todos_current_total_quota in profiles:", updateProfileError.message);

  setTaskCountQuotaHook(currentTotalTodosQuota);
  setIsLoadingQuotaHook(false);
  return currentTotalTodosQuota;
}

async function syncTasks(userId) {
  const fetchedTasks = await fetchTasks(userId);
  return fetchedTasks;
}

export default function TodoPage() {
  const [actionState, formAction, isPending] = useActionState(addTask, initialActionState);
  const [showForm, setShowForm] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isLoadingQuota, setIsLoadingQuota] = useState(true);
  const [taskCountQuota, setTaskCountQuota] = useState(FREE_TODOS_QUOTA_BASE);
  const [currentUser, setCurrentUser] = useState(null);
  const currentUserIdRef = useRef(null);

  useEffect(() => {
    async function loadTodoPageData(sessionUser) {
      setIsLoadingTasks(true);

      if (!sessionUser) {
        console.log("TodoPage: No user session, setting defaults.");
        setCurrentUser(null);
        currentUserIdRef.current = null;
        setTasks([]);
        setTaskCountQuota(FREE_TODOS_QUOTA_BASE);
        setIsLoadingTasks(false);
        setIsLoadingQuota(false); 
        return;
      }

      if (sessionUser.id !== currentUserIdRef.current) {
          setCurrentUser(sessionUser);
          currentUserIdRef.current = sessionUser.id;
        }

      try {
        await updateUserQuotaAndHandleExpiryForTodos(sessionUser.id, setTaskCountQuota, setIsLoadingQuota);
        const fetchedTasks = await fetchTasks(sessionUser.id);
        setTasks(fetchedTasks);
      } catch (error) {
        console.error("TodoPage: Error during page data loading:", error.message);
        setCurrentUser(null);
        setTasks([]);
        setTaskCountQuota(FREE_TODOS_QUOTA_BASE);
        setIsLoadingQuota(false);
      } finally {
        setIsLoadingTasks(false);
      }
    }

    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (sessionError) {
        console.error("TodoPage: Error getting initial session:", sessionError.message);
        loadTodoPageData(null);
      } else {
        loadTodoPageData(session?.user || null);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("TodoPage Auth Event:", event, "Session User ID:", session?.user?.id);
        if (event === "SIGNED_IN") {
          console.log("TodoPage: User SIGNED_IN. Reloading data.");
          loadTodoPageData(session?.user || null);
        } else if (event === "SIGNED_OUT") {
          console.log("TodoPage: User SIGNED_OUT. Resetting page.");
          loadTodoPageData(null);
        } else if (event === "TOKEN_REFRESHED" && session?.user) {
          console.log("TodoPage: Token refreshed for user:", session.user.id, ". Re-checking quota.");
          // setIsLoadingQuota(true); 
          await updateUserQuotaAndHandleExpiryForTodos(session.user.id, setTaskCountQuota, setIsLoadingQuota);
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (actionState.success && actionState.task) {
      setTasks(prevTasks => {
        const existingTaskIndex = prevTasks.findIndex(t => t.id === actionState.task.id);
        let newTasks;
        if (existingTaskIndex > -1) {
          newTasks = [...prevTasks];
          newTasks[existingTaskIndex] = actionState.task;
        } else {
          newTasks = [actionState.task, ...prevTasks];
        }
        return newTasks.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      });
      setShowForm(false);

      // Log aktivitas: Task baru dibuat
      const logTaskCreation = async () => {
        if (!currentUser) return;
        const { error: logError } = await supabase
          .from('activity_log')
          .insert({
            user_id: currentUser.id,
            page: 'Todo',
            action: 'Created',
            details: `Created new task "${actionState.task.name}"`,
            created_at: new Date().toISOString()
          });
        if (logError) console.error("Error logging task creation activity:", logError.message);
      };
      logTaskCreation();
    } else if (!actionState.success && actionState.message && !isPending) {
      alert(`Error: ${actionState.message}`);
      console.error("Form action error:", actionState.message, actionState.errors);
    }
  }, [actionState, isPending, currentUser]);

  async function updateTaskStatus(taskId, newStatus = 'completed') {
    const originalTasks = [...tasks];
    setTasks(prevTasks => prevTasks.map(task =>
      task.id === taskId ? { ...task, status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : task.completed_at } : task
    ));
    const { error } = await supabase
      .from('task')
      .update({ status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : null })
      .eq('id', taskId);

    if (error) {
      console.error("Error updating task status in DB:", error.message);
      setTasks(originalTasks);
      alert("Failed to update task status. Please try again.");
      return;
    }
    console.log(`Task ${taskId} status updated to ${newStatus}`);

    // Log aktivitas: Task status diperbarui
    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (taskToUpdate && currentUser) {
      const { error: logError } = await supabase
        .from('activity_log')
        .insert({
          user_id: currentUser.id,
          page: 'Todo',
          action: 'Updated',
          details: `Updated task "${taskToUpdate.name}" to status "${newStatus}"`,
          created_at: new Date().toISOString()
        });
      if (logError) console.error("Error logging task update activity:", logError.message);
    }

    if (newStatus === 'completed') {
      const userId = currentUserIdRef.current;

      if (userId) {
        try {
          const { data: taskLogData, error: fetchLogEntryError } = await supabase
            .from('task_completion_log')
            .select('completed_task_count')
            .eq('user_id', userId)
            .single();

          if (fetchLogEntryError && fetchLogEntryError.code !== 'PGRST116') {
            console.error('Error fetching task_completion_log entry:', fetchLogEntryError.message);
          } else {
            const currentTotalCount = taskLogData?.completed_task_count || 0;
            const newTotalCount = currentTotalCount + 1;

            const { error: updateTotalCountError } = await supabase
              .from('task_completion_log')
              .update({ completed_task_count: newTotalCount, updated_at: new Date().toISOString() })
              .eq('user_id', userId);

            if (updateTotalCountError) {
              console.error('Error updating completed_task_count in task_completion_log:', updateTotalCountError.message);
              if (fetchLogEntryError && fetchLogEntryError.code === 'PGRST116') {
                const { error: insertLogError } = await supabase
                  .from('task_completion_log')
                  .insert({ user_id: userId, completed_task_count: 1, updated_at: new Date().toISOString() });
                if (insertLogError) {
                  console.error('Error inserting new entry into task_completion_log:', insertLogError.message);
                } else {
                  console.log(`Inserted new entry in task_completion_log for user ${userId}`);
                }
              }
            } else {
              console.log(`Updated completed_task_count in task_completion_log for user ${userId} to ${newTotalCount}`);
            }
          }
        } catch (e) {
          console.error('Exception during task_completion_log update logic:', e.message);
        }

        try {
          const todayDateString = toYYYYMMDD(new Date());

          const { data: existingSummary, error: fetchDailyError } = await supabase
            .from('daily_task_completion_summary')
            .select('id, tasks_completed_today')
            .eq('user_id', userId)
            .eq('completion_date', todayDateString)
            .single();

          if (fetchDailyError && fetchDailyError.code !== 'PGRST116') {
            console.error('Error fetching daily task summary:', fetchDailyError.message);
          } else if (existingSummary) {
            const newDailyCount = (existingSummary.tasks_completed_today || 0) + 1;
            const { error: updateDailyError } = await supabase
              .from('daily_task_completion_summary')
              .update({ tasks_completed_today: newDailyCount, updated_at: new Date().toISOString() })
              .eq('id', existingSummary.id);

            if (updateDailyError) {
              console.error('Error updating daily task summary:', updateDailyError.message);
            } else {
              console.log(`Daily task summary updated for ${userId} on ${todayDateString}. Tasks today: ${newDailyCount}`);
            }
          } else {
            const { error: insertDailyError } = await supabase
              .from('daily_task_completion_summary')
              .insert({
                user_id: userId,
                completion_date: todayDateString,
                tasks_completed_today: 1
              });

            if (insertDailyError) {
              console.error('Error inserting new daily task summary:', insertDailyError.message);
            } else {
              console.log(`New daily task summary inserted for ${userId} on ${todayDateString}. Tasks today: 1`);
            }
          }
        } catch (e) {
          console.error('Exception during daily_task_completion_summary update logic:', e.message);
        }
      } else {
        console.warn("User ID not available. Cannot update completion logs.");
      }
    }
  }

  useEffect(() => {
    const deleteOldCompletedTasks = async () => {
      if (!currentUser) return;
      const cutoff = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
      const { data: tasksToDelete, error: fetchError } = await supabase
        .from('task')
        .select('id, name')
        .eq('status', 'completed')
        .eq('user_id', currentUser.id)
        .lt('completed_at', cutoff);

      if (fetchError) {
        console.error('Error fetching tasks to delete:', fetchError.message);
        return;
      }

      if (tasksToDelete && tasksToDelete.length > 0) {
        const taskNames = tasksToDelete.map(task => task.name).join(', ');
        const { error, count } = await supabase
          .from('task')
          .delete({ count: 'exact' })
          .eq('status', 'completed')
          .eq('user_id', currentUser.id)
          .lt('completed_at', cutoff);

        if (error) {
          console.error('Error auto-deleting completed tasks:', error.message);
        } else {
          if (count && count > 0) {
            console.log(`Auto-deleted ${count} old completed task(s).`);
            // Log aktivitas: Task dihapus
            const { error: logError } = await supabase
              .from('activity_log')
              .insert({
                user_id: currentUser.id,
                page: 'Todo',
                action: 'Deleted',
                details: `Auto-deleted ${count} old completed task(s): ${taskNames}`,
                created_at: new Date().toISOString()
              });
            if (logError) console.error("Error logging task deletion activity:", logError.message);
            const updatedTasks = await syncTasks(currentUser.id);
            setTasks(updatedTasks);
          } else {
            console.log('Checked for old completed tasks to delete. None found or deleted.');
          }
        }
      }
    };

    if (currentUser) {
      const intervalId = setInterval(deleteOldCompletedTasks, 60 * 60 * 1000);
      deleteOldCompletedTasks();
      return () => clearInterval(intervalId);
    }
  }, [currentUser]);

  const todoTasksRaw = tasks.filter(task => task.status === 'todo');
  const visibleTodoTasks = todoTasksRaw.slice(0, taskCountQuota);
  const blurredTodoTasks = todoTasksRaw.slice(taskCountQuota);
  const actualActiveTodoTaskCount = todoTasksRaw.length;
  const canAddNewTask = actualActiveTodoTaskCount < taskCountQuota;

  const completedTasks = tasks.filter(task => task.status === 'completed').sort((a, b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0));

  return (
    <PageLayout title="TODO">
      {showForm && (
        <TaskForm
          formAction={formAction}
          state={{ ...actionState, pending: isPending }}
          setShowForm={setShowForm}
        />
      )}
      <div className={`flex flex-col p-4 md:p-6 transition-filter duration-300 ${showForm ? 'filter blur-sm' : ''}`}>
        <div className="flex flex-col gap-8">
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b-2 border-gray-200 pb-3">
              <h2 className="text-xl font-semibold text-gray-700">To Do</h2>
              {!isLoadingQuota && (
                <h2 className="text-sm font-medium text-gray-500 tabular-nums">
                  Quota: {actualActiveTodoTaskCount}/{taskCountQuota}
                </h2>
              )}
            </div>
            <CardContent className="p-0">
              {isLoadingTasks || isLoadingQuota ? (
                <div className="flex justify-center items-center h-48">
                  <p className="text-indigo-600 animate-pulse text-lg">Loading tasks & quota...</p>
                </div>
              ) : (
                <>
                  {visibleTodoTasks.length === 0 && blurredTodoTasks.length === 0 && (
                    !canAddNewTask && !isLoadingQuota && actualActiveTodoTaskCount >= taskCountQuota ? null :
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <AlertTriangle size={48} className="text-gray-300 mb-3" />
                        <p className="text-xl text-gray-500 font-semibold">No tasks on your To-Do list yet!</p>
                        <p className="text-sm text-gray-400 mt-1">Click "Add New Task" to get started.</p>
                      </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5 mb-5">
                    {visibleTodoTasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-5 border border-gray-200 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 bg-white flex flex-col justify-between min-h-[220px]"
                      >
                        <div>
                          <h3 className="font-semibold text-lg text-gray-800 break-words mb-1.5">{task.name}</h3>
                          {task.description ? (
                            <p className="text-gray-600 text-sm text-justify break-words max-h-24 overflow-y-auto custom-scrollbar leading-relaxed">
                              {task.description}
                            </p>
                          ) : (
                            <p className="text-gray-400 text-sm mt-1.5 italic">No description provided.</p>
                          )}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="flex flex-wrap gap-x-3 gap-y-2 mb-4 text-xs">
                            {task.deadline && (
                              <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full font-medium">
                                <Calendar size={14} />
                                <span>{formatDate(task.deadline)}</span>
                              </div>
                            )}
                            {task.hour && (
                              <div className="flex items-center gap-1.5 text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full font-medium">
                                <Clock size={14} />
                                <span>{task.hour.slice(0, 5)}</span>
                              </div>
                            )}
                            {task.tag && (
                              <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2.5 py-1 rounded-full font-medium">
                                <Tag size={14} />
                                <span>{task.tag}</span>
                              </div>
                            )}
                          </div>
                          <Button
                            variant="default"
                            size="sm"
                            className="w-full mt-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 transition-colors flex items-center justify-center gap-2 rounded-lg hover:cursor-pointer"
                            onClick={() => updateTaskStatus(task.id, 'completed')}
                          >
                            <CheckCircle size={16} /> Mark as Completed
                          </Button>
                        </div>
                      </div>
                    ))}
                    {blurredTodoTasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-5 border border-dashed border-gray-300 rounded-xl bg-gray-50 opacity-60 flex flex-col justify-between min-h-[220px] relative group"
                      >
                        <div className="absolute top-3 right-3 bg-amber-400 text-amber-800 text-xs px-2.5 py-1 rounded-full font-semibold shadow-sm z-10 flex items-center gap-1">
                          <AlertTriangle size={12} /> Over Quota
                        </div>
                        <div>
                          <h3 className="font-semibold text-md text-gray-700 break-words mb-1.5">{task.name}</h3>
                          {task.description ? (
                            <p className="text-gray-500 text-sm text-justify break-words max-h-20 overflow-y-auto custom-scrollbar">
                              {task.description}
                            </p>
                          ) : (
                            <p className="text-gray-400 text-sm mt-1.5 italic">No description provided.</p>
                          )}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex flex-wrap gap-x-3 gap-y-2 mb-4 text-xs">
                            {/* Metadata for blurred tasks */}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-auto bg-gray-300 text-gray-600 font-medium py-2.5 cursor-not-allowed flex items-center justify-center gap-2 rounded-lg"
                            disabled
                          >
                            <XCircle size={16} /> Mark Completed
                          </Button>
                        </div>
                        <div className="absolute inset-0 bg-slate-700 bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl">
                          <Link
                            href='/settings/billing'
                            className="px-5 py-2.5 bg-red-500 text-white font-semibold text-sm rounded-lg shadow-md hover:bg-red-600 transition-colors"
                          >
                            Upgrade to Use Task
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                  {actualActiveTodoTaskCount > taskCountQuota && !isLoadingQuota && (
                    <div className="flex flex-col items-center justify-center py-6 px-4 text-center mt-4 bg-red-50 border-2 border-dashed border-red-200 rounded-xl">
                      <AlertTriangle size={32} className="text-red-500 mb-2.5" />
                      <p className="text-lg font-semibold text-red-600 mb-1.5">
                        You've used {actualActiveTodoTaskCount} of {taskCountQuota} task quota!
                      </p>
                      <p className="text-sm text-red-500 mb-4 max-w-md">
                        Some tasks are currently hidden or blurred because you've exceeded your active task limit. Please upgrade your plan or complete existing tasks.
                      </p>
                      <Link
                        href='/settings/billing'
                        className="inline-block px-6 py-2.5 bg-red-500 text-white font-medium text-sm rounded-lg shadow-md hover:bg-red-600 transition-colors"
                      >
                        Increase Quota Now
                      </Link>
                    </div>
                  )}
                  {!showForm && (
                    <div className={`flex flex-col items-center justify-center py-8 text-center`}>
                      {canAddNewTask && !isLoadingQuota && (
                        <Button
                          variant="default"
                          size="lg"
                          className="text-base flex items-center gap-2.5 hover:cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-3.5 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                          onClick={() => {
                            setShowForm(true);
                          }}
                        >
                          <CirclePlus size={22} />
                          <span>Add New Task</span>
                        </Button>
                      )}
                      {!canAddNewTask && !isLoadingQuota && actualActiveTodoTaskCount === taskCountQuota && visibleTodoTasks.length > 0 && (
                        <div className="text-center mt-6 p-5 bg-amber-50 border border-amber-200 rounded-xl">
                          <AlertTriangle size={28} className="text-amber-500 mb-2 mx-auto" />
                          <p className="font-semibold text-amber-700">You've reached your task quota ({taskCountQuota}/{taskCountQuota}).</p>
                          <p className="text-sm text-amber-600 mt-1">Complete existing tasks or <Link href='/settings/billing' className="underline hover:text-amber-700 font-medium">upgrade your plan</Link> to add more.</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </div>

          <div className="flex flex-col mt-6">
            <div className="flex items-center justify-between mb-4 border-b-2 border-gray-200 pb-3">
              <h2 className="text-xl font-semibold text-gray-700">Completed <span className='opacity-50'>(Deleted in 1 day)</span></h2>
              {!isLoadingTasks && <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium">{completedTasks.length} task(s)</span>}
            </div>
            <CardContent className="p-0">
              {isLoadingTasks ? (
                <div className="flex justify-center items-center h-40">
                  <p className="text-indigo-600 animate-pulse">Loading completed tasks...</p>
                </div>
              ) : completedTasks.length === 0 ? (
                <div className="flex flex-col justify-center items-center py-12 text-center text-gray-400">
                  <BadgeCheck size={52} className="text-gray-300 mb-3.5" />
                  <p className="font-medium text-lg text-gray-500">No completed tasks yet.</p>
                  <p className="text-sm">Tasks you mark as done will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
                  {completedTasks.map((task) => (
                    <div key={task.id} className="p-4 border border-green-300 bg-green-50 rounded-xl shadow-sm opacity-90 hover:opacity-100 hover:shadow-md transition-all duration-200">
                      <h3 className="font-medium text-gray-700 line-through break-words">{task.name}</h3>
                      {task.description && <p className="text-xs text-gray-500 mt-1.5 line-through break-words max-h-16 overflow-y-auto custom-scrollbar">{task.description}</p>}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3 pt-3 border-t border-green-200 text-xs">
                        {task.tag && (
                          <div className="flex items-center gap-1 text-gray-500 bg-gray-200/70 px-2 py-0.5 rounded-full">
                            <Tag size={12} />
                            <span>{task.tag}</span>
                          </div>
                        )}
                        {task.completed_at && (
                          <div className="flex items-center gap-1 text-green-700 font-medium">
                            <Calendar size={12} />
                            <span>Done: {formatDate(task.completed_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}