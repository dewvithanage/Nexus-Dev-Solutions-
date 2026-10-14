import { Suspense } from "react";
import PageSkeleton from "@/components/public/PageSkeleton";
import Image from "next/image";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import AboutStats from "@/components/public/AboutStats";

// The figures below are counted live from the database, so the page is
// rendered on each request rather than once at build time.
export const dynamic = "force-dynamic";

export const metadata = { title: "About | StartupSpark" };

export default async function AboutPage() {
  const steps = [
    {
      number: 1,
      title: "Apply & Verify",
      description:
        "Student status verification ensures every product or digital service listing belongs to a registered university entrepreneur.",
    },
    {
      number: 2,
      title: "Build Your Shop",
      description:
        "Launch products within minutes with clean image portfolios, clear turnaround targets, and customized deliverables.",
    },
    {
      number: 3,
      title: "WhatsApp Connect",
      description:
        "Buyers can contact sellers via WhatsApp to coordinate payments or safe campus pickups.",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 py-16 md:grid-cols-2">
          <div>
            <h1 className="text-4xl font-bold leading-tight text-slate-900">
              Empowering Student Entrepreneurs
            </h1>

            <p className="mt-4 text-sm leading-6 text-slate-500">
              Entre Club – University of Sri Jayewardenepura is the
              student-led entrepreneurship hub established under the
              Entrepreneurship Development Unit. It serves as a platform
              where students with innovative ideas can build business
              concepts, develop entrepreneurial abilities, and gain
              exposure through workshops, competitions, mentoring, and
              networking opportunities.
            </p>
          </div>

          <div className="relative min-h-[280px] overflow-hidden rounded-xl bg-slate-100">
            <Image src="/images/new-hero.png" alt="Startup Spark student entrepreneurship community" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
          </div>
        </section>

        {/* Statistics Section */}
        <Suspense fallback={<PageSkeleton />}><AboutStats /></Suspense>

        {/* How It Works Section */}
        <section className="mx-auto max-w-6xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold text-slate-900">
            How We Spark Success
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Our campus model is designed around university student
            schedules.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-6 text-left md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.number}
                className="rounded-xl border border-slate-200 bg-slate-50 p-6"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {step.number}
                </div>

                <h3 className="mt-4 text-base font-bold text-slate-900">
                  {step.title}
                </h3>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact Section */}
        <section className="bg-slate-50 py-16">
          <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white px-8 py-10 text-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              Contact Us
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Are you an administrator or university leader? Integrate
              Startup Spark onto your campus to support local student
              micro-economies.
            </p>

            <a
              href="mailto:entrclub@fhss.sjp.ac.lk"
              className="mt-5 inline-block rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              entrclub@fhss.sjp.ac.lk
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
