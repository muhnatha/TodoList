"use client";

import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import { ArrowDownToLine } from 'lucide-react';
import { MessageCircleX } from 'lucide-react';
import { Pencil } from 'lucide-react';
import { Trash2 } from 'lucide-react';

export default function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [editing, setEditing] = useState(false);
  const [currentNote, setCurrentNote] = useState({ title: "", content: "", date: "" });
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);

  const handleCreate = () => {
    setEditing(true);
    setCurrentNote({ title: "", content: "", date: new Date().toISOString().split("T")[0] });
  };

  const handleSave = () => {
    if (currentNote.title.trim() === "" && currentNote.content.trim() === "") return;
    setNotes([...notes, currentNote]);
    setEditing(false);
  };

  const handleEdit = (index) => {
    const noteToEdit = notes[index];
    setCurrentNote(noteToEdit);
    setEditing(true);
    setNotes(notes.filter((_, i) => i !== index));
  };

  const handleNewNote = () => {
    setEditing(true);
    setCurrentNote({ title: "", content: "", date: new Date().toISOString().split("T")[0] });
  };

  const handleClose = () => {
    setEditing(false);
    setCurrentNote({ title: "", content: "", date: "" });
  };

  const handleDelete = (index) => {
    setDeleteIndex(index);
    setShowConfirmDelete(true);
  };

  const confirmDelete = () => {
    const updatedNotes = notes.filter((_, i) => i !== deleteIndex);
    setNotes(updatedNotes);
    setShowConfirmDelete(false);
    setDeleteIndex(null);
  };

  const cancelDelete = () => {
    setShowConfirmDelete(false);
    setDeleteIndex(null);
  };

  return (
    <PageLayout title="NOTES">
      <div className="flex-1 flex flex-col p-8 relative">
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

        {!editing && notes.length === 0 && (
          <>
            <button
              onClick={handleCreate}
              className="absolute top-22 left-7 bg-[#6B5CFF] text-white rounded-full p-2.5 shadow-lg hover:bg-[#5a4de0] transition duration-200"
            >
              Create Notes ✏️
            </button>
            <div className="text-gray-400 text-center mt-32 text-lg">No notes yet...</div>
          </>
        )}

        {editing && (
          <div className="border p-6 rounded-md shadow-md bg-white w-full max-w-3xl mx-auto relative">
            <div className="flex justify-between items-center mb-2">
              <input
                type="date"
                value={currentNote.date}
                onChange={(e) => setCurrentNote({ ...currentNote, date: e.target.value })}
                className="text-sm text-gray-500 border px-2 py-1 rounded-md"
              />
              <div className="flex gap-2">
                <button onClick={handleSave}> <ArrowDownToLine /></button>
                <button onClick={handleClose}><MessageCircleX /></button>
              </div>
            </div>
            <input
              type="text"
              className="text-2xl font-bold w-full outline-none mb-4"
              placeholder="Type Title"
              value={currentNote.title}
              onChange={(e) => setCurrentNote({ ...currentNote, title: e.target.value })}
            />
            <textarea
              rows={6}
              className="w-full outline-none"
              placeholder="Type notes......"
              value={currentNote.content}
              onChange={(e) => setCurrentNote({ ...currentNote, content: e.target.value })}
            />
          </div>
        )}

        {!editing && notes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
            {notes.map((note, index) => (
              <div key={index} className="border p-4 rounded-md shadow-md bg-white relative">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500">{note.date}</span>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(index)}><Pencil /></button>
                    <button onClick={() => handleDelete(index)}><Trash2 /></button>
                  </div>
                </div>
                <h2 className="text-lg font-semibold">{note.title}</h2>
                <p className="text-sm mt-2 text-gray-700">{note.content}</p>
              </div>
            ))}

            <button
              onClick={handleNewNote}
              className="border-2 border-dashed border-gray-400 rounded-md flex items-center justify-center text-gray-600 text-center h-40"
            >
              + New Note
            </button>
          </div>
        )}

        {/* 🔔 Popup Konfirmasi Hapus */}
        {showConfirmDelete && (
          <div className="fixed inset-0 flex items-center justify-center">
            <div className="bg-white p-6 rounded-md shadow-lg text-center w-80">
              <p className="text-lg font-semibold mb-4">Yakin ingin menghapus catatan ini?</p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={confirmDelete}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Hapus
                </button>
                <button
                  onClick={cancelDelete}
                  className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}