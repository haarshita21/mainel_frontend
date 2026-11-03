"use client";

import { useEffect, useRef, useState } from "react";

const steps = [
  {
    number: "01",
    title: "Report the waste",
    description:
      "Capture a waste hotspot or upload an existing photo. UrbanTriage connects the report with its location and time.",
    label: "REPORT",
    time: 0,
  },
  {
    number: "02",
    title: "AI understands the scene",
    description:
      "Our vision system identifies the waste type, estimates its scale, and determines the cleanup response required.",
    label: "ANALYZE",
    time: 4,
  },
  {
    number: "03",
    title: "Turn reports into action",
    description:
      "Verified hotspots become actionable cleanup missions that nearby volunteers can discover and join.",
    label: "MOBILIZE",
    time: 10,
  },
  {
    number: "04",
    title: "Clean the location",
    description:
      "Volunteers arrive at the reported location and carry out the cleanup.",
    label: "CLEAN",
    time: 12,
  },
  {
    number: "05",
    title: "Verify the impact",
    description:
      "Cleanup evidence is submitted and reviewed so verified contributions become measurable community impact.",
    label: "VERIFY",
    time: 14,
  },
];

export default function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [activeStep, setActiveStep] = useState(0);
  const [videoFinished, setVideoFinished] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const section = sectionRef.current;
    if (!video || !section) return;

    // Play ONLY when scrolled into view; every time revisited, play from start
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.currentTime = 0;
            video.play().catch(() => {});
            setVideoFinished(false);
            setActiveStep(0);
          } else {
            video.pause();
            video.currentTime = 0;
            setVideoFinished(false);
            setActiveStep(0);
          }
        });
      },
      {
        threshold: 0.25,
      }
    );

    observer.observe(section);

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;
      let currentStep = 0;

      for (let i = 0; i < steps.length; i++) {
        if (currentTime >= steps[i].time) {
          currentStep = i;
        }
      }

      setActiveStep(currentStep);
    };

    const handleEnded = () => {
      setVideoFinished(true);
    };

    const handlePlay = () => {
      setVideoFinished(false);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("play", handlePlay);

    return () => {
      observer.disconnect();
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("play", handlePlay);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="relative overflow-hidden bg-[#06110D] px-6 py-32 text-[#F4FFF8] md:px-12 lg:px-16"
    >
      {/* ========================= */}
      {/* HEADER */}
      {/* ========================= */}
      <div className="mx-auto max-w-[850px] text-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-[#19D879]">
          HOW IT WORKS
        </p>

        <h2 className="mt-5 text-4xl font-semibold tracking-[-0.045em] md:text-5xl lg:text-6xl">
          From a report
          <br />
          <span className="text-[#91A99C]">to real-world impact.</span>
        </h2>

        <p className="mx-auto mt-6 max-w-[560px] text-sm leading-7 text-[#91A99C] md:text-base">
          See how UrbanTriage turns a simple waste report into coordinated, verified
          cleanup action.
        </p>
      </div>

      {/* ========================= */}
      {/* VIDEO */}
      {/* ========================= */}
      <div className="mx-auto mt-20 max-w-[850px]">
        <div className="relative">
          {/* glow */}
          <div className="pointer-events-none absolute inset-[-80px] rounded-full bg-[#19D879]/[0.035] blur-[120px]" />

          {/* video - plays on scroll into view from start */}
          <div className="relative overflow-hidden rounded-[24px] border border-white/[0.10] bg-[#071A12] shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
            <video
              ref={videoRef}
              src="/videos/urbantriage-demo.mp4"
              muted
              playsInline
              preload="auto"
              className="aspect-video w-full object-cover"
            />

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#06110D]/70 via-transparent to-transparent" />
          </div>
        </div>

        {/* ========================= */}
        {/* ACTIVE STEP */}
        {/* ========================= */}
        {!videoFinished && (
          <div className="mt-8 text-center">
            <div key={activeStep} className="animate-[stepIn_500ms_ease-out]">
              <div className="flex items-center justify-center gap-3">
                <span className="text-xs font-medium tracking-[0.25em] text-[#19D879]">
                  {steps[activeStep].number}
                </span>

                <span className="h-px w-8 bg-[#19D879]/40" />

                <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#19D879]">
                  {steps[activeStep].label}
                </span>
              </div>

              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-[#F4FFF8] md:text-3xl">
                {steps[activeStep].title}
              </h3>

              <p className="mx-auto mt-3 max-w-[600px] text-sm leading-6 text-[#91A99C]">
                {steps[activeStep].description}
              </p>
            </div>
          </div>
        )}

        {/* ========================= */}
        {/* FINAL HORIZONTAL FLOW */}
        {/* ========================= */}
        {videoFinished && (
          <div className="mt-10">
            <div className="flex flex-col items-center justify-center gap-5 md:flex-row md:gap-0">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center">
                  {/* Step */}
                  <div className="px-4 text-center">
                    <div className="text-[10px] font-medium tracking-[0.2em] text-[#19D879]">
                      {step.number}
                    </div>

                    <div className="mt-1 text-sm font-medium text-[#F4FFF8]">
                      {step.label}
                    </div>
                  </div>

                  {/* connector */}
                  {index < steps.length - 1 && (
                    <div className="hidden h-px w-10 bg-[#19D879]/30 md:block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================= */}
      {/* MOBILE FINAL FLOW */}
      {/* ========================= */}
      {videoFinished && (
        <div className="mx-auto mt-8 max-w-[500px] md:hidden">
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-4">
            {steps.map((step) => (
              <div key={step.number} className="flex items-center gap-2">
                <span className="text-[10px] text-[#19D879]">{step.number}</span>

                <span className="text-xs text-[#F4FFF8]">{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}