"use client";

/** 클라이언트에서 프론트 프록시 라우트(app/api/*)로 JSON POST 하는 헬퍼 */
export async function postJSON<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg = (data as { message?: string | string[] } | null)?.message;
    const text = Array.isArray(msg) ? msg.join(", ") : msg;
    throw new Error(text || `요청에 실패했습니다. (${res.status})`);
  }

  return data as T;
}
