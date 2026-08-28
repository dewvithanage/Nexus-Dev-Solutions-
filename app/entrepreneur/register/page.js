import EntrepreneurRegisterForm from "../../../components/entrepreneur/EntrepreneurRegisterForm";

// Entrepreneur registration page
export default function EntrepreneurRegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#101b31] px-4 py-10">
      {/* Registration card */}
      <section className="w-full max-w-lg rounded-xl bg-white p-8 shadow-lg">
        {/* Page heading */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">
            Entrepreneur Registration
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Create your StartupSpark entrepreneur account
          </p>
        </div>

        {/* Registration form */}
        <EntrepreneurRegisterForm />
      </section>
    </main>
  );
}