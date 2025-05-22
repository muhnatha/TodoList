"use server";
import { revalidatePath } from "next/cache";
import { supabase } from '../lib/supabaseClient';

export async function addTask(prevState, formData) {
  try {
    // Extract the form data properly using FormData
    const taskId = await new Date().getTime();
    const taskName = await formData.get("taskName");
    const taskDescription = await formData.get("taskDescription");
    const taskDeadline = await formData.get("taskDeadline");
    const taskHour = await formData.get("taskDeadlineTime");
    const taskTag = await formData.get("taskTag");
    const taskCreatedTime = new Date().toISOString();
    const taskStatus = "todo";
    const taskCompletedTime = null;

    // More visible logging - these will show in your terminal where Next.js is running
    console.log("\n========== SERVER ACTION CALLED ==========");
    console.log("👉 Task Name:", taskName);
    console.log("👉 Description:", taskDescription);
    console.log("👉 Deadline:", taskDeadline + " ", taskHour);
    console.log("👉 Tag:", taskTag);
    console.log("==========================================\n");

    // This won't be visible in production but can help during development
    const task = {
      id: taskId,  
      name: taskName,
      description: taskDescription,
      deadline: taskDeadline,
      hour: taskHour,
      tag: taskTag,
      created_at: taskCreatedTime,
      status: taskStatus,
      completed_at: taskCompletedTime
    };

    // Validate the data
    if (!taskName) {
      return {
        message: "Task name is required",
        success: false,
        debug: "Validation failed: Missing task name"
      };
    }

    // Insert the task into Supabase
    const { data, error } = await supabase
      .from('task')
      .insert([task]);

    if (error) {
      throw new Error(error.message);
    }

    // Revalidate the path to refresh data
    revalidatePath("/");

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
}