import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";

// TODO (Sprint 2, Himasha — Content Management): this page is fully
// hardcoded for now. Once ContentBlock rows exist and an admin content
// editor is built, replace the static text below with data fetched from
// GET /api/content — the ContentBlock model already exists in the schema
// for this.
export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <main className="mx-auto max-w-4xl flex-1 px-6 py-16">
        <h1 className="text-4xl font-bold text-slate-900">Empowering Student Entrepreneurs</h1>
        <p className="mt-4 text-sm leading-6 text-slate-500">
          Entre Club is the student-led entrepreneurship hub at the University of Sri
          Jayewardenepura, supporting students who build business concepts and gain real
          experience through workshops and mentoring.
        </p>

        <div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
            <p className="text-3xl font-bold text-blue-600">350+</p>
            <p className="mt-1 text-xs text-slate-500">Student Creators</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
            <p className="text-3xl font-bold text-blue-600">1,200+</p>
            <p className="mt-1 text-xs text-slate-500">Products Sold</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
            <p className="text-3xl font-bold text-blue-600">12</p>
            <p className="mt-1 text-xs text-slate-500">Partner Universities</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
            <p className="text-3xl font-bold text-blue-600">98%</p>
            <p className="mt-1 text-xs text-slate-500">Satisfaction Rate</p>
          </div>
        </div>

        <div className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
          <h2 className="text-xl font-bold text-slate-900">Contact Us</h2>
          <p className="mt-2 text-sm text-slate-500">
            Are you an administrator or university leader? Integrate Startup Spark onto
            your campus to support local student micro-economies.
          </p>
          <a
            href="mailto:entrclub@fhss.sjp.ac.lk"
            className="mt-5 inline-block rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            entrclub@fhss.sjp.ac.lk
          </a>
        </div>
      </main>
      <Footer />
    </div>
  );
}
