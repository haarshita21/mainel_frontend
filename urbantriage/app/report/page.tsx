"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { WasteAnalysis, WasteReport, LocationData } from "@/lib/types";
import { createTaskFromReport, getDynamicDeadline } from "@/lib/task-store";
import { DEFAULT_LOCALITIES, reverseGeocode, forwardGeocode } from "@/lib/geo";

export default function ReportIncident() {
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const liveDetectIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Live running clock for precise local time display
  const [liveClock, setLiveClock] = useState<string>("");

  useEffect(() => {
    const update = () => {
      setLiveClock(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  // Set user role to "user" (citizen reporter)
  useEffect(() => {
    try {
      localStorage.setItem("urbantriage_role", "user");
    } catch {}
  }, []);

  // Flow State
  const [step, setStep] = useState<
    "choose" | "camera" | "preview" | "analyzing" | "review" | "created"
  >("choose");

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [source, setSource] = useState<"upload" | "camera">("upload");
  const [detectionMode, setDetectionMode] = useState<"individual" | "piled">("piled");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [isFlashing, setIsFlashing] = useState(false);

  // Metadata State
  const [capturedAt, setCapturedAt] = useState<string>("");
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<
    "prompt" | "granted" | "denied" | "locating"
  >("prompt");
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [manualLocationText, setManualLocationText] = useState("");

  // Live Detection State (Active Reporting)
  const [liveWasteDetected, setLiveWasteDetected] = useState<boolean | null>(null);
  const [liveWasteCategory, setLiveWasteCategory] = useState("Scanning scene...");
  const [liveWasteType, setLiveWasteType] = useState("AI Live Vision Active");
  const [liveWasteTypes, setLiveWasteTypes] = useState<string[]>([]);
  const [liveConfidence, setLiveConfidence] = useState(0);
  const isDetectingRef = useRef(false);

  // AI Rejection State
  const [aiRejectionError, setAiRejectionError] = useState<string | null>(null);

  // AI Analysis Result
  const [analyzingProgress, setAnalyzingProgress] = useState(0);
  const [analyzingStepText, setAnalyzingStepText] = useState("Scanning photograph...");
  const [aiAnalysis, setAiAnalysis] = useState<WasteAnalysis | null>(null);
  const [createdReport, setCreatedReport] = useState<WasteReport | null>(null);
  const [showAnnotated, setShowAnnotated] = useState(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (liveDetectIntervalRef.current) {
        clearInterval(liveDetectIntervalRef.current);
      }
    };
  }, []);

  const stopCamera = () => {
    if (liveDetectIntervalRef.current) {
      clearInterval(liveDetectIntervalRef.current);
      liveDetectIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  /* ============================================================
     LOCATION PERMISSION & RETRIEVAL
     ============================================================ */
  const requestLocation = async (): Promise<LocationData | null> => {
    if (location) return location;

    setLocationPermissionStatus("locating");

    if (!navigator.geolocation) {
      setLocationPermissionStatus("denied");
      setShowLocationModal(true);
      return null;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          try {
            const geo = await reverseGeocode(lat, lng);
            const locData: LocationData = {
              latitude: lat,
              longitude: lng,
              area: geo.area,
              city: geo.city,
              state: geo.state,
            };
            setLocation(locData);
            setLocationPermissionStatus("granted");
            setShowLocationModal(false);
            resolve(locData);
          } catch {
            const fallback: LocationData = {
              latitude: lat,
              longitude: lng,
              area: `Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
              city: "Local Area",
              state: "",
            };
            setLocation(fallback);
            setLocationPermissionStatus("granted");
            setShowLocationModal(false);
            resolve(fallback);
          }
        },
        () => {
          setLocationPermissionStatus("denied");
          setShowLocationModal(true);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  };

  const handleSelectManualLocation = (preset: (typeof DEFAULT_LOCALITIES)[0]) => {
    const loc: LocationData = {
      latitude: preset.latitude,
      longitude: preset.longitude,
      area: preset.area,
      city: preset.city,
      state: preset.state,
    };
    setLocation(loc);
    setLocationPermissionStatus("granted");
    setShowLocationModal(false);
  };

  const handleCustomManualSubmit = async () => {
    if (!manualLocationText.trim()) return;
    try {
      const geo = await forwardGeocode(manualLocationText.trim());
      if (geo) {
        const loc: LocationData = {
          latitude: geo.latitude,
          longitude: geo.longitude,
          area: geo.area,
          city: geo.city,
          state: geo.state,
        };
        setLocation(loc);
        setLocationPermissionStatus("granted");
        setShowLocationModal(false);
        return;
      }
    } catch {
      // ignore
    }
    const loc: LocationData = {
      latitude: 12.9716,
      longitude: 77.5946,
      area: manualLocationText.trim(),
      city: "Selected Locality",
      state: "",
    };
    setLocation(loc);
    setLocationPermissionStatus("granted");
    setShowLocationModal(false);
  };

  /* ============================================================
     LIVE CAMERA & REFINED LIVE AI DETECTION
     ============================================================ */
  const openCamera = async (facing: "environment" | "user" = cameraFacing) => {
    setCameraError(null);
    setSource("camera");
    requestLocation();

    stopCamera();

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access is not supported by this browser.");
      setStep("camera");
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch {
        // Fallback for laptops / desktop webcams
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      setCameraFacing(facing);
      setStep("camera");

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);

      startLiveDetectionLoop();
    } catch (error) {
      console.error(error);
      setCameraError("Camera access was denied or the camera could not be opened.");
      setStep("camera");
    }
  };

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === "environment" ? "user" : "environment";
    openCamera(nextFacing);
  };

  const startLiveDetectionLoop = () => {
    if (liveDetectIntervalRef.current) clearInterval(liveDetectIntervalRef.current);

    liveDetectIntervalRef.current = setInterval(async () => {
      if (isDetectingRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const w = 320;
      const h = Math.round((video.videoHeight / (video.videoWidth || 1)) * w) || 240;
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);

      try {
        isDetectingRef.current = true;
        const frameData = canvas.toDataURL("image/jpeg", 0.6);
        const res = await fetch("/api/live-detect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ frame: frameData }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.detection) {
            const hasWaste = Boolean(json.detection.wasteDetected);
            setLiveWasteDetected(hasWaste);
            setLiveWasteCategory(hasWaste ? (json.detection.category || "Dry waste") : "None");
            setLiveWasteType(hasWaste ? (json.detection.wasteType || "Item Detected") : "Area Clear");
            setLiveWasteTypes(Array.isArray(json.detection.wasteTypes) ? json.detection.wasteTypes : []);
            setLiveConfidence(typeof json.detection.confidence === "number" ? json.detection.confidence : 0);
          }
        }
      } catch {
        // smooth background loop
      } finally {
        isDetectingRef.current = false;
      }
    }, 1200);
  };

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Trigger visual flash
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, width, height);

    const imageUrl = canvas.toDataURL("image/jpeg", 0.92);
    const nowIso = new Date().toISOString();

    setSelectedImage(imageUrl);
    setCapturedAt(nowIso);
    setSource("camera");
    setAiRejectionError(null);

    stopCamera();
    setStep("preview");

    if (!location) {
      requestLocation();
    }
  };

  const closeCamera = () => {
    stopCamera();
    setStep("choose");
    setCameraError(null);
  };

  /* ============================================================
     PHOTO UPLOAD (PASSIVE REPORTING)
     ============================================================ */
  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setSelectedImage(reader.result);
        setSource("upload");
        setCapturedAt(new Date().toISOString());
        setAiRejectionError(null);
        setStep("preview");

        if (!location) {
          requestLocation();
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const resetPhoto = () => {
    setSelectedImage(null);
    setAiAnalysis(null);
    setCreatedReport(null);
    setAiRejectionError(null);
    setStep("choose");
    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
    }
  };

  /* ============================================================
     AI ANALYSIS WORKFLOW (CALLS REAL GROQ API KEY)
     ============================================================ */
  const startAiAnalysis = async () => {
    if (!selectedImage) return;

    if (!location) {
      const loc = await requestLocation();
      if (!loc) {
        setShowLocationModal(true);
        return;
      }
    }

    setAiRejectionError(null);
    setStep("analyzing");
    setAnalyzingProgress(20);
    setAnalyzingStepText("Sending image to forensic vision inspector...");

    const pTimer1 = setTimeout(() => {
      setAnalyzingProgress(55);
      setAnalyzingStepText("Auditing photo authenticity & neural waste classification...");
    }, 700);

    const pTimer2 = setTimeout(() => {
      setAnalyzingProgress(85);
      setAnalyzingStepText("Evaluating volume, scale & generating disposal rules...");
    }, 1500);

    try {
      const formData = new FormData();
      formData.append("image", selectedImage);
      formData.append("mode", detectionMode);

      const res = await fetch("/api/analyze-waste", {
        method: "POST",
        body: formData,
      });

      clearTimeout(pTimer1);
      clearTimeout(pTimer2);

      if (!res.ok) {
        if (res.status === 422) {
          const errData = await res.json().catch(() => ({}));
          setAiRejectionError(
            errData.message ||
            "Application Rejected: Invalid photograph. UrbanTriage only accepts authentic real-world photos of municipal waste."
          );
          setStep("preview");
          return;
        }
        const errText = await res.text().catch(() => "Analysis failed");
        throw new Error(errText);
      }

      const data = await res.json();

      setAnalyzingProgress(100);
      setAnalyzingStepText("Finalizing structured triage card...");

      setTimeout(async () => {
        setAiAnalysis(data.analysis);
        if (data.analysis?.extractedGps && data.analysis?.isAuthentic) {
          const exifLat = data.analysis.extractedGps.latitude;
          const exifLng = data.analysis.extractedGps.longitude;
          try {
            const geo = await reverseGeocode(exifLat, exifLng);
            setLocation({
              latitude: exifLat,
              longitude: exifLng,
              area: geo.area || "Authentic Photo Location",
              city: geo.city || "Civic Area",
              state: geo.state || "",
            });
          } catch {
            setLocation({
              latitude: exifLat,
              longitude: exifLng,
              area: `Photo Coordinates (${exifLat.toFixed(4)}, ${exifLng.toFixed(4)})`,
              city: "Detected Location",
              state: "",
            });
          }
        }
        setStep("review");
      }, 400);
    } catch (err: any) {
      console.error(err);
      clearTimeout(pTimer1);
      clearTimeout(pTimer2);
      setAiRejectionError(
        err?.message || "Analysis service encountered an issue. Please try again with a clear photo."
      );
      setStep("preview");
    }
  };

  /* ============================================================
     TASK CREATION
     ============================================================ */
  const handleCreateCleanupTask = async () => {
    if (!selectedImage || !aiAnalysis || !location) return;

    const reportId = `UT-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();

    const report: WasteReport = {
      id: reportId,
      imageUrl: selectedImage,
      source: source === "camera" ? "active" : "passive",
      location,
      capturedAt: capturedAt || nowIso,
      reportedAt: nowIso,
      wasteAnalysis: aiAnalysis,
      status: "open",
    };

    createTaskFromReport(report);

    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: reportId,
          reportId,
          imageUrl: selectedImage,
          location,
          wasteCategory: aiAnalysis.category,
          wasteTypes: aiAnalysis.types && aiAnalysis.types.length > 0 ? aiAnalysis.types : [aiAnalysis.wasteType || "Plastic waste"],
          quantity: aiAnalysis.quantity,
          severity: aiAnalysis.severity || "Medium",
          recommendedDisposal: aiAnalysis.recommendedDisposal,
          requiredEquipment: aiAnalysis.recommendedEquipment,
          precautions: aiAnalysis.precautions,
          reportedAt: nowIso,
          deadline: getDynamicDeadline(24),
          status: "open",
          joinedVolunteers: [],
          maxVolunteers: aiAnalysis.quantity.scale === "large" ? 4 : 2,
          confidence: aiAnalysis.confidence,
          hazmatInfo: aiAnalysis.hazmatInfo,
          threatScore: aiAnalysis.threatScore,
          threatDetected: aiAnalysis.threatDetected,
          isAuthentic: aiAnalysis.isAuthentic,
          environmentalSensitivity: aiAnalysis.environmentalContext?.environmental_sensitivity,
          macroDescription: aiAnalysis.environmentalContext?.macro_description,
        }),
      });
    } catch {}

    setCreatedReport(report);
    setStep("created");
  };

  return (
    <main className="min-h-screen bg-[#06110D] px-6 text-[#F4FFF8]">
      {/* NAVBAR — Regular users report waste; Volunteer Tasks link removed */}
      <nav className="mx-auto flex h-[88px] max-w-[1200px] items-center justify-between">
        <Link href="/" className="text-[22px] font-semibold tracking-[-0.04em]">
          Urban<span className="text-[#19D879]">Triage</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/report"
            className="rounded-xl bg-[#19D879]/10 px-4 py-2.5 text-sm font-medium text-[#19D879]"
          >
            Report Incident
          </Link>

          <Link
            href="/map"
            className="rounded-xl border border-white/[0.10] bg-white/[0.035] px-4 py-2.5 text-sm font-medium text-[#91A99C] backdrop-blur-xl transition-all duration-200 hover:border-[#19D879]/30 hover:bg-white/[0.07] hover:text-[#F4FFF8]"
          >
            City Map
          </Link>

          <Link
            href="/"
            className="ml-2 rounded-xl border border-white/[0.10] px-4 py-2.5 text-sm text-[#91A99C] transition-colors hover:text-[#F4FFF8]"
          >
            Home
          </Link>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div className="mx-auto max-w-[1000px] pb-24 pt-12">
        {/* STEP 1: CHOOSE INPUT METHOD */}
        {step === "choose" && (
          <>
            <div className="text-center">
              <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-[#19D879]">
                INCIDENT REPORTING ENGINE
              </p>

              <h1 className="mt-5 text-4xl font-semibold tracking-[-0.045em] md:text-5xl">
                Help us identify
                <br />
                <span className="text-[#91A99C]">what needs attention.</span>
              </h1>

              <p className="mx-auto mt-5 max-w-[590px] text-sm leading-7 text-[#91A99C] md:text-base">
                Report a waste dump using an existing photo or capture it live
                with automated location intelligence and AI material classification.
              </p>
            </div>

            {/* LOCATION STATUS BADGE */}
            <div className="mx-auto mt-8 flex max-w-fit items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.025] px-5 py-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  location
                    ? "bg-[#19D879]"
                    : locationPermissionStatus === "locating"
                    ? "animate-ping bg-[#FFB84D]"
                    : "bg-[#91A99C]"
                }`}
              />
              <span className="text-xs text-[#91A99C]">
                {location
                  ? `Location ready: ${location.area}`
                  : locationPermissionStatus === "locating"
                  ? "Detecting coordinates..."
                  : "Location will be requested upon photo selection"}
              </span>
              {location && (
                <button
                  type="button"
                  onClick={() => setShowLocationModal(true)}
                  className="ml-2 text-xs font-medium text-[#19D879] hover:underline"
                >
                  Change
                </button>
              )}
            </div>

            {/* DETECTION MODE TOGGLE */}
            <div className="mx-auto mt-8 flex max-w-fit items-center gap-2 rounded-2xl border border-white/[0.10] bg-white/[0.035] p-1.5">
              <button
                type="button"
                onClick={() => setDetectionMode("individual")}
                className={`rounded-xl px-5 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200 ${
                  detectionMode === "individual"
                    ? "bg-[#19D879] text-[#06110D] shadow-[0_0_20px_rgba(25,216,121,0.3)]"
                    : "bg-transparent text-[#91A99C] hover:bg-white/[0.05] hover:text-[#F4FFF8]"
                }`}
              >
                Individual Waste
              </button>
              <button
                type="button"
                onClick={() => setDetectionMode("piled")}
                className={`rounded-xl px-5 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200 ${
                  detectionMode === "piled"
                    ? "bg-[#19D879] text-[#06110D] shadow-[0_0_20px_rgba(25,216,121,0.3)]"
                    : "bg-transparent text-[#91A99C] hover:bg-white/[0.05] hover:text-[#F4FFF8]"
                }`}
              >
                Piled-up Garbage
              </button>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {/* UPLOAD PHOTO (PASSIVE) */}
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className="group rounded-[28px] border border-white/[0.10] bg-white/[0.035] p-8 text-left transition-all duration-300 hover:-translate-y-1 hover:border-[#19D879]/30 hover:bg-[#0B2118]/70"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#19D879]/10 text-[#19D879]">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  >
                    <path d="M12 16V4" />
                    <path d="m7 9 5-5 5 5" />
                    <path d="M5 20h14" />
                  </svg>
                </div>

                <div className="mt-7 flex items-center justify-between">
                  <h2 className="text-2xl font-semibold tracking-[-0.03em]">
                    Upload Photo
                  </h2>
                  <span className="rounded-full border border-white/[0.12] bg-white/[0.05] px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.16em] text-[#91A99C]">
                    PASSIVE
                  </span>
                </div>

                <p className="mt-3 max-w-[390px] text-sm leading-6 text-[#91A99C]">
                  Select an existing photo from your gallery. We'll ask for location
                  permission or let you pick your area, then run full AI vision triage.
                </p>

                <div className="mt-8 text-sm font-medium text-[#19D879]">
                  Choose from device →
                </div>
              </button>

              {/* CAPTURE PHOTO (ACTIVE) */}
              <button
                type="button"
                onClick={() => openCamera("environment")}
                className="group rounded-[28px] border border-[#19D879]/20 bg-[#0B2118]/50 p-8 text-left transition-all duration-300 hover:-translate-y-1 hover:border-[#19D879]/40 hover:bg-[#0D281C]"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#19D879]/10 text-[#19D879]">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  >
                    <path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>

                <div className="mt-7 flex items-center gap-3">
                  <h2 className="text-2xl font-semibold tracking-[-0.03em]">
                    Capture Photo
                  </h2>
                  <span className="rounded-full border border-[#19D879]/20 bg-[#19D879]/10 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.18em] text-[#19D879]">
                    LIVE AI DETECT
                  </span>
                </div>

                <p className="mt-3 max-w-[390px] text-sm leading-6 text-[#91A99C]">
                  Open camera with real-time frame detection, human detection,
                  and automatic capture timestamp & GPS synchronization.
                </p>

                <div className="mt-8 text-sm font-medium text-[#19D879]">
                  Open camera feed →
                </div>
              </button>
            </div>
          </>
        )}

        {/* STEP: REFINED LIVE CAMERA SCREEN */}
        {step === "camera" && (
          <div className="mx-auto mt-6 max-w-[880px]">
            <div className="overflow-hidden rounded-[28px] border border-white/[0.10] bg-[#071A12] shadow-[0_30px_100px_rgba(0,0,0,0.55)]">
              {!cameraError ? (
                <>
                  <div className="relative aspect-video overflow-hidden bg-black">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />

                    {/* Camera Flash effect on shutter */}
                    {isFlashing && (
                      <div className="pointer-events-none absolute inset-0 z-50 bg-white opacity-80 transition-opacity duration-200" />
                    )}

                    {/* Laser scanning beam animation */}
                    <div className="pointer-events-none absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#19D879] to-transparent shadow-[0_0_15px_#19D879] animate-[scanline_3s_ease-in-out_infinite]" />

                    {/* LIVE CAMERA HUD & DETECTIONS */}
                    <div className="pointer-events-none absolute inset-0">
                      {/* Top status & Human detection */}
                      <div className="absolute left-5 top-5 flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2 rounded-full border border-white/[0.12] bg-[#06110D]/75 px-3 py-2 backdrop-blur-md">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-[#19D879]" />
                          <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-[#F4FFF8]">
                            AI VISION LIVE
                          </span>
                        </div>

                        {/* Waste detection status badge */}
                        <div
                          className={`flex items-center gap-2 rounded-full border px-3 py-2 text-[9px] font-medium uppercase tracking-[0.15em] backdrop-blur-md ${
                            liveWasteDetected
                              ? "border-[#19D879]/50 bg-[#19D879]/20 text-[#19D879]"
                              : "border-white/[0.10] bg-[#06110D]/70 text-[#91A99C]"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${liveWasteDetected ? "bg-[#19D879] animate-pulse" : "bg-[#91A99C]"}`} />
                          <span>{liveWasteDetected ? `Item: ${liveWasteType}` : "✓ Area Clear"}</span>
                        </div>
                      </div>

                      {/* Top right: Real-time GPS & Camera Toggle */}
                      <div className="absolute right-5 top-5 flex items-start gap-2">
                        <button
                          type="button"
                          onClick={toggleCameraFacing}
                          className="pointer-events-auto rounded-xl border border-white/[0.12] bg-[#06110D]/80 p-2.5 text-xs text-[#91A99C] backdrop-blur-md hover:text-[#19D879]"
                          title="Flip camera"
                        >
                          🔄
                        </button>

                        <div className="rounded-2xl border border-white/[0.10] bg-[#06110D]/80 p-3 text-right backdrop-blur-md">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#19D879]" />
                            <p className="text-[9px] font-mono uppercase tracking-[0.15em] text-[#19D879]">
                              {liveClock || "LIVE SYNC"}
                            </p>
                          </div>
                          <p className="mt-0.5 font-mono text-[11px] text-[#F4FFF8]">
                            {location
                              ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                              : "Locating..."}
                          </p>
                          <p className="mt-0.5 max-w-[130px] truncate text-[10px] text-[#91A99C]">
                            {location?.area || "Indiranagar"}
                          </p>
                        </div>
                      </div>

                      {/* Centered Target Reticle with Dynamic Detections */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className={`relative h-48 w-72 rounded-2xl border border-dashed transition-colors duration-300 ${
                          liveWasteDetected
                            ? "border-[#19D879] bg-[#19D879]/[0.05]"
                            : liveWasteDetected === false
                            ? "border-white/20 bg-black/20"
                            : "border-white/30 bg-transparent"
                        }`}>
                          {/* Corner markers */}
                          <div className="absolute -left-1 -top-1 h-5 w-5 border-l-2 border-t-2 border-[#19D879]" />
                          <div className="absolute -right-1 -top-1 h-5 w-5 border-r-2 border-t-2 border-[#19D879]" />
                          <div className="absolute -bottom-1 -left-1 h-5 w-5 border-b-2 border-l-2 border-[#19D879]" />
                          <div className="absolute -bottom-1 -right-1 h-5 w-5 border-b-2 border-r-2 border-[#19D879]" />

                          {/* CLASSIFICATION BADGE(S) */}
                          <div className="absolute -top-7 left-0 flex max-w-[280px] flex-wrap items-center gap-1.5">
                            {liveWasteDetected ? (
                              <div className="flex items-center gap-1.5 rounded-lg bg-[#19D879] px-2.5 py-1 text-[11px] font-bold text-[#06110D] shadow-lg">
                                <span>[{liveWasteType}]</span>
                                {liveConfidence > 0 && (
                                  <span className="text-[9px] font-normal opacity-85">· {Math.round(liveConfidence * 100)}%</span>
                                )}
                              </div>
                            ) : liveWasteDetected === false ? (
                              <div className="flex items-center gap-1.5 rounded-lg border border-[#19D879]/30 bg-[#061A11]/90 px-2.5 py-1 text-[11px] font-medium text-[#19D879] shadow-lg backdrop-blur-md">
                                <span>✓ AREA CLEAR / NO WASTE</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-[#06110D]/80 px-2.5 py-1 text-[11px] font-medium text-[#91A99C] shadow-lg backdrop-blur-md">
                                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-[#19D879]" />
                                <span>SCANNING SCENE...</span>
                              </div>
                            )}
                          </div>

                          {/* Multiple items chips if more than 1 item is visible */}
                          {liveWasteDetected && liveWasteTypes.length > 1 && (
                            <div className="absolute -bottom-8 inset-x-0 flex flex-wrap items-center justify-center gap-1">
                              {liveWasteTypes.map((t, idx) => (
                                <span
                                  key={idx}
                                  className="rounded-md border border-[#19D879]/40 bg-[#06110D]/90 px-2 py-0.5 text-[9px] font-semibold text-[#19D879] shadow-md backdrop-blur-md"
                                >
                                  • {t}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                            <span className={`text-xs font-mono font-semibold tracking-wider ${
                              liveWasteDetected ? "text-[#19D879]" : "text-[#91A99C]"
                            }`}>
                              {liveWasteDetected ? "TARGET DETECTED" : "FRAME TARGET"}
                            </span>
                            <span className="mt-1 text-[10px] text-[#F4FFF8]">
                              {liveWasteDetected
                                ? `Category: ${liveWasteCategory}`
                                : "Point camera at waste item"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Live Detection Summary */}
                      <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between rounded-xl border border-white/[0.10] bg-[#06110D]/90 px-4 py-2.5 backdrop-blur-md">
                        <div className="flex items-center gap-3">
                          <span className={`h-2 w-2 rounded-full ${
                            liveWasteDetected ? "animate-ping bg-[#19D879]" : "bg-[#91A99C]"
                          }`} />
                          <span className="text-xs font-medium text-[#F4FFF8]">
                            {liveWasteDetected ? (
                              <>
                                Detected: <strong className="text-[#19D879]">{liveWasteCategory}</strong>
                                {liveWasteTypes.length > 0 ? ` · ${liveWasteTypes.join(" + ")}` : ` · ${liveWasteType}`}
                              </>
                            ) : (
                              <>Status: <strong className="text-[#91A99C]">Area Clean</strong> · No Litter in Frame</>
                            )}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[#19D879]">
                          AI Vision Live Active
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Refined Camera Controls */}
                  <div className="flex items-center justify-between px-6 py-6 md:px-8">
                    <button
                      type="button"
                      onClick={closeCamera}
                      className="rounded-xl border border-white/[0.10] bg-white/[0.035] px-5 py-3 text-sm text-[#91A99C] transition-colors hover:bg-white/[0.07] hover:text-[#F4FFF8]"
                    >
                      Cancel
                    </button>

                    {/* Shutter Button */}
                    <button
                      type="button"
                      onClick={takePhoto}
                      className="group relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#F4FFF8]/90 bg-[#19D879] shadow-[0_0_40px_rgba(25,216,121,0.35)] transition-transform duration-150 active:scale-90 hover:scale-105"
                      aria-label="Capture scene"
                    >
                      <span className="h-14 w-14 rounded-full border-2 border-[#06110D] transition-transform group-hover:scale-95" />
                    </button>

                    <button
                      type="button"
                      onClick={toggleCameraFacing}
                      className="rounded-xl border border-white/[0.10] bg-white/[0.035] px-4 py-3 text-xs text-[#91A99C] hover:text-[#F4FFF8]"
                    >
                      {cameraFacing === "environment" ? "Back 📷" : "Front 🤳"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex min-h-[420px] items-center justify-center p-8 text-center">
                  <div className="max-w-md">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF5364]/10 text-[#FF5364]">
                      !
                    </div>
                    <h2 className="mt-6 text-2xl font-semibold">Camera access needed</h2>
                    <p className="mt-4 text-sm leading-6 text-[#91A99C]">
                      UrbanTriage needs camera access to capture a live photo and run
                      on-device framing analysis.
                    </p>
                    <div className="mt-7 flex justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => openCamera()}
                        className="rounded-xl bg-[#19D879] px-5 py-3 text-sm font-semibold text-[#06110D] hover:bg-[#4DFF9A]"
                      >
                        Try again
                      </button>
                      <button
                        type="button"
                        onClick={closeCamera}
                        className="rounded-xl border border-white/[0.10] px-5 py-3 text-sm text-[#91A99C] hover:text-[#F4FFF8]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP: PHOTO PREVIEW & LOCATION CONFIRMATION */}
        {step === "preview" && selectedImage && (
          <div className="mt-6">
            <div className="overflow-hidden rounded-[28px] border border-white/[0.10] bg-white/[0.035]">
              <div className="grid md:grid-cols-[1.1fr_0.9fr]">
                {/* PHOTO DISPLAY */}
                <div className="relative aspect-video bg-[#071A12] md:aspect-auto md:min-h-[440px]">
                  <img
                    src={selectedImage}
                    alt="Captured incident"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute left-5 top-5 rounded-full border border-white/[0.12] bg-[#06110D]/75 px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.18em] backdrop-blur-md">
                    {source === "camera" ? "LIVE CAPTURE" : "UPLOADED PHOTO"}
                  </div>
                </div>

                {/* METADATA & NEXT ACTIONS */}
                <div className="flex flex-col justify-between p-8 md:p-10">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#19D879]">
                      STEP 1 OF 2 · METADATA VERIFIED
                    </p>

                    <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
                      Ready for AI Analysis
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-[#91A99C]">
                      Groq Vision API will detect the exact waste material, quantity,
                      and generate tailored disposal protocols.
                    </p>

                    {/* AI IMAGE / INVALID REPORT REJECTION ALERT */}
                    {aiRejectionError && (
                      <div className={`mt-4 rounded-2xl border p-4 shadow-lg ${
                        aiRejectionError.toLowerCase().includes("ai-generated") || aiRejectionError.toLowerCase().includes("synthetic")
                          ? "border-red-500/50 bg-red-950/80 text-red-200 shadow-[0_0_25px_rgba(239,68,68,0.25)]"
                          : "border-amber-500/50 bg-amber-950/80 text-amber-200 shadow-[0_0_25px_rgba(245,158,11,0.25)]"
                      }`}>
                        <div className="flex items-center gap-2 font-bold">
                          <span className="text-lg">
                            {aiRejectionError.toLowerCase().includes("ai-generated") || aiRejectionError.toLowerCase().includes("synthetic") ? "🚫" : "⚠️"}
                          </span>
                          <span className={`text-xs uppercase tracking-wider ${
                            aiRejectionError.toLowerCase().includes("ai-generated") || aiRejectionError.toLowerCase().includes("synthetic") ? "text-red-400" : "text-amber-400"
                          }`}>
                            {aiRejectionError.toLowerCase().includes("ai-generated") || aiRejectionError.toLowerCase().includes("synthetic")
                              ? "Application Rejected: AI Image Detected"
                              : "Application Rejected: Invalid Waste Report"}
                          </span>
                        </div>
                        <p className="mt-2 text-xs leading-relaxed opacity-90">
                          {aiRejectionError}
                        </p>
                      </div>
                    )}

                    {/* LOCATION DETAILS CARD */}
                    <div className="mt-6 rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#91A99C]">
                          📍 Incident Location
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowLocationModal(true)}
                          className="text-xs text-[#19D879] hover:underline"
                        >
                          Change
                        </button>
                      </div>

                      {location ? (
                        <div className="mt-2">
                          <p className="text-sm font-semibold text-[#F4FFF8]">
                            {location.area}
                          </p>
                          <p className="mt-1 font-mono text-xs text-[#91A99C]">
                            {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                          </p>
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center justify-between">
                          <p className="text-xs text-[#FFB84D]">
                            Location not yet specified
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowLocationModal(true)}
                            className="rounded-lg bg-[#FFB84D]/15 px-3 py-1 text-xs font-medium text-[#FFB84D]"
                          >
                            Add Location
                          </button>
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2 text-xs text-[#91A99C]">
                        <span>Captured at:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-[#19D879]">
                            {capturedAt
                              ? new Date(capturedAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                  hour12: true,
                                })
                              : new Date().toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                  hour12: true,
                                })}{" "}
                            (Just now)
                          </span>
                          <button
                            type="button"
                            onClick={() => setCapturedAt(new Date().toISOString())}
                            className="rounded bg-white/[0.08] px-2 py-0.5 text-[10px] text-[#91A99C] transition hover:bg-[#19D879]/20 hover:text-[#19D879]"
                            title="Update capture timestamp to current second"
                          >
                            Update
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="mt-8 flex flex-wrap gap-3">
                    {aiRejectionError ? (
                      <button
                        type="button"
                        onClick={resetPhoto}
                        className="rounded-xl bg-red-600 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                      >
                        Upload Authentic Photo Instead
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={startAiAnalysis}
                        className="rounded-xl bg-[#19D879] px-6 py-3.5 text-sm font-semibold text-[#06110D] transition-all hover:bg-[#4DFF9A] hover:shadow-[0_0_30px_rgba(25,216,121,0.2)]"
                      >
                        Run AI Waste Analysis →
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={resetPhoto}
                      className="rounded-xl border border-white/[0.10] bg-white/[0.035] px-5 py-3.5 text-sm text-[#91A99C] transition-colors hover:bg-white/[0.07] hover:text-[#F4FFF8]"
                    >
                      Choose another
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP: ANALYZING LOADING SCREEN */}
        {step === "analyzing" && (
          <div className="mx-auto mt-16 max-w-[650px] text-center">
            <div className="overflow-hidden rounded-[28px] border border-[#19D879]/20 bg-[#0B2118]/60 p-10 backdrop-blur-xl">
              <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
                <div className="absolute inset-0 animate-ping rounded-full bg-[#19D879]/10" />
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-[#19D879]/20 border-t-[#19D879]" />
                <span className="absolute text-xl">♻</span>
              </div>

              <h2 className="mt-6 text-2xl font-semibold tracking-[-0.03em]">
                AI Vision Environmental Triage
              </h2>

              <p className="mt-2 text-sm text-[#91A99C]">{analyzingStepText}</p>

              <div className="mt-8 h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-full rounded-full bg-[#19D879] transition-all duration-300"
                  style={{ width: `${analyzingProgress}%` }}
                />
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-[#91A99C]">
                <span>Groq Vision Neural Classification</span>
                <span className="font-mono text-[#19D879]">{analyzingProgress}%</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP: USER REPORT CARD — SHOWS ONE SURE CLASSIFICATION */}
        {step === "review" && aiAnalysis && location && selectedImage && (
          <div className="mt-8">
            <div className="overflow-hidden rounded-[28px] border border-[#19D879]/30 bg-[#071911] shadow-[0_30px_100px_rgba(0,0,0,0.6)]">
              {/* TOP HEADER */}
              <div className="border-b border-white/[0.08] bg-[#092217] px-8 py-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#19D879]">
                      WASTE REPORT · TRIAGE SUMMARY
                    </span>
                    <h2 className="mt-1 text-2xl font-semibold">Incident Analysis Card</h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#19D879]/30 bg-[#19D879]/10 px-3.5 py-1.5 text-xs font-semibold text-[#19D879]">
                      AI Confidence: {Math.round(aiAnalysis.confidence * 100)}%
                    </span>
                    {typeof aiAnalysis.threatScore === "number" && (
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] border ${
                          aiAnalysis.threatDetected || aiAnalysis.threatScore >= 0.7
                            ? "bg-[#FF5364]/10 border-[#FF5364]/30 text-[#FF5364]"
                            : "bg-[#19D879]/10 border-[#19D879]/30 text-[#19D879]"
                        }`}
                      >
                        {aiAnalysis.threatDetected ? "Threat Active" : "Threat Clear"} ({Math.round(aiAnalysis.threatScore * 100)}%)
                      </span>
                    )}
                    {aiAnalysis.hazmatInfo?.isHazmat && (
                      <span className="rounded-full border border-red-500/50 bg-red-500/20 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-red-300 animate-pulse flex items-center gap-1.5">
                        ☣️ HAZMAT [{aiAnalysis.hazmatInfo.priority || "CRITICAL"}]
                      </span>
                    )}
                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] ${
                        aiAnalysis.severity === "High" || aiAnalysis.severity === "Critical"
                          ? "bg-[#FF5364]/10 text-[#FF5364]"
                          : "bg-[#FFB84D]/10 text-[#FFB84D]"
                      }`}
                    >
                      {aiAnalysis.severity || "Medium"} Severity
                    </span>
                  </div>
                </div>
              </div>

              {/* HAZMAT PRIORITY ESCALATION ALERT BANNER */}
              {aiAnalysis.hazmatInfo?.isHazmat && (
                <div className="border-b border-red-500/30 bg-red-950/40 px-8 py-4 flex flex-wrap items-center justify-between gap-4 text-red-200">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/20 text-lg border border-red-500/40 text-red-400">
                      ☣️
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-red-400">
                          HAZMAT PRIORITY ESCALATION [{aiAnalysis.hazmatInfo.priority || "CRITICAL"}]
                        </span>
                        <span className="rounded bg-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-200 uppercase">
                          {aiAnalysis.hazmatInfo.hazmatType || "Hazardous Waste"}
                        </span>
                      </div>
                      <p className="text-xs text-red-300/90 mt-1 max-w-2xl">
                        {aiAnalysis.hazmatInfo.hazmatAdvisory ||
                          "Hazardous material identified by Computer Vision. Priority escalated. Specialized protective equipment is required for collection."}
                      </p>
                    </div>
                  </div>

                  {aiAnalysis.hazmatInfo.requiredPPE && aiAnalysis.hazmatInfo.requiredPPE.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap rounded-xl border border-red-500/30 bg-black/40 px-3 py-2">
                      <span className="text-[10px] uppercase font-bold text-red-300">Mandatory PPE:</span>
                      {aiAnalysis.hazmatInfo.requiredPPE.map((ppe, i) => (
                        <span key={i} className="rounded-md border border-red-500/40 bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-100">
                          🛡️ {ppe}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* CARD BODY */}
              <div className="grid gap-8 p-8 lg:grid-cols-[1.1fr_0.9fr]">
                {/* LEFT: IMAGE & DISPOSAL GUIDANCE */}
                <div className="space-y-6">
                  <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/[0.08] bg-black">
                    <img
                      src={showAnnotated && aiAnalysis.annotatedImage ? aiAnalysis.annotatedImage : selectedImage}
                      alt="Analyzed incident"
                      className="h-full w-full object-cover"
                    />

                    {/* Dynamic Bounding Box Overlay for AI Object Detection */}
                    {showAnnotated && !aiAnalysis.annotatedImage && aiAnalysis.detections && aiAnalysis.detections.length > 0 && (
                      <div className="absolute inset-0 pointer-events-none">
                        {aiAnalysis.detections.map((det, i) => {
                          const [y1, x1, y2, x2] = det.bbox;
                          const top = `${(y1 / 10).toFixed(1)}%`;
                          const left = `${(x1 / 10).toFixed(1)}%`;
                          const width = `${Math.max(4, (x2 - x1) / 10).toFixed(1)}%`;
                          const height = `${Math.max(4, (y2 - y1) / 10).toFixed(1)}%`;
                          return (
                            <div
                              key={i}
                              className="absolute border-2 border-[#19D879] rounded shadow-[0_0_15px_rgba(25,216,121,0.6)] transition-all"
                              style={{ top, left, width, height }}
                            >
                              <span className="absolute -top-6 left-0 rounded bg-[#071A12] border border-[#19D879] px-2 py-0.5 text-[10px] font-bold text-[#19D879] whitespace-nowrap shadow-md flex items-center gap-1">
                                <span>🎯</span> {det.label} ({Math.round(det.confidence * 100)}%)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="absolute bottom-3 left-3 rounded-lg bg-[#06110D]/80 px-3 py-1.5 text-xs text-[#F4FFF8] backdrop-blur-md flex items-center gap-2">
                      <span>📍 {location.area}</span>
                      {aiAnalysis.isAuthentic && (
                        <span className="rounded bg-[#19D879]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#19D879] border border-[#19D879]/40">
                          ✓ Authentic EXIF
                        </span>
                      )}
                    </div>

                    {(aiAnalysis.annotatedImage || (aiAnalysis.detections && aiAnalysis.detections.length > 0)) && (
                      <button
                        type="button"
                        onClick={() => setShowAnnotated(!showAnnotated)}
                        className="absolute top-3 right-3 rounded-lg bg-[#06110D]/85 border border-white/[0.12] px-2.5 py-1 text-[11px] font-medium text-[#19D879] backdrop-blur-md hover:bg-black transition-colors"
                      >
                        {showAnnotated ? "Hide AI Detection Box" : "Show AI Detection Box"}
                      </button>
                    )}
                  </div>

                  {/* Macro-Environmental Situational Awareness */}
                  {aiAnalysis.environmentalContext && (
                    <div className="rounded-2xl border border-[#19D879]/20 bg-[#0B2118]/50 p-5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#19D879]">
                          🌍 SITUATIONAL AWARENESS
                        </span>
                        <span className="rounded-full bg-[#19D879]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#19D879] border border-[#19D879]/30">
                          Sensitivity: {aiAnalysis.environmentalContext.environmental_sensitivity ?? 5}/10
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-[#F4FFF8]">
                        {aiAnalysis.environmentalContext.macro_description}
                      </p>
                      <div className="mt-2.5 flex items-center gap-2 text-[11px] text-[#91A99C]">
                        <span>Zone Type:</span>
                        <span className={aiAnalysis.environmentalContext.is_designated_waste_zone ? "text-[#19D879] font-medium" : "text-[#FFB84D] font-medium"}>
                          {aiAnalysis.environmentalContext.is_designated_waste_zone ? "Official Designated Waste Point" : "Open / Unmanaged Dump Site"}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Disposal Recommendation */}
                  <div className="rounded-2xl border border-[#19D879]/20 bg-[#0B2118]/50 p-6">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#19D879]">
                      <span>♻ Disposal Recommendation</span>
                    </div>
                    <ul className="mt-3 space-y-2 text-xs leading-5 text-[#F4FFF8]">
                      {aiAnalysis.recommendedDisposal.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-[#19D879]">→</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Handling Precautions */}
                  {aiAnalysis.precautions && aiAnalysis.precautions.length > 0 && (
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#FFB84D]">
                        ⚠️ Handling Precautions
                      </p>
                      <ul className="mt-2 space-y-1.5 text-xs text-[#91A99C]">
                        {aiAnalysis.precautions.map((p, i) => (
                          <li key={i}>• {p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* RIGHT: ONE SURE CLASSIFICATION & STRUCTURED METRICS */}
                <div className="space-y-5">
                  {/* ONE SURE CLASSIFICATION CARD */}
                  <div className="rounded-2xl border-2 border-[#19D879]/40 bg-[#0B2118]/60 p-5 shadow-[0_0_25px_rgba(25,216,121,0.08)]">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-[#19D879] font-bold">
                      AI PREDICTED WASTE CLASSIFICATION
                    </p>

                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-[#F4FFF8]">
                        {aiAnalysis.category}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-[#91A99C]">Primary Type:</span>
                      <span className="rounded-lg bg-[#19D879]/20 px-2.5 py-1 text-xs font-bold text-[#19D879]">
                        {aiAnalysis.wasteType}
                      </span>
                    </div>

                    {/* DIFFERENT TYPES OF WASTE DETECTED IN IMAGE */}
                    <div className="mt-4 border-t border-white/[0.08] pt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#91A99C]">
                        Different Waste Types Detected ({aiAnalysis.types?.length || 1}):
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(aiAnalysis.types || [aiAnalysis.wasteType]).map((type, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 rounded-lg border border-white/[0.10] bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-[#F4FFF8]"
                          >
                            <span className="text-[#19D879]">●</span> {type}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* YOLO ENSEMBLE DETECTIONS */}
                    {aiAnalysis.detections && aiAnalysis.detections.length > 0 && (
                      <div className="mt-4 border-t border-white/[0.08] pt-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#19D879]">
                          Dual-Model DL Detections ({aiAnalysis.detections.length} objects):
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {aiAnalysis.detections.map((det, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#19D879]/30 bg-[#19D879]/10 px-2.5 py-1 text-xs font-medium text-[#F4FFF8]"
                            >
                              <span className="font-bold text-[#19D879]">{det.label.toUpperCase()}</span>
                              <span className="text-[10px] text-[#91A99C]">[{det.superclass}]</span>
                              <span className="text-[10px] font-mono text-[#19D879]">({Math.round(det.confidence * 100)}%)</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Location Info */}
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-[#91A99C]">
                      📍 LOCATION
                    </p>
                    <p className="mt-2 text-base font-semibold text-[#F4FFF8]">
                      {location.area}
                    </p>
                    <p className="mt-1 font-mono text-xs text-[#19D879]">
                      {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                    </p>
                  </div>

                  {/* Estimated Quantity & Volume */}
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-[#91A99C]">
                      📦 ESTIMATED QUANTITY
                    </p>
                    <div className="mt-2 flex items-baseline gap-3">
                      <span className="text-xl font-bold uppercase text-[#F4FFF8]">
                        {aiAnalysis.quantity.scale} Scale
                      </span>
                      <span className="text-xs text-[#91A99C]">
                        {aiAnalysis.quantity.estimatedVolume || "~1–2 m³"}
                      </span>
                    </div>
                  </div>

                  {/* Cleanup Equipment Requirements */}
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-[#91A99C]">
                      🧹 CLEANUP REQUIREMENTS
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {aiAnalysis.recommendedEquipment.map((eq, i) => (
                        <span
                          key={i}
                          className="flex items-center gap-1.5 rounded-lg bg-[#19D879]/10 px-3 py-1.5 text-xs font-medium text-[#19D879]"
                        >
                          ✓ {eq}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* CREATE CLEANUP TASK BUTTON */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleCreateCleanupTask}
                      className="w-full rounded-2xl bg-[#19D879] py-4 text-center text-sm font-semibold text-[#06110D] transition-all hover:bg-[#4DFF9A] hover:shadow-[0_0_35px_rgba(25,216,121,0.25)]"
                    >
                      [ CREATE CLEANUP TASK ]
                    </button>
                    <p className="mt-2 text-center text-xs text-[#91A99C]">
                      Creates an open cleanup mission for neighborhood volunteer crews.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP: CREATED CONFIRMATION (Citizen Reporter view - no volunteer tasks view) */}
        {step === "created" && createdReport && (
          <div className="mx-auto mt-12 max-w-[680px] text-center">
            <div className="overflow-hidden rounded-[28px] border border-[#19D879]/30 bg-[#0B2118]/70 p-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#19D879] text-2xl font-bold text-[#06110D]">
                ✓
              </div>

              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#19D879]">
                INCIDENT REPORT PUBLISHED
              </p>

              <h2 className="mt-2 text-3xl font-semibold">
                Report #{createdReport.id} Submitted
              </h2>

              <div className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs text-[#91A99C]">
                <span>⏰ Time Reported:</span>
                <span className="font-mono font-medium text-[#19D879]">
                  {new Date(createdReport.reportedAt).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                  })}{" "}
                  · Today
                </span>
              </div>

              <p className="mx-auto mt-4 max-w-[500px] text-sm leading-6 text-[#91A99C]">
                Thank you for your report! Your incident has been classified by AI as{" "}
                <strong className="text-[#19D879]">{createdReport.wasteAnalysis.category} ({createdReport.wasteAnalysis.wasteType})</strong>{" "}
                and mapped to the civic cleanup network.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href={`/map?lat=${createdReport.location.latitude}&lng=${createdReport.location.longitude}&zoom=16`}
                  className="w-full rounded-xl bg-[#19D879] px-6 py-3.5 text-sm font-semibold text-[#06110D] transition hover:bg-[#4DFF9A] sm:w-auto"
                >
                  View on City Map →
                </Link>

                <button
                  type="button"
                  onClick={resetPhoto}
                  className="w-full rounded-xl border border-white/[0.10] px-6 py-3.5 text-sm text-[#91A99C] transition hover:text-[#F4FFF8] sm:w-auto"
                >
                  Report Another Incident
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HIDDEN INPUTS */}
        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoSelect}
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* LOCATION PERMISSION / SELECTION MODAL */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-white/[0.12] bg-[#071A12] p-7 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#19D879]/10 text-2xl text-[#19D879]">
              📍
            </div>

            <h3 className="mt-5 text-xl font-semibold">Incident Location Required</h3>

            <p className="mt-2 text-sm leading-6 text-[#91A99C]">
              UrbanTriage coordinates cleanup volunteers using geographical coordinates.
              Please allow browser geolocation or pick your neighborhood below.
            </p>

            <button
              type="button"
              onClick={() => requestLocation()}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#19D879] py-3 text-sm font-semibold text-[#06110D] hover:bg-[#4DFF9A]"
            >
              Allow Browser Geolocation
            </button>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/[0.10]" />
              <span className="text-[10px] uppercase tracking-wider text-[#91A99C]">
                OR SELECT AREA
              </span>
              <div className="h-px flex-1 bg-white/[0.10]" />
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-2 gap-2">
              {DEFAULT_LOCALITIES.slice(0, 4).map((preset) => (
                <button
                  key={preset.area}
                  type="button"
                  onClick={() => handleSelectManualLocation(preset)}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-2.5 text-left text-xs text-[#91A99C] transition hover:border-[#19D879]/30 hover:text-[#F4FFF8]"
                >
                  <p className="font-medium text-[#F4FFF8] truncate">{preset.area.split(",")[0]}</p>
                  <p className="text-[10px] text-[#91A99C]/70">{preset.city}</p>
                </button>
              ))}
            </div>

            {/* Manual text entry */}
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                placeholder="Enter custom locality..."
                value={manualLocationText}
                onChange={(e) => setManualLocationText(e.target.value)}
                className="flex-1 rounded-xl border border-white/[0.10] bg-white/[0.03] px-3.5 py-2.5 text-xs text-[#F4FFF8] placeholder:text-[#91A99C]/50 focus:border-[#19D879] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCustomManualSubmit}
                className="rounded-xl border border-white/[0.10] bg-white/[0.05] px-4 py-2.5 text-xs font-semibold text-[#19D879] hover:bg-[#19D879]/10"
              >
                Set
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowLocationModal(false)}
              className="mt-5 w-full text-center text-xs text-[#91A99C] hover:text-[#F4FFF8]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </main>
  );
}