<<<<<<< HEAD
// Shared footer for public pages. Matches the Figma footer layout.
=======
// Real app-icon-style SVGs (rounded square badges matching each
// platform's actual icon design and colors), the same way they'd
// appear on a phone home screen or an app store listing — used here
// purely as "follow us" links, which is standard, accepted practice
// for linking out to a brand's own platform.

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 48 48" width="48" height="48">
      <rect width="48" height="48" rx="12" fill="#FF0000" />
      <path d="M20 17l11 7-11 7V17z" fill="white" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 48 48" width="48" height="48">
      <defs>
        <linearGradient id="igGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FEDA75" />
          <stop offset="25%" stopColor="#FA7E1E" />
          <stop offset="50%" stopColor="#D62976" />
          <stop offset="75%" stopColor="#962FBF" />
          <stop offset="100%" stopColor="#4F5BD5" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#igGradient)" />
      <rect x="14" y="14" width="20" height="20" rx="6" fill="none" stroke="white" strokeWidth="2.2" />
      <circle cx="24" cy="24" r="5.5" fill="none" stroke="white" strokeWidth="2.2" />
      <circle cx="30.5" cy="17.5" r="1.6" fill="white" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 48 48" width="48" height="48">
      <rect width="48" height="48" rx="12" fill="#1877F2" />
      <path
        d="M27 17h3v-4.5h-3.4c-3.4 0-5.6 2.1-5.6 5.7V21H18v4.5h3v10.5h4.5V25.5H29l.6-4.5h-4.1v-2.4c0-1.1.5-1.6 1.5-1.6z"
        fill="white"
      />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 48 48" width="48" height="48">
      <rect width="48" height="48" rx="12" fill="#0A66C2" />
      <rect x="13" y="20" width="4.5" height="15" fill="white" />
      <circle cx="15.2" cy="14.5" r="2.6" fill="white" />
      <path
        d="M22 20h4.3v2.1h.1c.6-1.1 2.1-2.4 4.3-2.4 4.6 0 5.4 2.9 5.4 6.7V35h-4.5v-7.7c0-1.8 0-4.2-2.6-4.2-2.6 0-3 2-3 4.1V35H22V20z"
        fill="white"
      />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 48 48" width="48" height="48">
      <rect width="48" height="48" rx="12" fill="#010101" />
      <path
        d="M31.2 17.8a6.4 6.4 0 0 1-3.7-3.5V14h-3.9v14.9a2.9 2.9 0 1 1-2.1-2.8v-3.9a6.8 6.8 0 1 0 6 6.8v-7.5a10.3 10.3 0 0 0 4.9 1.3v-3.9a6.4 6.4 0 0 1-1.2-.1z"
        fill="#25F4EE"
      />
      <path
        d="M30 16.8a6.4 6.4 0 0 1-3.7-3.5V13h-3.9v14.9a2.9 2.9 0 1 1-2.1-2.8v-3.9a6.8 6.8 0 1 0 6 6.8v-7.5a10.3 10.3 0 0 0 4.9 1.3v-3.9a6.4 6.4 0 0 1-1.2-.1z"
        fill="#FE2C55"
        opacity="0.85"
      />
      <path
        d="M30.6 17.3a6.4 6.4 0 0 1-3.7-3.5v-.3h-3.9v14.9a2.9 2.9 0 1 1-2.1-2.8v-3.9a6.8 6.8 0 1 0 6 6.8v-7.5a10.3 10.3 0 0 0 4.9 1.3v-3.9a6.4 6.4 0 0 1-1.2-.1z"
        fill="white"
      />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 48 48" width="48" height="48">
      <circle cx="24" cy="24" r="24" fill="#25D366" />
      <path
        d="M24 12.5c-6.3 0-11.5 5.1-11.5 11.5 0 2 .5 4 1.5 5.7L12.5 35.5l5.9-1.5a11.4 11.4 0 0 0 5.6 1.4c6.3 0 11.5-5.1 11.5-11.5S30.3 12.5 24 12.5zm5.9 16.3c-.3.7-1.4 1.4-2 1.5-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.7-.6-3-1.3-5-4.4-5.1-4.6-.2-.2-1.2-1.6-1.2-3.1s.8-2.2 1.1-2.5c.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .7.5.3.6.9 2.1 1 2.2.1.2.2.4 0 .6-.1.2-.2.4-.4.6-.2.2-.4.5-.6.6-.2.2-.4.4-.2.8.2.4 1 1.6 2.1 2.6 1.4 1.3 2.6 1.7 3 1.9.4.2.6.1.9-.1.2-.3.9-1.1 1.2-1.4.3-.4.5-.3.9-.2.4.2 2.4 1.1 2.8 1.3.4.2.6.3.7.5.1.2.1.9-.2 1.6z"
        fill="white"
      />
    </svg>
  );
}

// Shared footer for public pages. Matches the Figma footer layout,
// with a real "Stay tuned" social links section added for Entre Club.
>>>>>>> origin/Dev
export default function Footer() {
  const columns = [
    { title: "Marketplace", items: ["Handmade Crafts", "Tech Products", "WhatsApp Confirm", "Contact Support"] },
    { title: "Categories", items: ["Handmade Crafts", "Tech Products", "WhatsApp Confirm", "Contact Support"] },
    { title: "For Students", items: ["Handmade Crafts", "Tech Products", "WhatsApp Confirm", "Contact Support"] },
    { title: "Company", items: ["Handmade Crafts", "Tech Products", "WhatsApp Confirm", "Contact Support"] },
  ];

<<<<<<< HEAD
  return (
    <footer className="mt-auto bg-[#0D1B33] text-white">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-5">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <img src="/images/startup-spark-logo.png" alt="StartupSpark" className="h-7 w-7 rounded" />
              <span className="text-base font-bold">StartupSpark</span>
=======
  const socialLinks = [
    { icon: YouTubeIcon, label: "YouTube", url: "https://youtube.com/@entreclubfhss?si=fda1qkjTJl9x0XP8" },
    { icon: InstagramIcon, label: "Instagram", url: "https://www.instagram.com/entre_club_fhss?igsh=ZXJldmU1d24yN3Rx&utm_source=qr" },
    { icon: FacebookIcon, label: "Facebook", url: "https://www.facebook.com/share/1G2UYwn7ZG/?mibextid=wwXIfr" },
    { icon: TikTokIcon, label: "TikTok", url: "https://vm.tiktok.com/ZS9kLsGPyDxfW-qFsS2/" },
    { icon: LinkedInIcon, label: "LinkedIn", url: "https://www.linkedin.com/in/entre-club-university-of-sri-jayewardenepura-530502429/" },
    { icon: WhatsAppIcon, label: "WhatsApp", url: "https://chat.whatsapp.com/H14qtBvGURb4fNsKsT7AOD?mode=gi_t" },
  ];

  return (
    <footer className="mt-auto bg-[#0D1B33] text-white">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-6">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <img src="/images/startup-spark-logo.png" alt="StartupSpark" className="h-11 w-11 rounded" />
              <span className="text-lg font-bold">StartupSpark</span>
>>>>>>> origin/Dev
            </div>
            <p className="mt-3 max-w-xs text-xs text-slate-400">
              The ultimate student entrepreneur marketplace. Discover, support, and
              purchase directly from talented minds on campus.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-300">
                {column.title}
              </h3>
              <ul className="mt-3 space-y-2 text-xs text-slate-400">
                {column.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

<<<<<<< HEAD
        <div className="mt-10 border-t border-white/10 pt-6 text-xs text-slate-500">
=======
        {/* Stay tuned / social links — real Entre Club accounts,
            shown as colorful circular icon buttons so they actually
            catch the eye instead of blending in as plain text links. */}
        <div className="mt-10 border-t border-white/10 pt-8">
          <h3 className="text-sm font-bold text-white">Stay tuned with Entre Club 👀🔥🚀</h3>
          <div className="mt-5 flex flex-wrap gap-4">
            {socialLinks.map((social) => {
              const Icon = social.icon;
              return (
                <a
                  key={social.label}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={social.label}
                  className="group flex flex-col items-center gap-1.5"
                >
                  <span className="block overflow-hidden rounded-xl shadow-md transition-transform duration-200 group-hover:scale-110 group-hover:shadow-lg">
                    <Icon />
                  </span>
                  <span className="text-[10px] text-slate-400 transition group-hover:text-white">
                    {social.label}
                  </span>
                </a>
              );
            })}
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-6 text-xs text-slate-500">
>>>>>>> origin/Dev
          © 2026 Startup Spark Inc.
        </div>
      </div>
    </footer>
  );
}
