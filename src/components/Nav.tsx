import Link from "next/link";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/sectors", label: "產業分類" },
  { href: "/performance", label: "績效排行" },
  { href: "/signals", label: "訊號掃描" },
  { href: "/market", label: "市場環境" },
  { href: "/analyze", label: "分析器" },
];

export default function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-lg font-bold tracking-wide text-cyan-300">
          Mimi Tracker
        </Link>
        <nav className="flex gap-2 sm:gap-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
