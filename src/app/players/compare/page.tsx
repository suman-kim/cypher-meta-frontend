/**
 * 플레이어 2명 비교 페이지 — /players/compare?a=닉네임&b=닉네임&gt=all|rating|normal
 * 닉네임을 Neople 검색으로 playerId 로 바꾸고(정확히 같은 닉네임 우선) 대표 캐릭터를 함께 가져와,
 * 함께한 경기 / 상대 전적 결과(PlayerCompare, 클라이언트)에 넘긴다.
 */
import Link from "next/link";
import { Avatar } from "@/components/CharacterAvatar";
import CompareForm from "@/components/player/CompareForm";
import PlayerCompare from "@/components/player/PlayerCompare";
import { EmptyState, ErrorState, LinkTabs } from "@/components/ui";
import { DUO_GAME_TYPES, type DuoGameType, type DuoPlayer } from "@/lib/duo";
import { getPlayer, neopleErrorView, searchPlayers } from "@/lib/neople";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "플레이어 비교",
  description: "두 플레이어가 같은 팀으로 함께한 경기와 상대 팀으로 만난 상대 전적을 확인하세요.",
};

interface Props {
  searchParams: { a?: string; b?: string; gt?: string };
}

/**
 * 닉네임 → 비교용 플레이어 정보.
 * 검색 결과에서 닉네임이 정확히 같은 사람을 고르고(없으면 결과가 1명일 때만 그 사람), 대표 캐릭터를 붙인다.
 * @param nickname — 입력 닉네임
 * @returns { player } 또는 찾지 못하면 {}, 조회 오류면 { error }
 */
async function resolvePlayer(nickname: string): Promise<{ player?: DuoPlayer; error?: unknown }> {
  try {
    const rows = (await searchPlayers(nickname, { wordType: "match", limit: 10 })).rows ?? [];
    const hit = rows.find((r) => r.nickname === nickname) ?? (rows.length === 1 ? rows[0] : undefined);
    if (!hit) return {};
    const player: DuoPlayer = { playerId: hit.playerId, nickname: hit.nickname };
    try {
      const d = await getPlayer(hit.playerId);
      player.representId = d.represent?.characterId;
      player.representName = d.represent?.characterName;
    } catch {
      /* 대표 캐릭터는 없어도 비교는 가능 */
    }
    return { player };
  } catch (e) {
    return { error: e };
  }
}

export default async function ComparePage({ searchParams }: Props) {
  const na = (searchParams.a ?? "").trim();
  const nb = (searchParams.b ?? "").trim();
  const gt: DuoGameType = searchParams.gt === "rating" || searchParams.gt === "normal" ? searchParams.gt : "all";

  // 상단 히어로 — 제목 + 입력 폼(파랑·빨강 빛 번짐, 점 패턴 배경)
  const hero = (
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
          PLAYER <span className="text-lose">VS</span> PLAYER
        </span>
        <h1 className="mt-3 text-[26px] font-black leading-tight tracking-tight text-gray-50 sm:text-3xl">플레이어 비교</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-400">
          두 플레이어가 함께한 경기와 맞붙은 전적을 한눈에 확인하세요.
        </p>
        <div className="mt-5">
          <CompareForm defaultA={na} defaultB={nb} gameType={gt} />
        </div>
      </div>
    </section>
  );

  // 입력 전 — 히어로 + 무엇을 볼 수 있는지 안내
  if (!na || !nb) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        {hero}
        <CompareGuide />
      </div>
    );
  }

  const [ra, rb] = await Promise.all([resolvePlayer(na), resolvePlayer(nb)]);
  const failed = ra.error ?? rb.error;
  const pa = ra.player;
  const pb = rb.player;
  const missing = [!pa && !ra.error ? na : null, !pb && !rb.error ? nb : null].filter(Boolean);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {hero}

      {failed ? (
        <ErrorState {...neopleErrorView(failed, "플레이어 정보를 불러오지 못했습니다.")} />
      ) : !pa || !pb ? (
        <EmptyState
          icon={null}
          title="플레이어를 찾을 수 없어요"
          description={`${missing.map((n) => `"${n}"`).join(", ")} 닉네임을 정확히 입력했는지 확인해 주세요.`}
        />
      ) : pa.playerId === pb.playerId ? (
        <EmptyState icon={null} title="같은 플레이어예요" description="서로 다른 두 플레이어를 입력해 주세요." />
      ) : (
        <>
          <VersusHeader a={pa} b={pb} />
          <LinkTabs
            keepScroll
            tabs={DUO_GAME_TYPES.map((t) => {
              const q = new URLSearchParams({ a: na, b: nb });
              if (t.key !== "all") q.set("gt", t.key);
              return { href: `/players/compare?${q.toString()}`, label: t.label, active: t.key === gt };
            })}
          />
          <PlayerCompare a={pa} b={pb} gameType={gt} />
        </>
      )}
    </div>
  );
}

/** 입력 전 안내 — 비교로 볼 수 있는 것 3가지 */
const GUIDE = [
  { no: "01", title: "함께한 경기", desc: "같은 팀으로 뛴 경기 수와 함께할 때의 공식전 승률", tone: "from-primary" },
  { no: "02", title: "상대 전적", desc: "서로 맞붙었을 때 누가 더 많이 이겼는지 스코어로", tone: "from-lose" },
  { no: "03", title: "경기 기록", desc: "판마다 고른 캐릭터와 KDA, 누르면 매치 상세로", tone: "from-gray-400" },
];

/** 입력 전 안내 카드 3개 */
function CompareGuide() {
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
 * A vs B 머리 카드 — 대표 캐릭터(팀 색 테두리)·닉네임, 가운데 VS 배지. 누르면 각자 전적 페이지.
 * @param a — 플레이어 A
 * @param b — 플레이어 B
 */
function VersusHeader({ a, b }: { a: DuoPlayer; b: DuoPlayer }) {
  return (
    <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-2 overflow-hidden rounded-3xl border border-line bg-surface px-3 py-6 sm:gap-6 sm:px-8 sm:py-8">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-primary/15 to-transparent" aria-hidden />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-lose/15 to-transparent" aria-hidden />
      <PlayerHero p={a} tone="a" />
      <span className="relative grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-primary to-lose text-sm font-black italic text-white shadow-lg shadow-primary/30 ring-4 ring-surface sm:h-14 sm:w-14 sm:text-base">
        VS
      </span>
      <PlayerHero p={b} tone="b" />
    </div>
  );
}

/**
 * 머리 카드의 플레이어 1명 — 아바타(팀 색 링 + A/B 표시)와 닉네임을 세로로.
 * @param p — 플레이어
 * @param tone — "a"(파랑) | "b"(빨강)
 */
function PlayerHero({ p, tone }: { p: DuoPlayer; tone: "a" | "b" }) {
  const isA = tone === "a";
  return (
    <Link href={`/players/${p.playerId}`} className="group relative flex min-w-0 flex-col items-center text-center">
      <span
        className={`relative rounded-2xl p-[3px] shadow-lg ${
          isA ? "bg-gradient-to-br from-primary to-primary/30 shadow-primary/25" : "bg-gradient-to-br from-lose to-lose/30 shadow-lose/25"
        }`}
      >
        <span className="block overflow-hidden rounded-[13px] bg-surface">
          <Avatar characterId={p.representId} characterName={p.representName} size={64} zoom={2} />
        </span>
        <span
          className={`absolute -bottom-2 left-1/2 grid h-5 min-w-5 -translate-x-1/2 place-items-center rounded-md px-1 text-[10px] font-black text-white ring-2 ring-surface ${
            isA ? "bg-primary" : "bg-lose"
          }`}
        >
          {isA ? "A" : "B"}
        </span>
      </span>
      <div className="mt-4 w-full truncate text-base font-black text-gray-50 transition-colors group-hover:text-primary sm:text-xl">
        {p.nickname}
      </div>
      {p.representName && <div className="mt-0.5 w-full truncate text-[11px] text-gray-500">대표 · {p.representName}</div>}
    </Link>
  );
}
