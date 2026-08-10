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
import { StatChip } from "@/components/meta/StatChip";
import MetaViewTabs from "@/components/meta/MetaViewTabs";
import TierVote from "@/components/meta/TierVote";
import { EmptyState, ErrorState } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "사이퍼즈 캐릭터 티어 (메타)",
  description:
    "사이퍼즈 캐릭터 티어표 — 상위 랭커 매치 기반 픽률·승률·KDA로 본 캐릭터 메타를 확인하세요.",
  alternates: { canonical: "/meta" },
};

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
      : "사이퍼즈 공식전(레이팅) 랭킹 상위권 플레이어들의 경기를 매일 수집해 집계한 캐릭터 티어입니다.";
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
  const grouped = groupByTier(tiered, tierBy);
  const activeTiers = TIER_ORDER.filter((t) => grouped[t].length > 0);

  return (
    <div className="space-y-5">
      {renderHeader("data")}
      <MetaViewTabs base="/meta" active="data" dataLabel="데이터 티어" />

      {summary &&
        (() => {
          // 정확한 집계 상한(scope.rankTop)이 있을 때만 노출한다.
          // (구버전 백엔드의 lastCollect.rankers 는 회전 수집의 1회 window 값이라 오해 소지가 있어 폴백하지 않음)
          const sc = summary.scope;
          const rankTop = sc?.rankTop ?? null;
          const gt = sc?.gameType ?? summary.lastCollect?.gameTypeId ?? "rating";
          const gtLabel = gt === "rating" ? "공식전" : gt;

          // 회전 수집이면 순회 진행도(방금 갱신한 순위 구간·순회 %)를 계산한다.
          const rotating = !!sc?.rotating && sc?.window != null && rankTop != null;
          let rangeValue = rankTop != null ? `${gtLabel} 랭킹 상위 ${rankTop.toLocaleString()}위` : "";
          let rangeSub: string | undefined;
          let rangeTip =
            rankTop != null
              ? `사이퍼즈 ${gtLabel}(레이팅) 랭킹 상위 ${rankTop.toLocaleString()}위 플레이어들이 최근 플레이한 경기를 표본으로 집계합니다.`
              : "";
          if (rotating && rankTop != null && sc?.window != null) {
            const win = sc.window;
            const lastOff = sc.lastCollectedOffset ?? 0;
            const from = lastOff + 1;
            const to = Math.min(lastOff + win, rankTop);
            const pct = Math.min(100, Math.max(0, Math.round((to / rankTop) * 100)));
            rangeValue = `${gtLabel} 랭킹 상위 ${rankTop.toLocaleString()}위 순회 중`;
            rangeSub = `· 순회 ${pct}%`;
            rangeTip = `사이퍼즈 ${gtLabel}(레이팅) 랭킹 상위 ${rankTop.toLocaleString()}위를 매일 ${win}명씩 순위 구간을 이동하며 수집합니다. 방금 ${from.toLocaleString()}~${to.toLocaleString()}위 구간을 갱신했어요(순회 ${pct}%). 상위 ${rankTop.toLocaleString()}위를 한 바퀴 도는 데 시간이 걸려 순위 구간별로 데이터 신선도가 다를 수 있습니다.`;
          }

          return (
            <div className="flex flex-wrap items-start gap-2 text-sm">
              {rankTop != null && (
                <StatChip label="집계 범위" value={rangeValue} sub={rangeSub} tip={rangeTip} />
              )}
              <StatChip
                label="표본 매치"
                value={summary.matches.toLocaleString()}
                tip="상위 랭커들이 최근 플레이한 경기를 중복 없이 모은 수예요. 이 경기들이 티어 계산의 표본이 됩니다."
              />
              <StatChip
                label="플레이어 기록"
                value={summary.playerRecords.toLocaleString()}
                tip="표본 매치에 참여한 모든 플레이어(양 팀 전원)의 캐릭터 픽 1건이 1기록이에요. 픽률·승률·KDA는 이 기록을 집계해 계산합니다."
              />
              <StatChip
                label="캐릭터"
                value={`${summary.characters}종`}
                tip="표본 경기에 한 번 이상 등장한 서로 다른 캐릭터 수예요."
              />
              {summary.lastCollect?.lastRun && (
                <StatChip
                  muted
                  label="최근 수집"
                  value={new Date(summary.lastCollect.lastRun).toLocaleString("ko-KR", {
                    timeZone: "Asia/Seoul",
                  })}
                  tip="표본 데이터를 마지막으로 갱신한 시각이에요. 하루 한 번 자동으로 새 경기를 수집합니다."
                />
              )}
            </div>
          );
        })()}

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
