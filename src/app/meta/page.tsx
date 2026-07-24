import Link from "next/link";
import {
  getCharacterMeta,
  getMetaSummary,
  withTiers,
  groupByTier,
  TIER_ORDER,
  TIER_META,
  TIER_BASIS_LABEL,
  ROLE_TABS,
  ROLE_LABELS,
  isRoleFilter,
  type TierBasis,
  type RoleFilter,
  type CharacterMeta,
  type MetaSummary,
} from "@/lib/meta";
import {
  getRoster,
  getTierVotes,
  rosterMapOf,
  VOTE_ROLES,
  type RosterEntry,
  type TierVotesResult,
} from "@/lib/votes";
import { Avatar } from "@/components/CharacterAvatar";
import MetaTable from "@/components/MetaTable";
import { TierPickCell } from "@/components/meta/TierPickCell";
import MetaViewTabs from "@/components/meta/MetaViewTabs";
import TierVote from "@/components/meta/TierVote";
import { EmptyState, ErrorState } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "캐릭터 티어" };

const GAME_TABS = [{ key: "rating", label: "공식전" }] as const;
const BASIS_TABS: { key: TierBasis; label: string }[] = [
  { key: "score", label: "종합" },
  { key: "win", label: "승률" },
  { key: "pick", label: "픽률" },
];

function metaHref(gameType: string, tierBy: TierBasis, role: RoleFilter): string {
  const p: string[] = [];
  if (gameType) p.push(`gameType=${gameType}`);
  if (tierBy !== "score") p.push(`tierBy=${tierBy}`);
  if (role !== "all") p.push(`role=${role}`);
  return p.length ? `/meta?${p.join("&")}` : "/meta";
}

function renderHeader(tab: "data" | "vote") {
  const desc =
    tab === "vote"
      ? "유저가 직접 역할별 최고 캐릭터를 뽑는 커뮤니티 투표입니다."
      : "상위 랭커 매치를 집계한 캐릭터 티어입니다.";
  return (
    <div>
      <h1 className="text-2xl font-black tracking-tight text-gray-50">캐릭터 티어</h1>
      <p className="mt-1 text-sm text-gray-500">{desc}</p>
    </div>
  );
}

interface Props {
  searchParams: { gameType?: string; tierBy?: string; role?: string; tab?: string };
}

export default async function MetaPage({ searchParams }: Props) {
  const tab = searchParams.tab === "vote" ? "vote" : "data";

  /* ───────── 커뮤니티 투표 탭 ───────── */
  if (tab === "vote") {
    let roster: RosterEntry[] = [];
    let tierVotes: TierVotesResult | null = null;
    try {
      [roster, tierVotes] = await Promise.all([getRoster(), getTierVotes()]);
    } catch {
      roster = [];
      tierVotes = null;
    }
    const rmap = rosterMapOf(roster);

    return (
      <div className="space-y-5">
        {renderHeader("vote")}
        <MetaViewTabs base="/meta" active="vote" dataLabel="데이터 티어" />

        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-gray-100">커뮤니티 티어 투표</h2>
            <span className="text-xs text-gray-500">
              역할별 최고 캐릭터 1명씩 선택{" "}
              {tierVotes ? `· 총 ${tierVotes.totalBallots.toLocaleString()}표` : ""}
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* 결과: 역할별 득표 1~5위 */}
            <div className="grid gap-3 sm:grid-cols-2">
              {VOTE_ROLES.map((r) => {
                const list = tierVotes?.roles?.[r] ?? [];
                return (
                  <div key={r} className="card p-3">
                    <div className="mb-2 text-sm font-semibold text-gray-200">{ROLE_LABELS[r]}</div>
                    {list.length === 0 ? (
                      <div className="py-3 text-center text-xs text-gray-500">아직 투표가 없습니다</div>
                    ) : (
                      <ol className="space-y-1.5">
                        {list.map((e, i) => {
                          const c = rmap.get(e.characterId);
                          return (
                            <li key={e.characterId} className="flex items-center gap-2">
                              <span className="w-4 shrink-0 text-center text-xs font-bold text-gray-500">
                                {i + 1}
                              </span>
                              <Avatar
                                characterId={e.characterId}
                                characterName={c?.characterName ?? undefined}
                                size={26}
                                zoom={1}
                              />
                              <span className="flex-1 truncate text-xs text-gray-200">
                                {c?.characterName ?? e.characterId}
                              </span>
                              <span className="shrink-0 text-xs font-semibold text-primary">{e.votes}표</span>
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 투표 폼 */}
            {roster.length > 0 ? (
              <TierVote roster={roster} />
            ) : (
              <div className="card grid place-items-center p-6 text-center text-sm text-gray-500">
                투표 기능을 사용하려면 백엔드(투표 API)가 실행/배포되어 있어야 합니다.
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  /* ───────── 데이터 티어 탭 (기본) ───────── */
  const gameType = GAME_TABS.some((t) => t.key === searchParams.gameType)
    ? (searchParams.gameType as string)
    : "rating";
  const tierBy: TierBasis = BASIS_TABS.some((b) => b.key === searchParams.tierBy)
    ? (searchParams.tierBy as TierBasis)
    : "score";
  const role: RoleFilter = isRoleFilter(searchParams.role) ? searchParams.role : "all";
  const roleLabel = (r: RoleFilter) => (r === "all" ? "전체" : ROLE_LABELS[r]);

  let rows: CharacterMeta[] = [];
  let summary: MetaSummary | null = null;
  let failed = false;
  try {
    [rows, summary] = await Promise.all([getCharacterMeta(gameType || undefined), getMetaSummary()]);
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <div className="space-y-5">
        {renderHeader("data")}
        <MetaViewTabs base="/meta" active="data" dataLabel="데이터 티어" />
        <ErrorState
          message="메타 데이터를 불러오지 못했습니다."
          hint="백엔드 서버(:4000)가 실행 중인지 확인하세요."
        />
      </div>
    );
  }

  const tieredAll = withTiers(rows, tierBy);
  const tiered = role === "all" ? tieredAll : tieredAll.filter((r) => r.role === role);
  const grouped = groupByTier(tiered);
  const activeTiers = TIER_ORDER.filter((t) => grouped[t].length > 0);

  return (
    <div className="space-y-5">
      {renderHeader("data")}
      <MetaViewTabs base="/meta" active="data" dataLabel="데이터 티어" />

      {summary && (
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="chip bg-surface-2 text-gray-300">표본 매치 {summary.matches.toLocaleString()}</span>
          <span className="chip bg-surface-2 text-gray-300">
            플레이어 기록 {summary.playerRecords.toLocaleString()}
          </span>
          <span className="chip bg-surface-2 text-gray-300">캐릭터 {summary.characters}종</span>
          {summary.lastCollect?.lastRun && (
            <span className="chip bg-surface-2 text-gray-500">
              최근 수집 {new Date(summary.lastCollect.lastRun).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
            </span>
          )}
        </div>
      )}

      <div className="inline-flex gap-1 rounded-lg border border-line bg-surface-2 p-1">
        {GAME_TABS.map((t) => (
          <Link
            key={t.key}
            href={metaHref(t.key, tierBy, role)}
            className={`segtab ${t.key === gameType ? "segtab-active" : ""}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="아직 수집된 데이터가 없습니다"
          description="백엔드에서 수집을 먼저 실행하세요 → POST /api/meta/collect?rankers=20&perPlayer=10"
          icon="📊"
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-500">역할</span>
            <div className="inline-flex flex-wrap gap-1 rounded-lg border border-line bg-surface-2 p-1">
              {ROLE_TABS.map((t) => (
                <Link
                  key={t.key}
                  href={metaHref(gameType, tierBy, t.key)}
                  className={`segtab text-xs ${t.key === role ? "segtab-active" : ""}`}
                >
                  {t.label}
                </Link>
              ))}
            </div>
          </div>

          <section>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-gray-100">티어 리스트</h2>
                {role !== "all" && <span className="chip bg-surface-3 text-gray-300">{roleLabel(role)}</span>}
                <span className="text-xs text-gray-500">
                  {TIER_BASIS_LABEL[tierBy]} 기준 상대 평가 · 상위 10% S / 25% A / 50% B / 80% C
                </span>
                <span className="hidden text-[11px] text-gray-600 sm:inline">
                  이미지·이름=상세 · &lsquo;경기 기록&rsquo;=표본 경기 보기
                </span>
              </div>
              <div className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface-2 p-1">
                <span className="px-1.5 text-xs font-medium text-gray-500">기준</span>
                {BASIS_TABS.map((b) => (
                  <Link
                    key={b.key}
                    href={metaHref(gameType, b.key, role)}
                    className={`segtab text-xs ${b.key === tierBy ? "segtab-active" : ""}`}
                  >
                    {b.label}
                  </Link>
                ))}
              </div>
            </div>
            {tiered.length === 0 ? (
              <EmptyState title={`${roleLabel(role)} 캐릭터 표본이 없습니다`} icon="📭" />
            ) : (
              <div className="card divide-y divide-line">
                {activeTiers.map((t) => (
                  <div key={t} className="flex items-stretch gap-3 p-3">
                    <div
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-lg font-black text-white"
                      style={{ backgroundColor: TIER_META[t].color }}
                      title={TIER_META[t].desc}
                    >
                      {t}
                    </div>
                    <div className="flex flex-1 flex-wrap gap-2">
                      {grouped[t].map((c) => (
                        <TierPickCell
                          key={c.characterId}
                          characterId={c.characterId}
                          characterName={c.characterName ?? null}
                          pickRate={c.pickRate}
                          winRate={c.winRate}
                          gameTypeId={gameType || undefined}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-100">캐릭터 상세</h2>
              {role !== "all" && <span className="chip bg-surface-3 text-gray-300">{roleLabel(role)}</span>}
              <span className="text-xs text-gray-500">카드를 눌러 표본 픽 보기</span>
            </div>
            <MetaTable rows={tiered} />
          </section>
        </>
      )}
    </div>
  );
}
