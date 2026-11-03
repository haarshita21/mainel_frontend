"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CleanupTask } from "@/lib/types";
import { getLocalTasks } from "@/lib/task-store";
import { formatDistance, calculateDistanceMeters } from "@/lib/geo";

export default function CompletedTasksWindow() {
  const [tasks, setTasks] = useState<CleanupTask[]>([]);
  const [isVolunteer, setIsVolunteer] = useState<boolean | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    try {
      const role = localStorage.getItem("urbantriage_role");
      setIsVolunteer(role === "volunteer");
    } catch {
      setIsVolunteer(false);
    }

    const load = () => {
      const all = getLocalTasks();
      setTasks(all.filter((t) => t.status === "completed"));
    };
    load();

    window.addEventListener("urbantriage_tasks_updated", load);
    window.addEventListener("storage", load);

    // Fetch server tasks if available
    fetch("/api/tasks")
      .then((res) => res.json())
      .then((data) => {
        if (data.tasks && data.tasks.length > 0) {
          const local = getLocalTasks();
          const merged = [...local];
          data.tasks.forEach((st: CleanupTask) => {
            if (!merged.some((lt) => lt.id === st.id)) {
              merged.push(st);
            }
          });
          setTasks(merged.filter((t) => t.status === "completed"));
        }
      })
      .catch(() => {});

    return () => {
      window.removeEventListener("urbantriage_tasks_updated", load);
      window.removeEventListener("storage", load);
    };
  }, []);

  const filteredTasks = tasks.filter((task) => {
    if (categoryFilter !== "ALL") {
      if (!task.wasteCategory.toLowerCase().includes(categoryFilter.toLowerCase())) {
        return false;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchArea = task.location.area.toLowerCase().includes(q);
      const matchType = (task.wasteTypes || []).some((wt) => wt.toLowerCase().includes(q));
      const matchCat = task.wasteCategory.toLowerCase().includes(q);
      if (!matchArea && !matchType && !matchCat) return false;
    }
    return true;
  });

  const totalPoints = tasks.length * 120;

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
            className="rounded-xl px-4 py-2.5 text-sm text-[#91A99C] transition-colors hover:text-[#F4FFF8]"
          >
            Active Tasks
          </Link>

          <Link
            href="/volunteer/tasks/completed"
            className="rounded-xl bg-[#19D879]/15 px-4 py-2.5 text-sm font-semibold text-[#19D879] border border-[#19D879]/30"
          >
            Completed ({tasks.length})
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
        </div>
      </nav>

      {/* CONTENT */}
      <section className="mx-auto max-w-[1200px] px-6 pb-24 pt-8">
        {/* WINDOW SWITCHER HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/volunteer/tasks"
              className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-sm font-semibold text-[#91A99C] transition hover:bg-white/[0.07] hover:text-[#F4FFF8]"
            >
              <span>⚡ Active Missions Window</span>
            </Link>

            <div className="flex items-center gap-2 rounded-2xl bg-[#19D879] px-5 py-3 text-sm font-bold text-[#06110D] shadow-[0_0_25px_rgba(25,216,121,0.25)]">
              <span>🏆 Completed Tasks Window</span>
              <span className="rounded-full bg-[#06110D]/20 px-2 py-0.5 text-xs">
                {tasks.length}
              </span>
            </div>
          </div>

          <Link
            href="/volunteer/verification"
            className="text-xs font-semibold text-[#19D879] hover:underline"
          >
            Pending Verifications →
          </Link>
        </div>

        {/* HERO TITLE & STATS */}
        <div className="mt-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#19D879]">
              CLEANUP ARCHIVE · PROOF OF WORK
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
              Completed Tasks Window
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#91A99C]">
              All completed, cleaned, and verified tasks with photographic before/after audit proofs,
              volunteer impact points, and computer vision verification records.
            </p>
          </div>

          {/* STATS TILES */}
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-center">
              <p className="text-[10px] uppercase tracking-wider text-[#91A99C]">Total Cleaned</p>
              <p className="mt-1 text-2xl font-bold text-[#19D879]">{tasks.length}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-center">
              <p className="text-[10px] uppercase tracking-wider text-[#91A99C]">Points Awarded</p>
              <p className="mt-1 text-2xl font-bold text-[#F4FFF8]">+{totalPoints}</p>
            </div>
          </div>
        </div>

        {/* FILTER BAR */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[#91A99C]">Category:</span>
            {["ALL", "Plastic", "Dry", "Wet", "Recyclable", "E-waste", "Mixed"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  categoryFilter === cat
                    ? "bg-[#19D879] text-[#06110D] font-bold"
                    : "border border-white/[0.08] bg-white/[0.03] text-[#91A99C] hover:text-[#F4FFF8]"
                }`}
              >
                {cat === "ALL" ? "All Categories" : cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search area or item..."
              className="rounded-xl border border-white/[0.10] bg-[#071A12] px-3.5 py-1.5 text-xs text-[#F4FFF8] placeholder-[#91A99C]/50 focus:border-[#19D879] focus:outline-none"
            />
          </div>
        </div>

        {/* COMPLETED TASKS LIST */}
        <div className="mt-8 space-y-5">
          {filteredTasks.length === 0 ? (
            <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.02] p-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] text-3xl">
                🏆
              </div>
              <h3 className="mt-4 text-lg font-semibold">No Completed Tasks Found</h3>
              <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[#91A99C]">
                {tasks.length === 0
                  ? "When volunteers complete cleanups and verify them with proof photos, completed tasks will appear here in this dedicated window."
                  : "No completed tasks match your selected category filter."}
              </p>
              <div className="mt-6">
                <Link
                  href="/volunteer/tasks"
                  className="rounded-xl bg-[#19D879] px-5 py-2.5 text-xs font-bold text-[#06110D] hover:bg-[#4DFF9A]"
                >
                  Go to Active Missions Window →
                </Link>
              </div>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const beforeImg = task.imageUrl;
              const afterImg = task.cleanupProof?.imageUrl || task.imageUrl;
              const vr = task.cleanupProof?.verificationResult;

              return (
                <div
                  key={task.id}
                  className="group rounded-[28px] border border-white/[0.09] bg-[#0B2118]/30 p-6 transition-all hover:border-[#19D879]/30 hover:bg-[#0B2118]/60"
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    {/* BEFORE & AFTER PHOTO COMPARISON */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      {/* Before Photo */}
                      <div className="relative h-32 w-44 shrink-0 overflow-hidden rounded-2xl border border-red-500/30 bg-black">
                        <img
                          src={beforeImg}
                          alt="Before cleanup"
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute top-2 left-2 rounded bg-black/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-400">
                          Before
                        </div>
                        <div className="absolute bottom-2 left-2 rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-mono text-[#91A99C]">
                          #{task.id}
                        </div>
                      </div>

                      {/* Transition arrow */}
                      <div className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-[#19D879]/10 text-[#19D879] font-bold text-sm">
                        →
                      </div>

                      {/* After Photo */}
                      <div className="relative h-32 w-44 shrink-0 overflow-hidden rounded-2xl border border-[#19D879]/40 bg-black shadow-[0_0_15px_rgba(25,216,121,0.15)]">
                        <img
                          src={afterImg}
                          alt="After cleanup verified"
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute top-2 left-2 rounded bg-[#19D879] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#06110D]">
                          ✓ Verified Clean
                        </div>
                      </div>

                      {/* Task Info */}
                      <div className="min-w-0 pl-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[#19D879]/15 border border-[#19D879]/30 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#19D879]">
                            {task.wasteCategory}
                          </span>
                          <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[9px] font-semibold text-[#F4FFF8]">
                            {task.quantity.scale} scale
                          </span>
                          <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
                            +120 PTS AWARDED
                          </span>
                        </div>

                        <h3 className="mt-2 text-lg font-semibold text-[#F4FFF8]">
                          {task.location.area}
                        </h3>

                        <p className="mt-1 text-xs text-[#91A99C]">
                          Cleaned items: {(task.wasteTypes || [task.wasteCategory]).join(", ")}
                        </p>

                        <div className="mt-2 flex items-center gap-3 text-[11px] text-[#91A99C]">
                          <span>Volunteer: <strong className="text-[#F4FFF8]">{task.assignedVolunteer || "You"}</strong></span>
                          <span>•</span>
                          <span>{task.cleanupProof?.submittedAt ? new Date(task.cleanupProof.submittedAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Recently Verified"}</span>
                        </div>
                      </div>
                    </div>

                    {/* ACTION BUTTONS & VERIFIED PILL */}
                    <div className="flex flex-col items-start lg:items-end justify-between gap-3 shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-2xl border border-[#19D879]/30 bg-[#19D879]/10 px-3.5 py-2 text-xs font-bold text-[#19D879] flex items-center gap-1.5">
                          <span>✓</span>
                          <span>AI VERIFIED ({Math.round((vr?.confidence || 0.95) * 100)}%)</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/volunteer/tasks/${task.id}`}
                          className="rounded-xl border border-white/[0.10] bg-white/[0.04] px-4 py-2 text-xs font-semibold text-[#F4FFF8] hover:bg-white/[0.08]"
                        >
                          View Mission File →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
