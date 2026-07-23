import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import { getRatingRanking } from "@/lib/neople";
import { getCharacterMeta, withTiers, TIER_META, type TieredCharacter } from "@/lib/meta";
import { enrichPlayer, mapLimit, type PlayerMeta } from "@/lib/ranking-enrich";
import { Avatar } from "@/components/CharacterAvatar";
import RankAvatar from "@/components/ranking/RankAvatar";
import PickList from "@/components/ranking/PickList";
import {
  getNotices,
  getRecentPosts,
  isBoard,
  categoryLabel,
  type CommunityPost,
} from "@/lib/community";
import type { RatingRankingRow } from "@/lib/types";

export const dynamic = "force-dynamic";

// 메타 데이터가 아직 없을 때 보여줄 예시(목업)
const TREND_MOCK = [
  { tier: "S", name: "루이스", pick: "52.4", win: "51.2" },
  { tier: "S", name: "클레어", pick: "48.1", win: "50.8" },
  { tier: "A", name: "드렉슬러", pick: "42.7", win: "53.1" },
  { tier: "A", name: "시바", pick: "39.2", win: "49.5" },
  { tier: "B", name: "피터", pick: "35.8", win: "54.2" },
  { tier: "B", name: "카인", pick: "31.4", win: "47.8" },
];

const RANK_COLORS = ["#e3b23c", "#9aa7b4", "#b06b3f"];

function MockBadge() {
  return <span className="chip bg-surface-3 text-gray-500">예시</span>;
}

function communityHref(p: CommunityPost) {
  return `/community/${isBoard(p.boardType) ? p.boardType : "free"}/${p.id}`;
}

export default async function HomePage() {
  // 상위 랭커(실데이터) + 각자 최근 공식전 기록(대표캐릭터·픽·승률)
  let top: RatingRankingRow[] = [];
  try {
    const r = await getRatingRanking({ limit: 3 });
    top = (r.rows ?? []).slice(0, 3);
  } catch {}

  const topMetas = await mapLimit(top, 3, (row) => enrichPlayer(row.player.playerId, 30));
  const metaMap = new Map<string, PlayerMeta>(topMetas.map((m) => [m.playerId, m]));

  // 실 메타 트렌드 (점수 상위 6)
  let trend: TieredCharacter[] = [];
  try {
    const meta = await getCharacterMeta();
    trend = withTiers(meta)
      .sort((a, b) => b.score - a.score || b.pickRate - a.pickRate)
      .slice(0, 6);
  } catch {}

  // 커뮤니티 실데이터
  let notices: CommunityPost[] = [];
  let recent: CommunityPost[] = [];
  try {
    [notices, recent] = await Promise.all([
      getNotices(4).catch(() => []),
      getRecentPosts(5).catch(() => []),
    ]);
  } catch {}

  return (
    <div className="space-y-8">
      {/* 히어로 검색 */}
      <section className="-mx-4 overflow-hidden bg-gradient-to-b from-navy to-primary sm:-mx-6 lg:-mx-8 2xl:-mx-12">
        <div className="px-4 py-14 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-2xl font-extrabold text-white sm:text-3xl">사이퍼즈 전적 및 통계 검색</h1>
            <p className="mt-2 text-sm text-white/75">닉네임으로 전적을 검색하고 랭킹·캐릭터·아이템을 확인하세요.</p>
            <div className="mt-6">
              <SearchBar size="lg" autoFocus />
            </div>
          </div>
        </div>
      </section>

      {/* 상위 랭커 (실데이터 + 대표캐릭터·픽·승률) */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-100">🏅 상위 랭커</h2>
          <Link href="/ranking" className="text-sm font-medium text-primary hover:underline">
            전체 순위 보기
          </Link>
        </div>
        {top.length === 0 ? (
          <div className="card p-8 text-center text-sm text-gray-500">
            랭킹 데이터를 불러올 수 없습니다. (API 키/네트워크 확인)
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {top.map((row, i) => {
              const m = metaMap.get(row.player.playerId);
              const hasRecord = (m?.total ?? 0) > 0;
              const wr = m?.winRate ?? 0;
              const loses = (m?.total ?? 0) - (m?.wins ?? 0);
              return (
                <Link
                  key={row.player.playerId}
                  href={`/players/${row.player.playerId}`}
                  className="card relative overflow-hidden p-4 transition-colors hover:bg-surface-2"
                >
                  <span className="pointer-events-none absolute -right-1 -top-4 select-none text-7xl font-black text-gray-200/50">
                    {row.ranking}
                  </span>
                  <div className="relative flex items-center gap-3">
                    <RankAvatar
                      characterId={m?.topChar?.characterId}
                      characterName={m?.topChar?.characterName}
                      nickname={row.player.nickname}
                      size={48}
                      zoom={2}
                      ringStyle={{ boxShadow: `0 0 0 3px ${RANK_COLORS[i] ?? "#9aa7b4"}` }}
                    />
                    <div className="min-w-0">
                      <div className="truncate font-bold text-gray-100">{row.player.nickname}</div>
                      <div className="text-xs text-gray-500">
                        Rating {(row.ratingPoint ?? 0).toLocaleString()} RP
                      </div>
                    </div>
                  </div>

                  {hasRecord ? (
                    <div className="relative mt-3">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-primary">승률 {wr}%</span>
                        <span className="text-gray-500">
                          {m?.wins ?? 0}승 {loses}패
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${wr}%` }} />
                      </div>
                    </div>
                  ) : (
                    <div className="relative mt-3 text-xs text-gray-500">최근 공식전 기록 없음</div>
                  )}

                  <div className="relative mt-3 flex items-center gap-2">
                    <span className="shrink-0 text-[11px] font-semibold text-gray-500">픽 TOP3</span>
                    <PickList picks={m?.picks ?? []} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* 캐릭터 메타 트렌드 */}
      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold text-gray-100">📈 캐릭터 메타 트렌드</h2>
          {trend.length === 0 ? (
            <>
              <MockBadge />
              <span className="text-xs text-gray-500">수집된 데이터가 아직 없습니다</span>
            </>
          ) : (
            <Link href="/meta" className="text-sm font-medium text-primary hover:underline">
              전체 메타 보기
            </Link>
          )}
        </div>

        {trend.length === 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {TREND_MOCK.map((c) => (
              <div key={c.name} className="card overflow-hidden">
                <div className="flex h-16 items-start bg-surface-2 p-2">
                  <span className="chip bg-navy/80 text-white">TIER {c.tier}</span>
                </div>
                <div className="p-2.5">
                  <div className="truncate text-sm font-bold text-gray-100">{c.name}</div>
                  <div className="mt-1 flex justify-between text-xs">
                    <span className="text-gray-500">픽률</span>
                    <span className="font-semibold text-primary">{c.pick}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">승률</span>
                    <span className="font-semibold text-gray-200">{c.win}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {trend.map((c) => (
              <Link
                key={c.characterId}
                href={`/characters/${c.characterId}`}
                className="card overflow-hidden transition-colors hover:bg-surface-2"
              >
                <div className="flex items-center gap-2 bg-surface-2 p-2">
                  <span
                    className="grid h-6 w-6 shrink-0 place-items-center rounded text-xs font-black text-white"
                    style={{ backgroundColor: TIER_META[c.tier].color }}
                  >
                    {c.tier}
                  </span>
                  <Avatar characterId={c.characterId} characterName={c.characterName ?? undefined} size={28} />
                  <span className="truncate text-sm font-bold text-gray-100">
                    {c.characterName ?? c.characterId}
                  </span>
                </div>
                <div className="p-2.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">픽률</span>
                    <span className="font-semibold text-primary">{c.pickRate}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">승률</span>
                    <span
                      className="font-semibold"
                      style={{ color: c.winRate >= 50 ? "rgb(var(--win))" : undefined }}
                    >
                      {c.winRate}%
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 최신 소식(공지) + 커뮤니티 포스트 — 실데이터 */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 flex items-center justify-between text-lg font-bold text-gray-100">
            🗞 최신 소식
            <Link href="/community" className="text-sm font-medium text-primary hover:underline">
              커뮤니티 가기
            </Link>
          </h2>
          <div className="card divide-y divide-line">
            {notices.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">등록된 공지가 없습니다.</div>
            ) : (
              notices.map((n) => (
                <Link
                  key={n.id}
                  href={communityHref(n)}
                  className="flex items-center gap-3 p-3 transition-colors hover:bg-surface-2"
                >
                  <span className="chip shrink-0 bg-primary/10 text-primary">공지</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-gray-200">{n.title}</span>
                </Link>
              ))
            )}
          </div>
        </div>
        <div>
          <h2 className="mb-3 flex items-center justify-between text-lg font-bold text-gray-100">
            💬 커뮤니티 포스트
            <Link href="/community" className="text-sm font-medium text-primary hover:underline">
              더보기
            </Link>
          </h2>
          <div className="card divide-y divide-line">
            {recent.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                아직 게시글이 없습니다.{" "}
                <Link href="/community/free/write" className="font-medium text-primary hover:underline">
                  첫 글 남기기
                </Link>
              </div>
            ) : (
              recent.map((p) => (
                <Link
                  key={p.id}
                  href={communityHref(p)}
                  className="flex items-center gap-3 p-3 transition-colors hover:bg-surface-2"
                >
                  <span className="chip shrink-0 bg-surface-3 text-gray-500">
                    {categoryLabel(p.category)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-gray-200">{p.title}</span>
                  {p.commentCount > 0 && (
                    <span className="shrink-0 text-xs text-gray-500">댓글 {p.commentCount}</span>
                  )}
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
