'use client';

import { useEffect, useState } from "react";
import PageLayout from "@/components/PageLayout";

export default function NotesPage() {
  return (
    <div className="flex h-screen bg-[#FAF9FF]">
      {/* Sidebar */}
      <aside className="w-16 bg-white flex flex-col items-center py-6 shadow-md">
        <div className="mb-10">
          <img src="/logo.png" alt="Logo" className="w-8 h-8" />
        </div>
        <div className="flex flex-col gap-6 text-gray-500 text-xl">
          <button>🏠</button>
          <button>📅</button>
          <button>📋</button>
          <button className="text-white bg-[#6B5CFF] rounded-xl p-2">✏️</button>
          <button>⚙️</button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-8 relative">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[#1D1C3B]">My Notes</h1>
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Search note"
              className="px-4 py-2 rounded-md bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#6B5CFF]"
            />
            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
          </div>
        </div>

        {/* Add Note Button */}
        <button className="absolute top-22 left-7 bg-[#6B5CFF] text-white rounded-full p-2.5 shadow-lg hover:bg-[#5a4de0] transition duration-200">
          Create Notes ✏️
        </button>

        {/* Notes List (kosong untuk sekarang) */}
        <div className="text-gray-400 text-center mt-32 text-lg">
          No notes yet...
        </div>
      </div>
    </div>
  );
}