'use client'
import React, { useState, useEffect } from 'react'
import PageLayout from "@/components/PageLayout"
import { Button } from "@/components/ui/button"
import { CardContent } from "@/components/ui/card"
import { addTask } from '../action'
import { useActionState } from 'react'
import { CirclePlus, Calendar, Tag } from "lucide-react"
import TaskForm from '@/components/TaskForm'

const initialState = {
  message: '',
  status: 'todo',
  success: false,
};

export default function TodoPage() {
  const [state, formAction] = useActionState(addTask, initialState);
  const [showForm, setShowForm] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState(initialState);

  // Function to update the status of a task
  const updateTaskStatus = (taskId, newStatus) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );
  };

  // Effect to update tasks when a new task is added
  useEffect(() => {
    // If state contains a task and it was successful, add it to the tasks list
    if (state.task && state.success) {
      setTasks(prevTasks => [...prevTasks, state.task]);
    }
  }, [state]);

  // Initial load - simulate fetching tasks (replace with actual API call)
  useEffect(() => {
    // In a real app, you would fetch tasks from API/database here
    // For now, just initialize with empty array to show empty state
    setTimeout(() => {
      setTasks([]);
      setIsLoading(false);
    }, 500);
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
                      <p className="text-[#6772FE] font-medium">There is no todo</p>
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
                ) : (
                  <div className="flex flex-col gap-3 2xl:grid 2xl:grid-cols-3 2xl:gap-4">
                    {tasks.filter(task => task.status === 'todo').map((task, index) => (
                      <div key={index} className="p-3 border rounded-md hover:bg-gray-50">
                        <h3 className="font-medium">{task.name}</h3>
                        {task.description && <p className="text-gray-600 text-sm mt-1">{task.description}</p>}
                        <div className="flex gap-3 mt-2">
                          {task.deadline && (
                            <div className="flex items-center gap-1 text-xs text-[#6772FE]">
                              <Calendar size={12} />
                              <span>{new Date(task.deadline).toLocaleDateString()}</span>
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
                              onClick={() => updateTaskStatus(task.id, 'completed')}
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
                        className="text-xs flex items-center gap-1"
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
                        {task.description && <p className="text-gray-600 text-sm mt-1">{task.description}</p>}
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