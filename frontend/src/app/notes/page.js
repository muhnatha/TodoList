'use client';

import { useEffect, useState } from "react";
import PageLayout from "@/components/PageLayout";

export default function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");

  const fetchNotes = async () => {
    try {
      const res = await fetch("http://localhost:3001/notes");
      const data = await res.json();
      setNotes(data);
    } catch (err) {
      console.error("Gagal ambil notes:", err);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      const res = await fetch("http://localhost:3001/notes/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: newNote }),
      });

      if (res.ok) {
        setNewNote("");
        fetchNotes();
      } else {
        console.error("Gagal tambah note");
      }
    } catch (err) {
      console.error("Error saat tambah note:", err);
    }
  };

  return (
    <PageLayout title="NOTES">
      <form onSubmit={handleSubmit} className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Tulis catatan..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="flex-1 px-4 py-2 border rounded-md"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Tambah
        </button>
      </form>

      <ul className="space-y-2">
        {notes.map((note, i) => (
          <li key={i} className="bg-gray-100 dark:bg-slate-700 p-3 rounded-md">
            {note.content}
          </li>
        ))}
      </ul>
    </PageLayout>
  );
}