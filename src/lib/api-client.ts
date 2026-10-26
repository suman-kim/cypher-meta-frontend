"use client";

/**
 * 프록시 라우트 호출 실패 에러. message 는 백엔드가 준 한국어 메시지이고,
 * 응답 본문 전체(data)도 남겨 두어 금칙어 검출 위치(matches) 같은 부가 정보를 꺼내 쓸 수 있다.
 */
export class ApiError extends Error {
  /**
   * @param message — 사용자에게 보여 줄 메시지
   * @param status — HTTP 상태 코드
   * @param data — 응답 본문(JSON, 없으면 null)
   */
  constructor(
    message: string,
    readonly status: number,
    readonly data: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * 실패 응답을 ApiError 로 바꾼다.
 * @param res — fetch 응답
 * @param data — 파싱한 본문(없으면 null)
 * @returns 백엔드 message 를 담은 ApiError
 */
function toApiError(res: Response, data: unknown): ApiError {
  const msg = (data as { message?: string | string[] } | null)?.message;
  const text = Array.isArray(msg) ? msg.join(", ") : msg;
  return new ApiError(text || `요청에 실패했습니다. (${res.status})`, res.status, data);
}

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

  if (!res.ok) throw toApiError(res, data);

  return data as T;
}

/**
 * 클라이언트에서 프론트 프록시 라우트(app/api/*)로 JSON GET 하는 헬퍼.
 * @param path — 자기 도메인 경로(예: "/api/meta/history/duo?a=…")
 * @returns 응답 JSON
 * @throws 응답이 실패면 백엔드 message(한국어)를 담은 ApiError
 */
export async function getJSON<T = unknown>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "no-store" });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) throw toApiError(res, data);

  return data as T;
}
