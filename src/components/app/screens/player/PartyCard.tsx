/**
 * 앱 플레이어 화면의 "자주 만난 유저" 카드 (서버 컴포넌트, Suspense 로 늦게 채운다).
 *
 * 웹 PartyMembersCard 와 같은 계산: 최근 N판의 매치 상세를 불러와(캐시됨) 같은 팀·상대 팀으로 2판 이상 만난 유저를 센다.
 * Neople API 는 파티(미리 모인 그룹) 정보를 주지 않아, 실제 파티가 아니라 "자주 같은 편·상대 편으로 매칭된" 빈도다.
 * 앱에서는 두 목록을 가로로 넘기는 작은 타일 줄로 줄였다.
 */
import Link from "next/link";
import { getMatch } from "@/lib/neople";
import { buildFrequentPlayers, type FrequentPlayer } from "@/lib/profile";
import type { MatchDetail, MatchRow } from "@/lib/types";
import { CharImg, Skel } from "../../ui";
import { SubLabel } from "./parts";

/**
 * 한 줄(같은 팀 또는 상대 팀) — 가로로 넘기는 타일.
 * @param title 소제목
 * @param members 자주 만난 유저 목록
 * @param unit 판수 뒤에 붙일 말 ("함께" / "상대")
 * @param empty 비었을 때 안내
 */
function FrequentRow({ title, members, unit, empty }: { title: string; members: FrequentPlayer[]; unit: string; empty: string }) {
  return (
    <div className="grid gap-2">
      <SubLabel>{title}</SubLabel>
      {members.length === 0 ? (
        <p className="text-xs text-gray-500">{empty}</p>
      ) : (
        <div className="a-hscroll -mx-4 gap-2 px-4">
          {members.map((m) => (
            <Link
              key={m.playerId}
              href={`/players/${m.playerId}`}
              className="a-press flex w-[132px] shrink-0 items-center gap-2 rounded-xl bg-bg p-2"
            >
              <CharImg id={m.characterId} name={m.characterName ?? m.nickname} size={32} radius={9} />
              <span className="grid min-w-0 gap-px">
                <span className="truncate text-xs font-bold text-gray-100">{m.nickname}</span>
                <span className="text-[10.5px] text-gray-500">
                  {m.count}판 {unit}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 자주 만난 유저 카드.
 * @param playerId 이 화면의 플레이어 ID
 * @param matches 보기 기준의 최근 매치 (최신순)
 * @param sample 앞에서부터 상세를 볼 판수
 */
export async function PartyCard({ playerId, matches, sample = 20 }: { playerId: string; matches: MatchRow[]; sample?: number }) {
  const ids = matches
    .slice(0, sample)
    .map((m) => m.matchId)
    .filter(Boolean);
  if (ids.length === 0) return null;

  const details = (await Promise.all(ids.map((id) => getMatch(id).catch(() => null)))).filter(
    (d): d is MatchDetail => d !== null,
  );
  const { teammates, enemies } = buildFrequentPlayers(details, playerId, { limit: 5, minGames: 2 });

  return (
    <section className="a-card grid gap-3.5 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[17px] font-extrabold tracking-[-0.02em] text-gray-100">자주 만난 유저</h2>
        <span className="text-[11px] text-gray-500">최근 {details.length}판</span>
      </div>
      <FrequentRow title="같은 팀으로" members={teammates} unit="함께" empty="2판 이상 같은 팀이었던 유저가 없어요." />
      <FrequentRow title="상대 팀으로" members={enemies} unit="상대" empty="2판 이상 상대로 만난 유저가 없어요." />
      <p className="text-[11px] leading-relaxed text-gray-500">
        파티 정보가 제공되지 않아, 자주 같은 편·상대 편으로 만난 횟수로 셌어요.
      </p>
    </section>
  );
}

/** 자주 만난 유저 카드를 불러오는 동안 보여 줄 자리 */
export function PartyCardSkeleton() {
  return (
    <section className="a-card grid gap-3 p-4" aria-label="자주 만난 유저를 불러오는 중">
      <Skel className="h-5 w-28 rounded-md" />
      <div className="flex gap-2">
        <Skel className="h-12 w-[132px] rounded-xl" />
        <Skel className="h-12 w-[132px] rounded-xl" />
      </div>
      <div className="flex gap-2">
        <Skel className="h-12 w-[132px] rounded-xl" />
        <Skel className="h-12 w-[132px] rounded-xl" />
      </div>
    </section>
  );
}
