import { CleanupTask, WasteReport } from "./types";

// Helper to create dynamic deadlines relative to current time
export function getDynamicDeadline(hoursFromNow = 24): string {
  const d = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  const now = new Date();
  const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth();
  const isTomorrow =
    d.getDate() === new Date(now.getTime() + 86400000).getDate() &&
    d.getMonth() === new Date(now.getTime() + 86400000).getMonth();

  const dayStr = isToday ? "Today" : isTomorrow ? "Tomorrow" : d.toLocaleDateString([], { weekday: "short" });
  const timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
  return `${dayStr} · ${timeStr}`;
}

export const INITIAL_TASKS: CleanupTask[] = [
  // INDIRANAGAR CLUSTER (3 incidents at same place)
  {
    id: "1",
    reportId: "rep-101",
    imageUrl: "https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80",
    location: {
      latitude: 12.9784,
      longitude: 77.6408,
      area: "Indiranagar, 100ft Road",
      city: "Bengaluru",
      state: "Karnataka",
    },
    wasteCategory: "Mixed waste",
    wasteTypes: ["Plastic bottles", "Plastic bags", "Food/kitchen waste"],
    quantity: {
      scale: "large",
      estimatedVolume: "Approximately 2–3 cubic meters",
      confidence: 0.88,
    },
    severity: "High",
    recommendedDisposal: [
      "Separate recyclable plastics and dry materials",
      "Send organic matter to wet waste composting",
      "Route residual waste to authorized disposal depot",
    ],
    requiredEquipment: ["Heavy-duty gloves", "Garbage bags", "Collection cart", "Tongs"],
    precautions: ["Wear puncture-resistant gloves", "Check for shattered glass bottles"],
    reportedAt: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString(),
    deadline: getDynamicDeadline(14),
    status: "open",
    joinedVolunteers: ["You"],
    maxVolunteers: 3,
    confidence: 0.89,
  },
  {
    id: "3",
    reportId: "rep-103",
    imageUrl: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80",
    location: {
      latitude: 12.9784,
      longitude: 77.6408,
      area: "Indiranagar, 100ft Road",
      city: "Bengaluru",
      state: "Karnataka",
    },
    wasteCategory: "Commercial packaging",
    wasteTypes: ["Cardboard boxes", "Styrofoam blocks", "Plastic strapping"],
    quantity: {
      scale: "medium",
      estimatedVolume: "Approximately 1.5 cubic meters",
      confidence: 0.85,
    },
    severity: "Medium",
    recommendedDisposal: [
      "Flatten cardboard for dry recycling",
      "Bag styrofoam separately for polymer processing",
    ],
    requiredEquipment: ["Gloves", "Box cutter", "Heavy duty twine"],
    precautions: ["Beware of metal staples in shipping boxes"],
    reportedAt: new Date(Date.now() - 4.5 * 3600 * 1000).toISOString(),
    deadline: getDynamicDeadline(20),
    status: "open",
    joinedVolunteers: [],
    maxVolunteers: 2,
    confidence: 0.86,
  },
  {
    id: "4",
    reportId: "rep-104",
    imageUrl: "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80",
    location: {
      latitude: 12.9784,
      longitude: 77.6408,
      area: "Indiranagar, 100ft Road",
      city: "Bengaluru",
      state: "Karnataka",
    },
    wasteCategory: "Cleared Street Debris",
    wasteTypes: ["Plastic packaging", "Beverage cans"],
    quantity: {
      scale: "small",
      estimatedVolume: "Approximately 0.5 cubic meters",
      confidence: 0.94,
    },
    severity: "Low",
    recommendedDisposal: ["Sent to civic dry waste collection center"],
    requiredEquipment: ["Gloves", "Collection bin"],
    precautions: ["None"],
    reportedAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    deadline: "Completed",
    status: "completed",
    joinedVolunteers: ["Local Volunteers"],
    maxVolunteers: 2,
    confidence: 0.95,
  },

  // KORAMANGALA CLUSTER (2 incidents at same place)
  {
    id: "2",
    reportId: "rep-102",
    imageUrl: "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80",
    location: {
      latitude: 12.9352,
      longitude: 77.6245,
      area: "Koramangala, 4th Block",
      city: "Bengaluru",
      state: "Karnataka",
    },
    wasteCategory: "Recyclable waste",
    wasteTypes: ["Plastic bottles", "Single-use containers", "Cardboard"],
    quantity: {
      scale: "medium",
      estimatedVolume: "Approximately 1–1.5 cubic meters",
      confidence: 0.82,
    },
    severity: "Medium",
    recommendedDisposal: [
      "Segregate clean plastics from cardboard",
      "Send to authorized recycling facility",
    ],
    requiredEquipment: ["Gloves", "Garbage bags", "Trash pickers"],
    precautions: ["Keep paper and cardboard dry"],
    reportedAt: new Date(Date.now() - 1.2 * 3600 * 1000).toISOString(),
    deadline: getDynamicDeadline(16),
    status: "open",
    joinedVolunteers: [],
    maxVolunteers: 2,
    confidence: 0.84,
  },
  {
    id: "5",
    reportId: "rep-105",
    imageUrl: "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&w=800&q=80",
    location: {
      latitude: 12.9352,
      longitude: 77.6245,
      area: "Koramangala, 4th Block",
      city: "Bengaluru",
      state: "Karnataka",
    },
    wasteCategory: "E-Waste Hazard",
    wasteTypes: ["Discarded cables", "Lithium battery packs", "Small appliances"],
    quantity: {
      scale: "small",
      estimatedVolume: "Approximately 0.4 cubic meters",
      confidence: 0.91,
    },
    severity: "High",
    recommendedDisposal: [
      "Handle batteries with extreme care",
      "Deposit at authorized e-waste reclamation hub",
    ],
    requiredEquipment: ["Insulated gloves", "Hazard bag", "Safety goggles"],
    precautions: ["Do not crush or puncture batteries", "Keep dry"],
    reportedAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    deadline: getDynamicDeadline(12),
    status: "open",
    joinedVolunteers: [],
    maxVolunteers: 2,
    confidence: 0.92,
  },

  // MG ROAD CLUSTER (2 incidents at same place)
  {
    id: "6",
    reportId: "rep-106",
    imageUrl: "https://images.unsplash.com/photo-1528323273322-d81458248d40?auto=format&fit=crop&w=800&q=80",
    location: {
      latitude: 12.9716,
      longitude: 77.5946,
      area: "MG Road / Brigade Road",
      city: "Bengaluru",
      state: "Karnataka",
    },
    wasteCategory: "Overflowing public bin",
    wasteTypes: ["Food wrappers", "Beverage cups", "Tissues"],
    quantity: {
      scale: "medium",
      estimatedVolume: "Approximately 1.2 cubic meters",
      confidence: 0.87,
    },
    severity: "Medium",
    recommendedDisposal: [
      "Bag loose trash",
      "Notify municipal sanitation for immediate bin clearance",
    ],
    requiredEquipment: ["Sanitary gloves", "Heavy trash bags", "Disinfectant spray"],
    precautions: ["Use face mask due to odor"],
    reportedAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    deadline: getDynamicDeadline(10),
    status: "open",
    joinedVolunteers: [],
    maxVolunteers: 2,
    confidence: 0.89,
  },
  {
    id: "7",
    reportId: "rep-107",
    imageUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80",
    location: {
      latitude: 12.9716,
      longitude: 77.5946,
      area: "MG Road / Brigade Road",
      city: "Bengaluru",
      state: "Karnataka",
    },
    wasteCategory: "Sidewalk Plastic Cleanup",
    wasteTypes: ["Single-use plastic cups", "Polythene bags"],
    quantity: {
      scale: "small",
      estimatedVolume: "Approximately 0.6 cubic meters",
      confidence: 0.93,
    },
    severity: "Low",
    recommendedDisposal: ["Recycled via city depot"],
    requiredEquipment: ["Gloves", "Bags"],
    precautions: ["None"],
    reportedAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    deadline: "Completed",
    status: "completed",
    joinedVolunteers: ["Citizen Crew"],
    maxVolunteers: 2,
    confidence: 0.94,
  },

  // HSR LAYOUT
  {
    id: "8",
    reportId: "rep-108",
    imageUrl: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80",
    location: {
      latitude: 12.9121,
      longitude: 77.6446,
      area: "HSR Layout, Sector 2",
      city: "Bengaluru",
      state: "Karnataka",
    },
    wasteCategory: "Organic / Green waste",
    wasteTypes: ["Fallen tree branches", "Dry leaves", "Garden clippings"],
    quantity: {
      scale: "medium",
      estimatedVolume: "Approximately 2 cubic meters",
      confidence: 0.9,
    },
    severity: "Low",
    recommendedDisposal: ["Route to neighborhood composting facility"],
    requiredEquipment: ["Rakes", "Heavy duty sacks", "Pruning shears"],
    precautions: ["Watch for thorny branches"],
    reportedAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    deadline: getDynamicDeadline(30),
    status: "open",
    joinedVolunteers: [],
    maxVolunteers: 3,
    confidence: 0.91,
  },
];

const STORAGE_KEY = "urbantriage_cleanup_tasks";

/**
 * Client-side helper to load tasks
 */
export function getLocalTasks(): CleanupTask[] {
  if (typeof window === "undefined") return INITIAL_TASKS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_TASKS));
      return INITIAL_TASKS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_TASKS));
      return INITIAL_TASKS;
    }
    // Ensure all seed initial tasks exist in stored list
    const existingIds = new Set(parsed.map((t: CleanupTask) => t.id));
    let hasNew = false;
    const merged = [...parsed];
    for (const initTask of INITIAL_TASKS) {
      if (!existingIds.has(initTask.id)) {
        merged.push(initTask);
        hasNew = true;
      }
    }
    if (hasNew) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
    return parsed;
  } catch {
    return INITIAL_TASKS;
  }
}

/**
 * Client-side helper to save tasks
 */
export function saveLocalTasks(tasks: CleanupTask[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    window.dispatchEvent(new Event("urbantriage_tasks_updated"));
  } catch (e) {
    console.error("Failed to save tasks to local storage:", e);
  }
}

/**
 * Creates a new CleanupTask from a WasteReport
 */
export function createTaskFromReport(report: WasteReport): CleanupTask {
  const newTask: CleanupTask = {
    id: report.id,
    reportId: report.id,
    imageUrl: report.imageUrl,
    location: report.location,
    wasteCategory: report.wasteAnalysis.category,
    wasteTypes: report.wasteAnalysis.types,
    quantity: report.wasteAnalysis.quantity,
    severity: report.wasteAnalysis.severity || "Medium",
    recommendedDisposal: report.wasteAnalysis.recommendedDisposal,
    requiredEquipment: report.wasteAnalysis.recommendedEquipment,
    precautions: report.wasteAnalysis.precautions,
    reportedAt: report.reportedAt,
    deadline: "Within 24 hours",
    status: "open",
    joinedVolunteers: [],
    maxVolunteers:
      report.wasteAnalysis.quantity.scale === "large"
        ? 4
        : report.wasteAnalysis.quantity.scale === "medium"
        ? 2
        : 1,
    confidence: report.wasteAnalysis.confidence,
    threatScore: report.wasteAnalysis.threatScore,
    threatDetected: report.wasteAnalysis.threatDetected,
    isAuthentic: report.wasteAnalysis.isAuthentic,
    environmentalSensitivity: report.wasteAnalysis.environmentalContext?.environmental_sensitivity,
    macroDescription: report.wasteAnalysis.environmentalContext?.macro_description,
    hazmatInfo: report.wasteAnalysis.hazmatInfo,
  };

  const current = getLocalTasks();
  const exists = current.some((t) => t.id === newTask.id);
  const updated = exists
    ? current.map((t) => (t.id === newTask.id ? newTask : t))
    : [newTask, ...current];

  saveLocalTasks(updated);
  return newTask;
}

/**
 * Retrieves a single task by ID
 */
export function getTaskById(id: string): CleanupTask | undefined {
  const tasks = getLocalTasks();
  return tasks.find((t) => t.id === id);
}

/**
 * Updates a task in local storage
 */
export function updateTask(id: string, updates: Partial<CleanupTask>): CleanupTask | null {
  const tasks = getLocalTasks();
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const updatedTask = {
    ...tasks[index],
    ...updates,
  };
  tasks[index] = updatedTask;
  saveLocalTasks(tasks);
  return updatedTask;
}
