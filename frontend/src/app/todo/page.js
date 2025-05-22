'use client'
import React, { useState, useEffect } from 'react'
import PageLayout from "@/components/PageLayout"
import { Button } from "@/components/ui/button"
import { CardContent } from "@/components/ui/card"
import { addTask } from '../action'
import { useActionState } from 'react'
import { CirclePlus, Calendar, Tag, Clock, SquareX } from "lucide-react"
import TaskForm from '@/components/TaskForm'
import { supabase } from '@/lib/supabaseClient'

const initialState = {
  message: '',
  success: false,
};

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
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }

  console.log("Fetched tasks:", data);
  return data;
}

async function fetchProfiles() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("Error fetching user:", userError);
    return [];
  }

  const{data: profile, error} = await supabase
    .from('profiles')
    .select('todo_count')
    .eq('id', user.id);

  if (error) {
    console.error("Error fetching profile:", error);
    return [];
  }

  console.log("Fetched profile:", profile);
  return profile;
}

export default function TodoPage() {
  const [state, formAction] = useActionState(addTask, initialState);
  const [showForm, setShowForm] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [taskCount, setTaskCount] = useState(0);

  useEffect(() => {
     const loadTaskCount = async () => {
       try {
         const profilesArray = await fetchProfiles(); // fetchProfiles returns an array

         if (profilesArray && profilesArray.length > 0 && profilesArray[0].hasOwnProperty('todo_count')) {
           setTaskCount(profilesArray[0].todo_count);
         } else {
           // No profile found or todo_count is missing
           setTaskCount(0); // Or handle as an error, e.g., setTaskCount(null) and display a message
           console.log("No profile found or todo_count missing. Profiles array:", profilesArray);
         }
       } catch (error) {
         console.error("Error in loadTaskCount:", error);
         setTaskCount(0); // Or handle error appropriately
       }
     };

     loadTaskCount();
   }, []);

  // Function to update task status of task
  async function updateTaskStatus(taskId) {
    const { error } = await supabase
      .from('task')
      .update({ completed_at: new Date().toISOString(), status: 'completed' })
      .eq('id', taskId);

    if (error) {
      console.error("Error updating task status:", error);
      return;
    }

    // Refetch tasks from DB to ensure UI is in sync
    const data = await fetchTasks();
    setTasks(data || []);
  }

  // Effect to update tasks when a new task is added
  useEffect(() => {
    if (state.task && state.success) {
      setTasks(prevTasks => [...prevTasks, state.task]);
    }
  }, [state]);

  // Fetch tasks from database in supabase
  useEffect(() => {
    const loadTasks = async () => {
      setIsLoading(true);
      const data = await fetchTasks();
      setTasks(data || []);
      setIsLoading(false);
    };
    loadTasks();
  }, []);

  // Auto-delete completed tasks older than 5 days
  useEffect(() => {
    const deleteOldCompletedTasks = async () => {
      const cutoff = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from('task')
        .delete()
        .eq('status', 'completed')
        .lt('completed_at', cutoff);
      if (error) {
        console.error('Error auto-deleting completed tasks:', error);
      } else {
        const data = await fetchTasks();
        setTasks(data || []);
      }
    };
    deleteOldCompletedTasks();
  }, []);

  return (
    <PageLayout title="TODO">
    {/* Task Board */}
        <div className="flex flex-col p-6">
          <div className="flex flex-col gap-6">
            {/* To Do Column */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-4 border-2 rounded-sm p-3">
                <h2 className="text-sm font-medium">To Do</h2>
                <h2 className="text-sm font-medium">Limit: {taskCount}</h2>
              </div>
              {/* Task Form */}
              {showForm &&  (
                <TaskForm 
                  formAction={formAction} 
                  state={state} 
                  setShowForm={setShowForm} 
                />
              )}
            
              {/* Tasks List or Empty State */}
              <CardContent className="p-4">
                {isLoading ? (
                  <div className="flex justify-center items-center h-40">
                    <p className="text-[#6772FE]">Loading tasks...</p>
                  </div>
                ) : tasks.filter(task => task.status === 'todo').length === 0 ? (
                  <div className="space-y-3">
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <p className="text-[#6772FE] font-semibold">There is no todo</p>
                      <p className="text-xs text-gray-400 mt-1 mb-3">Add a new task to get started</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs flex items-center gap-1 hover:cursor-pointer"
                        onClick={() => setShowForm(true)}
                      >
                        <CirclePlus size={14} />
                        <span>Add Task</span>
                      </Button>
                    </div>
                  </div>
                ) : tasks.filter(task => task.status === 'todo').length === taskCount ?(
                    <div className="flex flex-col gap-3 2xl:grid 2xl:grid-cols-3 2xl:gap-4 ">
                    {tasks.filter(task => task.status === 'todo').map((task, index) => (
                      <div key={index} className="p-3 border rounded-md hover:bg-gray-50 flex flex-col justify-between">
                        <div>
                          <h3 className="font-medium">{task.name}</h3>
                          {task.description === null ?
                            <p className="text-gray-600/30 text-sm mt-1">Tidak ada deskrpsi</p> :
                            <p className="text-gray-600 text-sm mt-1 text-justify">{task.description}</p>
                          }
                        </div>
                        <div className="flex gap-3 mt-2">
                          {task.deadline && (
                            <div className="flex items-center gap-1 text-xs text-[#6772FE]">
                              <Calendar size={12} />
                              <span>{new Date(task.deadline).toLocaleDateString()}</span>
                            </div>
                          )}
                          {task.hour && (
                            <div className="flex items-center gap-1 text-xs text-[#6772FE]">
                              <Clock size={12} />
                              <span>{task.hour.slice(0,5)}</span>
                            </div>
                          )}
                          {task.tag && (
                            <div className="flex items-center gap-1 text-xs text-[#6772FE]">
                              <Tag size={12} />
                              <span>{task.tag}</span>
                            </div>
                          )}
                          {/* Button to mark as completed */}
                          {task.status !== 'completed' && (
                            <Button
                              variant="outline"
                              size="xs"
                              className="text-xs ml-auto p-3 bg-[#6772FE] hover:bg-[#E8EAFF] text-white hover:cursor-pointer"
                              onClick={() => updateTaskStatus(task.id)}
                            >
                              Mark as Completed
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <p className="text-md text-red-500 mt-1 mb-3">Mencapai batas penggunaan tugas, tambah kuota dengan menekan tombol di bawah</p>
                      <a href='/settings/billing'>
                        <Button 
                          variant="outline"
                          size="sm"
                          className="text-md flex items-center gap-1 hover:cursor-pointer hover:bg-[#6772FE] hover:text-white"
                        >
                          <span>Tambah kuota</span>
                        </Button>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 2xl:grid 2xl:grid-cols-3 2xl:gap-4 ">
                    {tasks.filter(task => task.status === 'todo').map((task, index) => (
                      <div key={index} className="p-3 border rounded-md hover:bg-gray-50 flex flex-col justify-between">
                        <div>
                          <h3 className="font-medium">{task.name}</h3>
                          {task.description === null ?
                            <p className="text-gray-600/30 text-sm mt-1">Tidak ada deskrpsi</p> :
                            <p className="text-gray-600 text-sm mt-1 text-justify">{task.description}</p>
                          }
                        </div>
                        <div className="flex gap-3 mt-2">
                          {task.deadline && (
                            <div className="flex items-center gap-1 text-xs text-[#6772FE]">
                              <Calendar size={12} />
                              <span>{new Date(task.deadline).toLocaleDateString()}</span>
                            </div>
                          )}
                          {task.hour && (
                            <div className="flex items-center gap-1 text-xs text-[#6772FE]">
                              <Clock size={12} />
                              <span>{task.hour.slice(0,5)}</span>
                            </div>
                          )}
                          {task.tag && (
                            <div className="flex items-center gap-1 text-xs text-[#6772FE]">
                              <Tag size={12} />
                              <span>{task.tag}</span>
                            </div>
                          )}
                          {/* Button to mark as completed */}
                          {task.status !== 'completed' && (
                            <Button
                              variant="outline"
                              size="xs"
                              className="text-xs ml-auto p-3 bg-[#6772FE] hover:bg-[#E8EAFF] text-white hover:cursor-pointer"
                              onClick={() => updateTaskStatus(task.id)}
                            >
                              Mark as Completed
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <p className="text-xs text-gray-400 mt-1 mb-3">Add a new task</p>
                      <Button 
                        variant="outline"
                        size="sm"
                        className="text-xs flex items-center gap-1 hover:cursor-pointer"
                        onClick={() => setShowForm(true)}
                      >
                        <CirclePlus size={14} />
                        <span>Add Task</span>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </div>

            {/* Completed Column */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-4 border-2 rounded-sm p-3">
                <h2 className="text-sm font-medium">Completed</h2>
              </div>
              <CardContent className="p-4 flex flex-col gap-3 2xl:grid 2xl:grid-cols-3 2xl:gap-4">
                {isLoading ? (
                  <div className="flex justify-center items-center h-40">
                    <p className="text-[#6772FE]">Loading tasks...</p>
                  </div>
                ) : tasks.filter(task => task.status === 'completed').length === 0 ? (
                  <div className="flex justify-center items-center h-40">
                    <p className="text-[#6772FE] font-semibold">No completed tasks</p>
                  </div>
                ) : (
                  tasks.filter(task => task.status === 'completed').map((task, index) => (
                    <div key={index} className="p-3 border rounded-md hover:bg-gray-50">
                      <h3 className="font-medium">{task.name}</h3>
                      <div className="flex gap-3 mt-2">
                        {task.tag && (
                          <div className="flex items-center gap-1 text-xs text-[#6772FE]">
                            <Tag size={12} />
                            <span>{task.tag}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </div>
          </div>
        </div>
    </PageLayout>
  )
}