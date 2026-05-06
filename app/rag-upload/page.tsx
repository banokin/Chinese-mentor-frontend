"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { API_BASE, uploadRagDocument } from "@/lib/api";

export default function RagUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof uploadRagDocument>
  > | null>(null);

  const onSubmit = useCallback(async () => {
    if (!file || uploading) return;
    setError("");
    setResult(null);
    setUploading(true);
    try {
      const data = await uploadRagDocument(file);
      setResult(data);
      setFile(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setUploading(false);
    }
  }, [file, uploading]);

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 p-6 pb-12 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          className="text-sm text-emerald-700 hover:underline"
          href="/"
        >
          ← На главную
        </Link>
        <Link
          className="text-xs text-violet-700 hover:underline"
          href="/agent"
        >
          К агенту →
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-slate-800">
          Загрузка в Qdrant (RAG)
        </h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Файл отправляется на бэкенд: текст режется на чанки, для каждого
          считается эмбеддинг и точки добавляются в коллекцию из переменной{" "}
          <code className="rounded bg-slate-200 px-1">QDRANT_COLLECTION</code>{" "}
          (по умолчанию{" "}
          <code className="rounded bg-slate-200 px-1">chinese_lexicon</code>
          ).
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Бэкенд: <code className="rounded bg-slate-100 px-1">{API_BASE}</code>
          . Нужны <code className="rounded bg-slate-100 px-1">QDRANT_URL</code>,{" "}
          <code className="rounded bg-slate-100 px-1">OPENAI_API_KEY</code>.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">Файл</h2>
        <p className="mt-1 text-xs text-slate-500">
          Форматы: PDF, TXT, Markdown. Максимум 15&nbsp;MB.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="file"
            accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
            disabled={uploading}
            className="block flex-1 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-amber-900 hover:file:bg-amber-100 disabled:opacity-50"
            onChange={(e) => {
              setResult(null);
              setError("");
              setFile(e.target.files?.[0] ?? null);
            }}
          />
          <button
            type="button"
            disabled={!file || uploading}
            className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-40"
            onClick={() => void onSubmit()}
          >
            {uploading ? "Индексация…" : "Загрузить в векторное хранилище"}
          </button>
        </div>

        {file ? (
          <p className="mt-3 text-xs text-slate-500">
            Выбрано: <span className="font-medium">{file.name}</span>
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        {result ? (
          <dl className="mt-4 grid gap-2 rounded-lg border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950">
            <div className="flex justify-between gap-4">
              <dt className="text-emerald-800">Файл</dt>
              <dd className="font-medium">{result.filename}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-emerald-800">Коллекция</dt>
              <dd className="font-medium">{result.collection}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-emerald-800">Документов</dt>
              <dd>{result.documents}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-emerald-800">Чанков</dt>
              <dd>{result.chunks}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-emerald-800">Размер вектора</dt>
              <dd>{result.vector_size}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-emerald-800">Всего точек в коллекции</dt>
              <dd className="font-semibold">{result.points_count}</dd>
            </div>
          </dl>
        ) : null}
      </section>
    </main>
  );
}
