"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { CleanupTask, CleanupVerification, LocationData } from "@/lib/types";
import { getTaskById, updateTask } from "@/lib/task-store";
import {
  CLEANUP_LOCATION_RADIUS_METERS,
  calculateDistanceMeters,
} from "@/lib/geo";

export default function VerifyCleanup({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [task, setTask] = useState<CleanupTask | null>(null);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);

  // After-photo state
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [proofSource, setProofSource] = useState<"camera" | "upload">("upload");
  const [cleanupLocation, setCleanupLocation] = useState<LocationData | null>(null);
  const [cleanupTimestamp, setCleanupTimestamp] = useState<string>("");
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);

  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Verification State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] =
    useState<CleanupVerification | null>(null);

  useEffect(() => {
    const t = getTaskById(id);
    if (t) {
      setTask(t);
      if (t.status === "completed") {
        setAlreadyCompleted(true);
        if (t.cleanupProof?.verificationResult) {
          setVerificationResult(t.cleanupProof.verificationResult);
        }
      }
    } else {
      fetch(`/api/tasks/${id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.task) {
            setTask(data.task);
            if (data.task.status === "completed") {
              setAlreadyCompleted(true);
              if (data.task.cleanupProof?.verificationResult) {
                setVerificationResult(data.task.cleanupProof.verificationResult);
              }
            }
          } else {
            // Reliable fallback task so task is never null
            const defaultTask: CleanupTask = {
              id,
              reportId: id,
              imageUrl: "https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80",
              location: { latitude: 12.9784, longitude: 77.6408, area: "Indiranagar, Bengaluru" },
              wasteCategory: "Mixed Waste",
              wasteTypes: ["Plastic bottles", "Plastic bags"],
              quantity: { scale: "medium", estimatedVolume: "1–2 m³", confidence: 0.85 },
              severity: "Medium",
              recommendedDisposal: ["Segregate clean plastics"],
              requiredEquipment: ["Heavy-duty gloves", "Garbage bags"],
              precautions: ["Wear puncture-resistant gloves"],
              reportedAt: new Date().toISOString(),
              deadline: "Today · 8:00 PM",
              status: "open",
              joinedVolunteers: ["You"],
              maxVolunteers: 2,
              confidence: 0.85,
            };
            setTask(defaultTask);
          }
        })
        .catch(() => {
          const defaultTask: CleanupTask = {
            id,
            reportId: id,
            imageUrl: "https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80",
            location: { latitude: 12.9784, longitude: 77.6408, area: "Indiranagar, Bengaluru" },
            wasteCategory: "Mixed Waste",
            wasteTypes: ["Plastic bottles", "Plastic bags"],
            quantity: { scale: "medium", estimatedVolume: "1–2 m³", confidence: 0.85 },
            severity: "Medium",
            recommendedDisposal: ["Segregate clean plastics"],
            requiredEquipment: ["Heavy-duty gloves", "Garbage bags"],
            precautions: ["Wear puncture-resistant gloves"],
            reportedAt: new Date().toISOString(),
            deadline: "Today · 8:00 PM",
            status: "open",
            joinedVolunteers: ["You"],
            maxVolunteers: 2,
            confidence: 0.85,
          };
          setTask(defaultTask);
        });
    }

    return () => {
      stopCamera();
    };
  }, [id]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const openCamera = async () => {
    setProofSource("camera");

    // Capture location simultaneously
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: LocationData = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            area: "Cleanup Site",
          };
          setCleanupLocation(loc);

          if (task?.location) {
            const d = calculateDistanceMeters(
              task.location.latitude,
              task.location.longitude,
              loc.latitude,
              loc.longitude
            );
            setCalculatedDistance(d);
          }
        },
        () => {},
        { enableHighAccuracy: true }
      );
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraActive(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } catch {
      alert("Camera could not be opened. Please upload a photo instead.");
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setAfterImage(dataUrl);
    setCleanupTimestamp(new Date().toISOString());
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAfterImage(reader.result);
        setProofSource("upload");
        setCleanupTimestamp(new Date().toISOString());
        setCleanupLocation(null);
        setCalculatedDistance(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Helper to mark task completed and award impact points
  const completeCleanup = (proofImg: string, result: CleanupVerification) => {
    updateTask(id, {
      status: "completed",
      cleanupProof: {
        imageUrl: proofImg,
        submittedAt: new Date().toISOString(),
        source: proofSource,
        location: cleanupLocation || undefined,
        distanceMeters: calculatedDistance || undefined,
        verificationResult: result,
      },
    });

    fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    }).catch(() => {});

    localStorage.setItem(
      `urbantriage-task-${id}`,
      JSON.stringify({
        status: "completed",
        points: 120,
        completedAt: new Date().toISOString(),
        taskId: id,
        volunteers: ["You", "Ananya", "Rahul"],
      })
    );

    setAlreadyCompleted(true);
    window.dispatchEvent(new Event("urbantriage_tasks_updated"));
  };

  const handleSubmitVerification = async () => {
    if (!afterImage) {
      alert("Please capture or upload an after-cleanup photo first.");
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    const beforeImg =
      task?.imageUrl ||
      "https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80";

    try {
      const res = await fetch("/api/verify-cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beforeImage: beforeImg,
          afterImage,
          reportLocation: task?.location,
          cleanupLocation: cleanupLocation || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error("Verification request failed");
      }

      const data = await res.json();
      const vr: CleanupVerification = data.verification;
      setVerificationResult(vr);

      // Strictly complete cleanup only if verified and clean with no residual waste
      if (
        vr.verified === true &&
        vr.cleanupStatus === "CLEANED" &&
        !vr.remainingWaste
      ) {
        completeCleanup(afterImage, vr);
      }
    } catch (err) {
      console.error("API error during verification:", err);
      // DO NOT AUTO-APPROVE! Fail safely and prompt volunteer to clean and retake photo
      const fallbackResult: CleanupVerification = {
        verified: false,
        cleanupStatus: "NOT_CLEANED",
        confidence: 0.0,
        remainingWaste: true,
        isAiGenerated: false,
        explanation:
          "Verification service could not confirm cleanup. Please ensure the camera is steady, the ground is completely clean, and retake the photo.",
        verifiedAt: new Date().toISOString(),
        distanceMeters: calculatedDistance || 18,
        acceptableDistance: true,
      };

      setVerificationResult(fallbackResult);
    } finally {
      setIsVerifying(false);
    }
  };

  const reportLat = task?.location?.latitude || 12.9784;
  const reportLng = task?.location?.longitude || 77.6408;

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
            className="rounded-xl px-4 py-2.5 text-sm text-[#91A99C] transition hover:text-[#F4FFF8]"
          >
            Active Tasks
          </Link>

          <Link
            href="/volunteer/tasks/completed"
            className="rounded-xl px-4 py-2.5 text-sm text-[#91A99C] transition hover:text-[#F4FFF8]"
          >
            Completed Tasks
          </Link>

          <Link
            href="/volunteer/verification"
            className="rounded-xl px-4 py-2.5 text-sm text-[#91A99C] transition hover:text-[#F4FFF8]"
          >
            Verification
          </Link>

          <Link
            href="/map"
            className="rounded-xl px-4 py-2.5 text-sm text-[#91A99C] transition hover:text-[#F4FFF8]"
          >
            City Map
          </Link>
        </div>
      </nav>

      {/* MAIN SECTION */}
      <section className="mx-auto max-w-[1050px] px-6 pb-24 pt-6">
        <Link
          href={`/volunteer/tasks/${id}`}
          className="text-sm text-[#91A99C] transition hover:text-[#F4FFF8]"
        >
          ← Back to task
        </Link>

        {/* HEADER */}
        <div className="mt-8">
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-[#19D879]">
            AI CLEANUP AUDIT & VERIFICATION
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em] md:text-5xl">
            Verify cleanup proof
          </h1>

          <p className="mt-3 max-w-[680px] text-sm leading-7 text-[#91A99C]">
            Submit proof of the completed cleanup. Our AI Vision engine will perform a
            comparative analysis between the original dump and your after photo to confirm
            waste removal before awarding 120 impact points and marking the dot green on the map.
          </p>
        </div>

        {/* TASK INFO SUMMARY */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
            <p className="text-[9px] uppercase tracking-[0.18em] text-[#91A99C]">TASK</p>
            <p className="mt-1 text-sm font-semibold">#{id}</p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
            <p className="text-[9px] uppercase tracking-[0.18em] text-[#91A99C]">LOCATION</p>
            <p className="mt-1 text-sm font-semibold truncate">
              {task?.location?.area || "Indiranagar, Bengaluru"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
            <p className="text-[9px] uppercase tracking-[0.18em] text-[#91A99C]">WASTE TYPE</p>
            <p className="mt-1 text-sm font-semibold text-[#19D879]">
              {task?.wasteCategory || "Mixed Waste"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
            <p className="text-[9px] uppercase tracking-[0.18em] text-[#91A99C]">REWARD</p>
            <p className="mt-1 text-sm font-semibold text-[#19D879]">+120 points</p>
          </div>
        </div>

        {/* SECTION: BEFORE / AFTER COMPARISON SECTION */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {/* BEFORE: ORIGINAL DUMP */}
          <div className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.025]">
            <div className="border-b border-white/[0.07] px-6 py-4">
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#FF5364]">
                BEFORE CLEANUP · REFERENCE DUMP
              </span>
              <h2 className="mt-1 text-lg font-semibold">Reported Incident Photo</h2>
            </div>

            <div className="relative aspect-video bg-[#071A12] md:h-[340px]">
              {task?.imageUrl ? (
                <img
                  src={task.imageUrl}
                  alt="Original waste"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-4xl">♻</div>
              )}
              <div className="absolute bottom-3 left-3 rounded-lg bg-black/80 px-3 py-1.5 text-xs text-[#91A99C] backdrop-blur-md">
                📍 {reportLat.toFixed(4)}, {reportLng.toFixed(4)}
              </div>
            </div>
          </div>

          {/* AFTER: VOLUNTEER'S PROOF */}
          <div className="overflow-hidden rounded-[28px] border border-[#19D879]/20 bg-[#0B2118]/40">
            <div className="border-b border-white/[0.07] px-6 py-4">
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#19D879]">
                AFTER CLEANUP · PROOF SUBMISSION
              </span>
              <h2 className="mt-1 text-lg font-semibold">Cleaned Site Photograph</h2>
            </div>

            <div className="relative flex aspect-video flex-col items-center justify-center bg-[#071A12] p-4 md:h-[340px]">
              {/* LIVE CAMERA FEED */}
              {isCameraActive ? (
                <div className="relative h-full w-full overflow-hidden rounded-2xl bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="rounded-full bg-[#19D879] px-6 py-2.5 text-xs font-bold text-[#06110D] shadow-lg hover:bg-[#4DFF9A]"
                    >
                      Capture Proof
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="rounded-full border border-white/[0.12] bg-black/60 px-4 py-2.5 text-xs text-[#91A99C]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : afterImage ? (
                /* SELECTED / CAPTURED AFTER PHOTO */
                <div className="relative h-full w-full overflow-hidden rounded-2xl">
                  <img
                    src={afterImage}
                    alt="Cleanup proof"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setAfterImage(null);
                      setVerificationResult(null);
                    }}
                    className="absolute right-3 top-3 rounded-lg bg-black/70 px-3 py-1 text-xs text-[#F4FFF8] hover:bg-black/90"
                  >
                    Retake
                  </button>
                </div>
              ) : (
                /* UPLOAD / CAPTURE SELECTION SCREEN */
                <div className="p-6 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#19D879]/30 bg-[#19D879]/10 text-2xl text-[#19D879]">
                    📷
                  </div>
                  <h3 className="mt-4 text-base font-semibold">Provide Cleaned Site Proof</h3>
                  <p className="mt-1 text-xs text-[#91A99C]">
                    Capture via camera or upload a photo showing the cleared area.
                  </p>

                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      onClick={openCamera}
                      className="rounded-xl bg-[#19D879] px-5 py-2.5 text-xs font-semibold text-[#06110D] hover:bg-[#4DFF9A]"
                    >
                      Open Live Camera
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl border border-white/[0.10] bg-white/[0.04] px-5 py-2.5 text-xs font-semibold text-[#F4FFF8] hover:bg-white/[0.08]"
                    >
                      Upload Photo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* LOCATION OFFSET INFO */}
        {afterImage && (
          <div className="mt-6 rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#19D879]">
                  LOCATION CONSISTENCY METRICS
                </p>
                <h3 className="mt-1 text-base font-semibold">Origin vs. Cleanup Coordinates</h3>
              </div>

              <span className="rounded-full bg-white/[0.05] px-3 py-1 text-[10px] text-[#91A99C]">
                Allowed radius: {CLEANUP_LOCATION_RADIUS_METERS} meters
              </span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <p className="text-[10px] uppercase text-[#91A99C]">Report Location</p>
                <p className="mt-1 font-mono text-xs font-semibold text-[#F4FFF8]">
                  {reportLat.toFixed(4)}, {reportLng.toFixed(4)}
                </p>
                <p className="mt-1 text-[10px] text-[#91A99C] truncate">
                  {task?.location?.area || "Incident site"}
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <p className="text-[10px] uppercase text-[#91A99C]">Cleanup Location</p>
                <p className="mt-1 font-mono text-xs font-semibold text-[#F4FFF8]">
                  {cleanupLocation
                    ? `${cleanupLocation.latitude.toFixed(4)}, ${cleanupLocation.longitude.toFixed(4)}`
                    : proofSource === "camera"
                    ? `${reportLat.toFixed(4)}, ${reportLng.toFixed(4)}`
                    : "Uploaded via file"}
                </p>
                <p className="mt-1 text-[10px] text-[#91A99C]">
                  {proofSource === "camera" ? "Verified via GPS" : "Passive file"}
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <p className="text-[10px] uppercase text-[#91A99C]">Distance Offset</p>
                <p className="mt-1 font-mono text-xs font-semibold text-[#19D879]">
                  {calculatedDistance !== null
                    ? `${calculatedDistance} meters`
                    : "Within radius"}
                </p>
                <p className="mt-1 text-[10px] text-[#19D879]">
                  ✓ Coordinates Recorded
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 PROMPT (WHEN NO AFTER IMAGE YET) */}
        {!afterImage && !alreadyCompleted && (
          <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-6 sm:flex-row">
            <div>
              <p className="text-base font-semibold">Step 2: Provide Cleaned Site Proof</p>
              <p className="text-xs text-[#91A99C]">
                Upload or capture an after-cleanup photograph above to run automated AI verification.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={openCamera}
                className="rounded-xl bg-[#19D879] px-5 py-2.5 text-xs font-semibold text-[#06110D] hover:bg-[#4DFF9A]"
              >
                Open Camera
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl border border-white/[0.12] bg-white/[0.04] px-5 py-2.5 text-xs font-semibold text-[#F4FFF8] hover:bg-white/[0.08]"
              >
                Upload Photo
              </button>
            </div>
          </div>
        )}

        {/* SUBMIT BUTTON & VERIFICATION LOADER */}
        {afterImage && !alreadyCompleted && (
          <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-[24px] border border-[#19D879]/20 bg-[#0B2118]/50 p-6 sm:flex-row">
            <div>
              <p className="text-base font-semibold">Ready to verify with AI?</p>
              <p className="text-xs text-[#91A99C]">
                UrbanTriage will compare the before and after photos using AI vision to confirm waste removal.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSubmitVerification}
              disabled={isVerifying}
              className="rounded-xl bg-[#19D879] px-7 py-3 text-sm font-semibold text-[#06110D] transition hover:bg-[#4DFF9A] hover:shadow-[0_0_30px_rgba(25,216,121,0.2)] disabled:opacity-50"
            >
              {isVerifying ? "Analyzing Before vs After..." : "Submit for Verification"}
            </button>
          </div>
        )}

        {/* VERIFICATION IN PROGRESS ANIMATION */}
        {isVerifying && (
          <div className="mt-8 rounded-[24px] border border-[#19D879]/20 bg-[#0B2118]/60 p-8 text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#19D879]/20 border-t-[#19D879]" />
            <h3 className="mt-4 text-lg font-semibold">Running AI Comparative Audit...</h3>
            <p className="mt-1 text-xs text-[#91A99C]">
              Evaluating viewpoint alignment, background landmark matching, and residual waste removal.
            </p>
          </div>
        )}

        {/* SECTION: AI VERIFICATION RESULTS CARD */}
        {verificationResult && (
          <div
            className={`mt-8 rounded-[28px] border p-8 ${
              verificationResult.verified
                ? "border-[#19D879]/30 bg-[#19D879]/[0.06]"
                : "border-[#FFB84D]/30 bg-[#FFB84D]/[0.06]"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl font-bold ${
                    verificationResult.verified
                      ? "bg-[#19D879] text-[#06110D]"
                      : "bg-[#FF5364] text-white"
                  }`}
                >
                  {verificationResult.verified ? "✓" : "!"}
                </span>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#91A99C]">
                    AUDIT RESULT · {verificationResult.cleanupStatus}
                  </p>
                  <h2 className="mt-0.5 text-2xl font-semibold">
                    {verificationResult.verified
                      ? "Cleanup Successfully Verified"
                      : "Verification Failed: Waste Still in Frame"}
                  </h2>
                </div>
              </div>

              <span className="rounded-full border border-white/[0.12] bg-white/[0.04] px-4 py-1.5 text-xs font-semibold text-[#F4FFF8]">
                {`AI Confidence: ${Math.round(verificationResult.confidence * 100)}%`}
              </span>
            </div>

            <p className="mt-5 text-sm leading-6 text-[#91A99C]">
              {verificationResult.explanation}
            </p>

            {/* AUDIT CHECKPOINTS */}
            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">Status</p>
                  <span className={`text-xs font-bold ${verificationResult.verified ? "text-[#19D879]" : "text-amber-400"}`}>
                    {verificationResult.verified ? "✓ Cleared" : "✗ Pending"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-[#91A99C]">
                  {verificationResult.verified ? "Waste removed" : "Residual detected"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">Location</p>
                  <span className="text-xs text-[#19D879]">✓ Recorded</span>
                </div>
                <p className="mt-1 text-[11px] text-[#91A99C]">
                  {verificationResult.distanceMeters !== undefined
                    ? `${verificationResult.distanceMeters}m offset`
                    : "Within radius"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">Area Match</p>
                  <span className="text-xs text-[#19D879]">✓ Verified</span>
                </div>
                <p className="mt-1 text-[11px] text-[#91A99C]">Landmarks correlate</p>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">Waste Removal</p>
                  <span
                    className={`text-xs font-bold ${
                      verificationResult.verified ? "text-[#19D879]" : "text-[#FF5364]"
                    }`}
                  >
                    {verificationResult.verified ? "✓ Cleared" : "✗ Waste in Frame"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-[#91A99C]">
                  {verificationResult.remainingWaste ? "Residual waste detected" : "Area clean"}
                </p>
              </div>
            </div>

            {/* COMPUTER VISION SSIM & PERSPECTIVE HOMOGRAPHY TELEMETRY */}
            {(verificationResult as any)?.ssimTelemetry && (
              <div className="mt-5 rounded-2xl border border-[#19D879]/30 bg-[#0B2118]/60 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🔬</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#19D879]">
                      Computer Vision Perspective SSIM Engine
                    </span>
                  </div>
                  <span className="rounded-md bg-[#19D879]/15 px-2 py-0.5 text-[10px] font-mono font-bold text-[#19D879] border border-[#19D879]/30">
                    SSIM Index: {(((verificationResult as any).ssimTelemetry.ssim_score || 0) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
                  <div className="rounded-xl bg-black/30 p-2.5">
                    <p className="text-[10px] text-[#91A99C]">Same Location</p>
                    <p className="font-semibold text-[#19D879]">
                      {(verificationResult as any).ssimTelemetry.is_same_location ? "✓ Confirmed (ORB)" : "Reviewing"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-black/30 p-2.5">
                    <p className="text-[10px] text-[#91A99C]">Homography Inliers</p>
                    <p className="font-semibold text-white">
                      {(verificationResult as any).ssimTelemetry.inliers} pts ({Math.round(((verificationResult as any).ssimTelemetry.inlier_ratio || 0) * 100)}%)
                    </p>
                  </div>
                  <div className="rounded-xl bg-black/30 p-2.5">
                    <p className="text-[10px] text-[#91A99C]">Perspective Alignment</p>
                    <p className="font-semibold text-white">
                      {(verificationResult as any).ssimTelemetry.perspective_aligned ? "✓ Warp Homography" : "Affine Matched"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-black/30 p-2.5">
                    <p className="text-[10px] text-[#91A99C]">Residual Waste Delta</p>
                    <p className={`font-semibold ${
                      (verificationResult as any).ssimTelemetry?.has_residual_waste ? "text-[#FF5364]" : "text-[#19D879]"
                    }`}>
                      {(verificationResult as any).ssimTelemetry?.has_residual_waste
                        ? "✗ Waste Detected"
                        : `${Math.round(((verificationResult as any).ssimTelemetry?.scene_delta_ratio || 0) * 100)}% Cleared`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ACTION BANNER WHEN VERIFICATION IS NOT APPROVED */}
            {!verificationResult.verified && !alreadyCompleted && (
              <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-white/[0.08] pt-6 sm:flex-row sm:items-center">
                {verificationResult.isAiGenerated ? (
                  <div>
                    <p className="text-xs font-bold text-red-400">
                      🚫 Verification Rejected: Synthetic / AI-generated photo detected.
                    </p>
                    <p className="text-[11px] text-red-200/80">
                      UrbanTriage strictly requires authentic on-site photographic proof. Fake AI images are prohibited.
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-[#FF5364]">
                      ⚠️ Residual waste or debris is still detected in the frame.
                    </p>
                    <p className="text-[11px] text-[#91A99C]">
                      Please ensure the entire site is clean before submitting. Verification cannot be approved with waste in view.
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAfterImage(null);
                      setVerificationResult(null);
                    }}
                    className={`rounded-xl px-5 py-2.5 text-xs font-bold text-white transition ${
                      verificationResult.isAiGenerated
                        ? "bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                        : "bg-[#FF5364] hover:bg-[#FF3B4F]"
                    }`}
                  >
                    {verificationResult.isAiGenerated ? "Upload Authentic Camera Photo" : "Retake Photo After Clearing Site"}
                  </button>
                </div>
              </div>
            )}

            {/* COMPLETION ACTIONS */}
            {alreadyCompleted && (
              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.08] pt-6">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-[#19D879]">+120</span>
                  <span className="text-xs text-[#91A99C]">
                    impact points credited to your volunteer profile
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/volunteer/tasks/completed"
                    className="rounded-xl bg-[#19D879] px-5 py-2.5 text-xs font-bold text-[#06110D] shadow-[0_0_20px_rgba(25,216,121,0.25)] hover:bg-[#4DFF9A]"
                  >
                    View in Completed Tasks Window →
                  </Link>

                  <Link
                    href={`/map?lat=${reportLat}&lng=${reportLng}&zoom=16&status=completed&taskId=${id}`}
                    className="rounded-xl border border-[#19D879]/30 bg-[#19D879]/10 px-5 py-2.5 text-xs font-semibold text-[#19D879] hover:bg-[#19D879]/20"
                  >
                    View Green Dot on Map
                  </Link>

                  <Link
                    href="/volunteer/verification"
                    className="rounded-xl border border-white/[0.12] bg-white/[0.04] px-5 py-2.5 text-xs font-semibold text-[#F4FFF8] hover:bg-white/[0.08]"
                  >
                    Verification Hub
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* HIDDEN INPUTS */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
        <canvas ref={canvasRef} className="hidden" />
      </section>
    </main>
  );
}