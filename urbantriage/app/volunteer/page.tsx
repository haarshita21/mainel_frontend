"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CleanupTask } from "@/lib/types";
import { getLocalTasks } from "@/lib/task-store";

export default function VolunteerDashboard() {
  const [tasks, setTasks] = useState<CleanupTask[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [impactPoints, setImpactPoints] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem("urbantriage_role", "volunteer");
    } catch {}

    const load = () => {
      const allTasks = getLocalTasks();
      setTasks(allTasks);

      const completed = allTasks.filter(
        (t) =>
          t.status === "completed" &&
          (t.assignedVolunteer === "You" || t.joinedVolunteers?.includes("You"))
      );
      const count = completed.length;
      setCompletedCount(count);
      setImpactPoints(count * 120);
    };

    load();
    window.addEventListener("urbantriage_tasks_updated", load);
    return () => {
      window.removeEventListener("urbantriage_tasks_updated", load);
    };
  }, []);

  const getVolunteerLevel = (points: number) => {
    if (points >= 360) return "Eco Guardian";
    if (points >= 240) return "Triage Ranger";
    if (points >= 120) return "Active Responder";
    return "Explorer";
  };

  const openTasks = tasks.filter((t) => t.status !== "completed").slice(0, 2);

  return (
    <main className="min-h-screen bg-[#06110D] text-[#F4FFF8]">
      {/* NAVBAR */}
      <nav className="mx-auto flex h-[88px] max-w-[1200px] items-center justify-between px-6">
        <Link href="/" className="text-[22px] font-semibold tracking-[-0.04em]">
          Urban<span className="text-[#19D879]">Triage</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/volunteer/tasks"
            className="rounded-xl px-4 py-2.5 text-sm text-[#91A99C] transition-colors hover:text-[#F4FFF8]"
          >
            Active Tasks
          </Link>

          <Link
            href="/volunteer/tasks/completed"
            className="rounded-xl px-4 py-2.5 text-sm text-[#91A99C] transition-colors hover:text-[#F4FFF8]"
          >
            Completed Tasks
          </Link>

          <Link
            href="/volunteer/verification"
            className="rounded-xl px-4 py-2.5 text-sm text-[#91A99C] transition-colors hover:text-[#F4FFF8]"
          >
            Verification
          </Link>

          <Link
            href="/volunteer/leaderboard"
            className="flex items-center gap-1.5 rounded-xl border border-[#19D879]/30 bg-[#19D879]/10 px-4 py-2 text-sm font-semibold text-[#19D879] transition-all hover:bg-[#19D879]/20 hover:shadow-[0_0_20px_rgba(25,216,121,0.2)]"
          >
            <span>🏆</span>
            <span>Leaderboard</span>
          </Link>

          <Link
            href="/report"
            className="rounded-xl border border-white/[0.10] bg-white/[0.035] px-4 py-2.5 text-sm text-[#91A99C] transition-all hover:border-[#19D879]/30 hover:text-[#F4FFF8]"
          >
            Report Incident
          </Link>

          <Link
            href="/map"
            className="rounded-xl border border-white/[0.10] bg-white/[0.035] px-4 py-2.5 text-sm text-[#91A99C] transition-all hover:border-[#19D879]/30 hover:text-[#F4FFF8]"
          >
            City Map
          </Link>

          <Link
            href="/volunteer/notifications"
            className="ml-2 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.10] bg-white/[0.035] text-[#91A99C] transition-all hover:border-[#19D879]/30 hover:text-[#F4FFF8]"
            aria-label="Notifications"
          >
            🔔
          </Link>
        </div>
      </nav>

      {/* DASHBOARD CONTENT */}
      <section className="mx-auto max-w-[1200px] px-6 pb-24 pt-12">
        {/* INTRO */}
        <div className="max-w-[700px]">
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-[#19D879]">
            VOLUNTEER NETWORK & OPERATIONS
          </p>

          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.045em] md:text-5xl">
            Make an impact
            <br />
            <span className="text-[#91A99C]">where it matters.</span>
          </h1>

          <p className="mt-5 max-w-[600px] text-sm leading-7 text-[#91A99C] md:text-base">
            Find nearby cleanup missions created by community reports and AI environmental triage.
            Coordinate cleanups, submit verified proof, and build your civic score.
          </p>
        </div>

        {/* DYNAMIC STATS */}
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-6">
            <p className="text-xs text-[#91A99C]">Impact Points</p>
            <p className="mt-3 text-3xl font-semibold text-[#19D879]">
              {impactPoints}
            </p>
            <p className="mt-1 text-xs text-[#91A99C]">+120 per verified cleanup</p>
          </div>

          <Link
            href="/volunteer/tasks/completed"
            className="group rounded-2xl border border-white/[0.08] bg-white/[0.035] p-6 transition-all hover:border-[#19D879]/40 hover:bg-[#0B2118]/60 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#91A99C] group-hover:text-[#19D879] transition-colors">Tasks Completed</p>
              <span className="text-xs text-[#19D879] transition-transform group-hover:translate-x-0.5">Open Window →</span>
            </div>
            <p className="mt-3 text-3xl font-semibold text-[#19D879]">{completedCount}</p>
            <p className="mt-1 text-xs text-[#91A99C]">View Completed Tasks Window</p>
          </Link>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-6">
            <p className="text-xs text-[#91A99C]">Current Level</p>
            <p className="mt-3 text-3xl font-semibold text-[#19D879]">
              {getVolunteerLevel(impactPoints)}
            </p>
            <p className="mt-1 text-xs text-[#91A99C]">Civic ranking</p>
          </div>
        </div>

        {/* MAIN ACTIONS */}
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <Link
            href="/volunteer/tasks"
            className="group rounded-[28px] border border-[#19D879]/15 bg-[#0B2118]/50 p-8 transition-all duration-300 hover:-translate-y-1 hover:border-[#19D879]/40 hover:bg-[#0D281C]"
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#19D879]">
                DISPATCH QUEUE
              </p>
              <span className="rounded-full bg-[#19D879]/10 px-2.5 py-0.5 text-xs font-semibold text-[#19D879]">
                {tasks.filter((t) => t.status !== "completed").length} active
              </span>
            </div>

            <h2 className="mt-4 text-2xl font-semibold">Active Tasks</h2>

            <p className="mt-3 text-sm leading-6 text-[#91A99C]">
              Discover open and in-progress cleanup missions nearby with real GPS offsets and equipment specs.
            </p>

            <div className="mt-7 text-sm font-medium text-[#19D879]">
              Open Active Window →
            </div>
          </Link>

          <Link
            href="/volunteer/tasks/completed"
            className="group rounded-[28px] border border-white/[0.09] bg-[#071A12]/80 p-8 transition-all duration-300 hover:-translate-y-1 hover:border-[#19D879]/40 hover:bg-[#0B2118]/70"
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#19D879]">
                CLEANUP ARCHIVE
              </p>
              <span className="rounded-full bg-[#19D879]/20 px-2.5 py-0.5 text-xs font-semibold text-[#19D879]">
                {completedCount} verified
              </span>
            </div>

            <h2 className="mt-4 text-2xl font-semibold">Completed Window</h2>

            <p className="mt-3 text-sm leading-6 text-[#91A99C]">
              Explore completed cleanup archives with photographic before/after proofs and AI audit certificates.
            </p>

            <div className="mt-7 text-sm font-medium text-[#19D879]">
              Open Completed Window →
            </div>
          </Link>

          <Link
            href="/volunteer/leaderboard"
            className="group rounded-[28px] border border-white/[0.09] bg-white/[0.025] p-8 transition-all duration-300 hover:-translate-y-1 hover:border-[#19D879]/30 hover:bg-[#0B2118]/70"
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#91A99C]">
              COMMUNITY IMPACT
            </p>

            <h2 className="mt-4 text-2xl font-semibold">Leaderboard</h2>

            <p className="mt-3 text-sm leading-6 text-[#91A99C]">
              Track your contribution, badges, achievements, and ranking within the city volunteer network.
            </p>

            <div className="mt-7 text-sm font-medium text-[#19D879]">
              View leaderboard →
            </div>
          </Link>
        </div>

        {/* ACTIVE TASKS QUICK PREVIEW */}
        {openTasks.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Priority Missions Nearby</h2>
              <Link
                href="/volunteer/tasks"
                className="text-xs text-[#19D879] hover:underline"
              >
                See all ({tasks.length})
              </Link>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {openTasks.map((ot) => (
                <Link
                  key={ot.id}
                  href={`/volunteer/tasks/${ot.id}`}
                  className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 transition hover:border-[#19D879]/30 hover:bg-[#0B2118]/40"
                >
                  <img
                    src={ot.imageUrl}
                    alt={ot.wasteCategory}
                    className="h-16 w-20 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-semibold text-[#19D879]">
                      {ot.wasteCategory}
                    </span>
                    <p className="truncate text-sm font-semibold">{ot.location.area}</p>
                    <p className="mt-0.5 text-xs text-[#91A99C]">
                      {ot.quantity.scale} scale · {ot.joinedVolunteers?.length || 0} joined
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* REPORT INCIDENT LINK */}
        <Link
          href="/report"
          className="mt-8 flex items-center justify-between rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-7 transition-all duration-300 hover:border-[#19D879]/30 hover:bg-white/[0.045]"
        >
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#91A99C]">
              COMMUNITY REPORTING
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Report a Waste Incident
            </h2>

            <p className="mt-2 text-sm text-[#91A99C]">
              Found waste? Upload a photo or use live camera capture with AI material triage.
            </p>
          </div>

          <span className="text-xl text-[#19D879]">→</span>
        </Link>
      </section>
    </main>
  );
}