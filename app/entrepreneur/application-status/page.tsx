import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, CircleDashed, Clock3, Mail, Store } from "lucide-react";

import LogoutButton from "@/components/entrepreneur/LogoutButton";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Where an entrepreneur waits while an admin reviews their registration.
// The seller pages (dashboard, products, orders...) send pending accounts
// here; approved accounts are sent on to their dashboard.
export default async function ApplicationStatusPage() {
  const user = await getCurrentUser();
  const profile = user?.entrepreneurProfile;

  if (!user || user.role !== "ENTREPRENEUR" || !profile) {
    redirect("/entrepreneur/login");
  }

  if (profile.status === "APPROVED") {
    redirect("/entrepreneur/dashboard");
  }

  const business = profile.business;
  const rejected = profile.status === "REJECTED";

  // A fuller profile gives the admin more to go on, so show what's missing.
  const profileChecklist = [
    { label: "Business description", done: !!business?.description },
    { label: "Faculty", done: !!profile.university },
    { label: "WhatsApp number", done: !!profile.whatsappNumber },
    { label: "Business logo", done: !!business?.logoUrl },
  ];
  const profileComplete = profileChecklist.every((item) => item.done);

  const latestNotification = await prisma.notification.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const steps = [
    { title: "Application submitted", detail: profile.appliedAt.toLocaleDateString(), state: "done" as const },
    {
      title: rejected ? "Application not approved" : "Admin review",
      detail: rejected
        ? profile.rejectionReason || "Contact the Startup Spark team for details."
        : "Usually within a few days",
      state: rejected ? ("rejected" as const) : ("current" as const),
    },
    { title: "Start selling", detail: "Add products once you're approved", state: "todo" as const },
  ];

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#101b31] px-4 py-10">
      <section className="w-full max-w-[520px] rounded-xl bg-white px-8 py-8 shadow-lg">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/images/startup-spark-logo.png" alt="StartupSpark Logo" width={40} height={40} className="object-contain" />
            <span className="text-sm font-bold text-slate-900">StartupSpark</span>
          </div>
          <LogoutButton className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50" />
        </div>

        <div className="mb-6">
          <p className="text-xs font-medium text-slate-500">{business?.businessName}</p>
          <h1 className="mt-1 text-xl font-bold text-slate-900">
            {rejected ? "Your application was not approved" : "Your application is under review"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {rejected
              ? "You can't sell on StartupSpark with this account."
              : `Thanks for applying, ${user.name}. An admin from the Startup Spark team checks every new seller before they can list products.`}
          </p>
        </div>

        <ol className="mb-6 space-y-4">
          {steps.map((step) => (
            <li key={step.title} className="flex gap-3">
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  step.state === "done"
                    ? "bg-emerald-100 text-emerald-600"
                    : step.state === "current"
                    ? "bg-amber-100 text-amber-600"
                    : step.state === "rejected"
                    ? "bg-red-100 text-red-600"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {step.state === "done" ? <Check size={13} /> : step.state === "current" ? <Clock3 size={13} /> : <CircleDashed size={13} />}
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-800">{step.title}</p>
                <p className="text-xs text-slate-500">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>

        {!rejected && (
          <div className="mb-5 rounded-lg border border-slate-200 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Store size={15} className="text-blue-600" />
              <p className="text-sm font-semibold text-slate-800">
                {profileComplete ? "Your business profile is complete" : "Complete your business profile"}
              </p>
            </div>
            <p className="mb-3 text-xs leading-5 text-slate-500">
              The admin uses your profile to review your application. A complete profile helps.
            </p>
            <ul className="mb-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              {profileChecklist.map((item) => (
                <li key={item.label} className={`flex items-center gap-1.5 ${item.done ? "text-emerald-600" : "text-slate-500"}`}>
                  {item.done ? <Check size={12} /> : <CircleDashed size={12} />}
                  {item.label}
                </li>
              ))}
            </ul>
            <Link
              href="/entrepreneur/profile"
              className="inline-block rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              {profileComplete ? "View business profile" : "Complete business profile"}
            </Link>
          </div>
        )}

        {latestNotification && (
          <div className="mb-5 rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-700">{latestNotification.title}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{latestNotification.message}</p>
          </div>
        )}

        <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
          <Mail size={14} className="mt-0.5 shrink-0" />
          {rejected
            ? "If you think this is a mistake, contact the Startup Spark team."
            : `We'll email ${user.email} as soon as an admin has reviewed your application. You can then sign in and start selling.`}
        </p>
      </section>
    </main>
  );
}
