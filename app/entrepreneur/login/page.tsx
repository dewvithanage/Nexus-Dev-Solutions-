import Image from "next/image";
import Link from "next/link";
import EntrepreneurLoginForm from "@/components/entrepreneur/EntrepreneurLoginForm";

export default function EntrepreneurLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#101b31] px-4 py-10">
      <section className="w-full max-w-[390px] rounded-xl bg-white px-8 py-8 shadow-lg">
        <div className="mb-4 flex justify-center">
          <Image
            src="/images/startup-spark-logo.png"
            alt="StartupSpark Logo"
            width={70}
            height={70}
            priority
            className="object-contain"
          />
        </div>

        <div className="mb-7 text-center">
          <h1 className="text-xl font-bold text-slate-900">Entrepreneur Portal</h1>
          <p className="mt-1 text-xs text-slate-500">StartupSpark University Marketplace</p>
        </div>

        <EntrepreneurLoginForm />

        <p className="mt-5 text-center text-xs text-slate-500">
          New entrepreneur?{" "}
          <Link href="/entrepreneur/register" className="font-semibold text-blue-600 hover:underline">
            Register here
          </Link>
        </p>
      </section>
    </main>
  );
}
