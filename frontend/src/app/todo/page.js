'use client'
import React, { useState, useEffect } from 'react'
import PageLayout from "@/components/PageLayout"
import { Button } from "@/components/ui/button"
import { CardContent } from "@/components/ui/card" // Assuming this is used for structure
import { addTask } from '../action' // Server Action for adding tasks
import { useActionState } from 'react'
import { CirclePlus, Calendar, Tag, Clock } from "lucide-react"
import TaskForm from '@/components/TaskForm'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link' // Import Link for navigation

// Hasil vibe coding dari code awal
const initialState = {
  message: '',
  success: false,
  task: null, // Ensure task is part of initial state if used in useEffect dependency
};

// Helper function to format date, can be outside the component or in a utils file
const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

async function fetchTasks() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("Error fetching user:", userError?.message || "No user session");
    return [];
  }

  const { data, error } = await supabase
    .from('task') // Ensure your table name is correct (e.g., 'tasks' or 'task')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true }); // Fetch oldest first for consistent blurring

  if (error) {
    console.error("Error fetching tasks:", error.message);
    return [];
  }
  console.log("Fetched tasks:", data);
  return data;
}

async function fetchUserQuota() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("Error fetching user for quota:", userError?.message || "No user session");
    return 5; // Default quota if user fetch fails
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('todo_count')
    .eq('id', user.id)
    .single(); // Expect a single profile object

  if (profileError) {
    if (profileError.code !== 'PGRST116') { // PGRST116 means 0 rows, not an error for .single()
      console.error("Error fetching profile for quota:", profileError.message);
    } else {
      console.log("No profile found for user ID, using default quota:", user.id);
    }
    return 5; // Default quota if profile not found or error
  }

  console.log("Fetched profile for quota:", profile);
  return profile?.todo_count ?? 5; // Return todo_count or default 5 if null/undefined
}

export default function TodoPage() {
  const [state, formAction] = useActionState(addTask, initialState);
  const [showForm, setShowForm] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isLoadingQuota, setIsLoadingQuota] = useState(true);
  const [taskCountQuota, setTaskCountQuota] = useState(5); // User's allowed task quota

  // Load taskCountQuota from profiles
  useEffect(() => {
    const loadQuota = async () => {
      setIsLoadingQuota(true);
      const quota = await fetchUserQuota();
      setTaskCountQuota(quota);
      setIsLoadingQuota(false);
    };
    loadQuota();
  }, []);

  // Function to update task status (e.g., to 'completed')
  async function updateTaskStatus(taskId, newStatus = 'completed') {
    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (!taskToUpdate) {
        console.error("Task not found for update:", taskId);
        return;
    }

    // Optimistically update UI first
    const originalTasks = [...tasks];
    setTasks(prevTasks => 
        prevTasks.map(task => 
            task.id === taskId ? { ...task, status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : task.completed_at } : task
        )
    );

    const { error } = await supabase
      .from('task') // Ensure your table name is correct
      .update({ 
        status: newStatus, 
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null 
      })
      .eq('id', taskId);

    if (error) {
      console.error("Error updating task status in DB:", error.message);
      setTasks(originalTasks); // Revert optimistic update on error
      alert("Failed to update task status. Please try again."); // User feedback
      return;
    }

    // Update completed_task_count in task_completion_log for the user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!userError && user && newStatus === 'completed') {
      // Fetch current completed_task_count
      const { data: logData, error: fetchLogError } = await supabase
        .from('task_completion_log')
        .select('completed_task_count')
        .eq('user_id', user.id)
        .single();

      if (fetchLogError && fetchLogError.code !== 'PGRST116') {
        console.error("Error fetching task_completion_log:", fetchLogError.message);
      } else {
        const currentCount = logData?.completed_task_count || 0;
        const { error: logError } = await supabase
          .from('task_completion_log')
          .update({
            completed_task_count: currentCount + 1,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (logError) {
          console.error("Error updating task_completion_log:", logError.message);
        }
      }
    }

    console.log(`Task ${taskId} status updated to ${newStatus}`);
  }

  // Effect to handle new task addition from Server Action
  useEffect(() => {
    if (state.success && state.task) {
      // Add new task to the beginning of the list for better visibility
      setTasks(prevTasks => [state.task, ...prevTasks].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)));
      setShowForm(false); // Optionally close form on success
      // Reset server action state if necessary, though useActionState handles some of this
    }
    if (!state.success && state.message) {
      alert(`Error adding task: ${state.message}`); // Show error from server action
    }
  }, [state.success, state.task, state.message]); // Depend on specific state fields

  // Fetch initial tasks from database
  useEffect(() => {
    const loadTasks = async () => {
      setIsLoadingTasks(true);
      const data = await fetchTasks();
      setTasks(data || []);
      setIsLoadingTasks(false);
    };
    loadTasks();
  }, []); // Runs once on mount

  // Auto-delete completed tasks older than 1 day
  useEffect(() => {
    const deleteOldCompletedTasks = async () => {
      const cutoff = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from('task') // Ensure your table name is correct
        .delete()
        .eq('status', 'completed')
        .lt('completed_at', cutoff);
      
      if (error) {
        console.error('Error auto-deleting completed tasks:', error.message);
      } else {
        console.log('Checked for old completed tasks to delete.');
        // Refetch tasks if any might have been deleted
        const data = await fetchTasks(); 
        setTasks(data || []);
      }
    };
    
    // Run cleanup periodically or on mount
    const intervalId = setInterval(deleteOldCompletedTasks, 60 * 60 * 1000); // Every hour
    deleteOldCompletedTasks(); // Run once on mount

    return () => clearInterval(intervalId); // Cleanup interval on unmount
  }, []);


  // Prepare tasks for rendering based on quota
  const todoTasksRaw = tasks.filter(task => task.status === 'todo');
  const sortedTodoTasks = [...todoTasksRaw].sort((a, b) => 
    new Date(a.created_at || 0) - new Date(b.created_at || 0)
  );

  const visibleTodoTasks = sortedTodoTasks.slice(0, taskCountQuota);
  const blurredTodoTasks = sortedTodoTasks.slice(taskCountQuota);
  const isOverQuota = sortedTodoTasks.length >= taskCountQuota;
  const actualTodoTaskCount = sortedTodoTasks.length;

  return (
    <PageLayout title="TODO">
      <div className="flex flex-col p-4 md:p-6">
        <div className="flex flex-col gap-6">
          {/* To Do Column */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b-2 border-gray-200 pb-3">
              <h2 className="text-xl font-semibold text-gray-700">To Do</h2>
              {!isLoadingQuota && (
                <h2 className="text-sm font-medium text-gray-500">
                  Quota: {actualTodoTaskCount}/{taskCountQuota}
                </h2>
              )}
            </div>
            
            {showForm && (
              <TaskForm 
                formAction={formAction} 
                state={state} 
                setShowForm={setShowForm} 
              />
            )}

            <CardContent className="p-0"> {/* Removed default CardContent padding */}
              {isLoadingTasks || isLoadingQuota ? (
                <div className="flex justify-center items-center h-40">
                  <p className="text-[#6772FE]">Loading tasks and quota...</p>
                </div>
              ) : (
                <>
                  {/* Render VISIBLE 'todo' tasks (within quota) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 mb-4">
                    {visibleTodoTasks.map((task) => (
                      <div 
                        key={task.id} 
                        className="p-4 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white flex flex-col justify-between min-h-[180px]"
                      >
                        <div>
                          <h3 className="font-semibold text-md text-gray-800 break-words">{task.name}</h3>
                          {task.description ? (
                            <p className="text-gray-600 text-sm mt-1 text-justify break-words max-h-20 overflow-y-auto">
                              {task.description}
                            </p>
                          ) : (
                            <p className="text-gray-400 text-sm mt-1 italic">No description</p>
                          )}
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex flex-wrap gap-x-3 gap-y-1.5 mb-3 text-xs">
                            {task.deadline && (
                              <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                <Calendar size={12} />
                                <span>{formatDate(task.deadline)}</span>
                              </div>
                            )}
                            {task.hour && (
                              <div className="flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                                <Clock size={12} />
                                <span>{task.hour.slice(0,5)}</span>
                              </div>
                            )}
                            {task.tag && (
                              <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded">
                                <Tag size={12} />
                                <span>{task.tag}</span>
                              </div>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-auto bg-[#6772FE] hover:bg-[#5051F9] text-white hover:text-white font-medium py-2 transition-colors hover:cursor-pointer"
                            onClick={() => updateTaskStatus(task.id, 'completed')}
                          >
                            Mark as Completed
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* Render BLURRED 'todo' tasks (over quota) */}
                    {blurredTodoTasks.map((task) => (
                      <div 
                        key={task.id} 
                        className="p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50 opacity-60 flex flex-col justify-between min-h-[180px] relative"
                      >
                        <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-800 text-xs px-2 py-0.5 rounded-sm font-semibold shadow-sm z-10">
                          Over Quota
                        </div>
                        <div>
                          <h3 className="font-semibold text-md text-gray-700 break-words">{task.name}</h3>
                          {task.description ? (
                            <p className="text-gray-500 text-sm mt-1 text-justify break-words max-h-20 overflow-y-auto">
                              {task.description}
                            </p>
                          ) : (
                            <p className="text-gray-400 text-sm mt-1 italic">Tidak ada deskripsi</p>
                          )}
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex flex-wrap gap-x-3 gap-y-1.5 mb-3 text-xs">
                            {task.deadline && (
                              <div className="flex items-center gap-1 text-gray-500">
                                <Calendar size={12} />
                                <span>{formatDate(task.deadline)}</span>
                              </div>
                            )}
                            {task.hour && (
                              <div className="flex items-center gap-1 text-gray-500">
                                <Clock size={12} />
                                <span>{task.hour.slice(0,5)}</span>
                              </div>
                            )}
                            {task.tag && (
                              <div className="flex items-center gap-1 text-gray-400 bg-gray-200 px-2 py-0.5 rounded">
                                <Tag size={12} />
                                <span>{task.tag}</span>
                              </div>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-auto bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 transition-colors hover:cursor-not-allowed"
                          >
                            Complete (Over Quota)
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* "Over Quota" message and button to upgrade */}
                  {isOverQuota && (
                    <div className="flex flex-col items-center justify-center py-6 text-center mt-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-md font-semibold text-red-600 mb-2">
                        Anda telah mencapai batas kuota tugas!
                      </p>
                      <p className="text-sm text-red-500 mb-4">
                        ({actualTodoTaskCount} tugas aktif dari kuota {taskCountQuota} Anda).
                        Beberapa tugas ditampilkan berbeda karena melebihi kuota.
                      </p>
                      <Link 
                        href='/settings/billing' 
                        className="inline-block px-5 py-2 bg-red-500 text-white font-medium text-sm rounded-md shadow-md hover:bg-red-600 transition-colors"
                      >
                        Tambah Kuota Sekarang
                      </Link>
                    </div>
                  )}
                  
                  {/* Add Task Button - always visible if not in form mode, or if no tasks */}
                  {!showForm && (
                    <div className={`flex flex-col items-center justify-center py-6 text-center`}>
                        { (visibleTodoTasks.length === 0 && blurredTodoTasks.length === 0) && !isLoadingTasks && !isLoadingQuota && (
                            <>
                                <p className="text-[#6772FE] font-semibold">There is no task</p>
                                <p className="text-xs text-gray-400 mt-1 mb-3">Add task to start.</p>
                            </>
                        )}
                        { !isOverQuota && (
                          <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-sm flex items-center gap-1.5 hover:cursor-pointer bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-700 px-4 py-2"
                              onClick={() => setShowForm(true)}
                          >
                              <CirclePlus size={16} />
                              <span>Add New Task</span>
                          </Button>
                        )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </div>

          {/* Completed Column */}
          <div className="flex flex-col mt-8">
            <div className="flex items-center justify-between mb-4 border-b-2 border-gray-200 pb-3">
              <h2 className="text-xl font-semibold text-gray-700">Completed</h2>
            </div>
            <CardContent className="p-0">
              {isLoadingTasks ? (
                <div className="flex justify-center items-center h-40">
                  <p className="text-[#6772FE]">Loading completed tasks...</p>
                </div>
              ) : tasks.filter(task => task.status === 'completed').length === 0 ? (
                <div className="flex justify-center items-center py-10 text-gray-400">
                  <p className="font-medium">There is no completed task.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                  {tasks.filter(task => task.status === 'completed').map((task) => (
                    <div key={task.id} className="p-4 border border-green-200 bg-green-50 rounded-lg shadow-sm opacity-80">
                      <h3 className="font-medium text-gray-700 line-through">{task.name}</h3>
                      {task.description && <p className="text-xs text-gray-500 mt-1 line-through">{task.description}</p>}
                      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2 text-xs">
                        {task.tag && (
                          <div className="flex items-center gap-1 text-gray-500">
                            <Tag size={12} />
                            <span>{task.tag}</span>
                          </div>
                        )}
                         {task.completed_at && (
                            <div className="flex items-center gap-1 text-gray-500">
                                <Calendar size={12} />
                                <span>Completed: {formatDate(task.completed_at)}</span>
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
