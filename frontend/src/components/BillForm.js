'use client'
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";

const getNthDayFromTodayString = (n) => {
  const date = new Date();
  date.setDate(date.getDate() + n);
  return date.toISOString().split('T')[0];
};

const getTomorrowDateString = () => {
  return getNthDayFromTodayString(1);
};

export default function BillForm({
  showModal,
  setShowModal,
  packageDetails,
  onConfirm,
  isLoading
}) {
  const [selectedExpiryDate, setSelectedExpiryDate] = useState('');

  useEffect(() => {
    if (showModal) {
      const defaultDate = getNthDayFromTodayString(7);
      console.log('[BillForm useEffect] Modal shown. Setting default expiry date:', defaultDate);
      setSelectedExpiryDate(defaultDate);
    } else {
      // Optional: Reset when modal is hidden, though might not be necessary if always set on show
      // console.log('[BillForm useEffect] Modal hidden.');
      // setSelectedExpiryDate(''); 
    }
  }, [showModal]);

  if (!showModal || !packageDetails) {
    return null;
  }

  const handleConfirm = async () => {
    console.log('[BillForm handleConfirm] Confirm button clicked. Current selectedExpiryDate:', selectedExpiryDate, '| Type:', typeof selectedExpiryDate);

    if (!selectedExpiryDate || String(selectedExpiryDate).trim() === '') {
      console.error('[BillForm handleConfirm] Validation FAIL: selectedExpiryDate is empty, null, undefined, or whitespace.', `Value: "${selectedExpiryDate}"`);
      alert("Please select an expiry date for the package.");
      return;
    }

    const parsedDate = new Date(selectedExpiryDate); 
    if (isNaN(parsedDate.getTime())) {
      console.error('[BillForm handleConfirm] Validation FAIL: selectedExpiryDate ("' + selectedExpiryDate + '") is not a parseable date string by new Date(). Parsed as:', parsedDate);
      alert("The selected expiry date is invalid. Please ensure it is a valid date (YYYY-MM-DD).");
      return;
    }
    console.log('[BillForm handleConfirm] selectedExpiryDate ("' + selectedExpiryDate + '") parsed successfully by new Date() to Date object:', parsedDate.toString());

    const tomorrowDateObj = new Date(getTomorrowDateString()); 
    const expiryDateAtMidnight = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
    const tomorrowAtMidnight = new Date(tomorrowDateObj.getFullYear(), tomorrowDateObj.getMonth(), tomorrowDateObj.getDate());


    if (expiryDateAtMidnight < tomorrowAtMidnight) {
      console.error('[BillForm handleConfirm] Validation FAIL: Expiry date', selectedExpiryDate, '(parsed as', expiryDateAtMidnight.toISOString(), ') is before tomorrow (', tomorrowAtMidnight.toISOString(), ').');
      alert("Expiry date must be tomorrow or later.");
      return;
    }
    console.log('[BillForm handleConfirm] Date range check passed. Expiry (midnight):', expiryDateAtMidnight.toISOString(), 'Tomorrow (midnight):', tomorrowAtMidnight.toISOString());

    if (typeof onConfirm === 'function') {
      console.log('[BillForm handleConfirm] All validations passed. Calling onConfirm with selectedExpiryDate:', `"${selectedExpiryDate}"`);
      await onConfirm(selectedExpiryDate);
    } else {
      console.error('[BillForm handleConfirm] CRITICAL: onConfirm is not a function!');
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
          <div className='bg-indigo-50 p-4 rounded-lg border border-indigo-200 space-y-1'>
            <p className='font-semibold text-indigo-700 text-lg'>
              Package: {packageDetails.actionText} ({packageDetails.type === 'todos' ? 'To-Do Items' : 'Notes'})
            </p>
            <p className='text-sm text-indigo-600'>Items to add: {packageDetails.items}</p>
            <p className='text-sm text-indigo-600'>Price: {packageDetails.price} + Total days until expired*Rp100</p>
          </div>

          <div className="mt-4">
            <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-1">
              Set Package Expiry Date: (Rp100/day)
            </label>
            <input
              type="date"
              id="expiryDate"
              name="expiryDate"
              value={selectedExpiryDate} // Should be "YYYY-MM-DD"
              onChange={(e) => {
                console.log('[BillForm input onChange] Date input changed. New value from e.target.value:', `"${e.target.value}"`);
                setSelectedExpiryDate(e.target.value);
              }}
              min={getTomorrowDateString()} // "YYYY-MM-DD"
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={isLoading}
            />
          </div>
          <p className="mt-2">Do you want to proceed?</p>
        </div>

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
            disabled={isLoading || !selectedExpiryDate} // Disable if no date is selected
            className="bg-indigo-600 hover:bg-indigo-700 text-white hover:cursor-pointer"
          >
            {isLoading ? 'Processing...' : 'Confirm Upgrade'}
          </Button>
        </div>
      </div>
    </div>
  );
}