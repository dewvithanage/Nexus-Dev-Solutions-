// Shared footer for public pages. Matches the Figma footer layout.
export default function Footer() {
  const columns = [
    { title: "Marketplace", items: ["Handmade Crafts", "Tech Products", "WhatsApp Confirm", "Contact Support"] },
    { title: "Categories", items: ["Handmade Crafts", "Tech Products", "WhatsApp Confirm", "Contact Support"] },
    { title: "For Students", items: ["Handmade Crafts", "Tech Products", "WhatsApp Confirm", "Contact Support"] },
    { title: "Company", items: ["Handmade Crafts", "Tech Products", "WhatsApp Confirm", "Contact Support"] },
  ];

  return (
    <footer className="mt-auto bg-[#0D1B33] text-white">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-5">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <img src="/images/startup-spark-logo.png" alt="StartupSpark" className="h-7 w-7 rounded" />
              <span className="text-base font-bold">StartupSpark</span>
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

        <div className="mt-10 border-t border-white/10 pt-6 text-xs text-slate-500">
          © 2026 Startup Spark Inc.
        </div>
      </div>
    </footer>
  );
}

