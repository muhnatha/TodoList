'use client'
import React from 'react';
import { Button } from "@/components/ui/button"; 

export default function BillForm({
  showModal,      
  setShowModal,   
  packageDetails, 
  onConfirm,      
  isLoading       
}) {
  if (!showModal || !packageDetails) {
    return null;
  }

  const handleConfirm = async () => {
    if (typeof onConfirm === 'function') {
      await onConfirm(); 
    }
  };

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'> 
      <div className='bg-white rounded-lg shadow-xl p-6 w-full max-w-md transform transition-all'>
        <div className='flex justify-between items-center mb-4'>
          <h2 className='text-xl font-semibold text-gray-800'>Confirm Package Upgrade</h2>
          <button
            type='button'
            onClick={() => setShowModal(false)}
            disabled={isLoading}
            className='text-gray-400 hover:text-gray-600 transition-colors hover:cursor-pointer'
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className='space-y-4 text-gray-700'>
          <p>You are about to upgrade your quota with the following package:</p>
          <div className='bg-indigo-50 p-4 rounded-lg border border-indigo-200'>
            <p className='font-semibold text-indigo-700 text-lg'>
              Package: {packageDetails.actionText} ({packageDetails.type === 'todos' ? 'To-Do Items' : 'Notes'})
            </p>
            <p className='text-sm text-indigo-600'>Items to add: {packageDetails.items}</p>
            <p className='text-sm text-indigo-600'>Price: {packageDetails.price}</p>
          </div>
          <p>Do you want to proceed?</p>
        </div>

        {/* {state && state.message && (
          <p className={`mt-2 text-sm ${state.success ? 'text-green-600' : 'text-red-600'}`}>
            {state.message}
          </p>
        )} */}

        <div className='mt-6 flex justify-end space-x-3'>
          <Button
            variant="outline"
            onClick={() => setShowModal(false)}
            disabled={isLoading}
            className="hover:cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white hover:cursor-pointer"
          >
            {isLoading ? 'Processing...' : 'Confirm Upgrade'}
          </Button>
        </div>
      </div>
    </div>
  );
}