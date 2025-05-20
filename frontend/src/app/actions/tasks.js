// File buat fungsi connect ke database (Backend Server-Side)

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'

export async function addTask(data) {
  const task = await prisma.task.create({ data })
  revalidatePath('/calendar')    // so Calendar page updates
  return task
}

export async function getTasks() {
  return await prisma.task.findMany({ orderBy: { deadline: 'asc' } })
}