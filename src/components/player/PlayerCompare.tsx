"use client";

/**
 * PlayerCompare — 플레이어 2명 비교 결과(함께한 경기 / 상대 전적).
 * 자기 도메인 프록시(GET /api/meta/history/duo)를 불러오고,
 * 처음 조회하는 플레이어의 전적 적립(pending)이나 일반전 팀 확인(teamPending)이 남아 있으면
 * 몇 초 간격으로 다시 불러와 결과를 채운다(최대 MAX_POLLS 회).
 */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/CharacterAvatar";
import { UltimateBadge } from "@/components/characters/UltimateBadge";
import { EmptyState, ErrorState } from "@/components/ui";
import { getJSON } from "@/lib/api-client";
import type { DuoGameType, DuoMatch, DuoPlayer, DuoRelation, DuoResult, DuoSide } from "@/lib/duo";
import { formatMatchListDate } from "@/lib/format";

/** 자동 재조회 간격(ms)·최대 횟수 */
const POLL_MS = 4000;
const MAX_POLLS = 15;
/** 경기 목록을 한 번에 보여 줄 개수 */
const PAGE = 20;

/** 목록 탭(팀 확인 대기 경기는 판별되면 들어간다) */
type ListTab = Exclude<DuoRelation, "checking">;
const TABS: { key: ListTab; label: string }[] = [
  { key: "together", label: "함께한 경기" },
  { key: "opponent", label: "상대 전적" },
  { key: "unknown", label: "판별 불가" },
];

/**
 * @param a — 플레이어 A(닉네임으로 찾은 결과)
 * @param b — 플레이어 B
 * @param gameType — 비교 기준(전체/공식전/일반전)
 */
export default function PlayerCompare({ a, b, gameType }: { a: DuoPlayer; b: DuoPlayer; gameType: DuoGameType }) {
  const [data, setData] = useState<DuoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ListTab>("together");
  const [shown, setShown] = useState(PAGE);
  const polls = useRef(0);
  // 첫 결과에서 한 번만 판수가 있는 탭으로 맞춘다(이후엔 사용자가 고른 탭 유지)
  const autoTabbed = useRef(false);

  const load = useCallback(async () => {
    const q = new URLSearchParams({ a: a.playerId, b: b.playerId, gameType, an: a.nickname, bn: b.nickname });
    try {
      const d = await getJSON<DuoResult>(`/api/meta/history/duo?${q.toString()}`);
      setData(d);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [a.playerId, a.nickname, b.playerId, b.nickname, gameType]);

  // 기준·대상이 바뀌면 처음부터 다시
  useEffect(() => {
    setData(null);
    setShown(PAGE);
    polls.current = 0;
    autoTabbed.current = false;
    load();
  }, [load]);

  // 적립·팀 확인이 남아 있으면 자동 재조회
  const working = !!data && (data.a.pending || data.b.pending || data.teamPending > 0);
  useEffect(() => {
    if (!working || polls.current >= MAX_POLLS) return;
    const t = setTimeout(() => {
      polls.current += 1;
      load();
    }, POLL_MS);
    return () => clearTimeout(t);
  }, [working, data, load]);

  // 첫 결과(적립 완료 후)가 나오면 판수가 있는 탭으로 한 번 맞춘다
  useEffect(() => {
    if (!data || autoTabbed.current || data.a.pending || data.b.pending) return;
    autoTabbed.current = true;
    setTab(data.together.games === 0 && data.opponents.games > 0 ? "opponent" : "together");
  }, [data]);

  if (error && !data) return <ErrorState message={error} />;
  if (!data) return <CompareSkeleton />;

  const collecting = data.a.pending || data.b.pending;
  const list = data.matches.filter((m) => m.relation === tab);
  const counts: Record<ListTab, number> = {
    together: data.together.games,
    opponent: data.opponents.games,
    unknown: data.unknown,
  };

  return (
    <div className="space-y-4">
      {/* 진행 상태 — 처음 조회 적립 / 일반전 팀 확인 */}
      {working && polls.current < MAX_POLLS && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs font-medium text-gray-300">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          {collecting
            ? "처음 조회하는 플레이어의 전적을 모으는 중이에요. 잠시 후 자동으로 채워져요."
            : `일반전 ${data.teamPending}판의 팀 구성을 확인하는 중이에요.`}
        </div>
      )}

      {/* 요약 — 함께한 경기 / 상대 전적 */}
      <div className="grid gap-3 sm:grid-cols-2">
        <TogetherCard data={data} />
        <VersusCard data={data} a={a} b={b} />
      </div>

      {/* 경기 목록 */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 px-1">
          <h2 className="text-lg font-bold text-gray-100">경기 기록</h2>
          <div className="ml-auto inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-line bg-surface-2 p-1">
            {TABS.filter((t) => t.key !== "unknown" || data.unknown > 0).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setTab(t.key);
                  setShown(PAGE);
                }}
                aria-pressed={tab === t.key}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                  tab === t.key ? "bg-surface text-gray-50 shadow-sm ring-1 ring-line" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {t.label}
                <span
                  className={`rounded-full px-1.5 py-px text-[10px] tabular-nums ${
                    tab === t.key ? (t.key === "opponent" ? "bg-lose/15 text-lose" : "bg-primary/15 text-primary") : "bg-surface-3 text-gray-500"
                  }`}
                >
                  {counts[t.key]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {list.length === 0 ? (
          <EmptyState
            icon={null}
            title={
              collecting
                ? "전적을 모으는 중이에요"
                : tab === "together"
                  ? "같은 팀으로 뛴 경기가 없어요"
                  : tab === "opponent"
                    ? "상대 팀으로 만난 경기가 없어요"
                    : "판별 불가 경기가 없어요"
            }
            description={collecting ? "잠시 후 자동으로 채워져요." : "두 플레이어의 누적 전적에서 찾은 결과예요."}
          />
        ) : (
          <div className="space-y-2">
            {list.slice(0, shown).map((m) => (
              <DuoMatchRow key={m.matchId} m={m} />
            ))}
            {list.length > shown && (
              <button
                type="button"
                onClick={() => setShown((s) => s + PAGE)}
                className="h-11 w-full rounded-xl border border-line bg-surface text-sm font-bold text-gray-300 transition-colors hover:border-primary/40 hover:text-primary"
              >
                더 보기 <span className="text-gray-500">· {list.length - shown}경기</span>
              </button>
            )}
          </div>
        )}

        {/* 안내 */}
        <p className="px-1 text-[11px] leading-relaxed text-gray-500">
          * 두 플레이어의 누적 전적에서 같은 경기를 찾아 같은 팀·상대 팀으로 나눴어요. 게임 API 는 이번 시즌 경기만 제공해서,
          처음 조회하는 플레이어는 이번 시즌 경기부터 쌓이고 이미 쌓아 둔 지난 시즌 기록은 그대로 포함돼요.
          일반전은 게임 API 가 승패를 주지 않아 같은 팀·상대만 표시하며, 지난 시즌 일반전은 팀을 확인할 수 없어 &lsquo;판별 불가&rsquo;로 둬요.
        </p>
      </section>
    </div>
  );
}

/**
 * 원형 승률 게이지.
 * @param percent — 승률(0~100)
 */
function WinRing({ percent }: { percent: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative grid h-[76px] w-[76px] shrink-0 place-items-center">
      <svg width="76" height="76" viewBox="0 0 76 76" className="-rotate-90" aria-hidden>
        <circle cx="38" cy="38" r={r} fill="none" strokeWidth="7" className="stroke-surface-3" />
        <circle
          cx="38"
          cy="38"
          r={r}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          className="stroke-primary transition-all duration-700"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(Math.max(percent, 0), 100) / 100)}
        />
      </svg>
      <span className="absolute text-center leading-none">
        <span className="block text-base font-black tabular-nums text-gray-50">{percent}%</span>
        <span className="mt-0.5 block text-[9px] font-bold text-gray-500">승률</span>
      </span>
    </span>
  );
}

/**
 * 함께한 경기 요약 카드 — 판수와 (공식전) 원형 승률 게이지.
 * @param data — 비교 결과
 */
function TogetherCard({ data }: { data: DuoResult }) {
  const t = data.together;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-surface p-5">
      <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-primary/15 blur-2xl" aria-hidden />
      <div className="relative flex items-center gap-4">
        {t.decided > 0 && t.winRate != null ? (
          <WinRing percent={t.winRate} />
        ) : (
          <span className="grid h-[76px] w-[76px] shrink-0 place-items-center rounded-full border-[7px] border-surface-3 text-[10px] font-bold text-gray-500">
            승패 없음
          </span>
        )}
        <div className="min-w-0">
          <div className="text-[11px] font-black tracking-widest text-primary">TOGETHER</div>
          <div className="text-xs font-semibold text-gray-500">함께한 경기</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-3xl font-black tabular-nums text-gray-50">{t.games.toLocaleString()}</span>
            <span className="text-sm font-semibold text-gray-500">경기</span>
          </div>
          <div className="mt-0.5 text-xs text-gray-500">
            {t.decided > 0 ? (
              <>
                공식전 <span className="font-bold text-win">{t.wins}승</span>{" "}
                <span className="font-bold text-lose">{t.losses}패</span>
              </>
            ) : t.games > 0 ? (
              "일반전은 승패 정보가 없어요"
            ) : (
              "같은 팀으로 뛴 기록이 없어요"
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 상대 전적 카드 — A 승 : B 승 스코어보드와 양쪽 비율 막대(공식전).
 * @param data — 비교 결과
 * @param a — 플레이어 A
 * @param b — 플레이어 B
 */
function VersusCard({ data, a, b }: { data: DuoResult; a: DuoPlayer; b: DuoPlayer }) {
  const o = data.opponents;
  const aPct = o.decided > 0 ? Math.round((o.aWins / o.decided) * 100) : 50;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-surface p-5">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-lose/15 blur-2xl" aria-hidden />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-black tracking-widest text-lose">HEAD TO HEAD</div>
            <div className="text-xs font-semibold text-gray-500">상대 전적</div>
          </div>
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold tabular-nums text-gray-400">
            {o.games.toLocaleString()}경기
          </span>
        </div>
        {o.decided > 0 ? (
          <>
            <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <div className="min-w-0">
                <div className="truncate text-[11px] font-bold text-primary">{a.nickname}</div>
                <div className="text-4xl font-black leading-none tabular-nums text-primary">{o.aWins}</div>
              </div>
              <div className="pb-1 text-xs font-black text-gray-500">승 : 승</div>
              <div className="min-w-0 text-right">
                <div className="truncate text-[11px] font-bold text-lose">{b.nickname}</div>
                <div className="text-4xl font-black leading-none tabular-nums text-lose">{o.bWins}</div>
              </div>
            </div>
            <div className="mt-3 flex h-2 gap-1">
              <div className="rounded-full bg-primary transition-all duration-700" style={{ width: `${aPct}%` }} />
              <div className="flex-1 rounded-full bg-lose" />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] font-bold tabular-nums">
              <span className="text-primary">{aPct}%</span>
              <span className="text-gray-500">공식전 {o.decided}판 기준</span>
              <span className="text-lose">{100 - aPct}%</span>
            </div>
          </>
        ) : (
          <p className="mt-4 text-xs text-gray-500">
            {o.games > 0 ? "일반전은 승패 정보가 없어 판수만 보여 줘요." : "상대 팀으로 만난 기록이 없어요."}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * 경기 1건 — 게임 타입·날짜와 두 플레이어의 캐릭터·승패·KDA. 누르면 매치 상세로.
 * @param m — 경기
 */
function DuoMatchRow({ m }: { m: DuoMatch }) {
  const rating = m.gameTypeId === "rating";
  // 은은한 결과 빛 번짐(공식전만)
  //  - 같은 팀: 왼쪽에서 승(파랑)/패(빨강)
  //  - 상대 팀: 이긴 쪽(A 면 왼쪽, B 면 오른쪽)에서 파랑
  const glow = !m.a.result
    ? null
    : m.relation === "opponent"
      ? m.a.result === "win"
        ? "bg-gradient-to-r from-win/[0.09]"
        : "bg-gradient-to-l from-win/[0.09]"
      : m.a.result === "win"
        ? "bg-gradient-to-r from-win/[0.09]"
        : "bg-gradient-to-r from-lose/[0.09]";
  const teamResult = m.relation === "together" ? m.a.result : null;
  return (
    <Link
      href={`/matches/${m.matchId}`}
      className="group relative flex items-center gap-2.5 overflow-hidden rounded-2xl border border-line bg-surface px-3 py-3 transition-all hover:-translate-y-px hover:border-primary/30 hover:shadow-md sm:gap-4 sm:px-4"
    >
      {glow && <span className={`pointer-events-none absolute inset-0 ${glow} via-transparent to-transparent`} aria-hidden />}
      <div className="relative w-[52px] shrink-0 sm:w-16">
        {/* 같은 팀 공식전은 팀 결과를 글자로 */}
        {teamResult && (
          <div className={`mb-1 text-[11px] font-black ${teamResult === "win" ? "text-win" : "text-lose"}`}>
            {teamResult === "win" ? "승리" : "패배"}
          </div>
        )}
        <span
          className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
            rating ? "bg-primary/10 text-primary" : "bg-surface-2 text-gray-400"
          }`}
        >
          {rating ? "공식전" : "일반전"}
        </span>
        <div className="mt-1 truncate text-[11px] text-gray-500">{formatMatchListDate(m.playedAt ?? undefined)}</div>
      </div>
      {m.relation === "together" ? (
        // 같은 팀 — 두 캐릭터를 왼쪽부터 나란히(맞붙는 구도로 보이지 않게).
        // 모바일은 반씩 두 칸, sm 이상은 일정 폭으로 왼쪽에 붙여 둔다(넓은 화면에서 B 가 가운데로 떨어지지 않게)
        <div className="relative grid min-w-0 flex-1 grid-cols-2 gap-2 sm:flex sm:gap-8">
          <div className="flex min-w-0 sm:w-56 sm:flex-none">
            <Side s={m.a} tag="a" />
          </div>
          <div className="flex min-w-0 sm:w-56 sm:flex-none">
            <Side s={m.b} tag="b" />
          </div>
        </div>
      ) : (
        <>
          <Side s={m.a} tag="a" />
          {/* 상대 팀(또는 판별 불가) — A | VS | B */}
          <span
            className={`relative grid h-7 min-w-7 shrink-0 place-items-center rounded-full px-1.5 text-[10px] font-black ${
              m.relation === "opponent" ? "bg-lose/10 text-lose" : "bg-surface-2 text-gray-500"
            }`}
            title={m.relation === "opponent" ? "상대 팀" : "팀 판별 불가"}
          >
            {m.relation === "opponent" ? "VS" : "?"}
          </span>
          <Side s={m.b} tag="b" align="right" />
        </>
      )}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="relative hidden shrink-0 text-gray-500 transition-transform group-hover:translate-x-0.5 sm:block" aria-hidden>
        <path d="m9 6 6 6-6 6" />
      </svg>
    </Link>
  );
}

/**
 * 경기 속 한 플레이어 — 캐릭터 아바타(궁극기 배지·A/B 표시)·이름·승패·KDA.
 * @param s — 기록
 * @param tag — 플레이어 A(파랑) / B(빨강) 표시
 * @param align — 오른쪽 정렬(상대 전적의 B 쪽)
 */
function Side({ s, tag, align = "left" }: { s: DuoSide; tag: "a" | "b"; align?: "left" | "right" }) {
  const right = align === "right";
  return (
    <div className={`relative flex min-w-0 flex-1 items-center gap-2 ${right ? "flex-row-reverse text-right" : ""}`}>
      <span className="relative shrink-0">
        <Avatar characterId={s.characterId} characterName={s.characterName ?? undefined} size={38} />
        {s.ultimateType === "2nd" && (
          <UltimateBadge ultimateType="2nd" className={`absolute -top-1 ${right ? "-left-1" : "-right-1"}`} />
        )}
        {/* 누구의 캐릭터인지 — 상단 VS 카드의 A/B 표시와 같은 색 */}
        <span
          className={`absolute -bottom-1 grid h-4 w-4 place-items-center rounded-[5px] text-[9px] font-black text-white ring-2 ring-surface ${
            right ? "-left-1" : "-right-1"
          } ${tag === "a" ? "bg-primary" : "bg-lose"}`}
          aria-label={tag === "a" ? "플레이어 A" : "플레이어 B"}
        >
          {tag === "a" ? "A" : "B"}
        </span>
      </span>
      <div className="min-w-0">
        <div className="truncate text-sm font-bold text-gray-100">{s.characterName ?? "-"}</div>
        {/* 승패·KDA 는 공식전만 — 일반전은 게임 API 가 주지 않는다 */}
        {s.result && (
          <div className={`mt-0.5 flex items-center gap-1 text-[11px] text-gray-500 ${right ? "flex-row-reverse" : ""}`}>
            <span
              className={`rounded px-1 py-px text-[10px] font-black ${
                s.result === "win" ? "bg-win/15 text-win" : "bg-lose/15 text-lose"
              }`}
            >
              {s.result === "win" ? "승" : "패"}
            </span>
            <span className="tabular-nums">
              {s.kill}/{s.death}/{s.assist}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/** 첫 로딩 스켈레톤 */
function CompareSkeleton() {
  return (
    <div className="space-y-4" aria-busy>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-32 animate-pulse rounded-2xl border border-line bg-surface-2" />
        <div className="h-32 animate-pulse rounded-2xl border border-line bg-surface-2" />
      </div>
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl border border-line bg-surface-2" />
        ))}
      </div>
    </div>
  );
}
