import type { Metadata } from "next";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import ResetAnalyticsChoice from "@/components/analytics/ResetAnalyticsChoice";

export const metadata: Metadata = {
  title: "Privacy Notice | StartupSpark",
  description: "What StartupSpark stores about visitors, customers and entrepreneurs, and why.",
};

// Static: the same for everyone, prebuilt at build time.
export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">Privacy Notice</h1>
        <p className="mt-2 text-sm text-slate-600">
          This page explains what StartupSpark stores and why. We only collect what the marketplace needs to work.
        </p>

        <Section title="Visitor statistics (Google Analytics)">
          <p>
            If you click <strong>Accept</strong> on the cookie banner, we use Google Analytics to count visits and see
            which public pages are popular (for example, how many people opened the marketplace this month). Google
            sets cookies in your browser for this. It is only used on the public pages, never on the entrepreneur or
            admin portals, checkout or order pages, and page addresses are sent without any search terms or order
            codes.
          </p>
          <p>
            If you click <strong>Decline</strong>, Google Analytics is not loaded at all. You can change your choice
            here:
          </p>
          <ResetAnalyticsChoice />
        </Section>

        <Section title="Customers placing an order">
          <p>
            Your name, phone number, delivery location and message are saved with the order and shared with the
            seller so they can contact you and deliver it. You don&apos;t need an account. Your cart is kept only in
            your own browser.
          </p>
        </Section>

        <Section title="Student entrepreneurs">
          <p>
            Your name, email, phone/WhatsApp number, university details and business information are used to review
            your application and to show your shop. Your password is stored only as a secure hash. When you sign in,
            a login cookie keeps you signed in; it is required for the portal to work.
          </p>
        </Section>

        <Section title="Where the data is kept">
          <p>
            The website is hosted on Vercel, the database on Neon, and uploaded images in Vercel Blob storage. Emails
            (such as application decisions and password resets) are sent through Gmail.
          </p>
        </Section>

        <Section title="Questions or removal requests">
          <p>
            Contact the StartupSpark team if you would like your details corrected or removed.
          </p>
        </Section>
      </main>

      <Footer />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-6 text-slate-700">{children}</div>
    </section>
  );
}
