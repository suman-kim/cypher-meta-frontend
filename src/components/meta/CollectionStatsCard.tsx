/**
 * CollectionStatsCard — 캐릭터 티어·조합 티어 상단의 "집계 정보" 영역.
 *
 * 예전에는 알약형 칩 5개(집계 범위·표본 매치·플레이어 기록·캐릭터·최근 수집)가 한 줄에 흩어져 있었다.
 * 화면 폭에 따라 두 디자인으로 보여 준다(Claude Design 핸드오프 "Stats Bar").
 *  - sm(640px) 이상 — 1a "KPI 카드 + 상태 헤더"
 *      · 상태 헤더: 수집 상태 점 + 집계 범위 + 순회 진행 막대·% / 오른쪽에 최근 수집 시각
 *      · KPI 칸: 라벨(위, 작게)과 숫자(아래, 크게). 설명은 칸 hover 툴팁(title)
 *      · 하단 안내(선택)
 *  - 모바일 — 1b "한 줄 메타 라인"
 *      · 왼쪽: 짧은 라벨 + 굵은 숫자(세로 구분선), 오른쪽: 범위·순회·수집 시각 회색 한 줄
 *      · ⓘ 하나로 항목별 설명(+하단 안내)을 팝오버로(CollectionInfoPopover)
 * 서버 컴포넌트(팝오버만 클라이언트). 색은 사이트 테마 토큰을 써서 다크 모드에서도 맞게 보인다.
 */
import type { MetaSummary } from "@/lib/meta";
import CollectionInfoPopover from "./CollectionInfoPopover";

/** KPI 칸 1개 */
export interface CollectionKpi {
  /** 라벨(예: "표본 매치") */
  label: string;
  /** 모바일 한 줄(1b)용 짧은 라벨(예: "매치"). 없으면 label */
  shortLabel?: string;
  /** 숫자(이미 서식 적용된 문자열, 예: "4,708") */
  value: string;
  /** 숫자 뒤 단위(예: "종", "판") — 작게·회색으로 표시 */
  unit?: string;
  /** 마우스를 올렸을 때 뜨는 설명 */
  tip?: string;
}

/** 집계 범위·순회 진행 상태(요약 응답에서 계산) */
interface CollectionScope {
  /** 집계 범위 문구(예: "공식전 랭킹 상위 500위"). 알 수 없으면 null */
  label: string | null;
  /** 회전 수집 중이면 순회 진행률(0~100), 아니면 null */
  pct: number | null;
  /** 범위 설명 툴팁 */
  tip: string;
  /** 최근 수집 시각 문구(예: "2026. 9. 30. 01:01"). 없으면 null */
  lastRun: string | null;
  /** 모바일 한 줄용 짧은 범위(예: "상위 500위"). 알 수 없으면 null */
  shortLabel: string | null;
}

/**
 * 수집 시각을 한국 시간 연·월·일·시각으로 서식화한다(1a·1b 공통).
 * @param iso — ISO 시각 문자열
 * @returns 예: "2026. 9. 30. 01:01"
 */
function fmtRun(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * 요약 응답에서 집계 범위·순회 진행률·최근 수집 시각을 계산한다(기존 캐릭터 티어 칩과 같은 규칙).
 * @param summary — GET /meta/summary 응답
 * @returns 헤더 표시용 상태
 */
function scopeOf(summary: MetaSummary): CollectionScope {
  const sc = summary.scope;
  const rankTop = sc?.rankTop ?? null;
  const gt = sc?.gameType ?? summary.lastCollect?.gameTypeId ?? "rating";
  const gtLabel = gt === "rating" ? "공식전" : gt;
  let label: string | null = null;
  let shortLabel: string | null = null;
  let pct: number | null = null;
  let tip = "";
  if (rankTop != null) {
    label = `${gtLabel} 랭킹 상위 ${rankTop.toLocaleString()}위`;
    shortLabel = `상위 ${rankTop.toLocaleString()}위`;
    tip = `사이퍼즈 ${gtLabel}(레이팅) 랭킹 상위 ${rankTop.toLocaleString()}위 플레이어들이 최근 플레이한 경기를 표본으로 집계합니다.`;
    // 회전 수집이면 방금 갱신한 순위 구간까지를 순회 진행률로 본다
    if (sc?.rotating && sc.window != null) {
      const lastOff = sc.lastCollectedOffset ?? 0;
      const to = Math.min(lastOff + sc.window, rankTop);
      pct = Math.min(100, Math.max(0, Math.round((to / rankTop) * 100)));
      tip = `사이퍼즈 ${gtLabel}(레이팅) 랭킹 상위 ${rankTop.toLocaleString()}위를 매일 ${sc.window}명씩 순위 구간을 이동하며 수집합니다. 방금 ${(lastOff + 1).toLocaleString()}~${to.toLocaleString()}위 구간을 갱신했어요(순회 ${pct}%). 순위 구간별로 데이터 신선도가 다를 수 있습니다.`;
    }
  }
  const run = summary.lastCollect?.lastRun;
  return {
    label,
    pct,
    tip,
    lastRun: run ? fmtRun(run) : null,
    shortLabel,
  };
}

/** 최근 수집 시각 설명(툴팁·팝오버 공용) */
const LAST_RUN_TIP = "표본 데이터를 마지막으로 갱신한 시각이에요. 하루 한 번 자동으로 새 경기를 수집합니다.";

/**
 * @param summary — 수집 요약(집계 범위·최근 수집 시각). 없으면 헤더를 생략
 * @param kpis — KPI 칸(3개 또는 4개)
 * @param showProgress — 헤더에 "순회 중" 진행 막대를 보일지(캐릭터 티어 true, 조합 티어 false)
 * @param note — 카드 하단 안내 문구(선택)
 * @param className — 최대 폭 등 추가 클래스
 */
export default function CollectionStatsCard({
  summary,
  kpis,
  showProgress = true,
  note,
  className = "",
}: {
  summary: MetaSummary | null;
  kpis: CollectionKpi[];
  showProgress?: boolean;
  note?: string;
  className?: string;
}) {
  const scope = summary ? scopeOf(summary) : null;
  const n = kpis.length;
  const cols = n === 4 ? "grid-cols-4" : n === 3 ? "grid-cols-3" : "grid-cols-2";
  // 모바일 ⓘ 팝오버 내용 — 범위·항목별 설명·수집 시각
  const infoItems = [
    ...(scope?.label && scope.tip ? [{ label: "집계 범위", text: scope.tip }] : []),
    ...kpis.filter((k) => k.tip).map((k) => ({ label: k.label, text: k.tip as string })),
    ...(scope?.lastRun ? [{ label: "최근 수집", text: `${scope.lastRun} · ${LAST_RUN_TIP}` }] : []),
  ];
  // 모바일 회색 줄 — "상위 500위 · 순회 8%" · "최근 수집 2026. 9. 30. 01:01"
  const metaRight = [
    scope?.shortLabel ? `${scope.shortLabel}${showProgress && scope.pct != null ? ` · 순회 ${scope.pct}%` : ""}` : null,
    scope?.lastRun ? `최근 수집 ${scope.lastRun}` : null,
  ].filter(Boolean) as string[];

  return (
    <>
      {/* ── 모바일: 1b 한 줄 메타 라인 (숫자 줄과 수집 정보 줄이 나뉘면 사이 간격을 넉넉히) ── */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-y border-line py-3.5 sm:hidden">
        {/* 줄바꿈하면 다음 줄 맨 앞에 구분선이 남으므로, 좁은 폰에서는 줄바꿈 대신 옆으로 스크롤 */}
        <div className="scroll-row max-w-full items-baseline gap-x-4 text-[13px] text-gray-500">
          {kpis.map((k, i) => (
            <span key={k.label} className="inline-flex items-baseline gap-1.5">
              {/* 세로 구분선(첫 항목 제외) */}
              {i > 0 && <span className="mr-2.5 inline-block h-3 w-px self-center bg-line" aria-hidden />}
              {k.shortLabel ?? k.label}
              <b className="text-[15px] font-bold tabular-nums text-gray-100">
                {k.value}
                {k.unit}
              </b>
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-xs tabular-nums text-gray-500">
          {metaRight.map((t, i) => (
            <span key={t} className="inline-flex items-center gap-2">
              {i > 0 && <span aria-hidden>·</span>}
              {t}
            </span>
          ))}
          {infoItems.length > 0 && <CollectionInfoPopover items={infoItems} note={note} />}
        </div>
      </div>

      {/* ── sm 이상: 1a KPI 카드 + 상태 헤더 ── */}
      <div className={`hidden overflow-hidden rounded-[14px] border border-line bg-surface sm:block ${className}`}>
      {/* 상태 헤더 */}
      {scope && (scope.label || scope.lastRun) && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-b border-line/60 px-5 py-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px]" title={scope.tip || undefined}>
            <span
              className={`h-2 w-2 shrink-0 rounded-full bg-[#22c55e] ${showProgress ? "shadow-[0_0_0_3px_rgba(34,197,94,0.18)]" : ""}`}
              aria-hidden
            />
            {scope.label && <span className="font-semibold text-gray-100">{scope.label}</span>}
            {showProgress && scope.pct != null && (
              <>
                <span className="text-gray-500">순회 중</span>
                <span className="h-1 w-20 overflow-hidden rounded-sm bg-surface-3" aria-hidden>
                  <span className="block h-full bg-primary" style={{ width: `${scope.pct}%` }} />
                </span>
                <span className="font-semibold tabular-nums text-primary">{scope.pct}%</span>
              </>
            )}
          </div>
          {scope.lastRun && (
            <span className="text-xs tabular-nums text-gray-500" title={LAST_RUN_TIP}>
              최근 수집 {scope.lastRun}
            </span>
          )}
        </div>
      )}

      {/* KPI 칸 — 라벨 위 / 숫자 아래, 설명은 hover 툴팁 */}
      <div className={`grid ${cols}`}>
        {kpis.map((k, i) => (
          <div
            key={k.label}
            title={k.tip}
            className={`flex flex-col gap-1 border-line/60 px-5 py-4 ${i > 0 ? "border-l" : ""}`}
          >
            <span className="text-xs text-gray-500">{k.label}</span>
            <span className="text-[22px] font-bold leading-tight tabular-nums text-gray-100">
              {k.value}
              {k.unit && <span className="ml-0.5 text-sm font-medium text-gray-500">{k.unit}</span>}
            </span>
          </div>
        ))}
      </div>

      {/* 하단 안내 */}
      {note && (
        <div className="border-t border-line/60 bg-surface-2/60 px-5 py-2.5 text-xs leading-relaxed text-gray-500">{note}</div>
      )}
      </div>
    </>
  );
}
