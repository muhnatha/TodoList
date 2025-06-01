'use client'
import React, { useEffect, useRef } from 'react';
import { X, CalendarDays, Clock, Tag as TagIcon, Loader2 } from "lucide-react";

export default function TaskForm({
  formAction,
  state, 
  setShowForm,
  isPending 
}) {
  const formRef = useRef(null);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        setShowForm(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [setShowForm]);

  const pending = isPending !== undefined ? isPending : (state?.pending || false);
  
  useEffect(() => {
    if (state?.success && formRef.current) {
      // formRef.current.reset();
    }
  }, [state?.success]);


  return (
    <div
      className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out'
      onClick={() => setShowForm(false)} 
    >
      {/* Modal Dialog */}
      <div
        className='bg-white rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-lg transform transition-all'
        onClick={(e) => e.stopPropagation()} 
      >
        <form
          ref={formRef}
          action={formAction} 
          className='w-full'
        >
          <div className='flex flex-col gap-5'>
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <h1 className='font-semibold text-2xl text-gray-800'>Add Todo</h1>
              <button
                type='button'
                onClick={() => setShowForm(false)}
                className='text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors'
                aria-label="Close form"
              >
                <X size={24} />
              </button>
            </div>

            {/* Server Action Error Message */}
            {state?.message && !state.success && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-300 rounded-md text-sm">
                {state.message}
              </div>
            )}
            {/* Optional: Success Message (if you want to show it briefly in the form before it closes) */}
            {/* {state?.message && state.success && (
              <div className="p-3 bg-green-50 text-green-700 border border-green-300 rounded-md text-sm">
                {state.message}
              </div>
            )} */}


            {/* Task Name */}
            <div className='flex flex-col gap-1.5'>
              <label htmlFor='taskName' className='font-medium text-sm text-gray-700'>Name <span className="text-red-500">*</span></label>
              <input
                type='text'
                name='taskName' 
                id='taskName'
                placeholder='Enter todo name'
                className='w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors shadow-sm'
                required
                defaultValue={state?.fieldValues?.taskName || ""} 
              />
              {state?.errors?.taskName && <p className="text-xs text-red-500 mt-1">{state.errors.taskName}</p>}
            </div>

            {/* Task Description */}
            <div className='flex flex-col gap-1.5'>
              <label htmlFor='taskDescription' className='font-medium text-sm text-gray-700'>Description</label>
              <textarea
                name='taskDescription' 
                id='taskDescription'
                placeholder='Add description'
                rows={3}
                className='w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors shadow-sm'
                defaultValue={state?.fieldValues?.taskDescription || ""}
              />
              {state?.errors?.taskDescription && <p className="text-xs text-red-500 mt-1">{state.errors.taskDescription}</p>}
            </div>

            {/* Deadline and Time */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-5'>
              <div className='flex flex-col gap-1.5'>
                <label htmlFor='taskDeadline' className='font-medium text-sm text-gray-700'>Deadline</label>
                <div className="relative">
                  <input
                    type='date'
                    name='taskDeadline' 
                    id='taskDeadline'
                    className='w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors shadow-sm'
                    required 
                    defaultValue={state?.fieldValues?.taskDeadline || ""}
                  />
                  <CalendarDays className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
                {state?.errors?.taskDeadline && <p className="text-xs text-red-500 mt-1">{state.errors.taskDeadline}</p>}
              </div>

              <div className='flex flex-col gap-1.5'>
                <label htmlFor='taskDeadlineTime' className='font-medium text-sm text-gray-700'>Hour</label>
                <div className="relative">
                  <input
                    type='time'
                    name='taskDeadlineTime' 
                    id='taskDeadlineTime'
                    className='w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors shadow-sm'
                    required
                    defaultValue={state?.fieldValues?.taskDeadlineTime || ""}
                  />
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
                {state?.errors?.taskDeadlineTime && <p className="text-xs text-red-500 mt-1">{state.errors.taskDeadlineTime}</p>}
              </div>
            </div>

            {/* Task Tag */}
            <div className='flex flex-col gap-1.5'>
              <label htmlFor='taskTag' className='font-medium text-sm text-gray-700'>Tag</label>
              <div className="relative">
                <select
                  name='taskTag' 
                  id='taskTag'
                  className='w-full pl-10 pr-8 py-2.5 appearance-none border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors shadow-sm bg-white'
                  required
                  defaultValue={state?.fieldValues?.taskTag || ""} 
                >
                  <option value='' disabled={!state?.fieldValues?.taskTag}>Choose todo tag</option>
                  <option value='Cloud Computing'>Cloud Computing</option>
                  <option value='Personal'>Personal</option>
                  <option value='Urgent'>Urgent</option>
                  {/* Add other tags as needed */}
                   <option value='Work'>Work</option>
                   <option value='Study'>Study</option>
                </select>
                <TagIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                {/* Custom dropdown arrow */}
                <div className="absolute inset-y-0 right-0 flex items-center px-2.5 pointer-events-none">
                    <svg className="w-4 h-4 fill-current text-gray-500" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                </div>
              </div>
              {state?.errors?.taskTag && <p className="text-xs text-red-500 mt-1">{state.errors.taskTag}</p>}
            </div>

            {/* Action Buttons */}
            <div className="mt-3 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                <button
                    type='button' 
                    onClick={() => setShowForm(false)}
                    className='w-full sm:w-auto px-6 py-2.5 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium shadow-sm hover:cursor-pointer'
                    disabled={pending}
                >
                    Cancel
                </button>
                <button
                    type='submit'
                    className='w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center text-sm shadow-sm disabled:opacity-70 hover:cursor-pointer'
                    disabled={pending}
                >
                    {pending ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                    </>
                    ) : (
                    'Add' 
                    )}
                </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}