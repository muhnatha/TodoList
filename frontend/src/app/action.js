"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function addTask(prevState, formData) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
      getAll() {
        // cookies().getAll() returns an array of { name, value }
        return cookieStore.getAll().map(({ name, value }) => ({ name, value }));
      },
      setAll(cookies) {
        // cookies is an array of { name, value, ...options }
        for (const { name, value, ...options } of cookies) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            console.warn("Could not set cookie using object notation in setAll");
          }
        }
      },
    },
  });

  try {
    // Get the current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Authentication error in addTask:", authError?.message || "User not found.");
      return {
        message: "Autentikasi gagal. Silakan login kembali.",
        success: false,
        debug: authError ? authError.message : "No active user session."
      };
    }

    const userId = user.id; // The ID of the authenticated user
    // Extract the form data properly using FormData
    const taskId = new Date().getTime();
    const taskName = await formData.get("taskName");
    const taskDescription = await formData.get("taskDescription");
    const taskDeadline = await formData.get("taskDeadline");
    const taskHour = await formData.get("taskDeadlineTime");
    const taskTag = await formData.get("taskTag");
    const taskCreatedTime = new Date().toISOString();
    const taskStatus = "todo";
    const taskCompletedTime = null;
    let deadlineAtISO = null;

    // More visible logging - these will show in your terminal where Next.js is running
    console.log("\n========== SERVER ACTION: addTask ==========");
    console.log("Authenticated User ID:", userId);
    console.log("Task Name:", taskName);
    console.log("Description:", taskDescription);
    console.log("Deadline:", taskDeadline, "Hour:", taskHour);
    console.log("Tag:", taskTag);
    console.log("Generated Task ID:", taskId);
    console.log("==========================================\n");

    if (taskDeadline && taskHour) {
    const [year, month, day] = taskDeadline.split('-').map(Number);
    const [hours, minutes] = taskHour.split(':').map(Number);
    const combinedDeadline = new Date(year, month - 1, day, hours, minutes);
    if (!isNaN(combinedDeadline.getTime())) {
        deadlineAtISO = combinedDeadline.toISOString();
    } else {
        // Handle invalid date/time combination
        return { message: 'Invalid deadline date or time.', success: false, task: null };
    }}
    

    // Validate the data
    if (!taskName) {
      return {
        message: "Task name is required",
        success: false,
        debug: "Validation failed: Missing task name"
      };
    }

    if (!userId) { // Should be caught by auth check, but as a safeguard
        return {
            message: "User ID tidak ditemukan. Autentikasi bermasalah.",
            success: false,
            debug: "User ID is missing post-authentication check."
        };
    }

    // This won't be visible in production but can help during development
    const task = {
      id: taskId,
      user_id: userId,  
      name: taskName,
      description: taskDescription,
      deadline: taskDeadline,
      hour: taskHour,
      deadline_at: deadlineAtISO, 
      due_soon_notified_at: null,
      tag: taskTag,
      created_at: taskCreatedTime,
      status: taskStatus,
      completed_at: taskCompletedTime
    };

    // Insert the task into Supabase
    const { data, error } = await supabase
      .from('task')
      .insert([task]);

    if (error) {
      throw new Error(error.message);
    }

    // Revalidate the path to refresh data
    revalidatePath("/");
    console.log("Task added successfully:", data);

    // Return successful state with debug info
    return {
      message: `Todo berhasil ditambahkan, ${taskName}!`,
      success: true,
      debug: `Task added at ${new Date().toISOString()}`,
      task: data ? data[0] : task // Return the inserted task from Supabase
    };
  } catch (error) {
    console.error("Error adding task:", error);
    return {
      message: "Failed to add task: " + error.message,
      success: false,
      debug: `Error: ${error.message}`
    };
  }
};

export async function confirmBilling(formData) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
      getAll() {
        // cookies().getAll() returns an array of { name, value }
        return cookieStore.getAll().map(({ name, value }) => ({ name, value }));
      },
      setAll(cookies) {
        // cookies is an array of { name, value, ...options }
        for (const { name, value, ...options } of cookies) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            console.warn("Could not set cookie using object notation in setAll");
          }
        }
      },
    },
  });

  try {
    // Get the current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Authentication error in addTask:", authError?.message || "User not found.");
      return {
        message: "Autentikasi gagal. Silakan login kembali.",
        success: false,
        debug: authError ? authError.message : "No active user session."
      };
    }
  } catch (error) {
    console.error("Error adding task:", error);
    return {
      message: "Failed to add task: " + error.message,
      success: false,
      debug: `Error: ${error.message}`
    };
  }
};