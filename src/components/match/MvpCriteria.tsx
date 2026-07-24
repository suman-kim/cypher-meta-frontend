import { MVP_CRITERIA } from "@/lib/match-summary";

const ROLE_COLOR: Record<string, string> = {
  딜러: "#4f8ff0",
  탱커: "#ff5470",
  서포터: "#4fbf6b",
  공통: "#9aa7b4",
  오브젝트: "#e3b23c",
};

/**
 * MVP 자체 점수의 가중치 표 — 사용자가 산정 기준을 직접 확인.
 * 가중치는 lib/match-summary 의 MVP_CRITERIA 를 그대로 읽어와, 실제 계산과 항상 일치한다.
 * 접이식(기본 닫힘)이라 화면을 어지럽히지 않는다.
 */
export default function MvpCriteria() {
  const maxW = Math.max(...MVP_CRITERIA.map((c) => c.weight));
  return (
    <details className="group rounded-lg border border-line bg-surface-2/40">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-[11px] font-medium text-gray-400 transition-colors hover:text-gray-200 [&::-webkit-details-marker]:hidden">
        <span className="grid h-3.5 w-3.5 place-items-center rounded-full border border-gray-600/70 text-[9px] font-semibold leading-none">
          i
        </span>
        <span>MVP 산정 기준 보기</span>
        <span className="ml-auto text-gray-600 transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="px-3 pb-3">
        <p className="mb-2.5 text-[11px] leading-relaxed text-gray-500">
          게임 공식 ACE/JOKER 와 별개인 자체 지표입니다. 매치 안에서 각 항목을 최고값 대비 0~100%로
          정규화한 뒤 아래 가중치로 합산해, 점수가 가장 높은 선수를 팀당 1명 MVP로 뽑습니다. 특정
          역할(딜러)에 치우치지 않도록 탱킹·어시·시야·힐 비중을 높였습니다.
        </p>
        <ul className="space-y-1.5">
          {MVP_CRITERIA.map((c) => {
            const color = ROLE_COLOR[c.role] ?? "#9aa7b4";
            return (
              <li key={c.key} className="flex items-center gap-2">
                <span
                  className="w-8 shrink-0 text-right text-[11px] font-bold tabular-nums"
                  style={{ color }}
                >
                  {Math.round(c.weight * 100)}%
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[11px] text-gray-300">{c.label}</span>
                    <span
                      className="chip shrink-0 px-1 py-0 text-[9px] font-semibold leading-none"
                      style={{ color, backgroundColor: `${color}20` }}
                    >
                      {c.role}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(c.weight / maxW) * 100}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-2.5 text-[10px] text-gray-500">
          가중치 합계 100% · 데스는 적을수록 가점(생존)
        </p>
      </div>
    </details>
  );
}
