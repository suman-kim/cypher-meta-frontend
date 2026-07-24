import { Avatar } from "@/components/CharacterAvatar";
import CollapsibleCard from "@/components/CollapsibleCard";
import { buildMatchSummary } from "@/lib/match-summary";
import MvpCriteria from "./MvpCriteria";
import type { MatchDetail } from "@/lib/types";

/** AI 경기 요약 — 지표 분석 기반 요약 + 팀별 자체 MVP. 모바일/태블릿에서 접기/펼치기 가능. */
export default function MatchAiSummary({
  match,
  highlightPlayerId,
}: {
  match: MatchDetail;
  highlightPlayerId?: string;
}) {
  const s = buildMatchSummary(match, highlightPlayerId);

  return (
    <CollapsibleCard
      headerClassName="border-b border-line bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-3"
      header={
        <>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2l1.9 5.6L19.5 9 14 11.4 12 17l-2-5.6L4.5 9l5.6-1.4L12 2z" />
            </svg>
            AI
          </span>
          <span className="text-sm font-bold text-gray-100">AI 경기 요약</span>
        </>
      }
    >
      <div className="space-y-3 p-4">
        <p className="text-sm font-semibold leading-relaxed text-gray-100">{s.headline}</p>

        {s.mvps.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {s.mvps.map((mv) => (
              <div key={mv.teamLabel} className="rounded-lg border border-line bg-surface-2 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-300">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M5 4h14l-1.6 9.2A3 3 0 0 1 14.5 15.6V18h2v2H7.5v-2h2v-2.4A3 3 0 0 1 6.6 13.2L5 4z" />
                    </svg>
                    {mv.teamLabel} MVP
                  </span>
                  {mv.known && (
                    <span
                      className={`chip px-1.5 py-0 text-[10px] font-bold ${
                        mv.win ? "bg-win/15 text-blue-300" : "bg-lose/15 text-red-300"
                      }`}
                    >
                      {mv.win ? "승리" : "패배"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Avatar
                    characterId={mv.characterId}
                    characterName={mv.characterName ?? mv.nickname}
                    size={32}
                    zoom={1}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-gray-100">{mv.nickname}</div>
                    <div className="truncate text-xs text-gray-500">
                      {mv.characterName ? `${mv.characterName} · ` : ""}
                      {mv.kdaText} · {mv.ratingText}
                    </div>
                  </div>
                </div>
                <div className="mt-2 truncate text-xs font-medium text-primary">{mv.reason}</div>
              </div>
            ))}
          </div>
        )}

        {s.mvps.length > 0 && <MvpCriteria />}

        <ul className="space-y-1.5">
          {s.points.map((p, i) => (
            <li key={i} className="flex gap-2 text-sm leading-relaxed text-gray-400">
              <span className="mt-0.5 shrink-0 text-primary">·</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>

        <p className="text-[11px] text-gray-500">
          ※ 경기 지표를 자체 분석해 자동 생성한 요약입니다. MVP는 킬·딜·어시·생존·시야·힐을 가중 합산해 팀별로 선정됩니다.
        </p>
      </div>
    </CollapsibleCard>
  );
}
