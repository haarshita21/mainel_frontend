"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

const leaderboard = [
  {
    rank: 1,
    name: "Ananya",
    points: 2480,
    cleanups: 31,
    impact: "126 kg",
    level: "Eco Champion",
    medal: "GOLD",
    image: "/badges/gold.png",
  },
  {
    rank: 2,
    name: "Rahul",
    points: 2190,
    cleanups: 27,
    impact: "108 kg",
    level: "Green Leader",
    medal: "SILVER",
    image: "/badges/silver.png",
  },
  {
    rank: 3,
    name: "You",
    points: 1840,
    cleanups: 21,
    impact: "84 kg",
    level: "Eco Warrior",
    medal: "BRONZE",
    image: "/badges/bronze.png",
    currentUser: true,
  },
];

export default function VolunteerLeaderboard() {
  const [showCelebration, setShowCelebration] = useState(false);

  const currentUser = leaderboard.find(
    (person) => person.currentUser
  );

  /*
   * Celebration is shown ONLY when the current user
   * is actually in the top 3.
   */
  useEffect(() => {
    if (!currentUser || currentUser.rank > 3) {
      setShowCelebration(false);
      return;
    }

    setShowCelebration(true);

    const finish = window.setTimeout(() => {
      setShowCelebration(false);
    }, 4200);

    return () => {
      window.clearTimeout(finish);
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#06110D] text-[#F4FFF8]">

      {/* =====================================================
          CELEBRATION
      ===================================================== */}

      {showCelebration && currentUser && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#030906]/95 backdrop-blur-xl">

          {/* Ambient glow */}

          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#19D879]/10 blur-[140px]" />

          {/* Left confetti */}

          <div className="pointer-events-none absolute inset-y-0 left-0 w-[30vw] overflow-hidden">
            {Array.from({ length: 35 }).map((_, index) => (
              <span
                key={`left-${index}`}
                className="leader-confetti leader-confetti-left"
                style={
                  {
                    top: `${5 + ((index * 17) % 88)}%`,
                    animationDelay: `${(index % 10) * 70}ms`,
                    "--travel": `${38 + (index % 7) * 7}vw`,
                    "--rotate": `${360 + (index % 5) * 180}deg`,
                  } as CSSProperties
                }
              />
            ))}
          </div>

          {/* Right confetti */}

          <div className="pointer-events-none absolute inset-y-0 right-0 w-[30vw] overflow-hidden">
            {Array.from({ length: 35 }).map((_, index) => (
              <span
                key={`right-${index}`}
                className="leader-confetti leader-confetti-right"
                style={
                  {
                    top: `${5 + ((index * 19) % 88)}%`,
                    animationDelay: `${(index % 10) * 70}ms`,
                    "--travel": `${38 + (index % 7) * 7}vw`,
                    "--rotate": `${360 + (index % 5) * 180}deg`,
                  } as CSSProperties
                }
              />
            ))}
          </div>

          {/* Celebration content */}

          <div className="relative z-10 flex w-full max-w-[600px] flex-col items-center px-6 text-center">

            <p className="celebration-fade text-[10px] font-semibold uppercase tracking-[0.38em] text-[#19D879]">
              COMMUNITY IMPACT
            </p>

            <h2 className="celebration-fade mt-4 text-3xl font-semibold tracking-[-0.05em] md:text-4xl">
              Congratulations!
            </h2>

            <p className="celebration-fade mt-3 max-w-[420px] text-sm leading-6 text-[#91A99C]">
              You made it into the top 3 volunteers this month.
            </p>

            {/* =================================================
                ONLY THE USER'S MEDAL
            ================================================= */}

            <div className="mt-7 flex min-h-[350px] flex-col items-center justify-center">

              <div className="badge-celebration">

                <img
                  src={currentUser.image}
                  alt={`${currentUser.medal} medal`}
                  className="badge-medal"
                />

                <div className="mt-[-4px]">

                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#19D879]">
                    #{currentUser.rank} · {currentUser.medal}
                  </p>

                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                    {currentUser.level}
                  </h3>

                </div>

              </div>

            </div>

            <button
              type="button"
              onClick={() => setShowCelebration(false)}
              className="mt-4 rounded-full border border-white/[0.10] bg-white/[0.04] px-5 py-2.5 text-xs text-[#91A99C] backdrop-blur-xl transition-all duration-200 hover:border-[#19D879]/30 hover:bg-[#19D879]/10 hover:text-[#F4FFF8]"
            >
              Skip celebration
            </button>

          </div>
        </div>
      )}

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <nav className="mx-auto flex h-[88px] max-w-[1200px] items-center justify-between px-6">

        <Link
          href="/volunteer"
          className="text-[22px] font-semibold tracking-[-0.04em]"
        >
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
            Tasks
          </Link>

          <Link
            href="/volunteer/notifications"
            className="rounded-xl px-4 py-2.5 text-sm text-[#91A99C] transition-colors hover:text-[#F4FFF8]"
          >
            Notifications
          </Link>

          <Link
            href="/map"
            className="rounded-xl px-4 py-2.5 text-sm text-[#91A99C] transition-colors hover:text-[#F4FFF8]"
          >
            City Map
          </Link>

        </div>
      </nav>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <section className="mx-auto max-w-[1100px] px-6 pb-24 pt-12">

        {/* HEADER */}

        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">

          <div>

            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-[#19D879]">
              COMMUNITY IMPACT
            </p>

            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.045em] md:text-5xl">
              Leaderboard
            </h1>

            <p className="mt-4 max-w-[620px] text-sm leading-7 text-[#91A99C] md:text-base">
              See how volunteers are turning cleanup actions into
              measurable environmental impact.
            </p>

          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] px-4 py-3">

            <p className="text-[9px] uppercase tracking-[0.18em] text-[#91A99C]">
              Ranking period
            </p>

            <p className="mt-1 text-sm font-medium">
              This month
            </p>

          </div>

        </div>

        {/* =====================================================
            YOUR IMPACT
        ===================================================== */}

        <div className="mt-10 rounded-[28px] border border-[#19D879]/20 bg-[#0B2118]/60 p-7">

          <div className="flex flex-col justify-between gap-7 md:flex-row md:items-center">

            <div>

              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#19D879]">
                YOUR IMPACT
              </p>

              <div className="mt-3 flex items-end gap-3">

                <span className="text-4xl font-semibold tracking-[-0.04em]">
                  #{currentUser?.rank}
                </span>

                <span className="mb-1 text-sm text-[#91A99C]">
                  this month
                </span>

              </div>

              <p className="mt-2 text-sm text-[#91A99C]">
                Keep contributing to move up the community leaderboard.
              </p>

            </div>

            <div className="grid grid-cols-3 gap-3">

              <div className="rounded-2xl border border-white/[0.07] bg-black/10 px-5 py-4">
                <p className="text-[10px] text-[#91A99C]">
                  Points
                </p>

                <p className="mt-2 text-xl font-semibold">
                  {currentUser?.points.toLocaleString()}
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-black/10 px-5 py-4">
                <p className="text-[10px] text-[#91A99C]">
                  Cleanups
                </p>

                <p className="mt-2 text-xl font-semibold">
                  {currentUser?.cleanups}
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-black/10 px-5 py-4">
                <p className="text-[10px] text-[#91A99C]">
                  Impact
                </p>

                <p className="mt-2 text-xl font-semibold">
                  {currentUser?.impact}
                </p>
              </div>

            </div>

          </div>

        </div>

        {/* =====================================================
            TOP 3
        ===================================================== */}

        <div className="mt-8 grid gap-4 md:grid-cols-3">

          {leaderboard.map((person) => (

            <div
              key={person.rank}
              className={`relative rounded-[28px] border p-7 ${
                person.currentUser
                  ? "border-[#19D879]/25 bg-[#0B2118]/60"
                  : "border-white/[0.08] bg-white/[0.025]"
              }`}
            >

              {person.currentUser && (
                <div className="absolute right-5 top-5 rounded-full bg-[#19D879]/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#19D879]">
                  You
                </div>
              )}

              <p className="text-3xl font-semibold text-[#19D879]">
                #{person.rank}
              </p>

              <h2 className="mt-5 text-xl font-semibold">
                {person.name}
              </h2>

              <p className="mt-1 text-xs text-[#91A99C]">
                {person.level}
              </p>

              {/* Medal */}

              <div className="mt-5 flex h-[120px] items-center justify-center">

                <img
                  src={person.image}
                  alt={`${person.medal} medal`}
                  className="h-[105px] w-[120px] object-contain"
                />

              </div>

              <div className="mt-3">

                <p className="text-2xl font-semibold">
                  {person.points.toLocaleString()}
                </p>

                <p className="text-xs text-[#91A99C]">
                  points
                </p>

              </div>

              <div className="mt-5 flex justify-between border-t border-white/[0.07] pt-4 text-xs">

                <span className="text-[#91A99C]">
                  Cleanups
                </span>

                <span className="font-medium">
                  {person.cleanups}
                </span>

              </div>

              <div className="mt-3 flex justify-between text-xs">

                <span className="text-[#91A99C]">
                  Impact
                </span>

                <span className="font-medium text-[#19D879]">
                  {person.impact}
                </span>

              </div>

            </div>

          ))}

        </div>

        {/* =====================================================
            COMMUNITY RANKINGS
        ===================================================== */}

        <div className="mt-8 overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.02]">

          <div className="border-b border-white/[0.07] px-6 py-5">

            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#91A99C]">
              COMMUNITY RANKINGS
            </p>

            <h2 className="mt-2 text-lg font-semibold">
              Volunteer impact
            </h2>

          </div>

          <div className="divide-y divide-white/[0.06]">

            {leaderboard.map((person) => (

              <div
                key={person.rank}
                className={`grid grid-cols-[50px_1fr_auto] items-center gap-4 px-6 py-5 md:grid-cols-[60px_1fr_120px_120px_140px] ${
                  person.currentUser
                    ? "bg-[#19D879]/[0.05]"
                    : ""
                }`}
              >

                <div className="text-sm font-semibold text-[#19D879]">
                  #{person.rank}
                </div>

                <div>

                  <p className="text-sm font-medium">

                    {person.name}

                    {person.currentUser && (
                      <span className="ml-2 rounded-full bg-[#19D879]/10 px-2 py-1 text-[9px] text-[#19D879]">
                        YOU
                      </span>
                    )}

                  </p>

                  <p className="mt-1 text-[10px] text-[#91A99C]">
                    {person.level}
                  </p>

                </div>

                <div className="hidden text-right md:block">

                  <p className="text-sm font-medium">
                    {person.points.toLocaleString()}
                  </p>

                  <p className="text-[10px] text-[#91A99C]">
                    points
                  </p>

                </div>

                <div className="hidden text-right md:block">

                  <p className="text-sm font-medium">
                    {person.cleanups}
                  </p>

                  <p className="text-[10px] text-[#91A99C]">
                    cleanups
                  </p>

                </div>

                <div className="text-right">

                  <p className="text-sm font-medium text-[#19D879]">
                    {person.impact}
                  </p>

                  <p className="text-[10px] text-[#91A99C]">
                    estimated impact
                  </p>

                </div>

              </div>

            ))}

          </div>

        </div>

        {/* =====================================================
            PROGRESSION
        ===================================================== */}

        <div className="mt-8 rounded-[28px] border border-white/[0.08] bg-white/[0.02] p-7">

          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#19D879]">
            PROGRESSION
          </p>

          <h2 className="mt-3 text-xl font-semibold">
            Grow your environmental impact
          </h2>

          <p className="mt-2 max-w-[650px] text-sm leading-6 text-[#91A99C]">
            Volunteers earn points through verified cleanup
            participation. Future levels and badges can be tied
            directly to measurable impact.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">

            <div className="rounded-2xl border border-white/[0.07] bg-black/10 p-5">

              <p className="text-sm font-semibold">
                Green Starter
              </p>

              <p className="mt-2 text-xs text-[#91A99C]">
                Begin contributing to your community.
              </p>

            </div>

            <div className="rounded-2xl border border-[#19D879]/15 bg-[#19D879]/[0.04] p-5">

              <p className="text-sm font-semibold text-[#19D879]">
                Eco Warrior
              </p>

              <p className="mt-2 text-xs text-[#91A99C]">
                Consistent cleanup participation and impact.
              </p>

            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-black/10 p-5">

              <p className="text-sm font-semibold">
                Eco Champion
              </p>

              <p className="mt-2 text-xs text-[#91A99C]">
                High-impact contribution across the network.
              </p>

            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          ANIMATIONS
      ===================================================== */}

      <style jsx global>{`

        /* ============================================
           MEDAL
           Horizontal / Y-axis rotation
        ============================================ */

        @keyframes badgeEntrance {

          0% {
            opacity: 0;
            transform:
              translateY(45px)
              scale(0.72)
              rotateY(0deg);
          }

          15% {
            opacity: 1;
          }

          50% {
            transform:
              translateY(-6px)
              scale(1.05)
              rotateY(180deg);
          }

          75% {
            transform:
              translateY(2px)
              scale(0.98)
              rotateY(300deg);
          }

          100% {
            opacity: 1;
            transform:
              translateY(0)
              scale(1)
              rotateY(360deg);
          }

        }

        .badge-celebration {
          display: flex;
          flex-direction: column;
          align-items: center;

          perspective: 1200px;

          animation:
            badgeEntrance
            1.8s
            cubic-bezier(0.22, 1, 0.36, 1)
            both;

          will-change: transform, opacity;
        }

        .badge-medal {
          width: 270px;
          height: 240px;

          object-fit: contain;

          background: transparent;

          transform-style: preserve-3d;

          filter:
            drop-shadow(
              0 25px 25px
              rgba(0, 0, 0, 0.42)
            )
            drop-shadow(
              0 0 28px
              rgba(25, 216, 121, 0.10)
            );

          will-change: transform;
        }

        /* ============================================
           CELEBRATION TEXT
        ============================================ */

        @keyframes celebrationFade {

          from {
            opacity: 0;
            transform: translateY(10px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }

        }

        .celebration-fade {
          animation:
            celebrationFade
            700ms
            ease-out
            both;
        }

        /* ============================================
           CONFETTI
        ============================================ */

        .leader-confetti {
          position: absolute;

          width: 7px;
          height: 14px;

          border-radius: 2px;

          opacity: 0;

          animation-duration: 2.7s;
          animation-timing-function:
            cubic-bezier(0.12, 0.75, 0.2, 1);
          animation-fill-mode: forwards;
        }

        .leader-confetti:nth-child(4n) {
          background: #19D879;
        }

        .leader-confetti:nth-child(4n + 1) {
          background: #4DFF9A;
        }

        .leader-confetti:nth-child(4n + 2) {
          background: #FFB84D;
        }

        .leader-confetti:nth-child(4n + 3) {
          background: #F4FFF8;
        }

        @keyframes confettiLeft {

          0% {
            opacity: 0;

            transform:
              translateX(-40px)
              translateY(-10px)
              rotate(0deg)
              scale(0.6);
          }

          12% {
            opacity: 1;
          }

          100% {
            opacity: 0;

            transform:
              translateX(var(--travel))
              translateY(90px)
              rotate(var(--rotate))
              scale(1);
          }

        }

        @keyframes confettiRight {

          0% {
            opacity: 0;

            transform:
              translateX(40px)
              translateY(-10px)
              rotate(0deg)
              scale(0.6);
          }

          12% {
            opacity: 1;
          }

          100% {
            opacity: 0;

            transform:
              translateX(calc(var(--travel) * -1))
              translateY(90px)
              rotate(var(--rotate))
              scale(1);
          }

        }

        .leader-confetti-left {
          animation-name: confettiLeft;
        }

        .leader-confetti-right {
          animation-name: confettiRight;
        }

        /* ============================================
           MOBILE
        ============================================ */

        @media (max-width: 640px) {

          .badge-medal {
            width: 220px;
            height: 200px;
          }

        }

      `}</style>

    </main>
  );
}