"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CleanupTask, LocationData } from "@/lib/types";
import { getLocalTasks, updateTask } from "@/lib/task-store";
import { calculateDistanceMeters, formatDistance } from "@/lib/geo";

export default function VolunteerTasks() {
  const [tasks, setTasks] = useState<CleanupTask[]>([]);
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [isVolunteer, setIsVolunteer] = useState<boolean | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [scaleFilter, setScaleFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");

  useEffect(() => {
    // Check if role is volunteer
    try {
      const role = localStorage.getItem("urbantriage_role");
      setIsVolunteer(role === "volunteer");
    } catch {
      setIsVolunteer(false);
    }

    // Load tasks
    const load = () => {
      setTasks(getLocalTasks());
    };
    load();

    window.addEventListener("urbantriage_tasks_updated", load);

    // Fetch server tasks if available
    fetch("/api/tasks")
      .then((res) => res.json())
      .then((data) => {
        if (data.tasks && data.tasks.length > 0) {
          // Merge with local tasks
          const local = getLocalTasks();
          const merged = [...local];
          data.tasks.forEach((st: CleanupTask) => {
            if (!merged.some((lt) => lt.id === st.id)) {
              merged.push(st);
            }
          });
          setTasks(merged);
        }
      })
      .catch(() => {});

    // Try to get volunteer's location for dynamic distance calculation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            area: "Current Location",
          });
        },
        () => {
          // Fallback to central Bengaluru
          setUserLocation({
            latitude: 12.9716,
            longitude: 77.5946,
            area: "Bengaluru Central",
          });
        }
      );
    }

    return () => {
      window.removeEventListener("urbantriage_tasks_updated", load);
    };
  }, []);

  const handleSignUp = (task: CleanupTask, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (task.status === "completed") return;
    if (task.assignedVolunteer && task.assignedVolunteer !== "You") {
      alert("This task has already been claimed by another volunteer.");
      return;
    }

    const updated = updateTask(task.id, {
      status: "assigned",
      assignedVolunteer: "You",
      joinedVolunteers: Array.from(new Set([...task.joinedVolunteers, "You"])),
    });

    if (updated) {
      setTasks(getLocalTasks());
    }
  };

  const getDistanceDisplay = (task: CleanupTask): string => {
    const vLat = userLocation ? userLocation.latitude : 12.9716;
    const vLng = userLocation ? userLocation.longitude : 77.5946;

    const meters = calculateDistanceMeters(
      vLat,
      vLng,
      task.location.latitude,
      task.location.longitude
    );
    return formatDistance(meters);
  };

  // Segregate active vs completed tasks
  const activeTasks = tasks.filter((t) => t.status !== "completed");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  // Filter logic (strictly active tasks only in this window)
  const filteredTasks = activeTasks.filter((task) => {
    if (statusFilter !== "ALL") {
      if (statusFilter === "open" && task.status !== "open") return false;
      if (statusFilter === "assigned" && task.status !== "assigned" && task.status !== "in_progress") return false;
    }

    if (categoryFilter !== "ALL") {
      const match = task.wasteCategory
        .toLowerCase()
        .includes(categoryFilter.toLowerCase());
      if (!match) return false;
    }

    if (scaleFilter !== "ALL") {
      if (task.quantity.scale.toLowerCase() !== scaleFilter.toLowerCase())
        return false;
    }

    if (priorityFilter !== "ALL") {
      if (task.severity?.toUpperCase() !== priorityFilter.toUpperCase())
        return false;
    }

    return true;
  });

  return (
    <main className="min-h-screen bg-[#06110D] text-[#F4FFF8]">
      {/* NAVBAR */}
      <nav className="mx-auto flex h-[88px] max-w-[1200px] items-center justify-between px-6">
        <Link href="/" className="text-[22px] font-semibold tracking-[-0.04em]">
          Urban<span className="text-[#19D879]">Triage</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/volunteer"
            className="rounded-xl px-4 py-2.5 text-sm text-[#91A99C] transition-colors hover:text-[#F4FFF8]"
          >
            Dashboard
          </Link>

          <Link
            href="/volunteer/tasks"
            className="rounded-xl bg-[#19D879]/15 px-4 py-2.5 text-sm font-semibold text-[#19D879] border border-[#19D879]/30"
          >
            Active Tasks ({activeTasks.length})
          </Link>

          <Link
            href="/volunteer/tasks/completed"
            className="rounded-xl px-4 py-2.5 text-sm text-[#91A99C] transition-colors hover:text-[#F4FFF8]"
          >
            Completed Tasks ({completedTasks.length})
          </Link>

          <Link
            href="/volunteer/verification"
            className="rounded-xl px-4 py-2.5 text-sm text-[#91A99C] transition-colors hover:text-[#F4FFF8]"
          >
            Verification
          </Link>

          <Link
            href="/volunteer/leaderboard"
            className="rounded-xl px-4 py-2.5 text-sm text-[#91A99C] transition-colors hover:text-[#F4FFF8]"
          >
            Leaderboard
          </Link>

          <Link
            href="/report"
            className="rounded-xl px-4 py-2.5 text-sm text-[#91A99C] transition-colors hover:text-[#F4FFF8]"
          >
            Report
          </Link>

          <Link
            href="/map"
            className="rounded-xl px-4 py-2.5 text-sm text-[#91A99C] transition-colors hover:text-[#F4FFF8]"
          >
            City Map
          </Link>

          <Link
            href="/volunteer/notifications"
            className="ml-2 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.10] bg-white/[0.035] text-sm transition-all hover:border-[#19D879]/30"
            aria-label="Notifications"
          >
            🔔
          </Link>
        </div>
      </nav>

      {/* RESTRICTED ACCESS GATE FOR NON-VOLUNTEERS */}
      {isVolunteer === false ? (
        <section className="mx-auto max-w-[700px] px-6 py-24 text-center">
          <div className="rounded-[28px] border border-white/[0.10] bg-[#071A12] p-10 shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFB84D]/10 text-3xl text-[#FFB84D]">
              🔒
            </div>

            <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#FFB84D]">
              RESTRICTED VOLUNTEER DISPATCH
            </p>

            <h1 className="mt-2 text-3xl font-semibold">
              Volunteer Access Required
            </h1>

            <p className="mx-auto mt-4 max-w-[460px] text-sm leading-6 text-[#91A99C]">
              Active cleanup tasks and location coordinates are only accessible to registered volunteers. Citizen users cannot view volunteer tasks.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.setItem("urbantriage_role", "volunteer");
                  } catch {}
                  setIsVolunteer(true);
                }}
                className="rounded-xl bg-[#19D879] px-6 py-3 text-sm font-semibold text-[#06110D] hover:bg-[#4DFF9A]"
              >
                Sign in as Volunteer
              </button>

              <Link
                href="/report"
                className="rounded-xl border border-white/[0.10] bg-white/[0.04] px-6 py-3 text-sm font-semibold text-[#F4FFF8] hover:bg-white/[0.08]"
              >
                ← Back to Report
              </Link>

              <Link
                href="/map"
                className="rounded-xl border border-white/[0.10] px-6 py-3 text-sm text-[#91A99C] hover:text-[#F4FFF8]"
              >
                City Map
              </Link>
            </div>
          </div>
        </section>
      ) : (
      /* CONTENT SECTION FOR VERIFIED VOLUNTEERS */
      <section className="mx-auto max-w-[1200px] px-6 pb-24 pt-12">
        {/* HEADER */}
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-[#19D879]">
              CLEANUP NETWORK
            </p>

            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.045em] md:text-5xl">
              Nearby cleanup tasks
            </h1>

            <p className="mt-4 max-w-[600px] text-sm leading-7 text-[#91A99C] md:text-base">
              Verified cleanup tasks generated from community reports and AI environmental triage.
              Join a task, clean up the site, and verify with an after photo to earn impact points.
            </p>
          </div>

          {/* AREA STATUS */}
          <div className="flex items-center gap-3 rounded-2xl border border-[#19D879]/15 bg-[#0B2118]/60 px-4 py-3">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#19D879]" />
            <div>
              <p className="text-[9px] uppercase tracking-[0.18em] text-[#91A99C]">
                Your area
              </p>
              <p className="mt-0.5 text-sm font-medium text-[#F4FFF8]">
                {userLocation?.area || "Bengaluru"}
              </p>
            </div>
          </div>
        </div>

        {/* DUAL WINDOW SWITCHER */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-[#19D879]/40 bg-[#0B2118] px-4 py-2.5 text-sm font-semibold text-[#19D879] shadow-[0_0_20px_rgba(25,216,121,0.2)]">
              <span className="h-2 w-2 rounded-full bg-[#19D879] animate-pulse" />
              <span>⚡ Active Tasks Window</span>
              <span className="ml-1 rounded-full bg-[#19D879]/20 px-2 py-0.5 text-xs text-[#19D879]">
                {activeTasks.length}
              </span>
            </div>

            <Link
              href="/volunteer/tasks/completed"
              className="group flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-[#91A99C] transition hover:border-[#19D879]/40 hover:bg-[#0B2118]/60 hover:text-[#F4FFF8]"
            >
              <span>✓ Completed Tasks Window</span>
              <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-xs text-[#91A99C] group-hover:text-[#19D879]">
                {completedTasks.length}
              </span>
              <span className="text-xs text-[#19D879] transition group-hover:translate-x-0.5">→</span>
            </Link>
          </div>

          <Link
            href="/volunteer/tasks/completed"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#19D879] hover:underline"
          >
            <span>Open Completed Archive ({completedTasks.length} verified cleanups)</span>
            <span>→</span>
          </Link>
        </div>

        {/* COMPREHENSIVE FILTER BAR */}
        <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-[#91A99C]">Filters:</span>

            {/* STATUS FILTER */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "ALL", label: `All Active (${activeTasks.length})` },
                { id: "open", label: "Open for Volunteers" },
                { id: "assigned", label: "Scheduled / In Progress" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                    statusFilter === f.id
                      ? "bg-[#19D879] text-[#06110D] font-semibold"
                      : "border border-white/[0.08] bg-white/[0.03] text-[#91A99C] hover:text-[#F4FFF8]"
                  }`}
                >
                  {f.label}
                </button>
              ))}

              <Link
                href="/volunteer/tasks/completed"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#19D879]/30 bg-[#19D879]/10 px-3.5 py-1.5 text-xs font-semibold text-[#19D879] transition hover:bg-[#19D879]/20"
              >
                <span>✓ View Completed Window ({completedTasks.length})</span>
                <span>→</span>
              </Link>
            </div>

            <div className="hidden h-5 w-px bg-white/[0.10] sm:block" />

            {/* CATEGORY FILTER */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-white/[0.10] bg-[#071A12] px-3 py-1.5 text-xs text-[#F4FFF8] focus:border-[#19D879] focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="Dry">Dry waste</option>
              <option value="Wet">Wet waste</option>
              <option value="Recyclable">Recyclable waste</option>
              <option value="Hazardous">Hazardous waste</option>
              <option value="E-waste">E-waste</option>
              <option value="Mixed">Mixed waste</option>
            </select>

            {/* SCALE FILTER */}
            <select
              value={scaleFilter}
              onChange={(e) => setScaleFilter(e.target.value)}
              className="rounded-xl border border-white/[0.10] bg-[#071A12] px-3 py-1.5 text-xs text-[#F4FFF8] focus:border-[#19D879] focus:outline-none"
            >
              <option value="ALL">All Scales</option>
              <option value="small">Small (~0.5 m³)</option>
              <option value="medium">Medium (~1–2 m³)</option>
              <option value="large">Large (2+ m³)</option>
            </select>

            {/* PRIORITY FILTER */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-xl border border-white/[0.10] bg-[#071A12] px-3 py-1.5 text-xs text-[#F4FFF8] focus:border-[#19D879] focus:outline-none"
            >
              <option value="ALL">All Priorities</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            {(statusFilter !== "ALL" ||
              categoryFilter !== "ALL" ||
              scaleFilter !== "ALL" ||
              priorityFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("ALL");
                  setCategoryFilter("ALL");
                  setScaleFilter("ALL");
                  setPriorityFilter("ALL");
                }}
                className="text-xs text-[#FF5364] hover:underline"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* TASK CARDS LIST */}
        <div className="mt-8 space-y-4">
          {filteredTasks.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-12 text-center">
              <p className="text-base font-semibold">No active tasks match current filters</p>
              <p className="mt-2 text-xs text-[#91A99C]">
                {completedTasks.length > 0
                  ? `${completedTasks.length} cleanup missions have been completed and moved to the Completed Tasks Window.`
                  : "Try adjusting the filters or report a new waste incident."}
              </p>
              {completedTasks.length > 0 && (
                <div className="mt-5 flex justify-center">
                  <Link
                    href="/volunteer/tasks/completed"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#19D879] px-5 py-2.5 text-xs font-bold text-[#06110D] shadow-[0_0_20px_rgba(25,216,121,0.25)] hover:bg-[#4DFF9A]"
                  >
                    <span>Open Completed Tasks Window ({completedTasks.length})</span>
                    <span>→</span>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            filteredTasks.map((task) => {
              const distanceStr = getDistanceDisplay(task);
              const isClaimedByMe = task.assignedVolunteer === "You";
              const isClaimedByOther =
                Boolean(task.assignedVolunteer) && task.assignedVolunteer !== "You";
              const isCompleted = task.status === "completed";

              return (
                <div
                  key={task.id}
                  className="group rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-6 transition-all duration-300 hover:border-[#19D879]/25 hover:bg-[#0B2118]/50"
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    {/* THUMBNAIL & INFO */}
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                      {/* Image Thumbnail */}
                      <div className="relative h-28 w-36 shrink-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#071A12]">
                        <img
                          src={task.imageUrl}
                          alt={task.wasteCategory}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute bottom-1.5 left-1.5 rounded bg-black/70 px-2 py-0.5 text-[9px] font-semibold text-[#19D879]">
                          #{task.id}
                        </div>
                      </div>

                      {/* Main Task Description */}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#19D879]">
                            {task.wasteCategory}
                          </span>

                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.15em] ${
                              task.severity?.toUpperCase() === "HIGH" ||
                              task.severity?.toUpperCase() === "CRITICAL"
                                ? "bg-[#FF5364]/10 text-[#FF5364]"
                                : "bg-[#FFB84D]/10 text-[#FFB84D]"
                            }`}
                          >
                            {task.severity || "MEDIUM"}
                          </span>

                          {/* Threat Score Badge */}
                          {typeof task.threatScore === "number" && (
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.15em] border ${
                                task.threatDetected || task.threatScore >= 0.7
                                  ? "bg-[#FF5364]/10 border-[#FF5364]/30 text-[#FF5364]"
                                  : "bg-[#19D879]/10 border-[#19D879]/30 text-[#19D879]"
                              }`}
                            >
                              {task.threatDetected ? "THREAT ACTIVE" : "THREAT CLEAR"} ({Math.round(task.threatScore * 100)}%)
                            </span>
                          )}

                          {/* Authentic EXIF GPS Badge */}
                          {task.isAuthentic && (
                            <span className="rounded-full border border-[#19D879]/30 bg-[#19D879]/10 px-2.5 py-0.5 text-[9px] font-semibold text-[#19D879]">
                              ✓ EXIF VERIFIED
                            </span>
                          )}

                          {/* Status Badge */}
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.15em] ${
                              isCompleted
                                ? "bg-[#19D879]/20 text-[#19D879]"
                                : isClaimedByMe
                                ? "bg-[#19D879]/10 text-[#19D879]"
                                : isClaimedByOther
                                ? "bg-white/[0.08] text-[#91A99C]"
                                : "bg-[#19D879]/10 text-[#19D879]"
                            }`}
                          >
                            {isCompleted
                              ? "✓ COMPLETED"
                              : isClaimedByMe
                              ? "ASSIGNED TO YOU"
                              : isClaimedByOther
                              ? "ASSIGNED"
                              : "OPEN FOR VOLUNTEERS"}
                          </span>
                        </div>

                        <h2 className="mt-2 text-xl font-semibold">
                          {task.wasteTypes?.slice(0, 3).join(", ") || "Waste Cleanup"}
                        </h2>

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#91A99C]">
                          <span>📍 {task.location.area}</span>
                          <span className="font-semibold text-[#F4FFF8]">
                            · {distanceStr} away
                          </span>
                          <span>· 📦 {task.quantity.scale} quantity</span>
                        </div>

                        {/* Equipment tags */}
                        {task.requiredEquipment && task.requiredEquipment.length > 0 && (
                          <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] text-[#91A99C]">Required:</span>
                            {task.requiredEquipment.slice(0, 3).map((eq, i) => (
                              <span
                                key={i}
                                className="rounded bg-white/[0.05] px-2 py-0.5 text-[10px] text-[#F4FFF8]"
                              >
                                ✓ {eq}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* METRICS & ACTION BUTTONS */}
                    <div className="flex flex-wrap items-center gap-4 lg:flex-nowrap">
                      {/* Volunteers indicator */}
                      <div className="border-l border-white/[0.08] pl-4 text-xs text-[#91A99C]">
                        <p>Volunteers</p>
                        <p className="mt-1 font-semibold text-[#F4FFF8]">
                          {task.joinedVolunteers?.length || 0} / {task.maxVolunteers || 2}
                        </p>
                      </div>

                      {/* Action buttons */}
                      {!isCompleted ? (
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/volunteer/tasks/${task.id}/verify`}
                            className="rounded-xl bg-[#19D879] px-4 py-2.5 text-xs font-bold text-[#06110D] shadow-[0_0_20px_rgba(25,216,121,0.25)] transition hover:bg-[#4DFF9A]"
                          >
                            Verify Cleanup →
                          </Link>
                          <Link
                            href={`/volunteer/tasks/${task.id}`}
                            className="rounded-xl border border-white/[0.10] bg-white/[0.04] px-3.5 py-2.5 text-xs font-semibold text-[#F4FFF8] hover:bg-white/[0.08]"
                          >
                            Details
                          </Link>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/map?lat=${task.location.latitude}&lng=${task.location.longitude}&zoom=16&status=completed`}
                            className="rounded-xl bg-[#19D879]/15 px-4 py-2.5 text-xs font-semibold text-[#19D879] border border-[#19D879]/30 hover:bg-[#19D879]/25"
                          >
                            View Green Dot →
                          </Link>
                          <Link
                            href={`/volunteer/tasks/${task.id}`}
                            className="rounded-xl border border-white/[0.10] bg-white/[0.04] px-3.5 py-2.5 text-xs font-semibold text-[#91A99C] hover:text-[#F4FFF8]"
                          >
                            Details
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
      )}
    </main>
  );
}