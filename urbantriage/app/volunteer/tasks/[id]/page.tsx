"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { CleanupTask } from "@/lib/types";
import { getTaskById, updateTask } from "@/lib/task-store";

export default function TaskDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [task, setTask] = useState<CleanupTask | null>(null);
  const [joined, setJoined] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    // Load task by ID
    const found = getTaskById(id);
    if (found) {
      setTask(found);
      const isUserJoined =
        found.assignedVolunteer === "You" ||
        found.joinedVolunteers?.includes("You");
      setJoined(Boolean(isUserJoined));
      setIsCompleted(found.status === "completed");
    } else {
      // Fetch from API
      fetch(`/api/tasks/${id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.task) {
            setTask(data.task);
            const isUserJoined =
              data.task.assignedVolunteer === "You" ||
              data.task.joinedVolunteers?.includes("You");
            setJoined(Boolean(isUserJoined));
            setIsCompleted(data.task.status === "completed");
          }
        })
        .catch(() => {});
    }

    // Check localStorage completion state for backward compatibility
    try {
      const saved = localStorage.getItem(`urbantriage-task-${id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.status === "completed") {
          setIsCompleted(true);
          setJoined(true);
        }
      }
    } catch {}
  }, [id]);

  const handleJoin = () => {
    if (!task || isCompleted) return;

    try {
      localStorage.setItem("urbantriage_role", "volunteer");
    } catch {}

    const updated = updateTask(id, {
      status: "assigned",
      assignedVolunteer: "You",
      joinedVolunteers: Array.from(new Set([...task.joinedVolunteers, "You"])),
    });

    if (updated) {
      setTask(updated);
      setJoined(true);
    }
  };

  const volunteerCount = task
    ? isCompleted
      ? task.maxVolunteers
      : joined
      ? Math.max(1, (task.joinedVolunteers?.length || 0) + (task.joinedVolunteers?.includes("You") ? 0 : 1))
      : task.joinedVolunteers?.length || 0
    : 1;

  const maxVolunteers = task?.maxVolunteers || 2;
  const progressRatio = Math.min(1, volunteerCount / maxVolunteers);

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
            href="/map"
            className="rounded-xl px-4 py-2.5 text-sm text-[#91A99C] transition-colors hover:text-[#F4FFF8]"
          >
            City Map
          </Link>
        </div>
      </nav>

      {/* CONTENT */}
      <section className="mx-auto max-w-[1000px] px-6 pb-24 pt-8">
        {/* TOP STATUS & HEADER */}
        <div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-[#19D879]">
              {isCompleted ? "COMPLETED CLEANUP TASK" : "VERIFIED CLEANUP TASK"}
            </span>
            <span className="rounded-full bg-white/[0.08] px-2.5 py-0.5 text-[9px] font-mono text-[#91A99C]">
              #{id}
            </span>
          </div>

          <div className="mt-4 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-semibold tracking-[-0.045em] md:text-5xl">
                {task?.wasteCategory || "Waste"} Cleanup
              </h1>
              <p className="mt-3 text-sm text-[#91A99C]">
                Reported{" "}
                {task?.reportedAt
                  ? `${new Date(task.reportedAt).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })} at ${new Date(task.reportedAt).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}`
                  : "Recently"}{" "}
                · AI Verified
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isCompleted ? (
                <span className="rounded-full bg-[#19D879]/20 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-[#19D879]">
                  ✓ COMPLETED
                </span>
              ) : (
                <span
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] ${
                    task?.severity?.toUpperCase() === "HIGH" ||
                    task?.severity?.toUpperCase() === "CRITICAL"
                      ? "bg-[#FF5364]/10 text-[#FF5364]"
                      : "bg-[#FFB84D]/10 text-[#FFB84D]"
                  }`}
                >
                  {task?.severity || "MEDIUM"} PRIORITY
                </span>
              )}

              {task?.hazmatInfo?.isHazmat && (
                <span className="rounded-full border border-red-500/50 bg-red-500/20 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-red-300 animate-pulse flex items-center gap-1.5">
                  ☣️ HAZMAT {task.hazmatInfo.priority || "CRITICAL"}
                </span>
              )}

              <span className="rounded-full border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#91A99C]">
                {task?.status ? task.status.replace("_", " ").toUpperCase() : "OPEN"}
              </span>
            </div>
          </div>
        </div>

        {/* HAZMAT DISPATCH PROTOCOL BANNER */}
        {(task?.hazmatInfo?.isHazmat || task?.wasteCategory === "Hazardous waste" || task?.severity === "Critical") && (
          <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-950/30 p-5 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/20 text-xl border border-red-500/40 text-red-400">
                  ☣️
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-red-400">
                      HAZMAT SAFETY PROTOCOL ENFORCED
                    </span>
                    <span className="rounded bg-red-500/30 px-2 py-0.5 text-[10px] font-black text-red-200">
                      {task?.hazmatInfo?.priority || "CRITICAL"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {task?.hazmatInfo?.hazmatType ? `Classification: ${task.hazmatInfo.hazmatType}` : "Hazardous Waste Classification"}
                  </p>
                  <p className="mt-1 text-xs text-red-200/80 max-w-2xl">
                    {task?.hazmatInfo?.hazmatAdvisory ||
                      "Toxic / biohazardous contaminants detected. Standard volunteer handling prohibited without mandatory protective equipment."}
                  </p>
                </div>
              </div>

              {task?.hazmatInfo?.requiredPPE && task.hazmatInfo.requiredPPE.length > 0 && (
                <div className="rounded-xl border border-red-500/30 bg-black/40 p-3 shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-red-300">
                    Mandatory PPE Checklist
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {task.hazmatInfo.requiredPPE.map((ppe, i) => (
                      <span
                        key={i}
                        className="rounded-md border border-red-500/40 bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-100"
                      >
                        ✓ {ppe}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* JOINED STATUS BANNER */}
        {joined && (
          <div
            className={`mt-8 rounded-2xl p-5 ${
              isCompleted
                ? "border border-[#19D879]/30 bg-[#19D879]/10"
                : "border border-[#19D879]/20 bg-[#19D879]/[0.08]"
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#19D879] text-base font-bold text-[#06110D]">
                ✓
              </span>
              <div>
                <p className="text-sm font-semibold text-[#F4FFF8]">
                  {isCompleted ? "Cleanup completed & verified!" : "You are assigned to this cleanup."}
                </p>
                <p className="mt-0.5 text-xs text-[#91A99C]">
                  {isCompleted
                    ? "Before & after photos verified by UrbanTriage AI. 120 points awarded."
                    : "Head to the site, complete the cleanup, and submit an after-photo for AI verification."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* IMAGE PREVIEW & LOCATION */}
        <div className="mt-8 grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          {/* IMAGE */}
          <div className="relative aspect-video overflow-hidden rounded-[28px] border border-white/[0.08] bg-black md:aspect-auto md:min-h-[350px]">
            {task?.imageUrl ? (
              <img
                src={task.imageUrl}
                alt="Reported site"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-4xl">♻</div>
            )}
            <div className="absolute left-4 top-4 rounded-full bg-black/75 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#19D879] backdrop-blur-md">
              ORIGINAL REPORT
            </div>
          </div>

          {/* LOCATION DETAILS & MAP LINK */}
          <div className="flex flex-col justify-between rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-7">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#91A99C]">
                📍 INCIDENT LOCATION
              </p>
              <h2 className="mt-3 text-2xl font-semibold">
                {task?.location?.area || "Indiranagar, Bengaluru"}
              </h2>
              <p className="mt-2 font-mono text-xs text-[#19D879]">
                Coordinates: {task?.location?.latitude?.toFixed(4) || "12.9784"},{" "}
                {task?.location?.longitude?.toFixed(4) || "77.6408"}
              </p>
              <p className="mt-4 text-xs leading-6 text-[#91A99C]">
                Precise GPS coordinates recorded at the time of report.
                Volunteers must verify cleanup within 100 meters of this origin point.
              </p>
            </div>

            <Link
              href={`/map?lat=${task?.location?.latitude || 12.9784}&lng=${
                task?.location?.longitude || 77.6408
              }&zoom=16&taskId=${id}`}
              className="mt-6 inline-flex items-center justify-center rounded-xl border border-[#19D879]/30 bg-[#19D879]/10 px-5 py-3 text-sm font-semibold text-[#19D879] transition hover:bg-[#19D879]/20"
            >
              Open in City Map →
            </Link>
          </div>
        </div>

        {/* METRIC CARDS */}
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-6">
            <p className="text-xs text-[#91A99C]">Waste Category</p>
            <p className="mt-2 text-lg font-semibold text-[#19D879]">
              {task?.wasteCategory || "Mixed Waste"}
            </p>
            <p className="mt-1 text-xs text-[#91A99C]">
              {task?.wasteTypes?.join(", ") || "General refuse"}
            </p>
          </div>

          <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-6">
            <p className="text-xs text-[#91A99C]">Threat Assessment</p>
            <p className="mt-2 text-lg font-semibold">
              {typeof task?.threatScore === "number"
                ? `${Math.round(task.threatScore * 100)}% (${task.threatDetected ? "Threat Active" : "Threat Clear"})`
                : `${task?.severity || "Medium"} Severity`}
            </p>
            <p className="mt-1 text-xs text-[#91A99C]">
              {task?.isAuthentic ? "✓ Authentic EXIF GPS" : "Situational score"}
            </p>
          </div>

          <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-6">
            <p className="text-xs text-[#91A99C]">Estimated Scale</p>
            <p className="mt-2 text-lg font-semibold uppercase">
              {task?.quantity?.scale || "Medium"}
            </p>
            <p className="mt-1 text-xs text-[#91A99C]">
              {task?.quantity?.estimatedVolume || "~1–2 m³"}
            </p>
          </div>

          <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-6">
            <p className="text-xs text-[#91A99C]">Deadline</p>
            <p className="mt-2 text-lg font-semibold">{task?.deadline || "Within 24 hours"}</p>
            <p className="mt-1 text-xs text-[#91A99C]">Target turnaround</p>
          </div>
        </div>

        {/* VOLUNTEERS & REQUIRED EQUIPMENT */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {/* VOLUNTEERS PROGRESS */}
          <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-7">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#91A99C]">
              VOLUNTEER CREW
            </p>
            <p className="mt-3 text-3xl font-semibold">
              {volunteerCount} / {maxVolunteers}
            </p>
            <p className="mt-1 text-sm text-[#91A99C]">
              {isCompleted
                ? "Task completed successfully by participating volunteers."
                : joined
                ? "You are assigned to this task."
                : "Volunteer needed to claim and mobilize."}
            </p>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full rounded-full bg-[#19D879] transition-all duration-500"
                style={{ width: `${Math.round(progressRatio * 100)}%` }}
              />
            </div>
          </div>

          {/* REQUIRED EQUIPMENT */}
          <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-7">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#91A99C]">
              REQUIRED EQUIPMENT
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(task?.requiredEquipment || ["Gloves", "Garbage bags", "Trash pickers"]).map(
                (eq, i) => (
                  <span
                    key={i}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-[#F4FFF8]"
                  >
                    ✓ {eq}
                  </span>
                )
              )}
            </div>
          </div>
        </div>

        {/* SECTION 9: DISPOSAL GUIDANCE & INCIDENT ANALYSIS */}
        <div className="mt-6 rounded-[28px] border border-[#19D879]/15 bg-[#0B2118]/40 p-8">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#19D879]">
            DISPOSAL METHOD & SAFETY PROTOCOL
          </p>
          <h2 className="mt-2 text-xl font-semibold">Recommended Disposal Channels</h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-5">
              <p className="text-xs font-semibold text-[#19D879]">Disposal Guidance</p>
              <ul className="mt-2 space-y-1.5 text-xs text-[#F4FFF8]">
                {(task?.recommendedDisposal || [
                  "Separate recyclable plastics and cardboard",
                  "Direct remaining refuse to authorized sorting station",
                ]).map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-[#19D879]">→</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-5">
              <p className="text-xs font-semibold text-[#FFB84D]">Safety Precautions</p>
              <ul className="mt-2 space-y-1.5 text-xs text-[#91A99C]">
                {(task?.precautions || [
                  "Wear puncture-resistant gloves at all times",
                  "Check for sharp objects or broken glass",
                ]).map((pr, idx) => (
                  <li key={idx}>• {pr}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="mt-8 flex flex-col items-center justify-between gap-5 rounded-[28px] border border-[#19D879]/20 bg-[#0B2118]/60 p-7 sm:flex-row">
          <div>
            <p className="text-lg font-semibold">
              {isCompleted
                ? "This cleanup is verified."
                : joined
                ? "Ready to verify your cleanup?"
                : "Want to join this cleanup?"}
            </p>
            <p className="mt-1 text-sm text-[#91A99C]">
              {isCompleted
                ? "All participants were credited with +120 impact points."
                : joined
                ? "Submit an after-cleanup photo to trigger automated AI verification."
                : "Claim this task to help turn a reported dump into verified impact."}
            </p>
          </div>

          <div>
            {isCompleted ? (
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/map?lat=${task?.location?.latitude || 12.9784}&lng=${task?.location?.longitude || 77.6408}&zoom=16&status=completed&taskId=${id}`}
                  className="rounded-xl bg-[#19D879] px-6 py-3.5 text-sm font-semibold text-[#06110D] shadow-[0_0_20px_rgba(25,216,121,0.25)] hover:bg-[#4DFF9A]"
                >
                  View Green Dot on Map →
                </Link>
                <Link
                  href="/volunteer/tasks/completed"
                  className="rounded-xl border border-white/[0.12] bg-white/[0.04] px-5 py-3.5 text-sm font-semibold text-[#F4FFF8] hover:bg-white/[0.08]"
                >
                  Completed Tasks Window →
                </Link>
                <div className="rounded-xl border border-[#19D879]/30 bg-[#19D879]/10 px-5 py-3.5 text-sm font-semibold text-[#19D879]">
                  ✓ Completed (+120 pts)
                </div>
              </div>
            ) : joined ? (
              <Link
                href={`/volunteer/tasks/${id}/verify`}
                className="inline-block rounded-xl bg-[#19D879] px-7 py-3.5 text-sm font-semibold text-[#06110D] transition hover:bg-[#4DFF9A] hover:shadow-[0_0_35px_rgba(25,216,121,0.25)]"
              >
                Verify Cleanup →
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleJoin}
                className="rounded-xl bg-[#19D879] px-7 py-3.5 text-sm font-semibold text-[#06110D] transition hover:bg-[#4DFF9A] hover:shadow-[0_0_35px_rgba(25,216,121,0.25)]"
              >
                Join Cleanup
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}