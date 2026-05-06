import Link from "next/link";

const linkClass =
  "rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100 hover:text-emerald-800";

const items: { href: string; label: string }[] = [
  { href: "/", label: "Главная" },
  { href: "/practice", label: "Практика" },
  { href: "/realtime", label: "Realtime" },
  { href: "/chat", label: "Чат" },
  { href: "/agent", label: "Агент" },
  { href: "/rag-upload", label: "Qdrant" },
];

export function AppNav() {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <nav
        className="mx-auto flex max-w-4xl flex-wrap items-center gap-1 px-3 py-2 text-sm sm:gap-2 sm:px-4"
        aria-label="Разделы приложения"
      >
        {items.map(({ href, label }) => (
          <Link key={href} href={href} className={linkClass}>
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
