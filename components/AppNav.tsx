import Link from "next/link";

const linkClass =
  "rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100 hover:text-emerald-800";

const items: { href: string; label: string }[] = [
  { href: "/", label: "Главная" },
  { href: "/practice", label: "Практика" },
  { href: "/realtime", label: "Realtime" },
  { href: "/agent", label: "Агент" },
  { href: "/rag-upload", label: "Qdrant" },
];

const chatLinks: { href: string; label: string }[] = [
  { href: "/chat", label: "Чат 中文" },
  { href: "/chat/fr", label: "Чат FR" },
  { href: "/chat/es", label: "Чат ES" },
  { href: "/chat/en", label: "Чат EN" },
];

export function AppNav() {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <nav
        className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-1 gap-y-2 px-3 py-2 text-sm sm:gap-x-2 sm:px-4"
        aria-label="Разделы приложения"
      >
        {items.slice(0, 3).map(({ href, label }) => (
          <Link key={href} href={href} className={linkClass}>
            {label}
          </Link>
        ))}
        <span className="hidden text-slate-300 sm:inline" aria-hidden>
          |
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:w-auto w-full sm:mt-0 mt-1">
          Чаты
        </span>
        {chatLinks.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`${linkClass} text-sky-800 hover:text-sky-950`}
          >
            {label}
          </Link>
        ))}
        <span className="hidden text-slate-300 sm:inline" aria-hidden>
          |
        </span>
        {items.slice(3).map(({ href, label }) => (
          <Link key={href} href={href} className={linkClass}>
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
