"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE, transcribeAudio } from "@/lib/api";

type Role = "user" | "assistant";

type Msg = { role: Role; content: string; fromVoice?: boolean };

function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
    return "audio/webm;codecs=opus";
  }
  if (MediaRecorder.isTypeSupported("audio/webm")) {
    return "audio/webm";
  }
  return undefined;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, transcribing]);

  const sendChat = useCallback(
    async (userText: string, fromVoice = false) => {
      const text = userText.trim();
      if (!text) return;

      setError("");
      const before = messages;
      const next: Msg[] = [
        ...before,
        { role: "user", content: text, ...(fromVoice ? { fromVoice: true } : {}) },
      ];
      setMessages(next);
      setLoading(true);

      try {
        const res = await fetch(`${API_BASE}/api/agent/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: next.map((m) => ({
              role: m.role,
              content: m.content,
            })),
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
    },
    [messages],
  );

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || transcribing) return;
    setInput("");
    await sendChat(text, false);
  }, [input, loading, transcribing, sendChat]);

  const stopRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === "inactive") return;
    mr.stop();
    setRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (loading || transcribing) return;
    setError("");
    chunksRef.current = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = pickRecorderMimeType();
    const mr = mime
      ? new MediaRecorder(stream, { mimeType: mime })
      : new MediaRecorder(stream);
    mediaRecorderRef.current = mr;
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
    };
    mr.start();
    setRecording(true);
  }, [loading, transcribing]);

  const submitVoice = useCallback(async () => {
    stopRecording();
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    await new Promise<void>((resolve) => {
      mr.addEventListener("stop", () => resolve(), { once: true });
    });
    const blob = new Blob(chunksRef.current, {
      type: mr.mimeType || "audio/webm",
    });
    if (blob.size === 0) {
      setError("Пустая запись");
      return;
    }
    setTranscribing(true);
    setError("");
    try {
      const { recognized_text } = await transcribeAudio(blob, "voice.webm");
      const text = recognized_text.trim();
      if (!text) {
        setError("Не удалось распознать речь — попробуйте ещё раз.");
        return;
      }
      await sendChat(text, true);
    } catch (e) {
      setError(String(e));
    } finally {
      setTranscribing(false);
    }
  }, [stopRecording, sendChat]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const inputDisabled = loading || transcribing || recording;

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-xl flex-col gap-4 p-4 pb-8 sm:p-8">
      <div className="flex items-center justify-between gap-2">
        <Link
          className="text-sm text-emerald-700 hover:underline"
          href="/"
        >
          ← На главную
        </Link>
        <h1 className="text-lg font-semibold text-slate-800">Чат с собеседником</h1>
        <span className="w-16" aria-hidden />
      </div>
      <p className="text-center text-sm text-slate-600">
        Пишите или отправьте{" "}
        <strong>голосовое</strong> — речь распознаётся и уходит в чат как текст (нужен микрофон и{" "}
        <code className="rounded bg-slate-200 px-1">OPENAI_API_KEY</code> / HF для ASR).
      </p>

      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 text-center text-sm text-slate-700 leading-relaxed" lang="zh-Hans">
        你好！这里是练习中文聊天的窗口。随便发一条消息开始吧。
      </div>

      <div className="flex min-h-[360px] flex-1 flex-col gap-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        {messages.length === 0 && !loading && !transcribing ? (
          <p className="py-8 text-center text-sm text-slate-400">
            Сообщений пока нет — напишите ниже или запишите голос.
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
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-900"
              }`}
              lang={m.role === "assistant" ? "zh-Hans" : undefined}
            >
              {m.role === "user" && m.fromVoice ? (
                <span className="mr-1.5 inline-block opacity-90" title="Голосовое сообщение">
                  🎤
                </span>
              ) : null}
              {m.content}
            </div>
          </div>
        ))}
        {transcribing ? (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-500">
              Распознаём речь…
            </div>
          </div>
        ) : null}
        {loading ? (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-500">
              Печатает…
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

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        {!recording ? (
          <button
            type="button"
            disabled={inputDisabled}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-40"
            onClick={() => void startRecording().catch((e) => setError(String(e)))}
            aria-label="Начать запись голосового сообщения"
          >
            <span aria-hidden>🎤</span>
            Голосовое
          </button>
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700"
            onClick={() => void submitVoice()}
            aria-label="Остановить запись и отправить"
          >
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white" />
            Стоп и отправить
          </button>
        )}
        {recording ? (
          <span className="text-xs text-rose-700">Идёт запись…</span>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <textarea
          className="min-h-[88px] flex-1 resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring-2"
          placeholder="Напишите сообщение… (Enter — отправить, Shift+Enter — новая строка)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={inputDisabled}
          rows={3}
        />
        <button
          type="button"
          disabled={loading || transcribing || recording || !input.trim()}
          className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
          onClick={() => void send()}
        >
          Отправить
        </button>
      </div>
    </main>
  );
}
