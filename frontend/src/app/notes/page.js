"use client";

import { useState, useEffect } from "react"; // Added useEffect
import PageLayout from "@/components/PageLayout";
import { ArrowDownToLine, MessageCircleX, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient"; // 👈 IMPORT SUPABASE CLIENT (ensure path is correct)
import { PlusCircle } from "lucide-react";
import Script from "next/script";

async function fetchUserQuota() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("Error fetching user for quota:", userError?.message || "No user session");
    return 5; // Default quota if user fetch fails
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('notes_count')
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

export default function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [editing, setEditing] = useState(false);
  // 👇 currentNote now includes an 'id' field
  const [currentNote, setCurrentNote] = useState({
    id: null,
    title: "",
    content: "",
    date: "",
  });
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  // 👇 store the ID of the note to be deleted
  const [noteIdToDelete, setNoteIdToDelete] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // 👈 For loading state
  const [user, setUser] = useState(null); // 👈 To store user session
  const [isLoadingQuota, setIsLoadingQuota] = useState(true);
  const [notesCountQuota, setNotesCountQuota] = useState(3);

  // Load taskCountQuota from profiles
    useEffect(() => {
      const loadQuota = async () => {
        setIsLoadingQuota(true);
        const quota = await fetchUserQuota();
        setNotesCountQuota(quota);
        setIsLoadingQuota(false);
      };
      loadQuota();
    }, []);

  // 👈 FETCH USER AND NOTES ON MOUNT
  useEffect(() => {
    const checkUserAndFetchNotes = async () => {
      setIsLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchUserNotes(session.user.id);
      } else {
        setUser(null);
        setNotes([]); // Clear notes if no user
        console.log("No user session found.");
      }
      setIsLoading(false);
    };
    checkUserAndFetchNotes();

    // Listen for auth changes (login/logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          setUser(session.user);
          fetchUserNotes(session.user.id);
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setNotes([]);
        }
      }
    );

    return () => {
      authListener?.unsubscribe();
    };
  }, []);

  const fetchUserNotes = async (userId) => {
    if (!userId) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false }); // Or order by created_at

    if (error) {
      console.error("Error fetching notes:", error.message);
      alert("Error fetching notes: " + error.message);
    } else {
      setNotes(data || []);
    }
    setIsLoading(false);
  };

  const handleCreate = () => {
    setEditing(true);
    setCurrentNote({
      id: null,
      title: "",
      content: "",
      date: new Date().toISOString().split("T")[0],
    });
  };

  const handleSave = async () => {
    if (!user) {
      alert("You must be logged in to save notes.");
      return;
    }
    if (currentNote.title.trim() === "" && currentNote.content.trim() === "")
      return;

    setIsLoading(true);
    let error;

    if (currentNote.id) {
      // Editing existing note
      const { error: updateError } = await supabase
        .from("notes")
        .update({
          title: currentNote.title,
          content: currentNote.content,
          date: currentNote.date,
          updated_at: new Date().toISOString(), // Manually set if not using DB trigger for updated_at
        })
        .eq("id", currentNote.id)
        .eq("user_id", user.id); // Ensure user can only update their own notes
      error = updateError;
    } else {
      // Creating new note
      const { error: insertError } = await supabase.from("notes").insert([
        {
          user_id: user.id,
          title: currentNote.title,
          content: currentNote.content,
          date: currentNote.date,
        },
      ]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving note:", error.message);
      alert("Error saving note: " + error.message);
    } else {
      await fetchUserNotes(user.id); // Re-fetch notes to get the latest list
      setEditing(false);
      setCurrentNote({ id: null, title: "", content: "", date: "" }); // Reset currentNote
    }
    setIsLoading(false);
  };

  const handleEdit = (noteToEdit) => {
    // No longer need to filter from local state here, just set for editing
    setCurrentNote({ ...noteToEdit });
    setEditing(true);
  };

  const handleNewNote = () => {
    // Same as handleCreate
    setEditing(true);
    setCurrentNote({
      id: null,
      title: "",
      content: "",
      date: new Date().toISOString().split("T")[0],
    });
  };

  const handleClose = () => {
    setEditing(false);
    setCurrentNote({ id: null, title: "", content: "", date: "" });
  };

  const handleDelete = (noteId) => {
    setNoteIdToDelete(noteId);
    setShowConfirmDelete(true);
  };

  const confirmDelete = async () => {
    if (!user || !noteIdToDelete) return;

    setIsLoading(true);
    const { error } = await supabase
      .from("notes")
      .delete()
      .eq("id", noteIdToDelete)
      .eq("user_id", user.id); // Ensure user can only delete their own notes

    if (error) {
      console.error("Error deleting note:", error.message);
      alert("Error deleting note: " + error.message);
    } else {
      await fetchUserNotes(user.id); // Re-fetch notes
    }
    setShowConfirmDelete(false);
    setNoteIdToDelete(null);
    setIsLoading(false);
  };

  const cancelDelete = () => {
    setShowConfirmDelete(false);
    setNoteIdToDelete(null);
  };

  const handleDownloadPDF = (note) => {
    if (!note) return;

    const doc = new window.jspdf.jsPDF(); // Menggunakan window karena dari CDN
    doc.setFontSize(18);
    doc.text(note.title || "Untitled", 10, 20);
    doc.setFontSize(12);
    doc.text(note.date || "No date", 10, 30);
    doc.setFontSize(14);
    doc.text(note.content || "", 10, 40);
    doc.save(`${note.title || "note"}.pdf`);
  };

  // UI (JSX)
  return (
    <PageLayout title="NOTES">
      <div className="flex-1 flex flex-col p-4 md:p-8 relative">
        {" "}
        {/* Adjusted padding */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-[#1D1C3B] dark:text-slate-100">
            My Notes
          </h1>
          {user && ( // Only show search and avatar if user is logged in
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search note (not implemented)" // Search is not implemented in this scope
                className="px-4 py-2 rounded-md bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-[#6B5CFF] w-full sm:w-auto"
                disabled // Disabled as it's not functional yet
              />
              {/* Placeholder for user avatar or info */}
              <div className="w-8 h-8 bg-gray-300 dark:bg-slate-600 rounded-full flex items-center justify-center text-sm text-gray-600 dark:text-slate-300">
                {user.email ? user.email.charAt(0).toUpperCase() : "?"}
              </div>
            </div>
          )}
        </div>
        {!user && !isLoading && (
          <div className="text-center py-10">
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Please log in to manage your notes.
            </p>
            {/* You might want to add a login button/link here */}
          </div>
        )}
        {user && !editing && notes.length === 0 && !isLoading && (
          <>
            <button
              onClick={handleCreate}
              className="hover:cursor-pointer absolute top-22 left-7 bg-[#6B5CFF] text-white rounded-full p-2.5 shadow-lg hover:bg-[#5a4de0] transition duration-200"
              aria-label="Create new note"
            >
              Create Notes ✏️
            </button>
            <div className="text-gray-400 dark:text-gray-500 text-center mt-32 text-lg">
              No notes yet...
            </div>
          </>
        )}
        {user && editing && (
          <div className="border dark:border-slate-700 p-6 rounded-md shadow-md bg-white dark:bg-slate-800 w-full max-w-3xl mx-auto relative">
            <div className="flex justify-between items-center mb-2">
              <input
                type="date"
                value={currentNote.date}
                onChange={(e) =>
                  setCurrentNote({ ...currentNote, date: e.target.value })
                }
                className="text-sm text-gray-500 dark:text-gray-400 border dark:border-slate-600 px-2 py-1 rounded-md bg-transparent"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  title="Save Note"
                  className="text-slate-600 dark:text-slate-300 hover:text-[#6B5CFF] dark:hover:text-[#8A7FFF] hover:cursor-pointer"
                >
                  {" "}
                  <ArrowDownToLine />
                </button>
                <button
                  onClick={handleClose}
                  title="Close Editor"
                  className="text-slate-600 dark:text-slate-300 hover:text-red-500 dark:hover:text-red-400 hover:cursor-pointer"
                >
                  <MessageCircleX />
                </button>
              </div>
            </div>
            <input
              type="text"
              className="text-2xl font-bold w-full outline-none mb-4 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
              placeholder="Type Title"
              value={currentNote.title}
              onChange={(e) =>
                setCurrentNote({ ...currentNote, title: e.target.value })
              }
            />
            <textarea
              rows={6}
              className="w-full outline-none bg-transparent text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
              placeholder="Type notes......"
              value={currentNote.content}
              onChange={(e) =>
                setCurrentNote({ ...currentNote, content: e.target.value })
              }
            />
          </div>
        )}
        {isLoading &&
          user && ( // Show loading spinner only if user is logged in and loading notes
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
              Loading notes...
            </div>
          )}
        {user && !editing && notes.length > 0 && !isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
            {notes.map(
              (
                note // Now we pass the full note object to handleEdit
              ) => (
                <div
                  key={note.id}
                  className="border dark:border-slate-700 p-4 rounded-md shadow-md bg-white dark:bg-slate-800 relative"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {note.date
                        ? new Date(note.date).toLocaleDateString()
                        : "No Date"}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(note)}
                        title="Edit Note"
                        className="text-slate-600 dark:text-slate-300 hover:text-[#6B5CFF] dark:hover:text-[#8A7FFF] hover:cursor-pointer"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        title="Delete Note"
                        className="text-slate-600 dark:text-slate-300 hover:text-red-500 dark:hover:text-red-400 hover:cursor-pointer"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDownloadPDF(note)}
                        title="Download PDF"
                        className="text-slate-600 dark:text-slate-300 hover:text-green-600 dark:hover:text-green-400 hover:cursor-pointer"
                      >
                        🡇
                      </button>
                    </div>
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 break-words">
                    {note.title || "Untitled"}
                  </h2>
                  <p className="text-sm mt-2 text-gray-700 dark:text-gray-300 break-words whitespace-pre-wrap">
                    {note.content}
                  </p>
                </div>
              )
            )}
            <button
              onClick={handleNewNote}
              className="hover:cursor-pointer border-2 border-dashed border-gray-400 dark:border-gray-600 rounded-md flex flex-col items-center justify-center text-gray-600 dark:text-gray-400 text-center h-40 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <PlusCircle size={24} className="mb-2" />{" "}
              {/* Example Icon, import if needed */}
              New Note
            </button>
          </div>
        )}
        {showConfirmDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            {" "}
            {/* Added z-index and background */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-md shadow-lg text-center w-full max-w-sm m-4">
              {" "}
              {/* Responsive width */}
              <p className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">
                Are you sure you want to delete this note?
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={confirmDelete}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                  disabled={isLoading}
                >
                  {isLoading ? "Deleting..." : "Delete"}
                </button>
                <button
                  onClick={cancelDelete}
                  className="bg-gray-300 dark:bg-gray-600 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                  disabled={isLoading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
          strategy="afterInteractive"
        />
      </div>
    </PageLayout>
  );
}
