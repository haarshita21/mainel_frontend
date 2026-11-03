import { INITIAL_TASKS } from "./task-store";
import { CleanupTask } from "./types";

// Persist on globalThis so all API route files and fast refreshes share the exact same state
const globalForTasks = globalThis as unknown as {
  serverTasksCache: CleanupTask[] | undefined;
};

export const sharedServerTasks: CleanupTask[] =
  globalForTasks.serverTasksCache ?? [...INITIAL_TASKS];

globalForTasks.serverTasksCache = sharedServerTasks;

export function getAllServerTasks(): CleanupTask[] {
  return sharedServerTasks;
}

export function getServerTaskById(id: string): CleanupTask | undefined {
  return sharedServerTasks.find((t) => t.id === id);
}

export function saveServerTask(task: CleanupTask): void {
  const index = sharedServerTasks.findIndex((t) => t.id === task.id);
  if (index !== -1) {
    sharedServerTasks[index] = task;
  } else {
    sharedServerTasks.unshift(task);
  }
}

export function updateServerTask(id: string, updates: Partial<CleanupTask>): CleanupTask | null {
  const index = sharedServerTasks.findIndex((t) => t.id === id);
  if (index === -1) return null;
  sharedServerTasks[index] = {
    ...sharedServerTasks[index],
    ...updates,
  };
  return sharedServerTasks[index];
}
