import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import { getRatingRanking } from "@/lib/neople";
import {
  getCharacterMeta,
  getCompositions,
  getMetaSummary,
  type CharacterMeta,
  type CompositionsResult,
  type MetaSummary,
} from "@/lib/meta";
import { enrichPlayer, mapLimit, type PlayerMeta } from "@/lib/ranking-enrich";
import { Avatar } from "@/components/CharacterAvatar";
import { CountUp } from "@/components/CountUp";
import RankerSlider from "@/components/ranking/RankerSlider";
import LiveStreams from "@/components/LiveStreams";
import { getLiveStreams } from "@/lib/live";
import { getLatestUpdate } from "@/lib/updates";
import LatestUpdateCard from "@/components/updates/LatestUpdateCard";
import {
  getNotices,
  getRecentPosts,
  isBoard,
  categoryLabel,
  type CommunityPost,
} from "@/lib/community";
import type { RatingRankingRow } from "@/lib/types";

export const dynamic = "force-dynamic";

const RANK_COLORS = ["#e3b23c", "#9aa7b4", "#b06b3f"];

const ROLE_META = [
  { key: "tank", label: "탱커", color: "#5b8def" },
  { key: "melee", label: "근접딜러", color: "#e2506a" },
  { key: "ranged", label: "원거리딜러", color: "#4fbf6b" },
  { key: "support", label: "서포터", color: "#a15bf0" },
] as const;

/** 포지션별 아이콘 (색상은 각 포지션 색 유지) — 탱커=방패 / 근접딜러=검 / 원거리딜러=과녁 / 서포터=하트 */
function RoleIcon({ role, color }: { role: string; color: string }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "shrink-0",
  };
  if (role === "tank")
    return (
      <svg {...common}>
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      </svg>
    );
  if (role === "melee")
    return (
      <svg {...common}>
        <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
        <path d="M13 19l6-6" />
        <path d="M16 16l4 4" />
        <path d="M19 21l2-2" />
      </svg>
    );
  if (role === "ranged")
    return (
      <svg {...common}>
        <circle cx="16.5" cy="6.5" r="3" />
        <path d="M14.4 8.6 4 19" />
        <path d="M16.5 1.7v1.3" />
        <path d="M21.3 6.5h-1.3" />
      </svg>
    );
  return (
    <svg {...common} strokeWidth={2.5}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function communityHref(p: CommunityPost) {
  return `/community/${isBoard(p.boardType) ? p.boardType : "free"}/${p.id}`;
}

function rankBadge(i: number) {
  return i === 0
    ? "bg-primary text-white"
    : i === 1
      ? "bg-surface-3 text-gray-100"
      : i === 2
        ? "bg-[#c07b3f] text-white"
        : "bg-surface-2 text-gray-400";
}

function SectionHeader({
  icon,
  title,
  href,
  cta,
}: {
  icon: string;
  title: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="mb-3.5 flex items-center justify-between">
      <h2 className="flex items-center gap-2.5 text-lg font-bold text-gray-100">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-base">{icon}</span>
        {title}
      </h2>
      {href && cta && (
        <Link
          href={href}
          className="inline-flex items-center gap-0.5 text-sm font-medium text-gray-400 transition-colors hover:text-primary"
        >
          {cta}
          <span className="text-xs">›</span>
        </Link>
      )}
    </div>
  );
}

function HeroStat({ value, label, delay = 0 }: { value: number; label: string; delay?: number }) {
  return (
    <div className="text-center">
      <div className="bg-gradient-to-b from-gray-50 to-gray-300 bg-clip-text text-xl font-black text-transparent sm:text-2xl">
        <CountUp end={value} duration={1500 + delay} />
      </div>
      <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-gray-500">{label}</div>
    </div>
  );
}

export default async function HomePage() {
  let top: RatingRankingRow[] = [];
  try {
    const r = await getRatingRanking({ limit: 10 });
    top = (r.rows ?? []).slice(0, 10);
  } catch {}

  const topMetas = await mapLimit(top, 5, (row) => enrichPlayer(row.player.playerId, 30));
  const metaMap = new Map<string, PlayerMeta>(topMetas.map((m) => [m.playerId, m]));

  let charMeta: CharacterMeta[] = [];
  let comps: CompositionsResult | null = null;
  let summary: MetaSummary | null = null;
  try {
    [charMeta, comps, summary] = await Promise.all([
      getCharacterMeta("rating"),
      getCompositions({ gameTypeId: "rating", limit: 6, minGames: 1 }).catch(() => null),
      getMetaSummary().catch(() => null),
    ]);
  } catch {}

  const roleTop: Record<string, CharacterMeta[]> = {};
  for (const rm of ROLE_META) {
    roleTop[rm.key] = charMeta
      .filter((c) => c.role === rm.key)
      .sort((a, b) => b.pickRate - a.pickRate || b.winRate - a.winRate)
      .slice(0, 3);
  }
  const compTrend = comps?.byFrequency ?? [];
  const hasMeta = charMeta.length > 0;

  let notices: CommunityPost[] = [];
  let recent: CommunityPost[] = [];
  try {
    [notices, recent] = await Promise.all([
      getNotices(4).catch(() => []),
      getRecentPosts(5).catch(() => []),
    ]);
  } catch {}

  const liveStreams = await getLiveStreams(20);
  const latestUpdate = await getLatestUpdate();

  return (
    <div className="space-y-10">
      {/* 히어로 */}
      <section className="relative -mx-4 overflow-hidden border-b border-line sm:-mx-6 lg:-mx-8 2xl:-mx-12">
        <div className="absolute inset-0 bg-gradient-to-b from-surface via-surface to-bg" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-60 w-[46rem] max-w-[92vw] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]"
          style={{
            backgroundImage: "radial-gradient(rgb(var(--border)) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="relative mx-auto max-w-2xl px-4 py-10 text-center sm:py-14">
          <span className="fade-up inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold tracking-wide text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            CYPHERS META
          </span>
          <h1 className="fade-up mt-4 text-3xl font-black leading-tight tracking-tight text-gray-50 sm:text-[2.75rem]" style={{ animationDelay: "0.07s" }}>
            사이퍼즈{" "}
            <span className="bg-gradient-to-r from-primary to-primary-strong bg-clip-text text-transparent">
              전적·통계
            </span>{" "}
            검색
          </h1>
          <p className="fade-up mx-auto mt-3 max-w-md text-sm text-gray-500 sm:text-base" style={{ animationDelay: "0.14s" }}>
            닉네임으로 전적을 검색하고 랭킹·티어·조합 메타를 한눈에 확인하세요.
          </p>
          <div className="fade-up relative z-30 mx-auto mt-6 max-w-xl" style={{ animationDelay: "0.21s" }}>
            <SearchBar size="lg" />
          </div>
          <div className="fade-up mt-4 flex flex-wrap items-center justify-center gap-2" style={{ animationDelay: "0.28s" }}>
            {[
              { href: "/ranking", label: "🏅 랭킹" },
              { href: "/meta", label: "📈 캐릭터 티어" },
              { href: "/meta/comp", label: "🧩 조합 티어" },
              { href: "/characters", label: "🦸 캐릭터" },
            ].map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className="rounded-full border border-line bg-surface/70 px-3.5 py-1.5 text-xs font-medium text-gray-400 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary hover:text-primary"
              >
                {q.label}
              </Link>
            ))}
          </div>

          {summary && (
            <div className="fade-up mx-auto mt-7 flex max-w-md items-center justify-center gap-5 rounded-2xl border border-line bg-surface/60 px-5 py-3.5 shadow-[0_10px_34px_-14px_rgba(83,131,232,0.4)] ring-1 ring-primary/5 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-12px_rgba(83,131,232,0.5)] sm:gap-8" style={{ animationDelay: "0.35s" }}>
              <HeroStat value={summary.matches} label="수집 매치" />
              <span className="h-8 w-px bg-line" />
              <HeroStat value={summary.characters} label="캐릭터" delay={150} />
              <span className="h-8 w-px bg-line" />
              <HeroStat value={summary.playerRecords} label="플레이 기록" delay={300} />
            </div>
          )}
        </div>
      </section>

      {latestUpdate && <LatestUpdateCard update={latestUpdate} />}

      {/* 지금 방송 중 (치지직·유튜브·SOOP 라이브, 시청자수 순) */}
      <LiveStreams initial={liveStreams} limit={20} />

      {/* 상위 랭커 TOP 10 */}
      <section>
        <SectionHeader icon="🏅" title="상위 랭커 TOP 10" href="/ranking" cta="전체 순위" />
        {top.length === 0 ? (
          <div className="card p-8 text-center text-sm text-gray-500">
            랭킹 데이터를 불러올 수 없습니다. (API 키/네트워크 확인)
          </div>
        ) : (
          <RankerSlider
            items={top.slice(0, 10).map((row) => {
              const m = metaMap.get(row.player.playerId);
              return {
                ranking: row.ranking,
                playerId: row.player.playerId,
                nickname: row.player.nickname,
                ratingPoint: row.ratingPoint ?? 0,
                tierName: row.tierName ?? null,
                win: m?.wins ?? row.win ?? 0,
                total: m?.total ?? (row.win ?? 0) + (row.lose ?? 0),
                winRate: m?.winRate ?? 0,
                charId: m?.topChar?.characterId ?? null,
                charName: m?.topChar?.characterName ?? null,
                picks: m?.picks ?? [],
              };
            })}
          />
        )}
      </section>

      {/* 포지션별 캐릭터 TOP3 */}
      <section>
        <SectionHeader icon="🧭" title="포지션별 캐릭터 TOP3" href="/meta" cta="캐릭터 티어" />
        {!hasMeta ? (
          <div className="card p-8 text-center text-sm text-gray-500">수집된 메타 데이터가 아직 없습니다.</div>
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {ROLE_META.map((rm) => {
              const list = roleTop[rm.key] ?? [];
              return (
                <div
                  key={rm.key}
                  className="card overflow-hidden shadow-sm transition-shadow hover:shadow-float"
                >
                  <div className="relative flex items-center gap-2 border-b border-line px-4 py-3">
                    <span className="absolute inset-x-0 top-0 h-0.5" style={{ backgroundColor: rm.color }} />
                    <RoleIcon role={rm.key} color={rm.color} />
                    <span className="text-sm font-bold text-gray-100">{rm.label}</span>
                  </div>
                  {list.length === 0 ? (
                    <div className="p-5 text-center text-xs text-gray-500">데이터 없음</div>
                  ) : (
                    <div className="divide-y divide-line">
                      {list.map((c, i) => (
                        <Link
                          key={c.characterId}
                          href={`/characters/${c.characterId}`}
                          className="flex items-center gap-2.5 p-2.5 transition-colors hover:bg-surface-2"
                        >
                          <span
                            className="w-4 shrink-0 text-center text-sm font-black tabular-nums"
                            style={{ color: RANK_COLORS[i] ?? "#9aa7b4" }}
                          >
                            {i + 1}
                          </span>
                          <Avatar
                            characterId={c.characterId}
                            characterName={c.characterName ?? undefined}
                            size={36}
                            zoom={1}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-gray-100">
                              {c.characterName ?? c.characterId}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              픽 {c.pickRate}% · 승 {c.winRate}%
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5인 조합 메타 트렌드 */}
      <section>
        <SectionHeader icon="🧩" title="5인 조합 메타 트렌드" href="/meta/comp" cta="조합 티어" />
        {compTrend.length === 0 ? (
          <div className="card p-8 text-center text-sm text-gray-500">수집된 조합 데이터가 아직 없습니다.</div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {compTrend.map((c, i) => (
              <div
                key={c.ids.join("-")}
                className="card flex items-center gap-3 p-3 shadow-sm transition-colors hover:border-primary/40"
              >
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md text-sm font-black ${rankBadge(i)}`}>
                  {i + 1}
                </span>
                <div className="flex flex-1 flex-wrap items-center gap-1.5">
                  {c.ids.map((id, j) => (
                    <span key={`${id}-${j}`} className="flex flex-col items-center gap-0.5" title={c.names[j]}>
                      <Avatar characterId={id} characterName={c.names[j]} size={32} zoom={1} />
                      <span className="w-9 truncate text-center text-[9px] leading-tight text-gray-500">
                        {c.names[j]}
                      </span>
                    </span>
                  ))}
                </div>
                <div className="shrink-0 text-right">
                  <div
                    className="text-sm font-bold"
                    style={{ color: c.winRate >= 50 ? "rgb(var(--win))" : undefined }}
                  >
                    {c.winRate}%
                  </div>
                  <div className="text-[11px] text-gray-500">{c.games}판</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 최신 소식 + 커뮤니티 */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <SectionHeader icon="🗞" title="최신 소식" href="/community" cta="커뮤니티" />
          <div className="card divide-y divide-line shadow-sm">
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
          <SectionHeader icon="💬" title="커뮤니티 포스트" href="/community" cta="더보기" />
          <div className="card divide-y divide-line shadow-sm">
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
                  <span className="chip shrink-0 bg-surface-3 text-gray-500">{categoryLabel(p.category)}</span>
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
