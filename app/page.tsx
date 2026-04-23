import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold text-slate-800">
        Тренажёр произношения
      </h1>
      <p className="text-slate-600">
        Выберите режим: обычная практика с загрузкой записи или упрощённый
        realtime по WebSocket.
      </p>
      <nav className="flex flex-col gap-3">
        <Link
          className="rounded-lg bg-emerald-600 px-4 py-3 text-center font-medium text-white hover:bg-emerald-700"
          href="/practice"
        >
          Практика (/practice)
        </Link>
        <Link
          className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-center font-medium text-slate-800 hover:bg-slate-50"
          href="/realtime"
        >
          Realtime (/realtime)
        </Link>
        <Link
          className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-center font-medium text-sky-900 hover:bg-sky-100"
          href="/chat"
        >
          Чат с собеседником (/chat)
        </Link>
        <Link
          className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-center font-medium text-violet-900 hover:bg-violet-100"
          href="/agent"
        >
          ReAct-агент (/agent)
        </Link>
      </nav>
    </main>
  );
}
