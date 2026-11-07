"use client";
/**
 * shared.tsx — 관리자 '일별·방문 로그·활동' 화면이 함께 쓰는 부품.
 *  - adminGet / useAdminData : 관리자 토큰을 붙여 /api/admin/analytics/* 를 읽기(불러오는 중·오류 상태 포함)
 *  - StateCard : 불러오는 중·빈 상태·오류(다시 시도) 표시
 *  - fmt : 숫자 천 단위 쉼표
 */
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";

/**
 * 숫자를 천 단위 쉼표로 쓴다.
 * @param n — 숫자(없으면 0)
 * @returns '1,234'
 */
export function fmt(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString("ko-KR");
}

/**
 * 관리자 통계 API 주소를 만든다(빈 값은 뺀다).
 * @param path — /api/admin/analytics/ 뒤 경로(예: "daily")
 * @param params — 쿼리 값
 * @returns '/api/admin/analytics/daily?days=30'
 */
export function analyticsUrl(path: string, params: Record<string, string | number | null | undefined> = {}): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  const s = q.toString();
  return `/api/admin/analytics/${path}${s ? `?${s}` : ""}`;
}

/**
 * 관리자 토큰을 붙여 GET 하고 JSON 을 돌려준다. 실패하면 백엔드 안내 문구로 오류를 던진다.
 * @param token — 관리자 토큰
 * @param url — 요청 주소
 * @param signal — 취소 신호(선택)
 * @returns 응답 JSON
 */
export async function adminGet<T>(token: string, url: string, signal?: AbortSignal): Promise<T> {
  const r = await fetch(url, { headers: { "x-admin-token": token }, signal, cache: "no-store" });
  if (!r.ok) {
    const body = (await r.json().catch(() => null)) as { message?: string | string[] } | null;
    const msg = Array.isArray(body?.message) ? body?.message[0] : body?.message;
    throw new Error(msg || `불러오지 못했어요 (${r.status})`);
  }
  return (await r.json()) as T;
}

/** useAdminData 결과 */
export interface AdminData<T> {
  /** 받은 데이터(아직 없으면 null) */
  data: T | null;
  /** 불러오는 중 */
  loading: boolean;
  /** 오류 문구(없으면 null) */
  error: string | null;
  /** 다시 불러오기 */
  reload: () => void;
}

/**
 * 주소가 바뀔 때마다 관리자 API 를 읽는다. 늦게 온 이전 응답은 버린다.
 * @param token — 관리자 토큰
 * @param url — 요청 주소(null 이면 읽지 않음)
 * @returns 데이터·불러오는 중·오류·다시 불러오기
 */
export function useAdminData<T>(token: string, url: string | null): AdminData<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const ctrl = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!url) return;
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setLoading(true);
    setError(null);
    adminGet<T>(token, url, c.signal)
      .then((d) => {
        if (!c.signal.aborted) setData(d);
      })
      .catch((e: Error) => {
        if (!c.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [token, url, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload };
}

/**
 * 불러오는 중·빈 상태·오류 카드.
 * @param props.kind — loading | empty | error
 * @param props.title — 큰 글(빈 상태·오류)
 * @param props.desc — 작은 설명(선택)
 * @param props.action — 버튼 영역(다시 시도·필터 초기화 등, 선택)
 * @param props.rows — 불러오는 중 자리 표시 줄 수(기본 3)
 */
export function StateCard({
  kind,
  title,
  desc,
  action,
  rows = 3,
}: {
  kind: "loading" | "empty" | "error";
  title?: string;
  desc?: string;
  action?: ReactNode;
  rows?: number;
}) {
  if (kind === "loading") {
    return (
      <div className="card space-y-2 p-4" aria-busy="true" aria-label="불러오는 중">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="h-8 animate-pulse rounded bg-surface-2" />
        ))}
      </div>
    );
  }
  return (
    <div
      className={`card px-6 py-10 text-center ${kind === "error" ? "border-lose/30 bg-lose/5" : ""}`}
      role={kind === "error" ? "alert" : undefined}
    >
      <p className="text-sm font-semibold text-gray-200">{title}</p>
      {desc && <p className="mt-1 text-xs text-gray-500">{desc}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/**
 * 오류 카드(다시 시도 버튼 포함) 줄임 부품.
 * @param props.message — 오류 문구
 * @param props.onRetry — 다시 시도
 */
export function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <StateCard
      kind="error"
      title="불러오지 못했어요"
      desc={message}
      action={
        <button type="button" onClick={onRetry} className="btn-ghost px-3 py-1.5 text-xs">
          다시 시도
        </button>
      }
    />
  );
}
