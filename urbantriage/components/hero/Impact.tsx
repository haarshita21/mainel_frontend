"use client";

const impacts = [
  {
    number: "01",
    title: "Environmental Impact",
    text: "Identify waste hotspots, coordinate targeted cleanup, and build a continuously updated picture of recurring waste across communities.",
  },
  {
    number: "02",
    title: "Community Impact",
    text: "Turn citizens and volunteers into active participants by making reporting, cleanup, and verified contribution part of one connected system.",
  },
  {
    number: "03",
    title: "CSR Integration",
    text: "Companies can support verified cleanup initiatives, sponsor local drives, and track the environmental and community outcomes of their CSR programs.",
  },
  {
    number: "04",
    title: "ESG Intelligence",
    text: "Convert verified cleanup activity into structured environmental and social impact data that organizations can use for ESG reporting and monitoring.",
  },
  {
    number: "05",
    title: "Revenue Model",
    text: "The platform can generate revenue through CSR partnerships, sponsored cleanup campaigns, organizational dashboards, and analytics services.",
  },
];

export default function Impact() {
  return (
    <section
      id="impact"
      className="relative overflow-hidden bg-[#06110D] px-6 py-32 text-[#F4FFF8] md:px-12 lg:px-16"
    >
      {/* Heading */}

      <div className="mx-auto max-w-[850px] text-center">

        <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-[#19D879]">
          IMPACT
        </p>

        <h2 className="mt-5 text-4xl font-semibold tracking-[-0.045em] md:text-5xl lg:text-6xl">
          From cleaner streets
          <br />
          <span className="text-[#91A99C]">
            to measurable impact.
          </span>
        </h2>

        <p className="mx-auto mt-6 max-w-[600px] text-sm leading-7 text-[#91A99C] md:text-base">
          UrbanTriage connects environmental action with
          measurable community, CSR, and ESG outcomes.
        </p>

      </div>


      {/* Impact list */}

      <div className="mx-auto mt-20 max-w-[1050px]">

        {impacts.map((impact, index) => (

          <div
            key={impact.number}
            className={`
              group grid gap-6 border-t border-white/[0.08]
              py-9 transition-all duration-300
              hover:border-[#19D879]/30
              md:grid-cols-[90px_280px_1fr]
              ${
                index === impacts.length - 1
                  ? "border-b"
                  : ""
              }
            `}
          >

            {/* Number */}

            <div className="text-sm tracking-[0.18em] text-[#19D879]/70">
              {impact.number}
            </div>


            {/* Title */}

            <h3 className="text-xl font-semibold tracking-[-0.025em] text-[#F4FFF8] transition-colors duration-300 group-hover:text-[#19D879]">
              {impact.title}
            </h3>


            {/* Description */}

            <p className="max-w-[570px] text-sm leading-7 text-[#91A99C]">
              {impact.text}
            </p>

          </div>

        ))}

      </div>

    </section>
  );
}