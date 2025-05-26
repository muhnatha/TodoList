'use client'
import React, { useState, useEffect } from 'react'
import PageLayout from "@/components/PageLayout"
import { Button } from "@/components/ui/button"
import { CardContent } from "@/components/ui/card"
import { addTask } from '../action' // Server Action
import { useActionState } from 'react'
import { CirclePlus, Calendar, Tag, Clock } from "lucide-react"
import TaskForm from '@/components/TaskForm'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

// Konstanta kuota gratis untuk To-Do
const FREE_TODOS_QUOTA_BASE = 5;

const initialState = {
  message: '',
  success: false,
  task: null,
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

async function fetchTasks(userId) {
  if (!userId) {
    console.error("User ID not provided to fetchTasks");
    return [];
  }
  // Ambil semua task, urutkan dari yang terbaru agar logic .slice() bekerja benar
  // untuk menyembunyikan task yang "lebih baru" jika kuota berkurang
  const { data, error } = await supabase
    .from('task')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false }); // Terbaru di atas

  if (error) {
    console.error("Error fetching tasks:", error.message);
    return [];
  }
  return data || []; // Kembalikan array kosong jika data null
}

// Fungsi untuk menangani kedaluwarsa paket dan menghitung ulang kuota To-Do
async function updateUserQuotaAndHandleExpiryForTodos(userId, setTaskCountQuotaHook, setIsLoadingQuotaHook) {
  if (!userId) {
    setIsLoadingQuotaHook(false);
    setTaskCountQuotaHook(FREE_TODOS_QUOTA_BASE);
    console.error("User ID not provided to updateUserQuotaAndHandleExpiryForTodos");
    return FREE_TODOS_QUOTA_BASE;
  }
  setIsLoadingQuotaHook(true);

  const now = new Date().toISOString();

  // 1. Nonaktifkan paket 'todos' yang sudah kedaluwarsa
  const { error: expiryUpdateError } = await supabase
    .from('quota_packages')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('package_type', 'todos')
    .eq('is_active', true)
    .lt('expires_at', now);

  if (expiryUpdateError) {
    console.error("Error deactivating expired todos packages:", expiryUpdateError.message);
  } else {
    console.log("Checked and deactivated any expired todos packages for user:", userId);
  }

  // 2. Hitung ulang total kuota saat ini
  const { data: activePackages, error: fetchActiveError } = await supabase
    .from('quota_packages')
    .select('items_added')
    .eq('user_id', userId)
    .eq('package_type', 'todos')
    .eq('is_active', true);

  let currentTotalTodosQuota = FREE_TODOS_QUOTA_BASE;
  if (fetchActiveError) {
    console.error("Error fetching active todos packages:", fetchActiveError.message);
  } else if (activePackages) {
    const totalPaidQuota = activePackages.reduce((sum, pkg) => sum + pkg.items_added, 0);
    currentTotalTodosQuota = FREE_TODOS_QUOTA_BASE + totalPaidQuota;
  }

  // 3. (PENTING) Update kolom 'todos_current_total_quota' di tabel 'profiles'
  // Ini memastikan halaman lain (seperti SettingsBillingPage) membaca nilai yang benar.
  const { error: updateProfileError } = await supabase
    .from('profiles')
    .update({ todos_current_total_quota: currentTotalTodosQuota }) // PASTIKAN KOLOM INI ADA
    .eq('id', userId);

  if (updateProfileError) {
      console.warn("Could not update todos_current_total_quota in profiles from client:", updateProfileError.message);
  }

  // 4. Set state lokal
  setTaskCountQuotaHook(currentTotalTodosQuota);
  setIsLoadingQuotaHook(false);
  return currentTotalTodosQuota;
}


export default function TodoPage() {
  const [state, formAction] = useActionState(addTask, initialState);
  const [showForm, setShowForm] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isLoadingQuota, setIsLoadingQuota] = useState(true);
  const [taskCountQuota, setTaskCountQuota] = useState(FREE_TODOS_QUOTA_BASE);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const initializePage = async () => {
      setIsLoadingTasks(true);
      setIsLoadingQuota(true); // Pastikan ini juga di-set

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("Error fetching user or no user session:", userError?.message || "No user session");
        setCurrentUser(null);
        setTasks([]);
        setTaskCountQuota(FREE_TODOS_QUOTA_BASE);
        setIsLoadingTasks(false);
        setIsLoadingQuota(false);
        return;
      }
      
      setCurrentUser(user);

      await updateUserQuotaAndHandleExpiryForTodos(user.id, setTaskCountQuota, setIsLoadingQuota);
      // Tidak perlu oper currentQuota ke fetchTasks jika fetchTasks tidak langsung menggunakannya
      // untuk membatasi query (karena kita slice di client)
      const fetchedTasks = await fetchTasks(user.id);
      setTasks(fetchedTasks); // setTasks dengan hasil fetch
      setIsLoadingTasks(false);
    };

    initializePage();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session?.user) { // Cek session.user juga
            // setCurrentUser(session.user); // Sudah dihandle initializePage
            initializePage();
        } else if (event === 'SIGNED_OUT') {
            setCurrentUser(null);
            setTasks([]);
            setTaskCountQuota(FREE_TODOS_QUOTA_BASE);
            setIsLoadingTasks(false);
            setIsLoadingQuota(false);
        }
    });

    return () => {
        authListener?.subscription.unsubscribe();
    };
  }, []);

  async function updateTaskStatus(taskId, newStatus = 'completed') {
    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (!taskToUpdate) return;

    const originalTasks = [...tasks];
    setTasks(prevTasks => 
        prevTasks.map(task => 
            task.id === taskId ? { ...task, status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : task.completed_at } : task
        )
    );

    const { error } = await supabase
      .from('task')
      .update({ status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : null })
      .eq('id', taskId);

    if (error) {
      console.error("Error updating task status in DB:", error.message);
      setTasks(originalTasks);
      alert("Failed to update task status. Please try again.");
      return;
    }

    if (currentUser && newStatus === 'completed') {
      const { data: logData, error: fetchLogError } = await supabase
        .from('task_completion_log')
        .select('completed_task_count')
        .eq('user_id', currentUser.id)
        .single();

      if (fetchLogError && fetchLogError.code !== 'PGRST116') {
        console.error("Error fetching task_completion_log:", fetchLogError.message);
      } else {
        const currentCount = logData?.completed_task_count || 0;
        const { error: logError } = await supabase
          .from('task_completion_log')
          .update({ completed_task_count: currentCount + 1, updated_at: new Date().toISOString() })
          .eq('user_id', currentUser.id);
        if (logError) console.error("Error updating task_completion_log:", logError.message);
      }
    }
    console.log(`Task ${taskId} status updated to ${newStatus}`);
  }

  useEffect(() => {
    if (state.success && state.task) {
      // Tambahkan task baru dan urutkan kembali (terbaru di atas)
      setTasks(prevTasks => [state.task, ...prevTasks].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)));
      setShowForm(false);
    }
    if (!state.success && state.message) {
      alert(`Error adding task: ${state.message}`);
    }
  }, [state.success, state.task, state.message]);


  // --- AWAS: Logika Penghapusan Task Selesai Otomatis ---
  // useEffect ini berasal dari kode asli Anda.
  // Ini akan MENGHAPUS task yang statusnya 'completed' dan berumur lebih dari 1 hari.
  // Jika Anda tidak ingin task selesai hilang sepenuhnya, Anda bisa MENGHAPUS atau MENGOMENTARI useEffect di bawah ini.
  useEffect(() => {
    const deleteOldCompletedTasks = async () => {
      if (!currentUser) return;
      const cutoff = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
      const { error, count } = await supabase // Dapatkan count untuk logging
        .from('task')
        .delete({ count: 'exact' }) // Minta Supabase mengembalikan jumlah baris yang dihapus
        .eq('status', 'completed')
        .eq('user_id', currentUser.id)
        .lt('completed_at', cutoff);
      
      if (error) {
        console.error('Error auto-deleting completed tasks:', error.message);
      } else {
        if (count && count > 0) {
            console.log(`Auto-deleted ${count} old completed task(s).`);
            // Muat ulang tasks HANYA jika ada yang benar-benar terhapus
            const updatedTasks = await fetchTasks(currentUser.id); 
            setTasks(updatedTasks);
        } else {
            console.log('Checked for old completed tasks to delete. None found or deleted.');
        }
      }
    };
    
    if (currentUser) {
        const intervalId = setInterval(deleteOldCompletedTasks, 60 * 60 * 1000); // Setiap jam
        deleteOldCompletedTasks(); // Jalankan sekali saat mount (setelah currentUser ada)
        return () => clearInterval(intervalId); 
    }
  }, [currentUser]); // Jalankan jika currentUser berubah


  const todoTasksRaw = tasks.filter(task => task.status === 'todo');
  // tasks sudah diurutkan dari terbaru oleh fetchTasks dan saat penambahan baru

  // `taskCountQuota` adalah jumlah total task yang diizinkan (gratis + berbayar aktif)
  // `visibleTodoTasks` adalah N task terbaru yang sesuai kuota
  const visibleTodoTasks = todoTasksRaw.slice(0, taskCountQuota);
  // `blurredTodoTasks` adalah task terbaru berikutnya yang melebihi kuota
  const blurredTodoTasks = todoTasksRaw.slice(taskCountQuota);
  
  const actualActiveTodoTaskCount = todoTasksRaw.length;
  // Kondisi untuk tombol "Add New Task": bisa tambah jika jumlah task aktif < kuota yang diizinkan
  const canAddNewTask = actualActiveTodoTaskCount < taskCountQuota;

  return (
    <PageLayout title="TODO">
      <div className="flex flex-col p-4 md:p-6">
        <div className="flex flex-col gap-6">
          {/* Kolom To Do */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b-2 border-gray-200 pb-3">
              <h2 className="text-xl font-semibold text-gray-700">To Do</h2>
              {!isLoadingQuota && (
                <h2 className="text-sm font-medium text-gray-500">
                  Quota: {actualActiveTodoTaskCount}/{taskCountQuota}
                </h2>
              )}
            </div>
            
            {showForm && (
              <TaskForm 
                formAction={formAction} 
                state={state} 
                setShowForm={setShowForm} 
              />
            )}

            <CardContent className="p-0">
              {isLoadingTasks || isLoadingQuota ? (
                <div className="flex justify-center items-center h-40">
                  <p className="text-[#6772FE]">Loading tasks and quota...</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 mb-4">
                    {/* Render VISIBLE 'todo' tasks */}
                    {visibleTodoTasks.map((task) => (
                      <div 
                        key={task.id} 
                        className="p-4 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white flex flex-col justify-between min-h-[180px]"
                      >
                        <div>
                          <h3 className="font-semibold text-md text-gray-800 break-words">{task.name}</h3>
                          {task.description ? (
                            <p className="text-gray-600 text-sm mt-1 text-justify break-words max-h-20 overflow-y-auto">
                              {task.description}
                            </p>
                          ) : (
                            <p className="text-gray-400 text-sm mt-1 italic">No description</p>
                          )}
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex flex-wrap gap-x-3 gap-y-1.5 mb-3 text-xs">
                            {task.deadline && (
                              <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                <Calendar size={12} />
                                <span>{formatDate(task.deadline)}</span>
                              </div>
                            )}
                            {task.hour && (
                              <div className="flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                                <Clock size={12} />
                                <span>{task.hour.slice(0,5)}</span>
                              </div>
                            )}
                            {task.tag && (
                              <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded">
                                <Tag size={12} />
                                <span>{task.tag}</span>
                              </div>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-auto bg-[#6772FE] hover:bg-[#5051F9] text-white hover:text-white font-medium py-2 transition-colors hover:cursor-pointer"
                            onClick={() => updateTaskStatus(task.id, 'completed')}
                          >
                            Mark as Completed
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* Render BLURRED 'todo' tasks */}
                    {blurredTodoTasks.map((task) => (
                      <div 
                        key={task.id} 
                        className="p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50 opacity-60 flex flex-col justify-between min-h-[180px] relative"
                      >
                        {/* ... (konten task blurred tetap sama) ... */}
                        <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-800 text-xs px-2 py-0.5 rounded-sm font-semibold shadow-sm z-10">
                          Over Quota
                        </div>
                        <div>
                          <h3 className="font-semibold text-md text-gray-700 break-words">{task.name}</h3>
                          {task.description ? (
                            <p className="text-gray-500 text-sm mt-1 text-justify break-words max-h-20 overflow-y-auto">
                              {task.description}
                            </p>
                          ) : (
                            <p className="text-gray-400 text-sm mt-1 italic">Tidak ada deskripsi</p>
                          )}
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex flex-wrap gap-x-3 gap-y-1.5 mb-3 text-xs">
                            {task.deadline && (
                              <div className="flex items-center gap-1 text-gray-500">
                                <Calendar size={12} />
                                <span>{formatDate(task.deadline)}</span>
                              </div>
                            )}
                            {task.hour && (
                              <div className="flex items-center gap-1 text-gray-500">
                                <Clock size={12} />
                                <span>{task.hour.slice(0,5)}</span>
                              </div>
                            )}
                            {task.tag && (
                              <div className="flex items-center gap-1 text-gray-400 bg-gray-200 px-2 py-0.5 rounded">
                                <Tag size={12} />
                                <span>{task.tag}</span>
                              </div>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-auto bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 transition-colors hover:cursor-not-allowed"
                            disabled
                          >
                            Complete (Over Quota)
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pesan "Over Quota" dan tombol upgrade */}
                  {actualActiveTodoTaskCount > taskCountQuota && !isLoadingQuota && (
                    <div className="flex flex-col items-center justify-center py-6 text-center mt-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-md font-semibold text-red-600 mb-2">
                        Anda telah menggunakan {actualActiveTodoTaskCount} dari {taskCountQuota} kuota tugas Anda!
                      </p>
                      <p className="text-sm text-red-500 mb-4">
                        Beberapa tugas mungkin tidak ditampilkan atau di-blur karena melebihi kuota.
                      </p>
                      <Link 
                        href='/settings/billing' 
                        className="inline-block px-5 py-2 bg-red-500 text-white font-medium text-sm rounded-md shadow-md hover:bg-red-600 transition-colors"
                      >
                        Tambah Kuota Sekarang
                      </Link>
                    </div>
                  )}
                  
                  {/* Tombol Add Task */}
                  {!showForm && (
                    <div className={`flex flex-col items-center justify-center py-6 text-center`}>
                        { (actualActiveTodoTaskCount === 0 && !isLoadingTasks && !isLoadingQuota) && (
                            <>
                                <p className="text-[#6772FE] font-semibold">There is no task</p>
                                <p className="text-xs text-gray-400 mt-1 mb-3">Add task to start.</p>
                            </>
                        )}
                        {/* Tombol tambah task hanya muncul jika jumlah task aktif < kuota */}
                        { canAddNewTask && !isLoadingQuota && (
                          <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-sm flex items-center gap-1.5 hover:cursor-pointer bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-700 px-4 py-2"
                              onClick={() => setShowForm(true)}
                          >
                              <CirclePlus size={16} />
                              <span>Add New Task</span>
                          </Button>
                        )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </div>

          {/* Kolom Completed - UI TIDAK DIUBAH dari struktur asli Anda */}
          <div className="flex flex-col mt-8">
            <div className="flex items-center justify-between mb-4 border-b-2 border-gray-200 pb-3">
              <h2 className="text-xl font-semibold text-gray-700">Completed</h2>
            </div>
            <CardContent className="p-0">
              {isLoadingTasks ? ( // Bisa juga isLoadingTasks || isLoadingQuota
                <div className="flex justify-center items-center h-40">
                  <p className="text-[#6772FE]">Loading completed tasks...</p>
                </div>
              ) : tasks.filter(task => task.status === 'completed').length === 0 ? (
                <div className="flex justify-center items-center py-10 text-gray-400">
                  <p className="font-medium">There is no completed task.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                  {tasks.filter(task => task.status === 'completed').map((task) => (
                    <div key={task.id} className="p-4 border border-green-200 bg-green-50 rounded-lg shadow-sm opacity-80">
                      <h3 className="font-medium text-gray-700 line-through">{task.name}</h3>
                      {task.description && <p className="text-xs text-gray-500 mt-1 line-through">{task.description}</p>}
                      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2 text-xs">
                        {task.tag && (
                          <div className="flex items-center gap-1 text-gray-500">
                            <Tag size={12} />
                            <span>{task.tag}</span>
                          </div>
                        )}
                         {task.completed_at && (
                            <div className="flex items-center gap-1 text-gray-500">
                                <Calendar size={12} />
                                <span>Completed: {formatDate(task.completed_at)}</span>
                            </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </div> {/* Akhir Kolom Completed */}

        </div>
      </div>
    </PageLayout>
  )
}