/* components/TaskForm.jsx */
'use client'
import React from 'react'

export default function TaskForm({ 
  formAction, 
  state, 
  setShowForm 
}) {
  return (
    <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white z-10 border-2 rounded-md p-4 w-1/2 2xl:w-1/4'>
      <form action={formAction} className='w-full flex justify-start items-center'>
        <div className='flex flex-col gap-3 w-full'>
          <h1 className='font-bold text-center text-xl'>Tambah Todo</h1>
          <button
            type='button'
            onClick={() => setShowForm(false)}
            className='absolute top-1 right-4 text-gray-500 hover:text-gray-700 hover:cursor-pointer'
          >
            <span className='text-2xl font-semibold'>x</span>
          </button>

          <div className='flex flex-col gap-1'>
            <label htmlFor='taskName' className='font-semibold'>Nama</label>
            <input
              type='text'
              name='taskName'
              id='taskName'
              placeholder='Masukkan nama tugas'
              className='border-1 rounded-md py-1 px-3 bg-[#6772FE]/20'
              required
            />
          </div>

          <div className='flex flex-col gap-1'>
            <label htmlFor='taskDescription' className='font-semibold'>Deskripsi</label>
            <textarea
              name='taskDescription'
              id='taskDescription'
              placeholder='Masukkan deskripsi tugas'
              className='border-1 rounded-md py-1 px-3 bg-[#6772FE]/20 w-full'
            />
          </div>

          <div className='md:grid md:grid-cols-2 md:gap-4'>
            <div className='flex flex-col gap-1'>
              <label htmlFor='taskDeadline' className='font-semibold'>Deadline</label>
              <input
                type='date'
                name='taskDeadline'
                id='taskDeadline'
                className='border-1 rounded-md py-1 px-3 bg-[#6772FE]/20 w-full'
              />
            </div>

            <div className='flex flex-row md:flex-col gap-2 md:gap-1 mt-6 md:mt-0'>
              <label htmlFor='taskTag' className='font-semibold'>Tag</label>
              <select
                name='taskTag'
                id='taskTag'
                className='border-1 rounded-md py-1 px-3 bg-[#6772FE]/20 w-full text-center'
                required
              >
                <option value=''>Select a tag</option>
                <option value='Cloud Computing'>Cloud Computing</option>
                <option value='Personal'>Personal</option>
                <option value='Urgent'>Urgent</option>
              </select>
            </div>
          </div>

          <button
            type='submit'
            className='bg-[#6772FE] text-white rounded-md py-2 px-4 hover:bg-[#5469D4] hover:cursor-pointer'
          >Add</button>
        </div>
      </form>
    </div>
  )
}