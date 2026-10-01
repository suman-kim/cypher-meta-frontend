/**
 * 멀티서치 페이지 — /players/multi?a=닉네임&a=…&b=닉네임&b=…
 * 내 팀·상대 팀(각 최대 5명, 인원 자유) 닉네임으로 각자의 최근 공식전 전적을 카드로 정리해 한 화면에 보여 준다.
 * 닉네임 → playerId(검색) → 플레이어 정보(티어·대표 캐릭터) + 최근 공식전 목록을 플레이어마다 병렬로 불러온다.
 */
import { Suspense } from "react";
import MultiPlayerCard, { MultiMissingCard, type MultiCardPlayer } from "@/components/player/MultiPlayerCard";
import MultiSearchForm from "@/components/player/MultiSearchForm";
import { ErrorState } from "@/components/ui";
import { buildMultiSummary, MULTI_RECENT, parseNames, type MultiSummary } from "@/lib/multi";
import { getPlayer, getPlayerMatches, NeopleApiError, neopleErrorView, searchPlayers } from "@/lib/neople";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "멀티서치",
  description: "지금 매칭된 내 팀과 상대 팀 플레이어의 최근 전적을 한 화면에서 확인하세요.",
};

interface Props {
  searchParams: { a?: string | string[]; b?: string | string[] };
}

/** 플레이어 1명 조회 결과 */
type CardResult =
  | { nickname: string; ok: true; player: MultiCardPlayer; summary: MultiSummary }
  | { nickname: string; ok: false; message: string; error?: unknown };

/**
 * 닉네임 → 카드 데이터. 정확히 같은 닉네임을 고르고(없으면 결과가 1명일 때만 그 사람),
 * 플레이어 정보와 최근 공식전 목록을 함께 불러와 요약한다.
 * @param nickname — 입력 닉네임
 * @returns 카드 데이터 또는 실패 안내
 */
async function loadCard(nickname: string): Promise<CardResult> {
  try {
    const rows = (await searchPlayers(nickname, { wordType: "match", limit: 10 })).rows ?? [];
    const hit = rows.find((r) => r.nickname === nickname) ?? (rows.length === 1 ? rows[0] : undefined);
    if (!hit) return { nickname, ok: false, message: "플레이어를 찾을 수 없어요" };
    const [detail, matches] = await Promise.all([
      getPlayer(hit.playerId),
      getPlayerMatches(hit.playerId, { gameTypeId: "rating", limit: MULTI_RECENT }),
    ]);
    return {
      nickname,
      ok: true,
      player: {
        playerId: hit.playerId,
        nickname: hit.nickname,
        tierName: detail.tierName,
        ratingPoint: detail.ratingPoint,
        representId: detail.represent?.characterId,
        representName: detail.represent?.characterName,
      },
      summary: buildMultiSummary(matches.matches?.rows ?? []),
    };
  } catch (e) {
    return { nickname, ok: false, message: neopleErrorView(e).message, error: e };
  }
}

export default function MultiSearchPage({ searchParams }: Props) {
  const a = parseNames(searchParams.a);
  const b = parseNames(searchParams.b);
  const empty = a.length + b.length === 0;

  return (
    <div className="space-y-5">
      {/* 상단 히어로 — 제목 + 팀 입력 폼 */}
      <section className="relative overflow-hidden rounded-3xl border border-line bg-surface p-5 sm:p-7">
        <div className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-primary/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-28 -right-24 h-72 w-72 rounded-full bg-lose/15 blur-3xl" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage: "radial-gradient(rgb(var(--g500) / 0.16) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
            maskImage: "linear-gradient(to bottom, black, transparent 85%)",
            WebkitMaskImage: "linear-gradient(to bottom, black, transparent 85%)",
          }}
          aria-hidden
        />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-black tracking-widest text-primary">
            MULTI SEARCH <span className="text-lose">5 : 5</span>
          </span>
          <h1 className="mt-3 text-[26px] font-black leading-tight tracking-tight text-gray-50 sm:text-3xl">멀티서치</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-400">
            지금 매칭된 내 팀과 상대 팀 플레이어의 최근 전적을 한 화면에서 확인하세요. 5명을 다 채우지 않아도 돼요.
          </p>
          <div className="mt-5">
            <MultiSearchForm defaultA={a} defaultB={b} />
          </div>
        </div>
      </section>

      {empty ? (
        <MultiGuide />
      ) : (
        // 결과는 스트리밍 — 플레이어 조회가 끝날 때까지 스켈레톤
        <Suspense key={[...a, "|", ...b].join(",")} fallback={<MultiSkeleton a={a.length} b={b.length} />}>
          <MultiResults a={a} b={b} />
        </Suspense>
      )}
    </div>
  );
}

/**
 * 결과 — 팀별 카드 열(PC 2단, 모바일 위아래).
 * @param a — 내 팀 닉네임
 * @param b — 상대 팀 닉네임
 */
async function MultiResults({ a, b }: { a: string[]; b: string[] }) {
  const [ca, cb] = await Promise.all([Promise.all(a.map(loadCard)), Promise.all(b.map(loadCard))]);
  // 점검(CY980)이면 카드마다 같은 안내를 띄우지 않고 한 번만 점검 화면을 보여 준다
  const maintenance = [...ca, ...cb].find(
    (c) => !c.ok && c.error instanceof NeopleApiError && c.error.code === "CY980",
  );
  if (maintenance && !maintenance.ok) return <ErrorState {...neopleErrorView(maintenance.error)} />;

  const both = a.length > 0 && b.length > 0;
  return (
    <div className={`grid gap-5 ${both ? "lg:grid-cols-2" : ""}`}>
      {a.length > 0 && <TeamColumn tone="a" cards={ca} />}
      {b.length > 0 && <TeamColumn tone="b" cards={cb} />}
    </div>
  );
}

/**
 * 팀 1열 — 머리(팀 이름·평균 승률) + 플레이어 카드.
 * @param tone — "a"(내 팀) | "b"(상대 팀)
 * @param cards — 카드 데이터
 */
function TeamColumn({ tone, cards }: { tone: "a" | "b"; cards: CardResult[] }) {
  const isA = tone === "a";
  const rates = cards.flatMap((c) => (c.ok && c.summary.winRate != null ? [c.summary.winRate] : []));
  const avg = rates.length ? Math.round(rates.reduce((n, r) => n + r, 0) / rates.length) : null;
  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-2 px-1">
        <span
          className={`grid h-6 w-6 place-items-center rounded-lg text-[11px] font-black text-white shadow-md ${
            isA ? "bg-primary shadow-primary/30" : "bg-lose shadow-lose/30"
          }`}
        >
          {isA ? "A" : "B"}
        </span>
        <span className={`text-[11px] font-black tracking-widest ${isA ? "text-primary" : "text-lose"}`}>
          {isA ? "MY TEAM" : "ENEMY TEAM"}
        </span>
        <span className="text-sm font-bold text-gray-100">{isA ? "내 팀" : "상대 팀"}</span>
        {avg != null && (
          <span className="ml-auto rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-bold tabular-nums text-gray-400">
            평균 승률 <span className={avg >= 50 ? "text-win" : "text-lose"}>{avg}%</span>
          </span>
        )}
      </div>
      <div className="space-y-2">
        {cards.map((c) =>
          c.ok ? (
            <MultiPlayerCard key={c.player.playerId} player={c.player} summary={c.summary} tone={tone} />
          ) : (
            <MultiMissingCard key={c.nickname} nickname={c.nickname} message={c.message} tone={tone} />
          ),
        )}
      </div>
      <p className="px-1 text-[11px] text-gray-500">* 플레이어마다 최근 공식전 {MULTI_RECENT}판 기준이에요.</p>
    </section>
  );
}

/** 입력 전 안내 — 멀티서치로 볼 수 있는 것 3가지 */
const GUIDE = [
  { no: "01", title: "팀 단위로 한 번에", desc: "내 팀·상대 팀 닉네임을 최대 5명씩, 원하는 만큼만 넣어요", tone: "from-primary" },
  { no: "02", title: "최근 전적 요약", desc: "티어·RP, 최근 승률과 KDA, 최근 10판 흐름을 한 장에", tone: "from-lose" },
  { no: "03", title: "주력 캐릭터", desc: "요즘 많이 쓰는 캐릭터 3개와 캐릭터별 승률", tone: "from-gray-400" },
];

/** 입력 전 안내 카드 3개 */
function MultiGuide() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {GUIDE.map((g) => (
        <div key={g.no} className="relative overflow-hidden rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <span className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${g.tone} to-transparent`} aria-hidden />
          <span className="text-xs font-black tracking-widest text-gray-500">{g.no}</span>
          <div className="mt-2 text-base font-black text-gray-100">{g.title}</div>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">{g.desc}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * 결과 로딩 스켈레톤 — 입력한 인원만큼 카드 자리.
 * @param a — 내 팀 인원
 * @param b — 상대 팀 인원
 */
function MultiSkeleton({ a, b }: { a: number; b: number }) {
  const col = (n: number) => (
    <div className="space-y-2">
      <div className="h-6 w-32 animate-pulse rounded-lg bg-surface-2" />
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="h-[148px] animate-pulse rounded-2xl border border-line bg-surface-2" />
      ))}
    </div>
  );
  return (
    <div className={`grid gap-5 ${a > 0 && b > 0 ? "lg:grid-cols-2" : ""}`} aria-busy>
      {a > 0 && col(a)}
      {b > 0 && col(b)}
    </div>
  );
}
