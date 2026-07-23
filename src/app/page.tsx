import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import { getRatingRanking } from "@/lib/neople";
import { getCharacterMeta, withTiers, TIER_META, type TieredCharacter } from "@/lib/meta";
import { Avatar } from "@/components/CharacterAvatar";
import { winRate } from "@/lib/format";
import type { RatingRankingRow } from "@/lib/types";

export const dynamic = "force-dynamic";

const POPULAR = ["듀블", "레베카", "다오", "아이샤"];

// 메타 데이터가 아직 없을 때 보여줄 예시(목업)
const TREND_MOCK = [
  { tier: "S", name: "루이스", pick: "52.4", win: "51.2" },
  { tier: "S", name: "클레어", pick: "48.1", win: "50.8" },
  { tier: "A", name: "드렉슬러", pick: "42.7", win: "53.1" },
  { tier: "A", name: "시바", pick: "39.2", win: "49.5" },
  { tier: "B", name: "피터", pick: "35.8", win: "54.2" },
  { tier: "B", name: "카인", pick: "31.4", win: "47.8" },
];
const NEWS = [
  { tag: "업데이트", title: "밸런스 패치 노트: 시즌 12 에피소드 3" },
  { tag: "E스포츠", title: "사이퍼즈 스프링 챔피언십 결승 대진표" },
  { tag: "가이드", title: "신규 유저를 위한 포지션별 캐릭터 추천" },
];
const POSTS = [
  { tag: "자유", title: "랭크에서 클레어 플레이 팁 아시는 분 계신가요?", c: 124 },
  { tag: "공략", title: "[궁극의 가이드] 탱커 캐릭터 상대하는 방법", c: 89 },
  { tag: "유머", title: "우리가 이길 때 vs 질 때 우리 팀원들...", c: 256 },
  { tag: "영상", title: "그랜드마스터 랭킹 1위 하이라이트 - 4주차", c: 42 },
];

const RANK_COLORS = ["#e3b23c", "#9aa7b4", "#b06b3f"];

function MockBadge() {
  return <span className="chip bg-surface-3 text-gray-500">예시</span>;
}

export default async function HomePage() {
  let top: RatingRankingRow[] = [];
  try {
    const r = await getRatingRanking({ limit: 3 });
    top = (r.rows ?? []).slice(0, 3);
  } catch {}

  // 실 메타 트렌드 (점수 상위 6)
  let trend: TieredCharacter[] = [];
  try {
    const meta = await getCharacterMeta();
    trend = withTiers(meta)
      .sort((a, b) => b.score - a.score || b.pickRate - a.pickRate)
      .slice(0, 6);
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
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-white/70">
              <span>인기:</span>
              {POPULAR.map((n) => (
                <Link
                  key={n}
                  href={`/search?nickname=${encodeURIComponent(n)}`}
                  className="font-semibold text-white hover:underline"
                >
                  {n}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 상위 랭커 (실데이터) */}
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
              const wr = winRate(row.win, row.lose);
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
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-full font-bold text-white"
                      style={{ backgroundColor: RANK_COLORS[i] ?? "#9aa7b4" }}
                    >
                      {row.ranking}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-bold text-gray-100">{row.player.nickname}</div>
                      <div className="text-xs text-gray-500">
                        Rating {(row.ratingPoint ?? 0).toLocaleString()} RP
                      </div>
                    </div>
                  </div>
                  <div className="relative mt-3">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-primary">승률 {wr}%</span>
                      <span className="text-gray-500">
                        {row.win ?? 0}승 {row.lose ?? 0}패
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${wr}%` }} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* 주간 캐릭터 트렌드 */}
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

      {/* 최신 소식 + 커뮤니티 (예시) */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-100">
            🗞 최신 소식 <MockBadge />
          </h2>
          <div className="card divide-y divide-line">
            {NEWS.map((n) => (
              <div key={n.title} className="flex items-center gap-3 p-3">
                <span className="chip shrink-0 bg-primary/10 text-primary">{n.tag}</span>
                <span className="truncate text-sm text-gray-200">{n.title}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-100">
            💬 커뮤니티 포스트 <MockBadge />
          </h2>
          <div className="card divide-y divide-line">
            {POSTS.map((p) => (
              <div key={p.title} className="flex items-center gap-3 p-3">
                <span className="chip shrink-0 bg-surface-3 text-gray-500">{p.tag}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-gray-200">{p.title}</span>
                <span className="shrink-0 text-xs text-gray-500">댓글 {p.c}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
