/**
 * 앱 메타 · 캐릭터 티어 화면 (시안 05).
 *
 * 구성: 큰 제목 "메타" + 캐릭터 목록 링크, 캐릭터 티어/조합 티어 세그먼트 → 역할군 칩 → 티어 기준 칩
 *       → 티어 표(순위·캐릭터·티어·픽률·승률) → 집계 기준 안내.
 * 데이터는 웹 메타 페이지(app/meta/page.tsx)가 계산한 티어 행을 그대로 받는다(서버 컴포넌트).
 * 시안과 다르게 한 점: 이름이 잘리지 않게 궁극기(1차/2차)는 이름 아래 줄에 역할군과 함께 둔다.
 */
import Link from "next/link";
import type { MetaSummary, Tier } from "@/lib/meta";
import { OfficialRoleIcon } from "@/components/characters/OfficialRoleIcon";
import { AppPage, CharImg, Chip, ChipRow, GhostLink, StateBox, UltBadge, wrClass } from "../../ui";
import { MetaTopBar, TierBadge, agoText } from "./parts";

/** 티어 표 한 행 */
export interface AppTierRow {
  /** 행 고유 키 (캐릭터 ID, 궁극기 단위면 "ID:1st|2nd") */
  key: string;
  /** 캐릭터 ID */
  characterId: string;
  /** 캐릭터 이름 */
  characterName: string | null;
  /** 데이터 티어 (S~D) */
  tier: Tier;
  /** 픽률(%) */
  pickRate: number;
  /** 승률(%) */
  winRate: number;
  /** 표본(픽 수) */
  picks: number;
  /** 역할군(공식 역할군 또는 예전 포지션) 한글 이름 — 모르면 null */
  roleName: string | null;
  /** 공식 역할군 체계면 true (역할군 아이콘 표시) */
  officialRole: boolean;
  /** 2차 궁극기 보유 캐릭터의 궁극기 표시("1차"/"2차") — 1차만 있는 캐릭터·예전 체계면 null */
  ultLabel: string | null;
  /** 누르면 갈 캐릭터 상세 주소 (2차 행은 ?ult=2nd) */
  href: string;
}

/** 칩·세그먼트 한 칸 (링크 방식) */
export interface AppLinkTab {
  /** 구분 값 */
  key: string;
  /** 표시 글자 */
  label: string;
  /** 이동 주소 */
  href: string;
  /** 선택 여부 */
  active: boolean;
  /** 공식 역할군 칩이면 아이콘을 그릴 역할군 키 */
  roleIcon?: string;
}

/** 앱 캐릭터 티어 화면이 받는 데이터 */
export interface AppMetaTierProps {
  /** 역할군 필터·정렬을 마친 티어 행 */
  rows: AppTierRow[];
  /** 필터 전 전체 행 수 (0 이면 아직 수집 전) */
  totalRows: number;
  /** 역할군 칩 */
  roleTabs: AppLinkTab[];
  /** 티어 기준 칩 (종합/승률/픽률) */
  basisTabs: AppLinkTab[];
  /** 지금 고른 역할군 이름 ("전체" 포함) */
  roleLabel: string;
  /** 지금 고른 티어 기준 이름 */
  basisLabel: string;
  /** 집계 요약 (표본 매치 수·최근 수집 시각) — 못 받으면 null */
  summary: MetaSummary | null;
  /** 메타 데이터를 불러오지 못했으면 true */
  failed: boolean;
}

/**
 * @param props 캐릭터 티어 데이터 (AppMetaTierProps)
 */
export default function AppMetaTier({ rows, totalRows, roleTabs, basisTabs, roleLabel, basisLabel, summary, failed }: AppMetaTierProps) {
  const now = Date.now();
  const ago = agoText(summary?.lastCollect?.lastRun, now);
  const rankTop = summary?.scope?.rankTop;

  return (
    <div className="min-h-[100dvh]" style={{ background: "radial-gradient(120% 42% at 50% -8%, var(--a-amb), transparent 70%)" }}>
      <MetaTopBar active="tier" />
      <AppPage className="!gap-3">
        {failed ? (
          <StateBox
            kind="error"
            title="메타 데이터를 불러오지 못했어요"
            desc="잠시 뒤 다시 열어 주세요."
            action={
              <GhostLink href="/meta" icon="refresh">
                다시 불러오기
              </GhostLink>
            }
          />
        ) : totalRows === 0 ? (
          <StateBox
            icon="bars"
            title="아직 수집된 경기가 없어요"
            desc="상위 랭커 경기가 모이면 캐릭터 티어가 보여요."
            action={<GhostLink href="/meta/comp">조합 티어 보기</GhostLink>}
          />
        ) : (
          <>
            {/* 역할군 칩 */}
            <ChipRow>
              {roleTabs.map((t) => (
                <Chip key={t.key} href={t.href} active={t.active}>
                  {t.roleIcon && <OfficialRoleIcon role={t.roleIcon} size={16} />}
                  {t.label}
                </Chip>
              ))}
            </ChipRow>

            {/* 티어 기준 */}
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs text-gray-500">
                {roleLabel} <b className="font-semibold text-gray-300">{rows.length}</b>개
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <span className="mr-0.5 text-[11px] text-gray-500">티어 기준</span>
                {basisTabs.map((b) => (
                  <Link
                    key={b.key}
                    href={b.href}
                    scroll={false}
                    replace
                    aria-current={b.active ? "true" : undefined}
                    className={`flex h-7 items-center rounded-full px-2.5 text-xs font-semibold ${
                      b.active ? "bg-app-ac-soft text-app-ac-tx" : "text-gray-500"
                    }`}
                  >
                    {b.label}
                  </Link>
                ))}
              </div>
            </div>

            {rows.length === 0 ? (
              <StateBox
                title={`${roleLabel} 캐릭터 표본이 아직 없어요`}
                desc="다른 역할군을 골라 보세요."
                action={<GhostLink href={roleTabs[0]?.href ?? "/meta"}>전체 보기</GhostLink>}
              />
            ) : (
              <div className="a-card overflow-hidden">
                {/* 표 머리 */}
                <div className="grid grid-cols-[18px_36px_minmax(0,1fr)_26px_44px_46px] items-center gap-x-2 border-b border-app-hair px-3 py-2.5 text-[11px] text-gray-500">
                  <span className="text-center">#</span>
                  <span className="col-span-2">캐릭터</span>
                  <span className="text-center">티어</span>
                  <span className="text-right">픽률</span>
                  <span className="text-right">승률</span>
                </div>
                <ol className="divide-y divide-app-hair">
                  {rows.map((r, i) => (
                    <li key={r.key}>
                      <Link
                        href={r.href}
                        className="grid grid-cols-[18px_36px_minmax(0,1fr)_26px_44px_46px] items-center gap-x-2 px-3 py-2.5 transition-colors active:bg-surface-2"
                      >
                        <span className="text-center text-xs font-bold tabular-nums text-gray-500">{i + 1}</span>
                        <CharImg id={r.characterId} name={r.characterName} size={36} radius={10} />
                        <span className="grid min-w-0 gap-0.5">
                          <span className="truncate text-sm font-bold text-gray-100">{r.characterName ?? "캐릭터"}</span>
                          <span className="flex min-w-0 items-center gap-1">
                            {r.ultLabel && <UltBadge label={r.ultLabel} />}
                            {r.officialRole && r.roleName && <OfficialRoleIcon role={r.roleName} size={13} />}
                            <span className="truncate text-[11px] text-gray-500">{r.roleName ?? "미분류"}</span>
                          </span>
                        </span>
                        <span className="flex justify-center">
                          <TierBadge tier={r.tier} />
                        </span>
                        <span className="text-right text-[13px] tabular-nums text-gray-300">{r.pickRate}%</span>
                        <span className={`text-right text-[13px] font-bold tabular-nums ${wrClass(r.winRate)}`}>{r.winRate}%</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* 집계 기준 안내 */}
            <div className="grid gap-1 px-1 text-[11px] leading-relaxed text-gray-500">
              {summary && (
                <p>
                  공식전{rankTop ? ` 랭킹 상위 ${rankTop.toLocaleString()}위` : " 상위 랭커"} 경기{" "}
                  <b className="font-semibold text-gray-300">{summary.matches.toLocaleString()}</b>판 기준
                  {ago ? ` · 최근 수집 ${ago}` : ""}
                </p>
              )}
              <p>
                티어는 {basisLabel} 기준 상대 평가예요 · 상위 10% S, 25% A, 50% B, 80% C, 나머지 D
                {basisLabel === "종합" ? " · 종합은 승률(표본이 적으면 50%쪽으로 보정)에 픽률을 더하거나 빼서 매겨요" : ""}
              </p>
              <p>캐릭터를 누르면 능력치·추천 빌드·랭커를 볼 수 있어요.</p>
            </div>
          </>
        )}
      </AppPage>
    </div>
  );
}
