/**
 * MultiPlayerCard — 멀티서치 플레이어 카드(최근 공식전 요약 한 장).
 * 대표 캐릭터·닉네임·티어/RP, 최근 승률·승패, 최근 흐름(승패 점), KDA, 많이 쓴 캐릭터 3개를 한 카드에 담는다.
 * 훅을 쓰지 않는 표시 컴포넌트라 서버 컴포넌트에서 바로 쓴다.
 */
import Link from "next/link";
import { Avatar } from "@/components/CharacterAvatar";
import { TierBadge } from "@/components/ui";
import { kdaColor } from "@/lib/format";
import { MULTI_RECENT, type MultiSummary } from "@/lib/multi";

/** 카드에 필요한 플레이어 정보 */
export interface MultiCardPlayer {
  playerId: string;
  nickname: string;
  tierName?: string;
  ratingPoint?: number;
  representId?: string;
  representName?: string;
}

/**
 * @param player — 플레이어 정보
 * @param summary — 최근 공식전 요약
 * @param tone — "a"(내 팀, 파랑) | "b"(상대 팀, 빨강)
 */
export default function MultiPlayerCard({
  player,
  summary,
  tone,
}: {
  player: MultiCardPlayer;
  summary: MultiSummary;
  tone: "a" | "b";
}) {
  const isA = tone === "a";
  const wr = summary.winRate;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-surface p-3.5 pl-4 transition-colors hover:border-primary/30">
      <span className={`absolute inset-y-0 left-0 w-1 ${isA ? "bg-primary" : "bg-lose"}`} aria-hidden />

      {/* 1줄 — 대표 캐릭터 · 닉네임 · 티어 / 최근 승률 */}
      <div className="flex items-center gap-3">
        <span className={`shrink-0 rounded-xl p-[2px] ${isA ? "bg-primary/40" : "bg-lose/40"}`}>
          <Avatar characterId={player.representId} characterName={player.representName} size={42} zoom={2} />
        </span>
        <div className="min-w-0 flex-1">
          <Link
            href={`/players/${player.playerId}`}
            className="block truncate text-[15px] font-black text-gray-50 transition-colors hover:text-primary"
          >
            {player.nickname}
          </Link>
          <div className="mt-0.5 truncate text-[11px]">
            <TierBadge tierName={player.tierName} rp={player.ratingPoint} />
          </div>
        </div>
        <div className="shrink-0 text-right">
          {wr != null ? (
            <>
              <div className={`text-xl font-black leading-none tabular-nums ${wr >= 50 ? "text-win" : "text-lose"}`}>{wr}%</div>
              <div className="mt-1 text-[10px] font-semibold tabular-nums text-gray-500">
                {summary.wins}승 {summary.losses}패
              </div>
            </>
          ) : (
            <div className="text-[11px] font-semibold text-gray-500">기록 없음</div>
          )}
        </div>
      </div>

      {summary.games > 0 ? (
        <>
          {/* 2줄 — 최근 흐름 · KDA */}
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-[3px]" title={`최근 ${summary.form.length}판 (왼쪽이 최신)`}>
              {summary.form.map((r, i) => (
                <span key={i} className={`h-3.5 w-2 rounded-[3px] ${r === "win" ? "bg-win" : "bg-lose/80"}`} />
              ))}
            </div>
            <div className="text-right text-[11px] tabular-nums text-gray-500">
              <span className="font-black" style={{ color: kdaColor(summary.kda ?? 0) }}>
                KDA {summary.kda?.toFixed(2)}
              </span>{" "}
              · {summary.avgKill}/{summary.avgDeath}/{summary.avgAssist}
            </div>
          </div>

          {/* 3줄 — 많이 쓴 캐릭터 */}
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {summary.characters.map((c) => (
              <div key={c.characterId} className="flex min-w-0 items-center gap-1.5 rounded-lg bg-surface-2 p-1 pr-1.5" title={c.characterName}>
                <Avatar characterId={c.characterId} characterName={c.characterName} size={26} />
                <div className="min-w-0 leading-tight">
                  <div className="truncate text-[11px] font-bold text-gray-200">{c.characterName}</div>
                  <div className="text-[10px] tabular-nums text-gray-500">
                    {c.games}판 <span className={c.winRate >= 50 ? "text-win" : "text-lose"}>{c.winRate}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-3 text-[11px] text-gray-500">최근 {MULTI_RECENT}판 안에 공식전 기록이 없어요.</p>
      )}
    </div>
  );
}

/**
 * 찾지 못한 닉네임·오류 자리 카드.
 * @param nickname — 입력 닉네임
 * @param message — 안내 문구
 * @param tone — "a" | "b"
 */
export function MultiMissingCard({ nickname, message, tone }: { nickname: string; message: string; tone: "a" | "b" }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-line bg-surface/60 p-3.5 pl-4">
      <span className={`absolute inset-y-0 left-0 w-1 ${tone === "a" ? "bg-primary/40" : "bg-lose/40"}`} aria-hidden />
      <div className="truncate text-[15px] font-black text-gray-300">{nickname}</div>
      <div className="mt-0.5 text-[11px] text-gray-500">{message}</div>
    </div>
  );
}
