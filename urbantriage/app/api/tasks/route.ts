import { NextRequest, NextResponse } from "next/server";
import { getAllServerTasks, saveServerTask } from "@/lib/server-tasks";
import { CleanupTask } from "@/lib/types";

export async function GET() {
  const tasks = getAllServerTasks();
  return NextResponse.json({
    success: true,
    tasks,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const task: CleanupTask = body;

    if (!task || !task.id) {
      return NextResponse.json(
        { error: "Invalid task data" },
        { status: 400 }
      );
    }

    saveServerTask(task);

    return NextResponse.json({
      success: true,
      task,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to save task" },
      { status: 500 }
    );
  }
}
