"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE } from "@/lib/api";

type Props = {
  /** Ожидаемая фраза (汉字) — её и озвучиваем */
  text: string;
};

function pickZhVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const vs = window.speechSynthesis.getVoices();
  return (
    vs.find((v) => v.lang.startsWith("zh")) ??
    vs.find((v) => v.lang.toLowerCase().includes("cn")) ??
    null
  );
}

/**
 * Проигрыватель эталона: OpenAI TTS (если настроен бэкенд), иначе Web Speech API (zh-CN).
 */
export function ExampleSpeechPlayer({ text }: Props) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const loadVoices = () => window.speechSynthesis?.getVoices();
    loadVoices();
    window.speechSynthesis?.addEventListener?.("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis?.removeEventListener?.("voiceschanged", loadVoices);
    };
  }, []);

  const stopBrowser = useCallback(() => {
    window.speechSynthesis?.cancel();
  }, []);

  const stopAll = useCallback(() => {
    stopBrowser();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPlaying(false);
  }, [stopBrowser]);

  useEffect(() => {
    return () => stopAll();
  }, [stopAll]);

  const playBrowser = useCallback(() => {
    const t = text.trim();
    if (!t) return;
    stopBrowser();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = "zh-CN";
    const v = pickZhVoice();
    if (v) u.voice = v;
    u.rate = 0.95;
    u.onend = () => setPlaying(false);
    u.onerror = () => {
      setPlaying(false);
      setHint("Синтез браузера недоступен");
    };
    setPlaying(true);
    setHint("Синтез браузера (качество зависит от системы)");
    window.speechSynthesis?.speak(u);
  }, [stopBrowser, text]);

  const playOpenAI = useCallback(async () => {
    const t = text.trim();
    if (!t) return;
    stopAll();
    setLoading(true);
    setHint("");
    try {
      const fd = new FormData();
      fd.append("text", t);
      const res = await fetch(`${API_BASE}/api/practice/example-speech`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const code = err?.detail?.code ?? "";
        if (res.status === 503 || code === "no_openai_key") {
          playBrowser();
          return;
        }
        setHint(
          typeof err?.detail?.message === "string"
            ? err.detail.message
            : "Не удалось получить озвучку",
        );
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setPlaying(false);
        stopAll();
      };
      audio.onerror = () => {
        setPlaying(false);
        setHint("Ошибка воспроизведения");
        stopAll();
      };
      setPlaying(true);
      setHint("Озвучка OpenAI TTS");
      await audio.play();
    } catch {
      playBrowser();
    } finally {
      setLoading(false);
    }
  }, [playBrowser, stopAll, text]);

  const onPlay = useCallback(() => {
    void playOpenAI();
  }, [playOpenAI]);

  const trimmed = text.trim();
  const disabled = !trimmed || loading;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-slate-700">
          Пример произношения
        </span>
        <button
          type="button"
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-40"
          onClick={playing ? stopAll : onPlay}
        >
          {loading ? (
            "…"
          ) : playing ? (
            <>
              <span aria-hidden>■</span> Стоп
            </>
          ) : (
            <>
              <span aria-hidden>▶</span> Слушать эталон
            </>
          )}
        </button>
      </div>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      <p className="text-xs text-slate-500">
        Сначала запрашивается озвучка на сервере (нужен{" "}
        <code className="rounded bg-slate-200 px-1">OPENAI_API_KEY</code>).
        Если ключа нет — используется встроенный синтез браузера для китайского.
      </p>
    </div>
  );
}
