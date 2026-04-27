"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE, transcribeAudio } from "@/lib/api";

type Role = "user" | "assistant";

type Msg = { role: Role; content: string };
type RagUploadResult = {
  filename: string;
  collection: string;
  documents: number;
  chunks: number;
  points_count: number;
};

export default function AgentPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string>("");
  const [ragFile, setRagFile] = useState<File | null>(null);
  const [ragUploading, setRagUploading] = useState(false);
  const [ragUploadResult, setRagUploadResult] = useState<RagUploadResult | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendText = useCallback(async (text: string, opts?: { clearInput?: boolean }) => {
    const normalized = text.trim();
    if (!normalized || loading) return;
    setError("");
    if (opts?.clearInput ?? true) setInput("");

    const before = messages;
    const next: Msg[] = [...before, { role: "user", content: normalized }];
    setMessages(next);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/agent/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg =
          typeof err?.detail?.message === "string"
            ? err.detail.message
            : JSON.stringify(err);
        setError(msg);
        setMessages(before);
        return;
      }
      const data = (await res.json()) as { message?: string };
      const reply = String(data.message ?? "").trim();
      if (!reply) {
        setError("Пустой ответ");
        setMessages(before);
        return;
      }
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      setError(String(e));
      setMessages(before);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const send = useCallback(async () => {
    await sendText(input, { clearInput: true });
  }, [input, sendText]);

  const uploadRagFile = useCallback(async () => {
    if (!ragFile || ragUploading) return;

    setError("");
    setRagUploadResult(null);
    setRagUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", ragFile);
      const res = await fetch(`${API_BASE}/api/agent/rag/upload`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg =
          typeof err?.detail?.message === "string"
            ? err.detail.message
            : JSON.stringify(err);
        setError(msg);
        return;
      }
      const data = (await res.json()) as RagUploadResult;
      setRagUploadResult(data);
      setRagFile(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setRagUploading(false);
    }
  }, [ragFile, ragUploading]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (loading || isTranscribing || isRecording) return;
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setError("Ошибка записи аудио");
      };

      recorder.onstop = async () => {
        setIsRecording(false);
        const tracks = mediaStreamRef.current?.getTracks() ?? [];
        tracks.forEach((track) => track.stop());
        mediaStreamRef.current = null;

        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        audioChunksRef.current = [];
        if (!blob.size) return;

        setIsTranscribing(true);
        try {
          const { recognized_text } = await transcribeAudio(blob, "voice.webm");
          const transcript = recognized_text.trim();
          if (!transcript) {
            setError("Whisper не распознал речь");
            return;
          }
          await sendText(transcript, { clearInput: false });
        } catch (e) {
          setError(String(e));
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (e) {
      setError(`Не удалось включить микрофон: ${String(e)}`);
      setIsRecording(false);
    }
  }, [isRecording, isTranscribing, loading, sendText]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-xl flex-col gap-4 p-4 pb-8 sm:p-8">
      <div className="flex items-center justify-between gap-2">
        <Link
          className="text-sm text-emerald-700 hover:underline"
          href="/"
        >
          ← На главную
        </Link>
        <h1 className="text-lg font-semibold text-slate-800">LangChain-агент</h1>
        <span className="w-16" aria-hidden />
      </div>
      <p className="text-center text-sm text-slate-600">
        RAG-агент с поддержкой голосовых сообщений через OpenAI Whisper. Нужен{" "}
        <code className="rounded bg-slate-200 px-1">OPENAI_API_KEY</code>.
      </p>

      <div className="rounded-xl border border-violet-200 bg-violet-50/80 px-4 py-3 text-center text-sm text-violet-900 leading-relaxed">
        Попробуйте: «Как читается 你好?» или обычный разговор по-китайски.
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Загрузить файл в RAG</h2>
            <p className="mt-1 text-xs text-slate-500">
              Поддерживаются PDF, TXT и MD. Файл будет разбит на чанки и добавлен в Qdrant.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="file"
              accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
              disabled={ragUploading}
              className="block flex-1 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-violet-800 hover:file:bg-violet-100 disabled:opacity-50"
              onChange={(e) => {
                setRagUploadResult(null);
                setRagFile(e.target.files?.[0] ?? null);
              }}
            />
            <button
              type="button"
              disabled={!ragFile || ragUploading}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40"
              onClick={() => void uploadRagFile()}
            >
              {ragUploading ? "Загружаем..." : "Загрузить в RAG"}
            </button>
          </div>
          {ragFile ? (
            <p className="text-xs text-slate-500">Выбран файл: {ragFile.name}</p>
          ) : null}
          {ragUploadResult ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              Загружено: {ragUploadResult.filename}. Чанков: {ragUploadResult.chunks}.
              Коллекция: {ragUploadResult.collection}. Всего векторов: {ragUploadResult.points_count}.
            </p>
          ) : null}
        </div>
      </section>

      <div className="flex min-h-[360px] flex-1 flex-col gap-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        {messages.length === 0 && !loading ? (
          <p className="py-8 text-center text-sm text-slate-400">
            Напишите сообщение — агент ответит (возможны вызовы инструментов).
          </p>
        ) : null}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2 text-[15px] leading-relaxed ${
                m.role === "user"
                  ? "bg-violet-600 text-white"
                  : "bg-slate-100 text-slate-900"
              }`}
              lang={m.role === "assistant" ? "zh-Hans" : undefined}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading ? (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-500">
              {isTranscribing ? "Whisper распознает голос..." : "Агент думает…"}
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <textarea
          className="min-h-[88px] flex-1 resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-violet-500 focus:ring-2"
          placeholder="Сообщение… (Enter — отправить)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={loading || isRecording || isTranscribing}
          rows={3}
        />
        <button
          type="button"
          disabled={loading || isTranscribing}
          className={`rounded-xl px-4 py-3 text-sm font-medium text-white ${
            isRecording ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
          } disabled:opacity-40`}
          onClick={() => {
            if (isRecording) {
              stopRecording();
              return;
            }
            void startRecording();
          }}
        >
          {isRecording ? "Стоп" : "Голос"}
        </button>
        <button
          type="button"
          disabled={loading || isRecording || isTranscribing || !input.trim()}
          className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40"
          onClick={() => void send()}
        >
          Отправить
        </button>
      </div>
    </main>
  );
}
