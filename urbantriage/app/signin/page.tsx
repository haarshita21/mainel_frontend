"use client";

import Link from "next/link";

export default function SignIn() {
  return (
    <main className="min-h-screen bg-[#06110D] px-6 text-[#F4FFF8]">

      {/* Navbar */}

      <nav className="mx-auto flex h-[88px] max-w-[1200px] items-center justify-between">

        <Link
          href="/"
          className="text-[22px] font-semibold tracking-[-0.04em]"
        >
          Urban<span className="text-[#19D879]">Triage</span>
        </Link>

        <Link
          href="/"
          className="text-sm text-[#91A99C] transition-colors hover:text-[#F4FFF8]"
        >
          ← Back to home
        </Link>

      </nav>


      {/* Main */}

      <div className="flex min-h-[calc(100vh-88px)] items-center justify-center pb-20">

        <div className="w-full max-w-[850px]">

          {/* Heading */}

          <div className="text-center">

            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-[#19D879]">
              SIGN IN
            </p>

            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.045em] md:text-5xl">
              Welcome to UrbanTriage.
            </h1>

            <p className="mx-auto mt-4 max-w-[500px] text-sm leading-7 text-[#91A99C]">
              Choose how you want to contribute to a cleaner
              community.
            </p>

          </div>


          {/* Role selection */}

          <div className="mt-14 grid gap-5 md:grid-cols-2">

            {/* USER */}
            <Link
              href="/signin/user"
              onClick={() => {
                try {
                  localStorage.setItem("urbantriage_role", "user");
                } catch {}
              }}
              className="group rounded-3xl border border-white/[0.09] bg-white/[0.025] p-8 transition-all duration-300 hover:-translate-y-1 hover:border-[#19D879]/30 hover:bg-[#0B2118]/70"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#19D879]/10 text-[#19D879]">
                <span className="text-lg">◎</span>
              </div>

              <h2 className="mt-7 text-2xl font-semibold tracking-[-0.03em]">
                User
              </h2>

              <p className="mt-3 text-sm leading-6 text-[#91A99C]">
                Report waste in your surroundings, track
                cleanup activity, and see the impact your
                reports create.
              </p>

              <div className="mt-8 flex items-center gap-2 text-sm font-medium text-[#19D879]">
                Continue as User
                <span className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </div>
            </Link>

            {/* VOLUNTEER */}
            <Link
              href="/volunteer"
              onClick={() => {
                try {
                  localStorage.setItem("urbantriage_role", "volunteer");
                } catch {}
              }}
              className="group rounded-3xl border border-white/[0.09] bg-white/[0.025] p-8 transition-all duration-300 hover:-translate-y-1 hover:border-[#19D879]/30 hover:bg-[#0B2118]/70"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#19D879]/10 text-[#19D879]">
                <span className="text-lg">✦</span>
              </div>

              <h2 className="mt-7 text-2xl font-semibold tracking-[-0.03em]">
                Volunteer
              </h2>

              <p className="mt-3 text-sm leading-6 text-[#91A99C]">
                Discover nearby cleanup missions, contribute
                your time, and build a verified record of
                environmental impact.
              </p>

              <div className="mt-8 flex items-center gap-2 text-sm font-medium text-[#19D879]">
                Continue as Volunteer
                <span className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </div>
            </Link>

          </div>

        </div>

      </div>

    </main>
  );
}