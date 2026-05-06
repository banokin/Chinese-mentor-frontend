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

/** Ответ POST /api/agent/rag/upload после индексации файла в Qdrant. */
export type RagUploadResponse = {
  filename: string;
  collection: string;
  documents: number;
  chunks: number;
  vector_size: number;
  points_count: number;
};

async function readBackendError(res: Response): Promise<string> {
  const err = await res.json().catch(() => ({})) as {
    detail?: unknown;
  };
  const detail = err?.detail;
  if (detail && typeof detail === "object" && detail !== null) {
    const msg = (detail as { message?: unknown }).message;
    if (typeof msg === "string") return msg;
  }
  if (typeof detail === "string") return detail;
  return JSON.stringify(err);
}

/** Загружает PDF / TXT / MD в коллекцию Qdrant (эмбеддинги на бэкенде). */
export async function uploadRagDocument(file: File): Promise<RagUploadResponse> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/api/agent/rag/upload`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    throw new Error(await readBackendError(res));
  }
  return res.json() as Promise<RagUploadResponse>;
}
