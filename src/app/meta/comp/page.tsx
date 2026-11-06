import {
  getCompositions,
  getRoleCompositions,
  getMetaSummary,
  type CompositionsResult,
  type RoleCompositionsResult,
  type MetaSummary,
} from "@/lib/meta";
import { ROLE_LABELS, type RoleOrEtc } from "@/lib/meta";
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
import CollectionStatsCard from "@/components/meta/CollectionStatsCard";
import CompVote from "@/components/meta/CompVote";
import { UltimateBadge } from "@/components/characters/UltimateBadge";
import OfficialCompositionSection, { type OfficialCompBasis } from "@/components/meta/OfficialCompositionSection";
import OfficialCompVote from "@/components/meta/OfficialCompVote";
import {
  getCharacterUltimates,
  getOfficialCompVotes,
  getOfficialFormations,
  getPositionSystem,
  getUltimateCompositions,
} from "@/lib/official-api";
import {
  OFFICIAL_ROLES,
  characterHref,
  dualCharacterIds,
  isOfficialRoleKey,
  ultimateLabel,
  unitKey,
  type CharacterUltimate,
  type OfficialCompVotesResult,
  type OfficialFormation,
  type UltimateCompositionsResult,
} from "@/lib/official";
import { isAppRequest } from "@/lib/app-mode";
import AppMetaComp, { type AppCompItem } from "@/components/app/screens/meta/AppMetaComp";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "사이퍼즈 조합 메타 (5인 조합 티어)",
  description:
    "사이퍼즈 5인 조합 메타 — 상위 랭커 매치의 팀 조합 빈도·승률과 추천 조합을 확인하세요.",
  alternates: { canonical: "/meta/comp" },
};

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
  /**
   * tab=vote|data, 공식 역할군 체계에서는 size(2|3)·roles(역할군 키 쉼표 목록)·basis(freq|win|both).
   * cat — 앱 전용: 예전 체계의 조합 카테고리(dealerduo 등). 앱에서 size·cat 이 없으면 5인 풀팀을 보여 준다.
   */
  searchParams: { tab?: string; size?: string; roles?: string; basis?: string; cat?: string };
}

/**
 * 조합 티어 페이지.
 * 포지션 체계가 official 이면 궁극기 단위 듀오/트리오 + 공식 역할군 필터·편성 투표를,
 * 아니면(legacy·조회 실패) 기존 역할 카테고리 조합·편성 투표를 보여 준다. 5인 풀팀 집계는 두 체계 공통.
 */
export default async function CompMetaPage({ searchParams }: Props) {
  // 앱 WebView 는 커뮤니티 투표 탭 없이 데이터 조합만 보여 준다(투표는 앱 시안상 P2).
  const app = isAppRequest();
  const tab = !app && searchParams.tab === "vote" ? "vote" : "data";
  const official = (await getPositionSystem()) === "official";

  /* ───────── 커뮤니티 투표 탭 — 공식 역할군 체계 ───────── */
  if (tab === "vote" && official) {
    const [ultimates, formations, votes] = await Promise.all([
      getCharacterUltimates().catch(() => [] as CharacterUltimate[]),
      getOfficialFormations().catch(() => [] as OfficialFormation[]),
      getOfficialCompVotes().catch(() => null as OfficialCompVotesResult | null),
    ]);
    if (ultimates.length > 0 && formations.length > 0) {
      const byUnit = new Map(ultimates.map((u) => [unitKey(u.characterId, u.ultimateType), u]));
      const dual = dualCharacterIds(ultimates);
      const fmap = new Map(formations.map((f) => [f.key, f]));
      return (
        <div className="space-y-5">
          {renderHeader("vote")}
          <MetaViewTabs base="/meta/comp" active="vote" dataLabel="데이터 조합" />
          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-gray-100">커뮤니티 추천 조합 투표</h2>
              <span className="text-xs text-gray-500">
                공식 역할군 편성 선택 후 5인 구성{" "}
                {votes ? `· 총 ${votes.totalBallots.toLocaleString()}표 · ${votes.distinctCombos.toLocaleString()}종` : ""}
              </span>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {/* 결과: 득표순 조합 */}
              <div className="space-y-2">
                {votes && votes.top.length > 0 ? (
                  votes.top.map((c, i) => (
                    <div key={c.units.join("-")} className="flex items-center gap-3 rounded-lg border border-line bg-surface p-2.5">
                      <span
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-md text-sm font-black ${
                          i === 0 ? "bg-primary text-white" : i === 1 ? "bg-surface-3 text-gray-100" : i === 2 ? "bg-[#c07b3f] text-white" : "bg-surface-2 text-gray-400"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div className="flex flex-1 flex-wrap items-center gap-1.5">
                        {c.units.map((unit, j) => {
                          const u = byUnit.get(unit);
                          const [cid, ult] = unit.split(":");
                          return (
                            <span key={`${unit}-${j}`} className="flex flex-col items-center gap-0.5" title={u ? `${u.characterName} · ${u.skillName}` : undefined}>
                              <span className="relative">
                                <Avatar characterId={cid} characterName={u?.characterName} size={32} zoom={1} />
                                {dual.has(cid) && <UltimateBadge ultimateType={ult} className="absolute -right-1.5 -top-1.5" />}
                              </span>
                              <span className="w-10 truncate text-center text-[9px] leading-tight text-gray-500">{u?.characterName ?? ""}</span>
                            </span>
                          );
                        })}
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-sm font-bold text-primary">{c.votes}표</div>
                        {fmap.get(c.formationKey) && <div className="text-[10px] text-gray-500">{fmap.get(c.formationKey)!.label}</div>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-line px-4 py-10 text-center text-sm text-gray-500">
                    아직 투표된 조합이 없습니다. 첫 조합을 등록해 보세요!
                  </div>
                )}
              </div>
              {/* 투표 폼 */}
              <OfficialCompVote ultimates={ultimates} formations={formations} />
            </div>
            <p className="text-[11px] text-gray-500">역할군은 사이퍼즈 공식 역할군(궁극기별)입니다.</p>
          </section>
        </div>
      );
    }
  }

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
  // 공식 역할군 체계 — 궁극기 단위 듀오/트리오(필터·기준은 URL 쿼리). 실패하면 기존 역할 카테고리로 폴백.
  const size: 2 | 3 = searchParams.size === "3" ? 3 : 2;
  const roleKeys = (searchParams.roles ?? "").split(",").filter((k) => isOfficialRoleKey(k));
  const basis: OfficialCompBasis =
    searchParams.basis === "win" || searchParams.basis === "both" ? searchParams.basis : "freq";
  // 서로 독립인 조회는 동시에 보낸다(차례로 기다리면 응답 시간이 합쳐진다). 각각 실패하면 null.
  const [comps, ultComps, summary] = await Promise.all([
    getCompositions({ gameTypeId: "rating", limit: 6, minGames: 3 }).catch(() => null as CompositionsResult | null),
    official
      ? getUltimateCompositions({ gameTypeId: "rating", size, roles: roleKeys, limit: 10, minGames: 3 }).catch(
          () => null as UltimateCompositionsResult | null,
        )
      : Promise.resolve(null as UltimateCompositionsResult | null),
    getMetaSummary().catch(() => null as MetaSummary | null),
  ]);
  // 궁극기 조합을 못 받았을 때만 기존 역할 카테고리 조합으로 폴백
  const roleComps: RoleCompositionsResult | null = ultComps
    ? null
    : await getRoleCompositions({ gameTypeId: "rating", limit: 8, minGames: 3 }).catch(() => null);

  // 앱 WebView: 같은 데이터로 앱 조합 티어 화면(시안 06)을 그린다.
  if (app) {
    return renderAppComp({ searchParams, size, roleKeys, comps, ultComps, roleComps });
  }

  return (
    <div className="space-y-5">
      {renderHeader("data")}
      <MetaViewTabs base="/meta/comp" active="data" dataLabel="데이터 조합" />

      {/* 집계 정보 — PC 디자인 1a(상태 헤더·KPI 4칸·하단 안내) / 모바일 1b(한 줄 + ⓘ 팝오버에 안내 포함) */}
      {comps && comps.totalTeams > 0 && (
        <CollectionStatsCard
          className="max-w-[880px]"
          summary={summary}
          showProgress={false}
          kpis={[
            {
              label: "표본 경기",
              shortLabel: "경기",
              value: (comps.sampledMatches ?? Math.round(comps.totalTeams / 2)).toLocaleString(),
              tip: "이 조합 통계가 도출된 경기 수예요. 한 경기에서 승/패 두 팀이 나옵니다.",
            },
            {
              label: "표본 팀",
              shortLabel: "팀",
              value: comps.totalTeams.toLocaleString(),
              tip: "집계에 쓰인 팀 수(경기당 양 팀). 각 팀의 5인 구성 하나가 '조합' 한 종이 됩니다.",
            },
            {
              label: "서로 다른 조합",
              shortLabel: "조합",
              value: comps.distinctCombos.toLocaleString(),
              unit: "종",
              tip: "'조합'은 5명 전원이 정확히 같은 팀을 뜻해요. 캐릭터 종류가 많아 5인 세트가 정확히 겹치는 경우가 드물어, 대부분의 조합은 1~2판만 등장합니다(빈도가 낮은 이유).",
            },
            ...(comps.maxGames != null
              ? [
                  {
                    label: "최다 반복",
                    shortLabel: "최다",
                    value: comps.maxGames.toLocaleString(),
                    unit: "판",
                    tip: `가장 많이 등장한 조합도 ${comps.maxGames}판입니다.${
                      comps.repeatedCombos != null
                        ? ` 2판 이상 반복된 조합은 ${comps.repeatedCombos.toLocaleString()}종뿐이에요.`
                        : ""
                    } 그래서 빈도 순위가 낮은 판수로 형성됩니다.`,
                  },
                ]
              : []),
          ]}
          note="'조합'은 5명 전원이 정확히 일치하는 팀 기준이라, 대부분의 조합이 1~2판으로 집계돼요."
        />
      )}

      {/* 공식 역할군 듀오/트리오 (official 체계) */}
      {ultComps && <OfficialCompositionSection data={ultComps} roles={roleKeys} basis={basis} />}

      {comps && comps.totalTeams > 0 ? (
        // official 체계에서는 역할 카테고리(roleData) 없이 5인 풀팀만 보여 준다
        <CompositionSection data={comps} roleData={ultComps ? null : roleComps} />
      ) : (
        <div className="card grid place-items-center p-8 text-center text-sm text-gray-500">
          아직 조합 집계 데이터가 없습니다. 수집이 진행되면 표시됩니다.
        </div>
      )}
    </div>
  );
}

/**
 * 앱 조합 화면 주소 — 편성(5인/듀오/트리오/예전 카테고리)·역할군·기준을 쿼리로 담는다.
 * @param kind full | duo | trio | 예전 카테고리 키
 * @param roles 듀오·트리오 역할군 필터(영문 키)
 * @param basis freq | win
 * @returns /meta/comp 주소
 */
function appCompHref(kind: string, roles: string[], basis: "freq" | "win"): string {
  const p = new URLSearchParams();
  if (kind === "duo" || kind === "trio") {
    p.set("size", kind === "trio" ? "3" : "2");
    if (roles.length) p.set("roles", roles.join(","));
  } else if (kind !== "full") {
    p.set("cat", kind);
  }
  if (basis !== "freq") p.set("basis", basis);
  const q = p.toString();
  return q ? `/meta/comp?${q}` : "/meta/comp";
}

/**
 * 앱 조합 티어 화면을 그린다 — 웹이 불러온 조합 데이터를 앱 카드 모양으로 바꾼다.
 * @param a.searchParams 페이지 쿼리
 * @param a.size 듀오·트리오 인원(2|3)
 * @param a.roleKeys 듀오·트리오 역할군 필터(영문 키)
 * @param a.comps 5인 풀팀 집계 (없으면 null)
 * @param a.ultComps 공식 역할군 듀오·트리오 집계 (없으면 null)
 * @param a.roleComps 예전 체계 역할 카테고리 조합 (없으면 null)
 */
function renderAppComp(a: {
  searchParams: Props["searchParams"];
  size: 2 | 3;
  roleKeys: string[];
  comps: CompositionsResult | null;
  ultComps: UltimateCompositionsResult | null;
  roleComps: RoleCompositionsResult | null;
}) {
  const { searchParams, size, roleKeys, comps, ultComps, roleComps } = a;
  const basis: "freq" | "win" = searchParams.basis === "win" ? "win" : "freq";
  const legacyCats = (roleComps?.categories ?? []).filter((c) => c.distinctCombos > 0);
  const kind: string =
    ultComps && (searchParams.size === "2" || searchParams.size === "3")
      ? size === 3
        ? "trio"
        : "duo"
      : !ultComps && legacyCats.some((c) => c.key === searchParams.cat)
        ? (searchParams.cat as string)
        : "full";
  const roles = kind === "duo" || kind === "trio" ? roleKeys : [];

  // 편성 칩 — 공식 체계: 5인/듀오/트리오, 예전 체계: 5인 + 역할 카테고리
  const kindDefs: { key: string; label: string }[] = [
    { key: "full", label: "5인 풀팀" },
    ...(ultComps
      ? [
          { key: "duo", label: "듀오" },
          { key: "trio", label: "트리오" },
        ]
      : legacyCats.map((c) => ({ key: c.key, label: c.label }))),
  ];

  let items: AppCompItem[] = [];
  let title = "최근 공식전 5인 조합";
  let desc: string | null = null;
  let note = "";
  let minGames = comps?.minGames ?? 3;
  let noData = false;

  if (kind === "full") {
    noData = !comps || comps.totalTeams === 0;
    const list = comps ? (basis === "win" ? comps.byWinRate : comps.byFrequency) : [];
    items = list.map((c) => ({
      key: c.ids.join("-"),
      games: c.games,
      winRate: c.winRate,
      matchIds: c.ids,
      members: c.ids.map((id, j) => ({
        characterId: id,
        name: c.names[j] ?? "",
        href: `/characters/${id}`,
        ultLabel: null,
        roleName: null,
        officialRole: false,
      })),
    }));
    desc = comps ? `팀 ${comps.totalTeams.toLocaleString()}개 · 조합 ${comps.distinctCombos.toLocaleString()}종` : null;
    note = `5명이 정확히 같은 팀만 같은 조합으로 세요. 그래서 대부분 1~2판이고, 판수가 적으면 참고만 해 주세요. 승률순은 ${minGames}판 이상 나온 조합만 보여요.`;
  } else if ((kind === "duo" || kind === "trio") && ultComps) {
    const list = basis === "win" ? ultComps.byWinRate : ultComps.byFrequency;
    minGames = ultComps.minGames;
    items = list.map((c) => ({
      key: c.members.map((m) => unitKey(m.characterId, m.ultimateType)).join("|"),
      games: c.games,
      winRate: c.winRate,
      matchIds: null,
      members: c.members.map((m) => ({
        characterId: m.characterId,
        name: m.characterName,
        href: characterHref(m.characterId, m.ultimateType),
        ultLabel: m.dual ? ultimateLabel(m.ultimateType) : null,
        roleName: m.officialRole,
        officialRole: true,
      })),
    }));
    title = kind === "trio" ? "같은 팀 3인 조합" : "같은 팀 2인 조합";
    desc = `${ultComps.distinctCombos.toLocaleString()}종${ultComps.filterRoles.length ? ` · ${ultComps.filterRoles.join("+")} 포함` : ""}`;
    note = `같은 팀(승패 같음) 안의 ${ultComps.size}인 조합이에요. 한 칸은 캐릭터와 그 판의 궁극기(장착 아이템으로 판별)이고, 역할군은 사이퍼즈 공식 역할군이에요. 승률순은 ${minGames}판 이상 나온 조합만 보여요.`;
  } else {
    const cat = legacyCats.find((c) => c.key === kind);
    const list = cat ? (basis === "win" ? cat.byWinRate : cat.byFrequency) : [];
    minGames = roleComps?.minGames ?? minGames;
    items = list.map((c) => ({
      key: `${c.ids.join("-")}-${c.roles.join("-")}`,
      games: c.games,
      winRate: c.winRate,
      matchIds: null,
      members: c.ids.map((id, j) => ({
        characterId: id,
        name: c.names[j] ?? "",
        href: `/characters/${id}`,
        ultLabel: null,
        roleName: ROLE_LABELS[c.roles[j] as RoleOrEtc] ?? c.roles[j] ?? null,
        officialRole: false,
      })),
    }));
    title = cat?.label ?? "역할 조합";
    desc = cat ? `${cat.distinctCombos.toLocaleString()}종` : null;
    note =
      "같은 팀(승패 같음) 안의 2·3인 조합이에요. 포지션은 그 판의 운용(목걸이·능력치·캐릭터)으로 판별해요. 탱커 트리오는 탱커 3명 또는 탱커 2명+서포터 1명이에요.";
  }

  return (
    <AppMetaComp
      kindTabs={kindDefs.map((k) => ({ key: k.key, label: k.label, href: appCompHref(k.key, [], basis), active: k.key === kind }))}
      basisTabs={(
        [
          ["freq", "많이 나온 순"],
          ["win", "승률순"],
        ] as const
      ).map(([k, label]) => ({ key: k, label, href: appCompHref(kind, roles, k), active: k === basis }))}
      roleTabs={
        kind === "duo" || kind === "trio"
          ? [
              { key: "all", label: "전체", href: appCompHref(kind, [], basis), active: roles.length === 0 },
              ...OFFICIAL_ROLES.map((r) => ({
                key: r.key,
                label: r.name,
                href: appCompHref(kind, [r.key], basis),
                active: roles.length === 1 && roles[0] === r.key,
                roleIcon: r.key,
              })),
            ]
          : null
      }
      items={items}
      basis={basis}
      minGames={minGames}
      title={title}
      desc={desc}
      note={note}
      noData={noData}
      gameTypeId={comps?.gameTypeId ?? "rating"}
    />
  );
}
