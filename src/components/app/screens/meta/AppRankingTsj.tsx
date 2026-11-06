/**
 * 앱 랭킹 · 결투장(투신전) 화면.
 *
 * 구성: 랭킹 상단바(결투장 선택) → 근거리/원거리 칩 → 순위 목록(순위 | 대표 캐릭터 얼굴 | 닉네임·승패 | 점수)
 *       → 이전/다음 50명. 시안에 없던 화면이라 전체 랭킹 목록 행과 같은 모양으로 간단히 만들었다.
 * 데이터는 웹 결투장 랭킹(app/ranking/tsj/page.tsx)이 불러온 값을 받는다(서버 컴포넌트).
 */
import Link from "next/link";
import { AppPage, CharImg, Chip, ChipRow, GhostLink, StateBox, wrClass } from "../../ui";
import type { AppLinkTab } from "./AppMetaTier";
import { PageLinks, RankTopBar } from "./parts";

/** 결투장 랭킹 한 줄 */
export interface AppTsjRow {
  /** 순위 */
  rank: number;
  /** 플레이어 ID */
  playerId: string;
  /** 닉네임 */
  nickname: string;
  /** 대표 캐릭터 ID (모르면 null) */
  repCharId: string | null;
  /** 대표 캐릭터 이름 (모르면 null) */
  repCharName: string | null;
  /** 결투장 점수 */
  score: number | null;
  /** 승 수 (모르면 null) */
  wins: number | null;
  /** 패 수 (모르면 null) */
  losses: number | null;
  /** 승률(%) — 모르면 null */
  winRate: number | null;
}

/** 앱 결투장 랭킹이 받는 데이터 */
export interface AppRankingTsjProps {
  /** 근거리/원거리 칩 */
  typeTabs: AppLinkTab[];
  /** 지금 결투장 이름 */
  typeLabel: string;
  /** 순위 목록 */
  rows: AppTsjRow[];
  /** 불러오기 실패 안내 (maintenance: 서버 점검) — 정상이면 null */
  error: { maintenance: boolean; message: string } | null;
  /** 이전 쪽 주소 (없으면 null) */
  prevHref: string | null;
  /** 다음 쪽 주소 (없으면 null) */
  nextHref: string | null;
  /** 지금 쪽 범위 글자 */
  rangeLabel: string | null;
  /** 다시 불러오기 주소 */
  retryHref: string;
}

/**
 * @param p 결투장 랭킹 데이터 (AppRankingTsjProps)
 */
export default function AppRankingTsj(p: AppRankingTsjProps) {
  return (
    <div className="min-h-[100dvh]" style={{ background: "radial-gradient(120% 42% at 50% -8%, var(--a-amb), transparent 70%)" }}>
      <RankTopBar active="tsj" basis="투신전 점수" />
      <AppPage className="!gap-3">
        <ChipRow>
          {p.typeTabs.map((t) => (
            <Chip key={t.key} href={t.href} active={t.active}>
              {t.label}
            </Chip>
          ))}
        </ChipRow>

        {p.error ? (
          <StateBox
            kind="error"
            title={p.error.maintenance ? "사이퍼즈 서버 점검 중이에요" : "랭킹을 불러오지 못했어요"}
            desc={p.error.maintenance ? "점검이 끝나면 다시 볼 수 있어요. 캐릭터 티어는 점검 중에도 볼 수 있어요." : p.error.message}
            action={
              p.error.maintenance ? (
                <GhostLink href="/meta">캐릭터 티어 보기</GhostLink>
              ) : (
                <GhostLink href={p.retryHref} icon="refresh">
                  다시 불러오기
                </GhostLink>
              )
            }
          />
        ) : p.rows.length === 0 ? (
          <StateBox icon="trophy" title={`${p.typeLabel} 랭킹 데이터가 없어요`} desc="다른 결투장을 골라 보세요." />
        ) : (
          <>
            <p className="px-1 text-[11px] text-gray-500">{p.typeLabel} 점수 순 · 얼굴은 플레이어의 대표 캐릭터예요</p>
            <ol className="a-card divide-y divide-app-hair overflow-hidden">
              {p.rows.map((r) => (
                <li key={r.playerId}>
                  <Link
                    href={`/players/${r.playerId}`}
                    className="grid grid-cols-[28px_36px_minmax(0,1fr)_auto] items-center gap-x-2.5 px-3 py-2.5 active:bg-surface-2"
                  >
                    <span
                      className={`text-center text-[15px] font-extrabold tabular-nums ${r.rank <= 3 ? "text-primary" : "text-gray-300"}`}
                    >
                      {r.rank}
                    </span>
                    <CharImg id={r.repCharId} name={r.repCharName ?? r.nickname} size={36} radius={10} />
                    <span className="grid min-w-0">
                      <span className="truncate text-sm font-bold text-gray-100">{r.nickname}</span>
                      <span className="truncate text-[11px] text-gray-500">
                        {r.wins !== null && r.losses !== null ? (
                          <>
                            {r.wins.toLocaleString()}승 {r.losses.toLocaleString()}패
                            {r.winRate !== null && (
                              <>
                                {" · "}
                                <b className={`font-semibold ${wrClass(r.winRate)}`}>승률 {r.winRate}%</b>
                              </>
                            )}
                          </>
                        ) : (
                          "승패 기록 없음"
                        )}
                      </span>
                    </span>
                    <span className="whitespace-nowrap text-right">
                      <b className="text-[15px] font-extrabold tabular-nums text-primary">{r.score !== null ? r.score.toLocaleString() : "-"}</b>
                      <span className="ml-0.5 text-[10px] font-semibold text-gray-500">점</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </>
        )}

        <PageLinks prevHref={p.prevHref} nextHref={p.nextHref} label={p.rangeLabel} />
      </AppPage>
    </div>
  );
}
