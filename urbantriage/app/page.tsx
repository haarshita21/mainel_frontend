import Link from "next/link";
import Earth from "@/components/hero/Earth";
import HowItWorks from "@/components/hero/HowItWorks";
import Impact from "@/components/hero/Impact";
export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#06110D] text-[#F4FFF8]">

      {/* ========================= */}
      {/* NAVIGATION */}
      {/* ========================= */}

      <nav className="relative z-50 flex h-[88px] items-center justify-between px-8 md:px-12 lg:px-16">

        {/* Logo */}
        <div className="text-[22px] font-semibold tracking-[-0.04em]">
          Urban<span className="text-[#19D879]">Triage</span>
        </div>

        {/* Navigation */}
        <div className="hidden items-center gap-10 md:flex">

          <a
            href="#how-it-works"
            className="text-sm text-[#91A99C] transition-colors duration-200 hover:text-[#F4FFF8]"
          >
            How it works
          </a>

          <a
            href="#impact"
            className="text-sm text-[#91A99C] transition-colors duration-200 hover:text-[#F4FFF8]"
          >
            Impact
          </a>

          <Link
            href="/signin"
            className="rounded-xl border border-white/[0.10] bg-white/[0.045] px-5 py-2.5 text-sm font-medium text-[#F4FFF8] backdrop-blur-xl transition-all duration-200 hover:border-[#19D879]/30 hover:bg-white/[0.07]"
          >
            Sign in
          </Link>

        </div>

      </nav>


      {/* ========================= */}
      {/* HERO */}
      {/* ========================= */}

      <section className="relative min-h-[calc(100vh-88px)]">

        {/* Ambient background glow */}
        <div className="pointer-events-none absolute left-[35%] top-[25%] h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#19D879]/[0.055] blur-[150px]" />

        <div className="relative mx-auto grid min-h-[calc(100vh-88px)] max-w-[1500px] items-center px-8 md:px-12 lg:grid-cols-[0.92fr_1.08fr] lg:px-16">

          {/* ========================= */}
          {/* LEFT CONTENT */}
          {/* ========================= */}

          <div className="relative z-20 max-w-[650px] pb-16 pt-12 lg:pb-24 lg:pt-0">

            {/* Eyebrow */}

            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.035] px-4 py-2 backdrop-blur-xl">

              <span className="h-1.5 w-1.5 rounded-full bg-[#19D879] shadow-[0_0_10px_rgba(25,216,121,0.7)]" />

              <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#91A99C]">
                AI · ENVIRONMENT · GEOSPATIAL INTELLIGENCE
              </span>

            </div>


            {/* Main heading */}

            <h1 className="max-w-[650px] text-[58px] font-bold leading-[0.98] tracking-[-0.055em] sm:text-[68px] lg:text-[76px]">

              Make your city

              <br />

              <span className="text-[#19D879]">
                cleaner, together.
              </span>

            </h1>


            {/* Description */}

            <p className="mt-7 max-w-[540px] text-[16px] leading-7 text-[#91A99C] md:text-[17px] md:leading-8">

              AI-powered waste detection, intelligent cleanup coordination,
              and community-verified environmental impact.

            </p>


            {/* CTA buttons */}

            <div className="mt-9 flex flex-wrap items-center gap-3">

              <Link
  href="/report"
  className="inline-flex items-center justify-center rounded-xl bg-[#19D879] px-6 py-3 text-sm font-semibold text-[#06110D] transition-all duration-200 hover:bg-[#4DFF9A] hover:shadow-[0_0_30px_rgba(25,216,121,0.18)]"
>
  Report Waste
</Link>


              <Link
  href="/volunteer"
  className="inline-flex items-center justify-center rounded-xl border border-white/[0.10] bg-white/[0.045] px-6 py-3 text-sm font-semibold text-[#F4FFF8] backdrop-blur-xl transition-all duration-200 hover:border-[#19D879]/30 hover:bg-white/[0.07]"
>
  Join as Volunteer
</Link>

            </div>


            {/* Small product statement */}

            <div className="mt-8 flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-[#91A99C]/70">

              <span className="h-px w-8 bg-[#19D879]/40" />

              <span>
                Detect · Mobilize · Verify
              </span>

            </div>

          </div>


          {/* ========================= */}
          {/* RIGHT — EARTH */}
          {/* ========================= */}

          <div className="relative -ml-4 h-[620px] lg:-ml-10 lg:h-[700px]">

            <Earth />

          </div>

        </div>

      </section>
        <HowItWorks />
        <Impact />

    </main>
  );
}