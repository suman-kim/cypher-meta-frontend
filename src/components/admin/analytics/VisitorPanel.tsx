"use client";
/**
 * VisitorPanel.tsx — 방문자 한 명의 요약 창(방문 로그에서 방문자 칸을 누르면 열림).
 * 첫·마지막 방문, 방문한 날 수, 조회 수, 앱/웹 사용, 최근 기기, 자주 본 화면을 보여 주고
 * '이 방문자 기록만 보기'로 그 사람이 본 화면을 방문 로그에서 이어 볼 수 있게 한다.
 * 휴대폰에서는 아래에서 올라오는 시트, 넓은 화면에서는 오른쪽 패널로 열린다. Esc·배경 클릭으로 닫는다.
 * 페이지를 감싼 요소의 transform 영향을 받지 않도록 body 바로 아래(포털)에 그린다.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { VisitorSummary } from "@/lib/admin-analytics-core";
import { deviceLabel, formatKst, kstToday, shortId } from "@/lib/admin-analytics-core";
import { analyticsUrl, ErrorCard, fmt, StateCard, useAdminData } from "./shared";

/**
 * 방문자 요약 창.
 * @param props.token — 관리자 토큰
 * @param props.visitorId — 볼 방문자 ID
 * @param props.onClose — 닫기
 * @param props.onShowLogs — '이 방문자 기록만 보기'(첫 방문 날짜를 넘긴다)
 */
export default function VisitorPanel({
  token,
  visitorId,
  onClose,
  onShowLogs,
}: {
  token: string;
  visitorId: string;
  onClose: () => void;
  onShowLogs: (fromDate: string) => void;
}) {
  const { data, loading, error, reload } = useAdminData<VisitorSummary>(token, analyticsUrl("visitor", { visitorId }));

  // 포털은 브라우저에서만 그린다(첫 렌더 뒤 켜짐)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-stretch sm:justify-end" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="방문자 요약"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl border border-line bg-surface p-5 shadow-2xl sm:max-h-none sm:w-[380px] sm:rounded-none sm:border-y-0 sm:border-r-0"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-gray-50">방문자 요약</h3>
            <p className="mt-0.5 break-all font-mono text-[11px] text-gray-500" title={visitorId}>
              {visitorId}
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost px-2.5 py-1 text-xs" aria-label="닫기">
            닫기
          </button>
        </div>

        {error ? (
          <ErrorCard message={error} onRetry={reload} />
        ) : loading || !data ? (
          <StateCard kind="loading" rows={5} />
        ) : (
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-2 gap-2">
              {[
                ["첫 방문", formatKst(data.firstAt, true)],
                ["마지막 방문", formatKst(data.lastAt, true)],
                ["방문한 날", `${fmt(data.activeDays)}일`],
                ["조회수", `${fmt(data.views)}회`],
                ["전체 기록", `${fmt(data.events)}건`],
                ["사용", [data.usedApp && "앱", data.usedWeb && "웹"].filter(Boolean).join(" · ") || "-"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-surface-2 px-3 py-2">
                  <dt className="text-[11px] text-gray-500">{k}</dt>
                  <dd className="mt-0.5 text-xs font-semibold text-gray-100">{v}</dd>
                </div>
              ))}
            </dl>

            {data.latest && (
              <section>
                <h4 className="mb-1.5 text-xs font-bold text-gray-300">최근 기기</h4>
                <p className="text-xs text-gray-400">
                  {[deviceLabel(data.latest.device), data.latest.browser, data.latest.os].filter((x) => x && x !== "-").join(" · ") || "-"}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  IP {data.latest.ip || "-"}
                  {data.latest.country ? ` · ${data.latest.city || data.latest.country}` : ""}
                </p>
              </section>
            )}

            <section>
              <h4 className="mb-1.5 text-xs font-bold text-gray-300">자주 본 화면</h4>
              {data.topPaths.length === 0 ? (
                <p className="text-xs text-gray-500">화면 조회 기록이 없어요.</p>
              ) : (
                <ul className="space-y-1">
                  {data.topPaths.map((p) => (
                    <li key={p.path} className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 flex-1 truncate text-gray-300" title={p.path}>
                        {p.path}
                      </span>
                      <span className="shrink-0 text-gray-500">{fmt(p.views)}회</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <button
              type="button"
              onClick={() => onShowLogs(kstToday(new Date(data.firstAt)))}
              className="btn-primary w-full justify-center text-sm"
            >
              {shortId(visitorId)} 기록만 보기 (최신순)
            </button>
          </div>
        )}
      </aside>
    </div>,
    document.body,
  );
}
