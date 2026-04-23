"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { wsPronunciationUrl } from "@/lib/api";

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export default function RealtimePage() {
  const [expected, setExpected] = useState("你好");
  const [connected, setConnected] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [finalJson, setFinalJson] = useState<string>("");
  const [finalHanzi, setFinalHanzi] = useState<string>("");
  const [finalTextMatch, setFinalTextMatch] = useState<boolean | null>(null);
  const [finalMatchMsg, setFinalMatchMsg] = useState<string>("");
  const [log, setLog] = useState<string>("");
  const [recording, setRecording] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const connect = useCallback(() => {
    setLog("");
    setFinalJson("");
    setFinalHanzi("");
    setFinalTextMatch(null);
    setFinalMatchMsg("");
    setLiveText("");
    const url = wsPronunciationUrl();
    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.onopen = () => {
      setConnected(true);
      setLog((l) => l + "opened\n");
    };
    ws.onclose = () => {
      setConnected(false);
      setLog((l) => l + "closed\n");
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as Record<string, unknown>;
        if (msg.type === "status") {
          setLog((l) => l + `status: ${msg.message}\n`);
        } else if (msg.type === "partial_result") {
          setLiveText(String(msg.recognized_text ?? ""));
        } else if (msg.type === "final_result") {
          const d = msg.data as Record<string, unknown> | undefined;
          setFinalJson(JSON.stringify(msg.data, null, 2));
          if (d) {
            setFinalHanzi(String(d.transcription_hanzi ?? d.recognized_text ?? ""));
            setFinalTextMatch(
              typeof d.text_matches_expected === "boolean"
                ? d.text_matches_expected
                : null,
            );
            setFinalMatchMsg(String(d.text_match_message_ru ?? ""));
          }
        } else if (msg.type === "error") {
          setLog((l) => l + `error: ${msg.message}\n`);
        }
      } catch {
        setLog((l) => l + `raw: ${ev.data}\n`);
      }
    };
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
  }, []);

  const sendStart = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "start", expected_text: expected }));
  }, [expected]);

  const startStreaming = useCallback(async () => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    sendStart();
    setLiveText("");
    setFinalJson("");
    setFinalHanzi("");
    setFinalTextMatch(null);
    setFinalMatchMsg("");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
    mediaRecorderRef.current = mr;
    mr.ondataavailable = async (e) => {
      if (e.data.size === 0) return;
      const buf = await e.data.arrayBuffer();
      const b64 = uint8ToBase64(new Uint8Array(buf));
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "audio_chunk", chunk_base64: b64 }));
      }
    };
    mr.start(250);
    setRecording(true);
  }, [sendStart]);

  const stopStreaming = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      mr.stop();
      mr.stream.getTracks().forEach((t) => t.stop());
    }
    mediaRecorderRef.current = null;
    setRecording(false);
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "stop" }));
    }
  }, []);

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 p-8">
      <Link className="text-sm text-emerald-700 hover:underline" href="/">
        ← На главную
      </Link>
      <h1 className="text-2xl font-semibold">Realtime (WebSocket MVP)</h1>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Ожидаемая фраза</span>
        <input
          className="rounded border border-slate-300 px-3 py-2"
          value={expected}
          onChange={(e) => setExpected(e.target.value)}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        {!connected ? (
          <button
            type="button"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-white"
            onClick={connect}
          >
            Подключиться
          </button>
        ) : (
          <button
            type="button"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2"
            onClick={disconnect}
          >
            Отключиться
          </button>
        )}
        <button
          type="button"
          className="rounded-lg bg-slate-800 px-4 py-2 text-white disabled:opacity-40"
          disabled={!connected || recording}
          onClick={() => void startStreaming()}
        >
          Старт записи
        </button>
        <button
          type="button"
          className="rounded-lg bg-amber-600 px-4 py-2 text-white disabled:opacity-40"
          disabled={!recording}
          onClick={stopStreaming}
        >
          Стоп и финал
        </button>
      </div>

      <div>
        <div className="text-sm font-medium text-slate-700">Живой текст</div>
        <p className="min-h-[1.5rem] rounded border border-slate-200 bg-white p-2 text-sm">
          {liveText || "—"}
        </p>
      </div>

      {finalHanzi ? (
        <section
          className={`rounded-xl border-2 p-3 ${
            finalTextMatch === true
              ? "border-emerald-400 bg-emerald-50"
              : finalTextMatch === false
                ? "border-amber-300 bg-amber-50"
                : "border-slate-200 bg-white"
          }`}
        >
          <div className="text-sm font-medium text-slate-700">
            Транскрипция (汉字)
          </div>
          <p className="text-center text-3xl font-medium" lang="zh-Hans">
            {finalHanzi}
          </p>
          {finalMatchMsg ? (
            <p className="mt-2 text-sm text-slate-700">{finalMatchMsg}</p>
          ) : null}
        </section>
      ) : null}

      {finalJson ? (
        <pre className="max-h-64 overflow-auto rounded border border-slate-200 bg-slate-900 p-3 text-xs text-emerald-200">
          {finalJson}
        </pre>
      ) : null}

      {log ? (
        <pre className="text-xs text-slate-500 whitespace-pre-wrap">{log}</pre>
      ) : null}
    </main>
  );
}
