"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CleanupTask } from "@/lib/types";
import { getLocalTasks } from "@/lib/task-store";

export default function CleanupVerificationTab() {
  const [tasks, setTasks] = useState<CleanupTask[]>([]);
  const [isVolunteer, setIsVolunteer] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const role = localStorage.getItem("urbantriage_role");
      setIsVolunteer(role === "volunteer");
    } catch {
      setIsVolunteer(false);
    }

    const load = () => {
      setTasks(getLocalTasks());
    };

    load();
    window.addEventListener("urbantriage_tasks_updated", load);
    window.addEventListener("storage", load);

    return () => {
      window.removeEventListener("urbantriage_tasks_updated", load);
      window.removeEventListener("storage", load);
    };
  }, []);

  const pendingVerification = tasks.filter((t) => t.status !== "completed");
  const verifiedTasks = tasks.filter((t) => t.status === "completed");

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
            className="rounded-xl px-4 py-2.5 text-sm text-[#91A99C] transition-colors hover:text-[#F4FFF8]"
          >
            Completed Tasks
          </Link>

          <Link
            href="/volunteer/verification"
            className="rounded-xl bg-[#19D879]/15 px-4 py-2.5 text-sm font-semibold text-[#19D879] border border-[#19D879]/30"
          >
            Verification {pendingVerification.length > 0 && `(${pendingVerification.length})`}
          </Link>

          <Link
            href="/volunteer/leaderboard"
            className="rounded-xl px-4 py-2.5 text-sm text-[#91A99C] transition-colors hover:text-[#F4FFF8]"
          >
            Leaderboard
          </Link>

          <Link
            href="/map"
            className="rounded-xl px-4 py-2.5 text-sm text-[#91A99C] transition-colors hover:text-[#F4FFF8]"
          >
            City Map
          </Link>

          <Link
            href="/volunteer/notifications"
            className="ml-2 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.10] bg-white/[0.035] text-sm text-[#91A99C] transition hover:text-[#F4FFF8]"
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
              VOLUNTEER AUDIT SUITE
            </p>

            <h1 className="mt-2 text-3xl font-semibold">Volunteer Access Required</h1>

            <p className="mx-auto mt-4 max-w-[460px] text-sm leading-6 text-[#91A99C]">
              Cleanup verification audits are conducted by registered community volunteers.
            </p>

            <div className="mt-8 flex justify-center gap-3">
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
                className="rounded-xl border border-white/[0.10] px-6 py-3 text-sm text-[#91A99C] hover:text-[#F4FFF8]"
              >
                Report Incident
              </Link>
            </div>
          </div>
        </section>
      ) : (
        /* CONTENT SECTION */
        <section className="mx-auto max-w-[1200px] px-6 pb-24 pt-10">
          {/* HEADER */}
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-[#19D879]">
              AI VERIFICATION & AUDIT SUITE
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em] md:text-5xl">
              Cleanup verification
            </h1>

            <p className="mt-3 max-w-[650px] text-sm leading-7 text-[#91A99C]">
              Submit and verify post-cleanup photographs with comparative AI vision.
              Once verified, the scheduled cleanup (🔴 Red Dot) transitions into a verified remediated site (🟢 Green Dot) and awards 120 points.
            </p>
          </div>

          {/* SUMMARY METRICS */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#91A99C]">
                SCHEDULED (RED DOTS)
              </p>
              <p className="mt-2 text-3xl font-semibold text-[#FF5364]">
                {pendingVerification.length}
              </p>
              <p className="mt-1 text-xs text-[#91A99C]">Awaiting cleanup proof</p>
            </div>

            <div className="rounded-2xl border border-[#19D879]/20 bg-[#0B2118]/40 p-5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#19D879]">
                DONE & VERIFIED (GREEN DOTS)
              </p>
              <p className="mt-2 text-3xl font-semibold text-[#19D879]">
                {verifiedTasks.length}
              </p>
              <p className="mt-1 text-xs text-[#91A99C]">Successfully cleaned</p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#91A99C]">
                AVAILABLE REWARD
              </p>
              <p className="mt-2 text-3xl font-semibold text-[#19D879]">
                +{pendingVerification.length * 120} pts
              </p>
              <p className="mt-1 text-xs text-[#91A99C]">120 impact pts per verified site</p>
            </div>
          </div>

          {/* SECTION 1: MISSIONS AWAITING VERIFICATION */}
          <div className="mt-12">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Scheduled Cleanups Awaiting Verification</h2>
                <p className="mt-0.5 text-xs text-[#91A99C]">
                  Take an after-photo to run AI Before vs. After validation
                </p>
              </div>

              <span className="rounded-full bg-[#FF3B30]/15 px-3 py-1 text-xs font-semibold text-[#FF5364] border border-[#FF3B30]/30">
                🔴 {pendingVerification.length} Active Hotspots
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {pendingVerification.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-12 text-center">
                  <p className="text-base font-semibold">All cleanups have been verified!</p>
                  <p className="mt-2 text-xs text-[#91A99C]">
                    Check the City Map to see the green dots, or report a new incident.
                  </p>
                </div>
              ) : (
                pendingVerification.map((task) => (
                  <div
                    key={task.id}
                    className="flex flex-col gap-5 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 transition hover:border-[#19D879]/30 hover:bg-[#0B2118]/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      {/* Image Thumbnail */}
                      <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-black">
                        <img
                          src={task.imageUrl}
                          alt={task.wasteCategory}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute bottom-1 left-1 rounded bg-black/80 px-1.5 py-0.5 text-[8px] font-bold text-[#FF5364]">
                          🔴 #{task.id}
                        </div>
                      </div>

                      {/* Details */}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-[#19D879]">
                            {task.wasteCategory}
                          </span>
                          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[9px] uppercase text-[#91A99C]">
                            {task.quantity.scale} scale
                          </span>
                        </div>

                        <div className="mt-1 flex flex-wrap gap-1">
                          {task.wasteTypes?.slice(0, 3).map((t, idx) => (
                            <span
                              key={idx}
                              className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-[#F4FFF8]"
                            >
                              • {t}
                            </span>
                          ))}
                        </div>

                        <p className="mt-1.5 text-xs text-[#91A99C]">
                          📍 {task.location.area} · Reported {task.reportedAt ? new Date(task.reportedAt).toLocaleDateString() : "Recently"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/map?lat=${task.location.latitude}&lng=${task.location.longitude}&zoom=16`}
                        className="rounded-xl border border-white/[0.10] bg-white/[0.03] px-4 py-2.5 text-xs font-semibold text-[#91A99C] hover:text-[#F4FFF8]"
                      >
                        View Red Dot
                      </Link>

                      <Link
                        href={`/volunteer/tasks/${task.id}/verify`}
                        className="rounded-xl bg-[#19D879] px-5 py-2.5 text-xs font-semibold text-[#06110D] shadow-[0_0_20px_rgba(25,216,121,0.25)] hover:bg-[#4DFF9A]"
                      >
                        Verify Cleanup Proof →
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SECTION 2: RECENTLY VERIFIED CLEANUPS (DONE / GREEN DOTS) */}
          {verifiedTasks.length > 0 && (
            <div className="mt-16">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Verified Cleanups (Done)</h2>
                  <p className="mt-0.5 text-xs text-[#91A99C]">
                    Remediated sites marked as Green Dots on the map
                  </p>
                </div>

                <span className="rounded-full bg-[#19D879]/15 px-3 py-1 text-xs font-semibold text-[#19D879] border border-[#19D879]/30">
                  🟢 {verifiedTasks.length} Cleaned Sites
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {verifiedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex flex-col gap-4 rounded-2xl border border-[#19D879]/20 bg-[#0B2118]/30 p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#19D879]/10 text-xl font-bold text-[#19D879]">
                        ✓
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#19D879]">
                            {task.wasteCategory}
                          </span>
                          <span className="rounded-full bg-[#19D879]/20 px-2 py-0.5 text-[9px] font-bold text-[#19D879]">
                            +120 PTS
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-[#91A99C]">📍 {task.location.area}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/map?lat=${task.location.latitude}&lng=${task.location.longitude}&zoom=16&status=completed`}
                        className="rounded-xl bg-[#19D879]/15 px-4 py-2 text-xs font-semibold text-[#19D879] border border-[#19D879]/30 hover:bg-[#19D879]/25"
                      >
                        View Green Dot on Map →
                      </Link>

                      <Link
                        href={`/volunteer/tasks/${task.id}`}
                        className="rounded-xl border border-white/[0.08] px-3.5 py-2 text-xs text-[#91A99C] hover:text-[#F4FFF8]"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
