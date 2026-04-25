"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE, transcribeAudio } from "@/lib/api";

type Role = "user" | "assistant";

type Msg = { id: string; role: Role; content: string; fromVoice?: boolean };

function makeMsgId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

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

function pickZhVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((voice) => voice.lang.startsWith("zh")) ??
    voices.find((voice) => voice.lang.toLowerCase().includes("cn")) ??
    null
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speakingId, setSpeakingId] = useState<string>("");
  const [translatingId, setTranslatingId] = useState<string>("");
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, transcribing]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  const sendChat = useCallback(
    async (userText: string, fromVoice = false) => {
      const text = userText.trim();
      if (!text) return;

      setError("");
      const before = messages;
      const next: Msg[] = [
        ...before,
        { id: makeMsgId(), role: "user", content: text, ...(fromVoice ? { fromVoice: true } : {}) },
      ];
      setMessages(next);
      setLoading(true);

      try {
        const res = await fetch(`${API_BASE}/api/chat/`, {
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
        setMessages([...next, { id: makeMsgId(), role: "assistant", content: reply }]);
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

  const stopSpeech = useCallback(() => {
    window.speechSynthesis?.cancel();
    audioRef.current?.pause();
    audioRef.current = null;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setSpeakingId("");
  }, []);

  const playBrowserSpeech = useCallback(
    (message: Msg) => {
      const text = message.content.trim();
      if (!text) return;
      stopSpeech();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "zh-CN";
      const voice = pickZhVoice();
      if (voice) utterance.voice = voice;
      utterance.rate = 0.95;
      utterance.onend = () => setSpeakingId("");
      utterance.onerror = () => {
        setSpeakingId("");
        setError("Не удалось озвучить сообщение");
      };
      setSpeakingId(message.id);
      window.speechSynthesis?.speak(utterance);
    },
    [stopSpeech],
  );

  const speakMessage = useCallback(
    async (message: Msg) => {
      if (speakingId === message.id) {
        stopSpeech();
        return;
      }

      const text = message.content.trim();
      if (!text) return;
      setError("");
      setSpeakingId(message.id);
      stopSpeech();
      setSpeakingId(message.id);

      try {
        const fd = new FormData();
        fd.append("text", text);
        const res = await fetch(`${API_BASE}/api/practice/example-speech`, {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          playBrowserSpeech(message);
          return;
        }
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        objectUrlRef.current = objectUrl;
        const audio = new Audio(objectUrl);
        audioRef.current = audio;
        audio.onended = stopSpeech;
        audio.onerror = () => {
          setError("Ошибка воспроизведения озвучки");
          stopSpeech();
        };
        setSpeakingId(message.id);
        await audio.play();
      } catch {
        playBrowserSpeech(message);
      }
    },
    [playBrowserSpeech, speakingId, stopSpeech],
  );

  const translateMessage = useCallback(async (message: Msg) => {
    if (translations[message.id]) {
      setTranslations((current) => {
        const next = { ...current };
        delete next[message.id];
        return next;
      });
      return;
    }

    setError("");
    setTranslatingId(message.id);
    try {
      const res = await fetch(`${API_BASE}/api/chat/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message.content }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg =
          typeof err?.detail?.message === "string"
            ? err.detail.message
            : "Не удалось перевести сообщение";
        setError(msg);
        return;
      }
      const data = (await res.json()) as { translation?: string };
      setTranslations((current) => ({
        ...current,
        [message.id]: String(data.translation ?? "").trim(),
      }));
    } catch (e) {
      setError(String(e));
    } finally {
      setTranslatingId("");
    }
  }, [translations]);

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
        {messages.map((m) => (
          <div
            key={m.id}
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
              {m.role === "assistant" ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-2">
                  <button
                    type="button"
                    className="rounded-lg bg-white px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
                    onClick={() => void speakMessage(m)}
                  >
                    {speakingId === m.id ? "Стоп" : "Слушать"}
                  </button>
                  <button
                    type="button"
                    disabled={translatingId === m.id}
                    className="rounded-lg bg-white px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
                    onClick={() => void translateMessage(m)}
                  >
                    {translatingId === m.id
                      ? "Переводим..."
                      : translations[m.id]
                        ? "Скрыть перевод"
                        : "Перевести"}
                  </button>
                </div>
              ) : null}
              {m.role === "assistant" && translations[m.id] ? (
                <p className="mt-2 rounded-lg bg-white/80 px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">
                  {translations[m.id]}
                </p>
              ) : null}
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
