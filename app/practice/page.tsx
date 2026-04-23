"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { ExampleSpeechPlayer } from "@/components/ExampleSpeechPlayer";
import { API_BASE } from "@/lib/api";

type FeedbackItem = {
  index: number;
  type: string;
  expected: string | null;
  actual: string | null;
  message_ru: string;
};

type Scores = {
  accuracy: number;
  tone_accuracy: number;
  completeness: number;
  fluency: number;
};

export default function PracticePage() {
  const [expected, setExpected] = useState("你好");
  const [status, setStatus] = useState<string>("");
  const [transcriptionHanzi, setTranscriptionHanzi] = useState<string>("");
  const [textMatches, setTextMatches] = useState<boolean | null>(null);
  const [matchMessageRu, setMatchMessageRu] = useState<string>("");
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [scores, setScores] = useState<Scores | null>(null);
  const [recording, setRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const stopRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === "inactive") return;
    mr.stop();
    setRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    setStatus("");
    setTranscriptionHanzi("");
    setTextMatches(null);
    setMatchMessageRu("");
    setFeedback([]);
    setScores(null);
    chunksRef.current = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
    mediaRecorderRef.current = mr;
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
    };
    mr.start();
    setRecording(true);
  }, []);

  const submitRecording = useCallback(async () => {
    stopRecording();
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    await new Promise<void>((resolve) => {
      mr.addEventListener("stop", () => resolve(), { once: true });
    });
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    if (blob.size === 0) {
      setStatus("Пустая запись");
      return;
    }
    const fd = new FormData();
    fd.append("expected_text", expected);
    fd.append("audio", blob, "clip.webm");
    setStatus("Отправка…");
    try {
      const res = await fetch(`${API_BASE}/api/practice/evaluate`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStatus(`Ошибка: ${JSON.stringify(err)}`);
        return;
      }
      const data = await res.json();
      const hanzi = String(data.transcription_hanzi ?? data.recognized_text ?? "");
      setTranscriptionHanzi(hanzi);
      setTextMatches(
        typeof data.text_matches_expected === "boolean"
          ? data.text_matches_expected
          : null,
      );
      setMatchMessageRu(String(data.text_match_message_ru ?? ""));
      setFeedback(data.feedback ?? []);
      setScores(data.scores ?? null);
      setStatus("Готово");
    } catch (e) {
      setStatus(`Сеть: ${String(e)}`);
    }
  }, [expected, stopRecording]);

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 p-8">
      <Link className="text-sm text-emerald-700 hover:underline" href="/">
        ← На главную
      </Link>
      <h1 className="text-2xl font-semibold">Практика</h1>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Ожидаемая фраза (汉字)</span>
        <input
          className="rounded border border-slate-300 px-3 py-2"
          value={expected}
          onChange={(e) => setExpected(e.target.value)}
        />
      </label>

      <ExampleSpeechPlayer text={expected} />

      <div className="flex flex-wrap gap-2">
        {!recording ? (
          <button
            type="button"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
            onClick={() => void startRecording()}
          >
            Запись
          </button>
        ) : (
          <button
            type="button"
            className="rounded-lg bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
            onClick={() => void submitRecording()}
          >
            Стоп и оценка
          </button>
        )}
      </div>

      {status ? <p className="text-sm text-slate-600">{status}</p> : null}

      {transcriptionHanzi ? (
        <section
          className={`rounded-xl border-2 p-4 ${
            textMatches === true
              ? "border-emerald-400 bg-emerald-50"
              : textMatches === false
                ? "border-amber-300 bg-amber-50"
                : "border-slate-200 bg-white"
          }`}
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-700">
              Транскрипция модели (汉字)
            </span>
            {textMatches === true ? (
              <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-medium text-white">
                Совпадает с эталоном
              </span>
            ) : null}
            {textMatches === false ? (
              <span className="rounded-full bg-amber-600 px-2.5 py-0.5 text-xs font-medium text-white">
                Не совпадает с эталоном
              </span>
            ) : null}
          </div>
          <p
            className="text-center text-4xl font-medium tracking-wide text-slate-900"
            lang="zh-Hans"
          >
            {transcriptionHanzi}
          </p>
          {matchMessageRu ? (
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              {matchMessageRu}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-slate-500">
            Если текст совпадает с ожидаемой фразой (после нормализации пробелов и
            знаков), считаем произношение по распознаванию верным. Ниже — отдельная
            оценка по слогам и тонам.
          </p>
        </section>
      ) : null}

      {scores ? (
        <ul className="rounded border border-slate-200 bg-white p-3 text-sm">
          <li className="font-medium text-slate-800">Скоринг по слогам и тонам</li>
          <li>Точность: {(scores.accuracy * 100).toFixed(0)}%</li>
          <li>Тоны: {(scores.tone_accuracy * 100).toFixed(0)}%</li>
          <li>Полнота: {(scores.completeness * 100).toFixed(0)}%</li>
          <li>Плавность (эвристика): {(scores.fluency * 100).toFixed(0)}%</li>
        </ul>
      ) : null}

      {feedback.length > 0 ? (
        <ul className="space-y-2 text-sm">
          {feedback.map((f) => (
            <li
              key={f.index}
              className="rounded border border-slate-200 bg-white px-3 py-2"
            >
              <span className="font-mono text-xs text-slate-500">{f.type}</span>
              <div>{f.message_ru}</div>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
