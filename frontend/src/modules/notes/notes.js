"use client";
import { useState, useEffect, useRef } from "react";
import PageLayout from "@/components/PageLayout";
import { ArrowDownToLine, MessageCircleX, Pencil, Trash2, PlusCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Script from "next/script";
import Link from "next/link";

const FREE_NOTES_QUOTA_BASE = 3;

async function updateUserQuotaAndHandleExpiryForNotes(userId, setNotesCountQuotaHook, setIsLoadingQuotaHook) {
  if (!userId) {
    setIsLoadingQuotaHook(false);
    setNotesCountQuotaHook(FREE_NOTES_QUOTA_BASE);
    console.error("User ID not provided to updateUserQuotaAndHandleExpiryForNotes");
    return FREE_NOTES_QUOTA_BASE;
  }
  setIsLoadingQuotaHook(true);

  const now = new Date().toISOString();

  try {
    const { error: expiryUpdateError } = await supabase
      .from('quota_packages')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('package_type', 'notes')
      .eq('is_active', true)
      .lt('expires_at', now);

    if (expiryUpdateError) {
      console.error("Error deactivating expired notes packages:", expiryUpdateError.message);
    } else {
      console.log("Checked and deactivated any expired notes packages for user:", userId);
    }

    const { data: activePackages, error: fetchActiveError } = await supabase
      .from('quota_packages')
      .select('items_added')
      .eq('user_id', userId)
      .eq('package_type', 'notes')
      .eq('is_active', true);

    let currentTotalNotesQuota = FREE_NOTES_QUOTA_BASE;
    if (fetchActiveError) {
      console.error("Error fetching active notes packages:", fetchActiveError.message);
    } else if (activePackages) {
      const totalPaidQuota = activePackages.reduce((sum, pkg) => sum + pkg.items_added, 0);
      currentTotalNotesQuota = FREE_NOTES_QUOTA_BASE + totalPaidQuota;
    }

    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({ notes_current_total_quota: currentTotalNotesQuota })
      .eq('id', userId);

    if (updateProfileError) {
      console.warn("Could not update notes_current_total_quota in profiles from client:", updateProfileError.message);
    }

    setNotesCountQuotaHook(currentTotalNotesQuota);
    return currentTotalNotesQuota;
  } catch (error) {
    console.error("Unexpected error in updateUserQuotaAndHandleExpiryForNotes:", error.message);
    setNotesCountQuotaHook(FREE_NOTES_QUOTA_BASE);
    return FREE_NOTES_QUOTA_BASE;
  } finally {
    setIsLoadingQuotaHook(false);
  }
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
  const [notesCountQuota, setNotesCountQuota] = useState(FREE_NOTES_QUOTA_BASE);
  const [inputValue, setInputValue] = useState('');
  const [searchResult, setSearchResult] = useState("");
  const isInitializingRef = useRef(false);
  const currentUserIdRef = useRef(null);

  const fetchUserNotes = async (userId) => { 
    if (!userId) return;
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notes:", error.message);
      alert("Error fetching notes: " + error.message);
      setNotes([]);
    } else {
      setNotes(data || []);
    }
  };

  useEffect(() => {
    const initializePage = async (sessionUser) => {
      if (isInitializingRef.current) {
        console.log("Initialization already in progress. Skipping.");
        return;
      }
      isInitializingRef.current = true;
      setIsLoading(true);
      setIsLoadingQuota(true); 
      try {
        if (!sessionUser) {
          console.log("No user session, setting defaults.");
          setUser(null);
          currentUserIdRef.current = null;
          setNotes([]);
          setNotesCountQuota(FREE_NOTES_QUOTA_BASE);
          return;
        }

        if (sessionUser.id !== currentUserIdRef.current) {
            setUser(sessionUser);
            currentUserIdRef.current = sessionUser.id;
        }
        
        const currentQuota = await updateUserQuotaAndHandleExpiryForNotes(sessionUser.id, setNotesCountQuota, setIsLoadingQuota);
        await fetchUserNotes(sessionUser.id);
        
      } catch (error) {
          console.error("Error during page initialization:", error.message);
          setUser(null);
          currentUserIdRef.current = null;
          setNotes([]);
          setNotesCountQuota(FREE_NOTES_QUOTA_BASE);
      } finally {
        setIsLoading(false);
        isInitializingRef.current = false;
      }
    };

    supabase.auth.getSession().then(async ({ data: { session }, error: sessionError }) => {
        if (sessionError) {
            console.error("Error getting initial session:", sessionError.message);
            await initializePage(null); 
            await initializePage(session?.user || null);
        }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth event:", event, "Current User ID:", currentUserIdRef.current, "Session User ID:", session?.user?.id);
        if (event === "SIGNED_IN") {
          if (session?.user && session.user.id !== currentUserIdRef.current) {
            console.log("User changed or newly signed in, re-initializing.");
            await initializePage(session.user);
          } else if (session?.user && currentUserIdRef.current === null) {
            console.log("User signed in (was previously null), re-initializing.");
            await initializePage(session.user);
          } else if (session?.user && !isLoading && !isLoadingQuota) {
            console.log("Auth event SIGNED_IN for same user, no re-initialization needed if not loading.");
          }
        } else if (event === "SIGNED_OUT") {
          console.log("User signed out, resetting page.");
          isInitializingRef.current = true; 
          setUser(null);
          currentUserIdRef.current = null;
          setNotes([]);
          setNotesCountQuota(FREE_NOTES_QUOTA_BASE);
          setIsLoading(false); 
          setIsLoadingQuota(false);
          isInitializingRef.current = false;
        } else if (event === "TOKEN_REFRESHED" && session?.user) {
            console.log("Token refreshed for user:", session.user.id, "Checking quota.");
            if (session.user.id === currentUserIdRef.current) {
                const previousIsLoadingQuota = isLoadingQuota; 
                await updateUserQuotaAndHandleExpiryForNotes(session.user.id, setNotesCountQuota, setIsLoadingQuota);
                setIsLoadingQuota(previousIsLoadingQuota); 
            }
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []); 

  const handleCreate = () => {
    if (notes.length >= notesCountQuota && notesCountQuota > 0) {
      alert(`Anda telah mencapai batas ${notesCountQuota} catatan. Silakan upgrade paket Anda untuk menambah catatan.`);
      return;
    }
    if (notesCountQuota === 0 && notes.length >= FREE_NOTES_QUOTA_BASE) {
      alert(`Paket gratis Anda hanya mengizinkan ${FREE_NOTES_QUOTA_BASE} catatan. Silakan upgrade untuk menambah lagi.`);
      return;
    }
    if (notesCountQuota === 0 && notes.length < FREE_NOTES_QUOTA_BASE) {
      // Boleh buat
    } else if (notesCountQuota === 0) {
      alert(`Paket Anda saat ini tidak mengizinkan penambahan catatan. Silakan upgrade.`);
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
      alert("Anda harus login untuk menyimpan catatan.");
      return;
    }
    if (currentNote.title.trim() === "" && currentNote.content.trim() === "") {
      alert("Judul atau isi catatan tidak boleh kosong.");
      return;
    }
  
    if (!currentNote.id) {
      if (notes.length >= notesCountQuota && notesCountQuota > 0) {
        alert(`Batas ${notesCountQuota} catatan tercapai. Tidak dapat menyimpan catatan baru.`);
        setEditing(false);
        return;
      }
      if (notesCountQuota === 0 && notes.length >= FREE_NOTES_QUOTA_BASE) {
        alert(`Paket gratis Anda hanya mengizinkan ${FREE_NOTES_QUOTA_BASE} catatan. Tidak dapat menyimpan catatan baru.`);
        setEditing(false);
        return;
      }
      if (notesCountQuota === 0 && notes.length < FREE_NOTES_QUOTA_BASE) {
        // Boleh simpan
      } else if (notesCountQuota === 0) {
        alert(`Paket Anda tidak mengizinkan penyimpanan catatan baru.`);
        setEditing(false);
        return;
      }
    }
  
    setIsLoading(true);
    let error;
    const noteData = {
      user_id: user.id,
      title: currentNote.title,
      content: currentNote.content,
      date: currentNote.date,
    };
  
    if (currentNote.id) {
      const { error: updateError } = await supabase
        .from("notes")
        .update({ ...noteData, updated_at: new Date().toISOString() })
        .eq("id", currentNote.id)
        .eq("user_id", user.id);
      error = updateError;
  
      if (!error) {
        // Log aktivitas: Note diperbarui
        const { error: logError } = await supabase
          .from('activity_log')
          .insert({
            user_id: user.id,
            page: 'Notes',
            action: 'Updated',
            details: `Updated note "${currentNote.title || 'Untitled'}"`,
            created_at: new Date().toISOString()
          });
        if (logError) console.error("Error logging note update activity:", logError.message);
      }
    } else {
      const { error: insertError } = await supabase
        .from("notes")
        .insert(noteData)
        .select();
      error = insertError;
  
      if (!error) {
        // Log aktivitas: Note baru dibuat
        const { error: logError } = await supabase
          .from('activity_log')
          .insert({
            user_id: user.id,
            page: 'Notes',
            action: 'Created',
            details: `Created new note "${currentNote.title || 'Untitled'}"`,
            created_at: new Date().toISOString()
          });
        if (logError) console.error("Error logging note creation activity:", logError.message);
      }
    }
  
    if (error) {
      console.error("Error saving note:", error.message);
      alert("Error saving note: " + error.message);
    } else {
      const currentQuota = await updateUserQuotaAndHandleExpiryForNotes(user.id, setNotesCountQuota, setIsLoadingQuota);
      await fetchUserNotes(user.id);
      setEditing(false);
      setCurrentNote({ id: null, title: "", content: "", date: "" });
    }
    setIsLoading(false);
  };

  const handleNewNote = () => {
    handleCreate();
  };

  const handleEdit = (noteToEdit) => {
    setCurrentNote({ ...noteToEdit });
    setEditing(true);
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
  
    // Dapatkan judul catatan yang akan dihapus
    const noteToDelete = notes.find(note => note.id === noteIdToDelete);
    const noteTitle = noteToDelete ? noteToDelete.title || 'Untitled' : 'Unknown';
  
    const { error } = await supabase
      .from("notes")
      .delete()
      .eq("id", noteIdToDelete)
      .eq("user_id", user.id);
  
    if (error) {
      console.error("Error deleting note:", error.message);
      alert("Error deleting note: " + error.message);
    } else {
      // Log aktivitas: Note dihapus
      const { error: logError } = await supabase
        .from('activity_log')
        .insert({
          user_id: user.id,
          page: 'Notes',
          action: 'Deleted',
          details: `Deleted note "${noteTitle}"`,
          created_at: new Date().toISOString()
        });
      if (logError) console.error("Error logging note deletion activity:", logError.message);
  
      const currentQuota = await updateUserQuotaAndHandleExpiryForNotes(user.id, setNotesCountQuota, setIsLoadingQuota);
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

  const handleDownloadPDF = async (note) => {
    if (!note) return;
    if (typeof window.jspdf === 'undefined') {
      alert('PDF library is not loaded yet. Please try again in a moment.');
      return;
    }

    const doc = new window.jspdf.jsPDF();
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    
    const margin = 20;
    const maxLineWidth = pageWidth - margin * 2;
    let currentY = margin;

    doc.setFontSize(18);
    doc.text(note.title || "Untitled", margin, currentY);
    currentY += 10;

    doc.setFontSize(12);
    doc.text(new Date(note.date || note.created_at).toLocaleDateString() || "No date", margin, currentY);
    currentY += 10;

    doc.setFontSize(12);
    const noteContent = note.content || "No content.";
    const contentToPrint = noteContent;

    const lines = doc.splitTextToSize(contentToPrint, maxLineWidth);
    
    lines.forEach(line => {
      if (currentY + 10 > pageHeight - margin) {
        doc.addPage();
        currentY = margin;
      }
      doc.text(line, margin, currentY);
      currentY += 7;
    });

    doc.save(`${note.title || "note"}-${new Date().toISOString().split('T')[0]}.pdf`);

    // Log aktivitas: Note didownload sebagai PDF
    if (user) {
      const { error: logError } = await supabase
        .from('activity_log')
        .insert({
          user_id: user.id,
          page: 'Notes',
          action: 'Downloaded',
          details: `Downloaded note "${note.title || 'Untitled'}" as PDF`,
          created_at: new Date().toISOString()
        });
      if (logError) console.error("Error logging note download activity:", logError.message);
    }
  };
  
  const handleInputChange = (e) => {
    setInputValue(e.target.value.toLowerCase());
  };

  const filteredNotes = notes.filter(notes =>
    notes.title.toLowerCase().includes(inputValue)
  );

  const canCreateNote = user && !isLoadingQuota && notes.length < notesCountQuota;
  const canCreateWithZeroQuotaFreeTier = user && !isLoadingQuota && notesCountQuota === 0 && notes.length < FREE_NOTES_QUOTA_BASE;
  const actualNotesCount = notes.length;
  const isOverQuota = actualNotesCount > notesCountQuota && notesCountQuota > 0;
  const isAtFreeQuotaLimitWithZeroPaidQuota = notesCountQuota === 0 && actualNotesCount >= FREE_NOTES_QUOTA_BASE;
  const showPageLoadingIndicator = isLoading || (isLoadingQuota && user);

  return (
    <PageLayout title="NOTES">
      <div className="flex-1 flex flex-col p-4 md:p-8 relative">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center">
            <h1 className="text-2xl md:text-3xl font-bold text-[#1D1C3B] dark:text-slate-100">
              My Notes
            </h1>
            {user && !isLoadingQuota && ( 
              <span className={`ml-3 text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full ${actualNotesCount >= notesCountQuota ? 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200' : ''}`}>
                {actualNotesCount}/{notesCountQuota > 0 ? notesCountQuota : FREE_NOTES_QUOTA_BASE}
              </span>
            )}
             {(isLoadingQuota && user) && ( 
                <span className="ml-3 text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full animate-pulse">
                    --/--
                </span>
            )}
          </div>
          {user && (
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <input
                type="text"
                onChange={handleInputChange}
                value={inputValue}
                placeholder="Search"
                className="px-4 py-2 rounded-md bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-[#6B5CFF] w-full sm:w-auto"
              />
            </div>
          )}
        </div>

        {!user && !showPageLoadingIndicator && ( 
          <div className="text-center py-10">
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Please log in to manage your notes.
            </p>
          </div>
        )}

        {user && !editing && !showPageLoadingIndicator && ( 
          <>
            {(isOverQuota || isAtFreeQuotaLimitWithZeroPaidQuota) && (
              <div className="p-4 mb-4 text-sm text-center text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800" role="alert">
                {isAtFreeQuotaLimitWithZeroPaidQuota
                  ? `Anda telah mencapai batas ${FREE_NOTES_QUOTA_BASE} catatan untuk paket gratis. `
                  : `Anda telah menggunakan ${actualNotesCount} dari ${notesCountQuota} kuota catatan Anda. `}
                Silakan <Link href="/settings/billing" className="font-bold underline">upgrade paket Anda</Link> untuk menambah catatan.
              </div>
            )}

            {actualNotesCount === 0 && (canCreateNote || canCreateWithZeroQuotaFreeTier) && (
              <button
                onClick={handleCreate}
                className="hover:cursor-pointer absolute top-22 left-7 bg-[#6B5CFF] text-white rounded-full p-2.5 shadow-lg hover:bg-[#5a4de0] transition duration-200"
                aria-label="Create new note"
              >
                Create Notes ✏️
              </button>
            )}
            
            {actualNotesCount === 0 && !(canCreateNote || canCreateWithZeroQuotaFreeTier) && (
              <div className="text-gray-400 dark:text-gray-500 text-center mt-32 text-lg">
                {notesCountQuota === 0 && !canCreateWithZeroQuotaFreeTier
                  ? <>Paket Anda saat ini tidak mengizinkan pembuatan catatan. <Link href="/settings/billing" className="underline text-[#6B5CFF]">Upgrade di sini</Link>.</>
                  : (isOverQuota || isAtFreeQuotaLimitWithZeroPaidQuota ? <>Anda telah mencapai batas kuota. <Link href="/settings/billing" className="underline text-[#6B5CFF]">Upgrade untuk menambah lagi</Link>.</> : 'No notes yet...')}
              </div>
            )}
             {actualNotesCount === 0 && (canCreateNote || canCreateWithZeroQuotaFreeTier) && (
                <div className="text-gray-400 dark:text-gray-500 text-center mt-32 text-lg">
                    No notes yet...
                </div>
            )}
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
                  disabled={isLoading} 
                  className="text-slate-600 dark:text-slate-300 hover:text-[#6B5CFF] dark:hover:text-[#8A7FFF] hover:cursor-pointer disabled:opacity-50"
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

        {showPageLoadingIndicator && (
            <div className="text-center py-10 text-indigo-600 animate-pulse">
              Loading notes...
            </div>
        )}

        {user && !editing && actualNotesCount > 0 && !showPageLoadingIndicator && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
            {filteredNotes.slice(0, notesCountQuota > 0 ? notesCountQuota : (actualNotesCount <= FREE_NOTES_QUOTA_BASE ? FREE_NOTES_QUOTA_BASE : 0) ).map((note) => (
              <div
                key={note.id}
                className="border dark:border-slate-700 p-4 rounded-md shadow-md bg-white dark:bg-slate-800 relative flex flex-col justify-between min-h-[150px]"
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(note.date || note.created_at).toLocaleDateString() || "No Date"}
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
                        <ArrowDownToLine size={18}/> 
                      </button>
                    </div>
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 break-words">
                    {note.title || "Untitled"}
                  </h2>
                  <p className="text-sm mt-2 text-gray-700 dark:text-gray-300 break-words whitespace-pre-wrap max-h-24 overflow-y-auto">
                    {note.content}
                  </p>
                </div>
              </div>
            ))}
            {(canCreateNote || canCreateWithZeroQuotaFreeTier) && (
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
        
        {user && !editing && actualNotesCount > (notesCountQuota > 0 ? notesCountQuota : FREE_NOTES_QUOTA_BASE) && !showPageLoadingIndicator && (
            <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-3 text-center">Notes Beyond Quota</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {notes.slice(notesCountQuota > 0 ? notesCountQuota : FREE_NOTES_QUOTA_BASE).map((note) => (
                    <div
                      key={note.id}
                      className="border border-dashed border-gray-300 dark:border-slate-600 p-4 rounded-md bg-gray-50 dark:bg-slate-800/50 opacity-60 relative flex flex-col justify-between min-h-[150px]"
                    >
                      <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-800 text-xs px-2 py-0.5 rounded-sm font-semibold shadow-sm z-10">
                          Over Quota
                      </div>
                      <div> 
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-400 dark:text-gray-500">
                            {new Date(note.date || note.created_at).toLocaleDateString() || "No Date"}
                          </span>
                        </div>
                        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 break-words">
                          {note.title || "Untitled"}
                        </h2>
                        <p className="text-sm mt-2 text-gray-500 dark:text-gray-400 break-words whitespace-pre-wrap max-h-24 overflow-y-auto">
                          {note.content}
                        </p>
                      </div>
                    </div>
                ))}
                </div>
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
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors hover:cursor-pointer"
                  disabled={isLoading}
                >
                  {isLoading ? "Deleting..." : "Delete"}
                </button>
                <button
                  onClick={cancelDelete}
                  className="bg-gray-300 dark:bg-gray-600 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors hover:cursor-pointer"
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