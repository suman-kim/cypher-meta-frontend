/**
 * 앱 랭킹 · 전체 화면 (시안 08).
 *
 * 구성: 큰 제목 "랭킹" + 전체/캐릭터별/결투장 세그먼트 → 1위 큰 카드 → 2·3위 메달 카드
 *       → 4위부터 촘촘한 목록(RankList, 끝에 닿으면 이어 불러오기).
 * 시안과 다르게 한 점: 4~100위 카드가 한 장에 약 160px 라 넘기기 힘들어 한 줄 반 행으로 줄였다
 *       (성향 태그 1~2개, 픽 얼굴 3개는 작게, 판수는 상위 3명 카드에서만).
 * 데이터는 웹 랭킹(app/ranking/page.tsx)이 불러와 보강한 값을 받는다(서버 컴포넌트).
 */
import Link from "next/link";
import { characterImage } from "@/lib/images";
import SafeImage from "@/components/SafeImage";
import { Icon } from "../../icons";
import { AppPage, CharImg, GhostLink, PlayTag, StateBox, tierKo, wrClass } from "../../ui";
import { Bar, RankTopBar } from "./parts";
import RankList from "./RankList";
import type { AppRankRow } from "./rank-data";

/** 메달 색 (1·2·3위) — 순위 표시용 고정색 */
const MEDAL = { 1: "#f5b301", 2: "#a7b1c2", 3: "#c07b3f" } as const;

/** 앱 전체 랭킹이 받는 데이터 */
export interface AppRankingProps {
  /** 1~3위 (첫 쪽에서만, 아니면 빈 배열) */
  top3: AppRankRow[];
  /** 4위(또는 시작 순위)부터 첫 쪽의 나머지 줄 */
  rows: AppRankRow[];
  /** 다음에 부를 offset (더 없으면 null) */
  nextOffset: number | null;
  /** 시작 순위가 1위가 아니면 그 순위 (1위부터면 null) */
  startRank: number | null;
  /** 100위 안쪽 목록의 표본 안내 글 */
  basisNote: string;
  /** 랭킹을 불러오지 못했을 때 (maintenance: 서버 점검 중) — 정상이면 null */
  error: { maintenance: boolean; message: string } | null;
}

/**
 * 메달 숫자 배지.
 * @param place 순위(1~3)
 * @param size 지름(px)
 */
function MedalBadge({ place, size = 22 }: { place: 1 | 2 | 3; size?: number }) {
  return (
    <span
      className="absolute -bottom-1 -right-1 grid place-items-center rounded-full text-[11px] font-extrabold text-white ring-2 ring-[rgb(var(--surface))]"
      style={{ width: size, height: size, background: MEDAL[place] }}
    >
      {place}
    </span>
  );
}

/**
 * 픽 TOP3 (얼굴 + 판수).
 * @param r 랭킹 한 줄
 * @param size 얼굴 크기(px)
 */
function Picks({ r, size }: { r: AppRankRow; size: number }) {
  if (r.picks.length === 0) return <span className="text-[11px] text-gray-500">최근 기록 없음</span>;
  return (
    <span className="flex items-center gap-2.5">
      {r.picks.map((p) => (
        <span key={p.characterId} className="flex items-center gap-1">
          <CharImg id={p.characterId} name={p.characterName} size={size} radius={size / 3} />
          <span className="text-[11px] font-semibold tabular-nums text-gray-300">{p.count}판</span>
        </span>
      ))}
    </span>
  );
}

/**
 * 1위 큰 카드.
 * @param r 1위 줄
 */
function HeroCard({ r }: { r: AppRankRow }) {
  const top = r.picks[0];
  const sub = ["공식전 1위", r.grade ? `등급 ${r.grade}` : null, tierKo(r.tierName)].filter(Boolean).join(" · ");
  return (
    <Link href={`/players/${r.playerId}`} className="a-card a-press relative block overflow-hidden p-4">
      {top && (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[62%]" aria-hidden="true" style={{ opacity: "var(--a-art-op)" }}>
          <SafeImage src={characterImage(top.characterId, 3)} alt="" fallbackText="" className="h-full w-full object-cover object-top" fallbackClassName="!bg-transparent" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgb(var(--surface)), rgb(var(--surface) / 0) 70%)" }} />
        </div>
      )}
      <div className="relative grid gap-3">
        <div className="flex items-center gap-3">
          <span className="relative shrink-0">
            <CharImg id={top?.characterId} name={top?.characterName ?? r.nickname} size={60} radius={30} className="ring-2 ring-[#f5b301]" />
            <MedalBadge place={1} size={24} />
          </span>
          <span className="grid min-w-0 gap-0.5">
            <span className="flex items-center gap-1 text-[11px] font-bold text-[#e0a400]">
              <Icon name="crown" size={13} />
              <span className="truncate">{sub}</span>
            </span>
            <span className="truncate text-2xl font-extrabold tracking-[-0.02em] text-gray-50">{r.nickname}</span>
            {r.clan && <span className="truncate text-xs text-gray-500">{r.clan}</span>}
          </span>
        </div>
        <div className="flex items-end justify-between gap-2">
          <span className="whitespace-nowrap">
            <b className="text-[34px] font-extrabold leading-none tracking-[-0.03em] text-primary tabular-nums">{r.rp.toLocaleString()}</b>
            <span className="ml-1 text-xs font-semibold text-gray-500">RP</span>
          </span>
          <span className="text-xs text-gray-500">
            {r.winRate !== null ? (
              <>
                승률 <b className={`font-extrabold ${wrClass(r.winRate)}`}>{r.winRate}%</b> · {r.wins}승 {r.losses}패
              </>
            ) : (
              "최근 기록 없음"
            )}
          </span>
        </div>
        {r.winRate !== null && <Bar pct={r.winRate} className="h-1.5" />}
        {r.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {r.tags.slice(0, 4).map((t) => (
              <PlayTag key={t} tag={t} />
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 border-t border-app-hair pt-3">
          <span className="shrink-0 text-[11px] text-gray-500">픽 TOP3</span>
          <Picks r={r} size={28} />
        </div>
      </div>
    </Link>
  );
}

/**
 * 2·3위 메달 카드.
 * @param r 순위 줄
 * @param place 2 | 3
 */
function MedalCard({ r, place }: { r: AppRankRow; place: 2 | 3 }) {
  const top = r.picks[0];
  return (
    <Link href={`/players/${r.playerId}`} className="a-card a-press grid min-w-0 content-start justify-items-center gap-1.5 px-3 py-3.5 text-center">
      <span className="relative">
        <CharImg
          id={top?.characterId}
          name={top?.characterName ?? r.nickname}
          size={56}
          radius={28}
          className={place === 2 ? "ring-2 ring-[#a7b1c2]" : "ring-2 ring-[#c07b3f]"}
        />
        <MedalBadge place={place} />
      </span>
      <span className="mt-1 w-full truncate text-[15px] font-extrabold text-gray-100">{r.nickname}</span>
      <span className="w-full truncate text-[11px] text-gray-500">{r.grade ? `등급 ${r.grade}` : (r.clan ?? "")}</span>
      <span className="whitespace-nowrap">
        <b className="text-xl font-extrabold tabular-nums text-primary">{r.rp.toLocaleString()}</b>
        <span className="ml-0.5 text-[10px] font-semibold text-gray-500">RP</span>
      </span>
      {r.winRate !== null && <Bar pct={r.winRate} className="h-1 w-full" />}
      <span className="text-[11px] text-gray-500">
        {r.winRate !== null ? (
          <>
            승률 <b className={`font-extrabold ${wrClass(r.winRate)}`}>{r.winRate}%</b>
          </>
        ) : (
          "최근 기록 없음"
        )}
      </span>
      {r.tags.length > 0 && (
        <span className="flex flex-wrap justify-center gap-1">
          {r.tags.slice(0, 2).map((t) => (
            <PlayTag key={t} tag={t} />
          ))}
        </span>
      )}
      {r.picks.length > 0 && (
        <span className="mt-0.5 flex justify-center gap-2">
          {r.picks.map((p) => (
            <span key={p.characterId} className="grid justify-items-center gap-0.5">
              <CharImg id={p.characterId} name={p.characterName} size={26} radius={9} />
              <span className="text-[10px] tabular-nums text-gray-500">{p.count}판</span>
            </span>
          ))}
        </span>
      )}
    </Link>
  );
}

/**
 * @param props 전체 랭킹 데이터 (AppRankingProps)
 */
export default function AppRanking({ top3, rows, nextOffset, startRank, basisNote, error }: AppRankingProps) {
  return (
    <div className="min-h-[100dvh]" style={{ background: "radial-gradient(120% 42% at 50% -8%, var(--a-amb), transparent 70%)" }}>
      <RankTopBar active="all" basis="공식전 RP" />
      <AppPage>
        {error ? (
          <StateBox
            kind="error"
            title={error.maintenance ? "사이퍼즈 서버 점검 중이에요" : "랭킹을 불러오지 못했어요"}
            desc={error.maintenance ? "점검이 끝나면 다시 볼 수 있어요. 캐릭터 티어는 점검 중에도 볼 수 있어요." : error.message}
            action={
              error.maintenance ? (
                <GhostLink href="/meta">캐릭터 티어 보기</GhostLink>
              ) : (
                <GhostLink href="/ranking" icon="refresh">
                  다시 불러오기
                </GhostLink>
              )
            }
          />
        ) : top3.length === 0 && rows.length === 0 ? (
          <StateBox icon="trophy" title="랭킹 데이터가 없어요" desc="잠시 뒤 다시 열어 주세요." action={<GhostLink href="/ranking" icon="refresh">다시 불러오기</GhostLink>} />
        ) : (
          <>
            {startRank && (
              <div className="a-tile flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs text-gray-300">
                <span>{startRank.toLocaleString()}위부터 보고 있어요</span>
                <Link href="/ranking" className="flex items-center gap-0.5 font-semibold text-primary">
                  1위부터 보기
                  <Icon name="chevronRight" size={13} />
                </Link>
              </div>
            )}
            {top3[0] && <HeroCard r={top3[0]} />}
            {top3.length >= 3 && (
              <div className="grid grid-cols-2 gap-2.5">
                <MedalCard r={top3[1]} place={2} />
                <MedalCard r={top3[2]} place={3} />
              </div>
            )}
            <RankList initial={rows} initialNext={nextOffset} basisNote={basisNote} />
          </>
        )}
      </AppPage>
    </div>
  );
}
