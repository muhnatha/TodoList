"use client";

import { useState, useEffect } from "react";
import PageLayout from "@/components/PageLayout";
import { ArrowDownToLine, MessageCircleX, Pencil, Trash2, PlusCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Script from "next/script";
import Link from "next/link"; // 👈 IMPORT LINK

// Updated to fetch notes_count and use a consistent default
async function fetchUserQuota(userId) { // Pass userId to avoid calling getUser again if already available
  if (!userId) {
    console.error("User ID not provided to fetchUserQuota");
    return 3; // Default quota
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('notes_count') // Specifically select notes_count
    .eq('id', userId)
    .single();

  if (profileError) {
    if (profileError.code !== 'PGRST116') { // PGRST116 means 0 rows
      console.error("Error fetching profile for quota:", profileError.message);
    } else {
      console.log("No profile found for user ID, using default quota:", userId);
    }
    return 3; // Default quota if profile not found or error
  }

  console.log("Fetched profile for notes quota:", profile);
  // Ensure notes_count is a number, otherwise default
  return typeof profile?.notes_count === 'number' ? profile.notes_count : 3;
}

export default function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [editing, setEditing] = useState(false);
  const [currentNote, setCurrentNote] = useState({
    id: null,
    title: "",
    content: "",
    date: "",
  });
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [noteIdToDelete, setNoteIdToDelete] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isLoadingQuota, setIsLoadingQuota] = useState(true);
  const [notesCountQuota, setNotesCountQuota] = useState(3); // Default notes quota

  useEffect(() => {
    const loadQuota = async (userId) => {
      if (!userId) return;
      setIsLoadingQuota(true);
      const quota = await fetchUserQuota(userId);
      setNotesCountQuota(quota);
      setIsLoadingQuota(false);
    };

    const checkUserAndFetchData = async () => {
      setIsLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Error getting session:", sessionError.message);
        setIsLoading(false);
        setIsLoadingQuota(false); // Stop quota loading if session error
        return;
      }

      if (session?.user) {
        setUser(session.user);
        await fetchUserNotes(session.user.id);
        await loadQuota(session.user.id); // Load quota after user is set
      } else {
        setUser(null);
        setNotes([]);
        setIsLoadingQuota(false); // No user, no quota to load beyond default
        console.log("No user session found.");
      }
      setIsLoading(false);
    };

    checkUserAndFetchData();

    const { data: authListener } = supabase.auth.onAuthStateChange( // <--- PROBLEM IS HERE
      async (event, session) => {
        setIsLoading(true); 
        if (event === "SIGNED_IN" && session?.user) {
          setUser(session.user);
          await fetchUserNotes(session.user.id);
          await loadQuota(session.user.id);
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setNotes([]);
          setNotesCountQuota(3); 
          setIsLoadingQuota(false); // This is line 99 from your error
        }
        setIsLoading(false);
      }
    );

    return () => {
      authListener?.unsubscribe(); // <--- THIS CALL FAILS
    };
  }, []); 

  const fetchUserNotes = async (userId) => {
    if (!userId) return;
    // setIsLoading(true); // isLoading is handled by the calling function
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching notes:", error.message);
      alert("Error fetching notes: " + error.message);
    } else {
      setNotes(data || []);
    }
    // setIsLoading(false); // isLoading is handled by the calling function
  };

  const handleCreate = () => {
    if (notes.length >= notesCountQuota && notesCountQuota > 0) {
      alert(`You have reached your note limit of ${notesCountQuota}. Please upgrade your plan to add more notes.`);
      return;
    }
     if (notesCountQuota === 0) {
      alert(`Your current plan does not allow creating notes. Please upgrade.`);
      return;
    }
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

    // Check quota again before saving a new note (not an edit)
    if (!currentNote.id && notes.length >= notesCountQuota && notesCountQuota > 0) {
       alert(`You have reached your note limit of ${notesCountQuota}. Cannot save new note.`);
       setEditing(false); // Close editor
       return;
    }
    if (!currentNote.id && notesCountQuota === 0) {
      alert(`Your current plan does not allow creating notes. Please upgrade.`);
      setEditing(false);
      return;
    }


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
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentNote.id)
        .eq("user_id", user.id);
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
      ]).select(); // Important to get the inserted data back if needed, or just check error
      error = insertError;
    }

    if (error) {
      console.error("Error saving note:", error.message);
      alert("Error saving note: " + error.message);
    } else {
      await fetchUserNotes(user.id); // Re-fetch notes
      setEditing(false);
      setCurrentNote({ id: null, title: "", content: "", date: "" });
    }
    setIsLoading(false);
  };

  const handleEdit = (noteToEdit) => {
    setCurrentNote({ ...noteToEdit });
    setEditing(true);
  };

  const handleNewNote = () => {
    // Same check as handleCreate
    if (notes.length >= notesCountQuota && notesCountQuota > 0) {
      alert(`You have reached your note limit of ${notesCountQuota}. Please upgrade your plan to add more notes.`);
      return;
    }
    if (notesCountQuota === 0) {
      alert(`Your current plan does not allow creating notes. Please upgrade.`);
      return;
    }
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
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting note:", error.message);
      alert("Error deleting note: " + error.message);
    } else {
      await fetchUserNotes(user.id);
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
    const doc = new window.jspdf.jsPDF();
    doc.setFontSize(18);
    doc.text(note.title || "Untitled", 10, 20);
    doc.setFontSize(12);
    doc.text(note.date || "No date", 10, 30);
    doc.setFontSize(14);
    doc.text(note.content || "", 10, 40);
    doc.save(`${note.title || "note"}.pdf`);
  };

  const canCreateNote = user && !isLoadingQuota && notes.length < notesCountQuota;
  const quotaReached = user && !isLoadingQuota && notes.length >= notesCountQuota;
  const planAllowsNoNotes = user && !isLoadingQuota && notesCountQuota === 0;

  return (
    <PageLayout title="NOTES">
      <div className="flex-1 flex flex-col p-4 md:p-8 relative">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center">
            <h1 className="text-2xl md:text-3xl font-bold text-[#1D1C3B] dark:text-slate-100">
              My Notes
            </h1>
            {user && !isLoadingQuota && (
              <span className="ml-3 text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                {notes.length}/{notesCountQuota}
              </span>
            )}
          </div>
          {user && (
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search note (not implemented)"
                className="px-4 py-2 rounded-md bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-[#6B5CFF] w-full sm:w-auto"
                disabled
              />
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
          </div>
        )}

        {user && !editing && (
          <>
            {/* Message when quota is reached or plan doesn't allow notes */}
            {(quotaReached && notesCountQuota > 0 || planAllowsNoNotes) && notes.length > 0 && (
              <div className="p-4 mb-4 text-sm text-center text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800" role="alert">
                {planAllowsNoNotes
                  ? 'Your current plan does not allow creating more notes. '
                  : `You have reached your note limit (${notes.length}/${notesCountQuota}). `}
                Please <Link href="/settings/billing" className="font-bold underline">upgrade your plan</Link> to add more notes.
              </div>
            )}

            {/* "Create Notes" button - shown when no notes exist AND user can create */}
            {notes.length === 0 && canCreateNote && !planAllowsNoNotes && (
              <button
                onClick={handleCreate}
                className="hover:cursor-pointer absolute top-22 left-7 bg-[#6B5CFF] text-white rounded-full p-2.5 shadow-lg hover:bg-[#5a4de0] transition duration-200"
                aria-label="Create new note"
              >
                Create Notes ✏️
              </button>
            )}
            
            {/* Message for no notes yet or quota related messages */}
            {notes.length === 0 && !isLoading && !isLoadingQuota && (
              <div className="text-gray-400 dark:text-gray-500 text-center mt-32 text-lg">
                {planAllowsNoNotes
                  ? <>Your current plan doesn't allow notes. <Link href="/settings/billing" className="underline text-[#6B5CFF]">Upgrade here</Link>.</>
                  : (quotaReached && notesCountQuota > 0 ? <>You've used all your {notesCountQuota} notes. <Link href="/settings/billing" className="underline text-[#6B5CFF]">Upgrade to add more</Link>.</> : 'No notes yet...')}
              </div>
            )}
          </>
        )}
        
        {user && editing && (
          <div className="border dark:border-slate-700 p-6 rounded-md shadow-md bg-white dark:bg-slate-800 w-full max-w-3xl mx-auto relative">
            {/* ... editor remains the same ... */}
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

        {(isLoading && user) && ( 
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
              Loading notes...
            </div>
        )}

        {user && !editing && notes.length > 0 && !isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
            {notes.map((note) => (
              <div
                key={note.id}
                className="border dark:border-slate-700 p-4 rounded-md shadow-md bg-white dark:bg-slate-800 relative flex flex-col justify-between min-h-[150px]" // Added flex properties
              >
                <div> {/* Content wrapper */}
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
                  <p className="text-sm mt-2 text-gray-700 dark:text-gray-300 break-words whitespace-pre-wrap max-h-24 overflow-y-auto"> {/* Added max-height and overflow */}
                    {note.content}
                  </p>
                </div>
              </div>
            ))}
            {/* "New Note" button in the grid - show only if user can create */}
            {canCreateNote && !planAllowsNoNotes && (
              <button
                onClick={handleNewNote}
                className="hover:cursor-pointer border-2 border-dashed border-gray-400 dark:border-gray-600 rounded-md flex flex-col items-center justify-center text-gray-600 dark:text-gray-400 text-center h-full min-h-[150px] hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <PlusCircle size={24} className="mb-2" />
                New Note
              </button>
            )}
          </div>
        )}

        {showConfirmDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-md shadow-lg text-center w-full max-w-sm m-4">
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