import Link from "next/link";
import { Avatar } from "@/components/CharacterAvatar";
import { getMatch } from "@/lib/neople";
import { buildFrequentPlayers, type FrequentPlayer } from "@/lib/profile";
import type { MatchDetail, MatchRow } from "@/lib/types";

/** 한 섹션(팀 또는 적팀) 렌더링 */
function FrequentList({
  title,
  members,
  unit,
  emptyText,
}: {
  title: string;
  members: FrequentPlayer[];
  unit: string;
  emptyText: string;
}) {
  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-bold text-gray-100">{title}</h3>
      {members.length === 0 ? (
        <p className="text-xs text-gray-500">{emptyText}</p>
      ) : (
        <ul className="space-y-2.5">
          {members.map((m, i) => (
            <li key={m.playerId} className="flex items-center gap-3">
              <span className="w-3 shrink-0 text-center text-xs font-bold text-gray-500">
                {i + 1}
              </span>
              <Avatar
                characterId={m.characterId}
                characterName={m.characterName ?? m.nickname}
                size={32}
                zoom={1}
              />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/players/${m.playerId}`}
                  className="block truncate text-sm font-semibold text-gray-200 hover:text-brand-glow"
                >
                  {m.nickname}
                </Link>
                <div className="text-xs text-gray-500">
                  {m.count}판 {unit}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * 자주 만난 유저 — 최근 매치 상세에서 "같은 팀" / "상대 팀" 동반 등장 빈도.
 * 매치 상세를 N건 병렬 조회하므로(캐싱됨) Suspense 로 감싸 스트리밍한다.
 * Neople API 에 파티(사전 그룹) 정보가 없어, 실제 파티가 아니라 매칭 빈도 기준이다.
 */
export default async function PartyMembersCard({
  playerId,
  matches,
  sample = 20,
}: {
  playerId: string;
  matches: MatchRow[];
  sample?: number;
}) {
  const ids = matches
    .slice(0, sample)
    .map((m) => m.matchId)
    .filter(Boolean);

  const details = (await Promise.all(ids.map((id) => getMatch(id).catch(() => null)))).filter(
    (d): d is MatchDetail => d !== null,
  );

  const { teammates, enemies } = buildFrequentPlayers(details, playerId, {
    limit: 5,
    minGames: 2,
  });

  return (
    <div className="space-y-4">
      <FrequentList
        title="팀으로 자주 만난 유저"
        members={teammates}
        unit="함께"
        emptyText="2판 이상 같은 팀이었던 유저가 없습니다."
      />
      <FrequentList
        title="적팀으로 자주 만난 유저"
        members={enemies}
        unit="상대"
        emptyText="2판 이상 상대로 만난 유저가 없습니다."
      />
    </div>
  );
}

/** 로딩 스켈레톤 (Suspense fallback) — 팀/적팀 두 섹션 */
export function PartyMembersSkeleton() {
  return (
    <div className="space-y-4">
      {["팀으로 자주 만난 유저", "적팀으로 자주 만난 유저"].map((title) => (
        <div key={title} className="card p-4">
          <h3 className="mb-3 text-sm font-bold text-gray-100">{title}</h3>
          <ul className="space-y-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="w-3 shrink-0 text-center text-xs font-bold text-gray-600">
                  {i + 1}
                </span>
                <span className="h-8 w-8 shrink-0 animate-pulse rounded-md bg-surface-2" />
                <div className="flex-1 space-y-1.5">
                  <span className="block h-3 w-20 animate-pulse rounded bg-surface-2" />
                  <span className="block h-2.5 w-12 animate-pulse rounded bg-surface-2" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
