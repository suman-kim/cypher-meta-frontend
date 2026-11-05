/**
 * 앱 랭킹 · 캐릭터별 화면 (시안 08 캐릭터별 칸).
 *
 * - 캐릭터를 고르기 전: 이름 검색 + 역할군 묶음 그리드(CharPicker)
 * - 고른 뒤: 캐릭터 머리(다른 캐릭터·캐릭터 정보 이동) → 지표 칩(승리 수·승률·킬·어시스트·경험치)
 *           → 순위 목록(순위 | 닉네임·승패 | 지표 값) → 이전/다음 50명
 * 데이터는 웹 캐릭터 랭킹(app/ranking/characters/page.tsx)이 불러온 값을 받는다(서버 컴포넌트).
 */
import Link from "next/link";
import { Icon } from "../../icons";
import { AppPage, CharImg, Chip, ChipRow, GhostLink, StateBox } from "../../ui";
import type { AppLinkTab } from "./AppMetaTier";
import CharPicker, { type PickerGroup } from "./CharPicker";
import { PageLinks, RankTopBar } from "./parts";

/** 캐릭터 랭킹 한 줄 */
export interface AppCharRankRow {
  /** 순위 */
  rank: number;
  /** 플레이어 ID */
  playerId: string;
  /** 닉네임 */
  nickname: string;
  /** 지표 값 표시 글자 */
  value: string;
  /** 승패 표시 ("12승 3패 · 승률 80%") — 모르면 null */
  record: string | null;
}

/** 앱 캐릭터별 랭킹이 받는 데이터 */
export interface AppRankingCharsProps {
  /** 고른 캐릭터 ID (고르기 전이면 null) */
  characterId: string | null;
  /** 고른 캐릭터 이름 */
  charName: string | null;
  /** 지금 지표 키 */
  rankingType: string;
  /** 지금 지표 이름 */
  metricLabel: string;
  /** 지표 칩 */
  metricTabs: AppLinkTab[];
  /** 순위 목록 */
  rows: AppCharRankRow[];
  /** 고르기 묶음 (캐릭터를 고르기 전에만 씀) */
  groups: PickerGroup[];
  /** 불러오기 실패 안내 (maintenance: 서버 점검) — 정상이면 null */
  error: { maintenance: boolean; message: string } | null;
  /** 이전 쪽 주소 (없으면 null) */
  prevHref: string | null;
  /** 다음 쪽 주소 (없으면 null) */
  nextHref: string | null;
  /** 지금 쪽 범위 글자 (예: "1~50위") */
  rangeLabel: string | null;
}

/**
 * @param p 캐릭터별 랭킹 데이터 (AppRankingCharsProps)
 */
export default function AppRankingChars(p: AppRankingCharsProps) {
  const errorBox = p.error && (
    <StateBox
      kind="error"
      title={p.error.maintenance ? "사이퍼즈 서버 점검 중이에요" : "랭킹을 불러오지 못했어요"}
      desc={p.error.maintenance ? "점검이 끝나면 다시 볼 수 있어요. 캐릭터 티어는 점검 중에도 볼 수 있어요." : p.error.message}
      action={
        p.error.maintenance ? (
          <GhostLink href="/meta">캐릭터 티어 보기</GhostLink>
        ) : (
          <GhostLink href={p.characterId ? `/ranking/characters?characterId=${p.characterId}&rankingType=${p.rankingType}` : "/ranking/characters"} icon="refresh">
            다시 불러오기
          </GhostLink>
        )
      }
    />
  );

  return (
    <div className="min-h-[100dvh]" style={{ background: "radial-gradient(120% 42% at 50% -8%, var(--a-amb), transparent 70%)" }}>
      <RankTopBar active="char" basis="네오플 캐릭터 랭킹" />
      <AppPage className="!gap-3">
        {!p.characterId ? (
          // 캐릭터 고르기
          p.groups.length === 0 ? (
            (errorBox ?? <StateBox title="캐릭터 목록을 불러오지 못했어요" action={<GhostLink href="/ranking/characters" icon="refresh">다시 불러오기</GhostLink>} />)
          ) : (
            <>
              <p className="px-1 text-xs text-gray-500">캐릭터를 고르면 그 캐릭터의 지표별 상위 랭커를 보여 줘요.</p>
              <CharPicker groups={p.groups} rankingType={p.rankingType} />
            </>
          )
        ) : (
          <>
            {/* 고른 캐릭터 */}
            <div className="a-card flex items-center gap-3 p-3.5">
              <CharImg id={p.characterId} name={p.charName} size={52} radius={14} />
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="truncate text-lg font-extrabold text-gray-100">{p.charName ?? "캐릭터"} 랭킹</span>
                <span className="truncate text-[11px] text-gray-500">{p.metricLabel} 상위 랭커 · 1차/2차 구분 없음</span>
              </span>
              <span className="grid shrink-0 justify-items-end gap-1">
                <Link
                  href={`/ranking/characters?rankingType=${p.rankingType}`}
                  className="a-press inline-flex h-8 items-center gap-1 rounded-full border border-line px-3 text-xs font-semibold text-gray-200"
                >
                  <Icon name="swap" size={13} />
                  다른 캐릭터
                </Link>
                <Link href={`/characters/${p.characterId}`} className="flex items-center gap-0.5 px-1 text-[11px] font-semibold text-primary">
                  캐릭터 정보
                  <Icon name="chevronRight" size={12} />
                </Link>
              </span>
            </div>

            <ChipRow>
              {p.metricTabs.map((t) => (
                <Chip key={t.key} href={t.href} active={t.active}>
                  {t.label}
                </Chip>
              ))}
            </ChipRow>

            {errorBox ??
              (p.rows.length === 0 ? (
                <StateBox icon="trophy" title="랭킹 데이터가 없어요" desc="다른 지표를 골라 보세요." />
              ) : (
                <ol className="a-card divide-y divide-app-hair overflow-hidden">
                  {p.rows.map((r) => (
                    <li key={r.playerId}>
                      <Link href={`/players/${r.playerId}`} className="flex items-center gap-3 px-3.5 py-2.5 active:bg-surface-2">
                        <span
                          className={`grid h-7 min-w-[28px] shrink-0 place-items-center rounded-full px-1 text-xs font-extrabold tabular-nums ${
                            r.rank === 1 ? "a-grad" : r.rank <= 3 ? "bg-app-ac-soft text-app-ac-tx" : "text-gray-500"
                          }`}
                        >
                          {r.rank}
                        </span>
                        <span className="grid min-w-0 flex-1">
                          <span className="truncate text-sm font-bold text-gray-100">{r.nickname}</span>
                          {r.record && <span className="truncate text-[11px] text-gray-500">{r.record}</span>}
                        </span>
                        <span className="shrink-0 text-sm font-extrabold tabular-nums text-primary">{r.value}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              ))}

            <PageLinks prevHref={p.prevHref} nextHref={p.nextHref} label={p.rangeLabel} />
          </>
        )}
      </AppPage>
    </div>
  );
}
