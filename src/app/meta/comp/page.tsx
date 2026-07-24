import {
  getCompositions,
  getMetaSummary,
  type CompositionsResult,
  type MetaSummary,
} from "@/lib/meta";
import {
  getRoster,
  getCompVotes,
  rosterMapOf,
  FORMATION_MAP,
  type RosterEntry,
  type CompVotesResult,
} from "@/lib/votes";
import { Avatar } from "@/components/CharacterAvatar";
import MetaViewTabs from "@/components/meta/MetaViewTabs";
import CompositionSection from "@/components/meta/CompositionSection";
import { StatChip } from "@/components/meta/StatChip";
import CompVote from "@/components/meta/CompVote";

export const dynamic = "force-dynamic";
export const metadata = { title: "조합 티어" };

function renderHeader(tab: "data" | "vote") {
  const desc =
    tab === "vote"
      ? "유저가 직접 추천 5인 조합을 뽑는 커뮤니티 투표입니다."
      : "상위 랭커 매치의 팀 조합을 집계한 결과입니다.";
  return (
    <div>
      <h1 className="text-2xl font-black tracking-tight text-gray-50">조합 티어</h1>
      <p className="mt-1 text-sm text-gray-500">{desc}</p>
    </div>
  );
}

interface Props {
  searchParams: { tab?: string };
}

export default async function CompMetaPage({ searchParams }: Props) {
  const tab = searchParams.tab === "vote" ? "vote" : "data";

  /* ───────── 커뮤니티 투표 탭 ───────── */
  if (tab === "vote") {
    let roster: RosterEntry[] = [];
    let compVotes: CompVotesResult | null = null;
    try {
      [roster, compVotes] = await Promise.all([getRoster(), getCompVotes()]);
    } catch {
      roster = [];
      compVotes = null;
    }
    const rmap = rosterMapOf(roster);

    return (
      <div className="space-y-5">
        {renderHeader("vote")}
        <MetaViewTabs base="/meta/comp" active="vote" dataLabel="데이터 조합" />

        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-gray-100">커뮤니티 추천 조합 투표</h2>
            <span className="text-xs text-gray-500">
              편성 선택 후 5인 구성{" "}
              {compVotes
                ? `· 총 ${compVotes.totalBallots.toLocaleString()}표 · ${compVotes.distinctCombos.toLocaleString()}종`
                : ""}
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* 결과: 득표순 조합 */}
            <div className="space-y-2">
              {compVotes && compVotes.top.length > 0 ? (
                compVotes.top.map((c, i) => {
                  const f = FORMATION_MAP[c.formationKey];
                  return (
                    <div key={c.ids.join("-")} className="flex items-center gap-3 rounded-lg border border-line bg-surface p-2.5">
                      <span
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-md text-sm font-black ${
                          i === 0 ? "bg-primary text-white" : i === 1 ? "bg-surface-3 text-gray-100" : i === 2 ? "bg-[#c07b3f] text-white" : "bg-surface-2 text-gray-400"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div className="flex flex-1 flex-wrap items-center gap-1.5">
                        {c.ids.map((id, j) => {
                          const e = rmap.get(id);
                          return (
                            <span key={`${id}-${j}`} className="flex flex-col items-center gap-0.5" title={e?.characterName ?? undefined}>
                              <Avatar characterId={id} characterName={e?.characterName ?? undefined} size={32} zoom={1} />
                              <span className="w-10 truncate text-center text-[9px] leading-tight text-gray-500">
                                {e?.characterName ?? ""}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-sm font-bold text-primary">{c.votes}표</div>
                        {f && <div className="text-[10px] text-gray-500">{f.label}</div>}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-lg border border-dashed border-line px-4 py-10 text-center text-sm text-gray-500">
                  아직 투표된 조합이 없습니다. 첫 조합을 등록해 보세요!
                </div>
              )}
            </div>

            {/* 투표 폼 */}
            {roster.length > 0 ? (
              <CompVote roster={roster} />
            ) : (
              <div className="card grid place-items-center p-6 text-center text-sm text-gray-500">
                투표 기능을 사용하려면 백엔드(투표 API)가 실행/배포되어 있어야 합니다.
              </div>
            )}
          </div>

          <p className="text-[11px] text-gray-500">
            역할(탱커/근접딜러/원거리딜러/서포터)은 게임 API가 제공하지 않아 자체 분류표를 사용합니다.
          </p>
        </section>
      </div>
    );
  }

  /* ───────── 데이터 조합 탭 (기본) ───────── */
  let comps: CompositionsResult | null = null;
  let summary: MetaSummary | null = null;
  try {
    comps = await getCompositions({ gameTypeId: "rating", limit: 6, minGames: 3 });
  } catch {
    comps = null;
  }
  try {
    summary = await getMetaSummary();
  } catch {
    summary = null;
  }

  return (
    <div className="space-y-5">
      {renderHeader("data")}
      <MetaViewTabs base="/meta/comp" active="data" dataLabel="데이터 조합" />

      {comps && comps.totalTeams > 0 && (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-start gap-2 text-sm">
            {summary?.scope?.rankTop != null && (
              <StatChip
                label="집계 범위"
                value={`${
                  (summary.scope.gameType ?? "rating") === "rating" ? "공식전" : summary.scope.gameType
                } 랭킹 상위 ${summary.scope.rankTop.toLocaleString()}위`}
                tip={`사이퍼즈 공식전(레이팅) 랭킹 상위 ${summary.scope.rankTop.toLocaleString()}위 플레이어들의 경기에서 팀 조합을 집계합니다.`}
              />
            )}
            <StatChip
              label="표본 경기"
              value={(comps.sampledMatches ?? Math.round(comps.totalTeams / 2)).toLocaleString()}
              tip="이 조합 통계가 도출된 경기 수예요. 한 경기에서 승/패 두 팀이 나옵니다."
            />
            <StatChip
              label="표본 팀"
              value={comps.totalTeams.toLocaleString()}
              tip="집계에 쓰인 팀 수(경기당 양 팀). 각 팀의 5인 구성 하나가 '조합' 한 종이 됩니다."
            />
            <StatChip
              label="서로 다른 조합"
              value={`${comps.distinctCombos.toLocaleString()}종`}
              tip="'조합'은 5명 전원이 정확히 같은 팀을 뜻해요. 캐릭터 종류가 많아 5인 세트가 정확히 겹치는 경우가 드물어, 대부분의 조합은 1~2판만 등장합니다(빈도가 낮은 이유)."
            />
            {comps.maxGames != null && (
              <StatChip
                muted
                label="최다 반복"
                value={`${comps.maxGames}판`}
                tip={`가장 많이 등장한 조합도 ${comps.maxGames}판입니다.${
                  comps.repeatedCombos != null
                    ? ` 2판 이상 반복된 조합은 ${comps.repeatedCombos.toLocaleString()}종뿐이에요.`
                    : ""
                } 그래서 빈도 순위가 낮은 판수로 형성됩니다.`}
              />
            )}
          </div>
          <p className="text-[11px] leading-relaxed text-gray-500">
            &lsquo;조합&rsquo;은 5명 전원이 정확히 일치하는 팀 기준이라, 표본이 늘어도 똑같은 5인 구성이 반복되는 경우는
            드뭅니다. 그래서 대부분의 조합이 1~2판으로 집계돼요.
          </p>
        </div>
      )}

      {comps && comps.totalTeams > 0 ? (
        <CompositionSection data={comps} />
      ) : (
        <div className="card grid place-items-center p-8 text-center text-sm text-gray-500">
          아직 조합 집계 데이터가 없습니다. 수집이 진행되면 표시됩니다.
        </div>
      )}
    </div>
  );
}
