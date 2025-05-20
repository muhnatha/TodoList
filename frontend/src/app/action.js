"use server";

import { revalidatePath } from "next/cache";

export async function addTask(prevState, formData) {
  try {
    // Extract the form data properly using FormData
    const taskName = formData.get("taskName");
    const taskDescription = formData.get("taskDescription");
    const taskDeadline = formData.get("taskDeadline");
    const taskTag = formData.get("taskTag");

    // More visible logging - these will show in your terminal where Next.js is running
    console.log("\n========== SERVER ACTION CALLED ==========");
    console.log("👉 Task Name:", taskName);
    console.log("👉 Description:", taskDescription);
    console.log("👉 Deadline:", taskDeadline);
    console.log("👉 Tag:", taskTag);
    console.log("==========================================\n");

    // For development purposes, you can also log to the response
    // This won't be visible in production but can help during development
    const task = {
      name: taskName,
      description: taskDescription,
      deadline: taskDeadline,
      tag: taskTag,
      timestamp: new Date().toISOString()
    };

    // Validate the data
    if (!taskName) {
      return {
        message: "Task name is required",
        success: false,
        debug: "Validation failed: Missing task name"
      };
    }

    // Here you would typically save the data to a database
    // For example:
    // await db.task.create({
    //   data: {
    //     name: taskName,
    //     description: taskDescription,
    //     deadline: taskDeadline,
    //     tag: taskTag,
    //   },
    // });

    // Revalidate the path to refresh data
    revalidatePath("/");

    // Return successful state with debug info
    return {
      message: `Todo berhasil ditambahkan, ${taskName}!`,
      success: true,
      debug: `Task added at ${new Date().toISOString()}`,
      task: task // Include the task data in the response for verification
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