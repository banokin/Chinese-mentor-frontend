/** Backend origin for REST + WS (override in .env.local). */
export const API_BASE: string =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000";

export function wsPronunciationUrl(): string {
  const u = new URL(API_BASE);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  u.pathname = "/ws/pronunciation";
  u.search = "";
  u.hash = "";
  return u.toString();
}

/** ASR через тот же бэкенд, что и практика (Whisper / HF). */
export async function transcribeAudio(
  blob: Blob,
  filename = "voice.webm",
): Promise<{ recognized_text: string }> {
  const fd = new FormData();
  fd.append("audio", blob, filename);
  const res = await fetch(`${API_BASE}/api/practice/transcribe`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as {
      detail?: { message?: string };
    };
    const msg =
      typeof err?.detail?.message === "string"
        ? err.detail.message
        : JSON.stringify(err);
    throw new Error(msg);
  }
  return res.json() as Promise<{ recognized_text: string }>;
}
