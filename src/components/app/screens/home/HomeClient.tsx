"use client";

/**
 * 앱 홈의 상호작용 조각들 — 검색 진입줄, 내 전적 카드, 즐겨찾기, 역할군 TOP3, 소식·커뮤니티.
 * 기기 저장값(내 계정·즐겨찾기·최근 검색)을 읽거나 탭 전환 상태가 있는 부분만 여기 둔다.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { useFavs, useHydrated, useMe, useRecent, refreshSaved } from "@/lib/app-storage";
import { characterHref } from "@/lib/official";
import type { PlayerCardData } from "@/app/api/app/player-card/route";
import { Icon } from "../../icons";
import { Badge, CharImg, Chip, ChipRow, SectionHead, Segmented, Skel, UltBadge, WinLossStrip, wrClass } from "../../ui";
import { OfficialRoleIcon } from "@/components/characters/OfficialRoleIcon";

/* ── 검색 진입줄 ─────────────────────────────── */

/** 홈 맨 위 검색 진입(누르면 검색 탭) + 캐릭터 목록·최근 검색 칩 */
export function HomeSearchEntry() {
  const recent = useRecent();
  return (
    <div className="grid grid-cols-1 gap-2.5">
      <Link
        href="/search"
        className="a-press flex h-12 items-center gap-2.5 rounded-3xl bg-surface-2 px-[18px] text-sm text-gray-500"
      >
        <Icon name="search" size={18} />
        닉네임으로 전적 검색
      </Link>
      <ChipRow>
        <Link
          href="/characters"
          className="flex h-8 shrink-0 items-center rounded-full bg-app-ac-soft px-3 text-xs font-bold text-app-ac-tx"
        >
          캐릭터 목록
        </Link>
        {recent.map((r) => (
          <Link
            key={r}
            href={`/search?nickname=${encodeURIComponent(r)}`}
            className="flex h-8 shrink-0 items-center rounded-full border border-line px-3 text-xs text-gray-300"
          >
            {r}
          </Link>
        ))}
      </ChipRow>
    </div>
  );
}

/* ── 내 전적 카드 ────────────────────────────── */

/**
 * 몇 분 전인지 짧게 적는다.
 * @param iso 기준 시각(ISO)
 */
function agoShort(iso: string): string {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}시간 전` : `${Math.floor(h / 24)}일 전`;
}

/** 내 전적 카드 — 연동 전이면 연동 안내, 연동 후면 요약을 불러와 보여 준다. */
export function HomeMyCard() {
  const hydrated = useHydrated();
  const me = useMe();
  const [data, setData] = useState<PlayerCardData | null>(null);
  const [err, setErr] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!me) return;
    let alive = true;
    setErr(false);
    fetch(`/api/app/player-card?playerId=${encodeURIComponent(me.playerId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: PlayerCardData) => {
        if (!alive) return;
        setData(d);
        refreshSaved({
          playerId: d.playerId,
          nickname: d.nickname,
          characterId: d.characterId ?? undefined,
          rp: d.rp ?? undefined,
          rank: d.rank,
          tierName: d.tierName ?? undefined,
        });
      })
      .catch(() => alive && setErr(true));
    return () => {
      alive = false;
    };
    // 연동 대상이 바뀌거나 다시 시도할 때만 다시 부른다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.playerId, tick]);

  if (!hydrated) return <Skel className="h-[178px] rounded-[20px]" />;

  if (!me) {
    return (
      <div className="a-card relative overflow-hidden p-4">
        <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-app-ac-soft blur-2xl" />
        <p className="relative text-xs font-bold text-primary">내 전적</p>
        <p className="relative mt-1.5 text-[17px] font-bold leading-snug text-gray-100">
          내 닉네임을 연동하면
          <br />
          홈에서 바로 내 전적을 볼 수 있어요
        </p>
        <p className="relative mt-1 text-xs text-gray-500">연동 정보는 이 기기에만 저장돼요.</p>
        <Link
          href="/account"
          className="a-grad a-glow a-press relative mt-3.5 inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-bold"
        >
          <Icon name="link" size={16} />
          닉네임 연동하기
        </Link>
      </div>
    );
  }

  // 불러오기 전에는 기기에 저장된 마지막 값으로 먼저 그린다
  const nickname = data?.nickname ?? me.nickname;
  const rp = data?.rp ?? me.rp ?? null;
  const rank = data ? data.rank : (me.rank ?? null);
  const charId = data?.characterId ?? me.characterId ?? null;

  return (
    <Link
      href={`/players/${me.playerId}?gameTypeId=rating`}
      className="a-press relative grid grid-cols-1 gap-3 overflow-hidden rounded-[20px] border border-app-hair p-4"
      style={{
        clipPath: "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)",
        background:
          "radial-gradient(110% 90% at 100% 0%, color-mix(in srgb, rgb(var(--primary)) 30%, transparent), transparent 62%), linear-gradient(160deg, var(--a-hero), rgb(var(--surface)) 72%)",
      }}
    >
      {charId && (
        <span
          className="pointer-events-none absolute -right-3 -top-2 h-[150px] w-[150px]"
          style={{
            opacity: "var(--a-art-op)",
            maskImage: "linear-gradient(to left, #000 35%, transparent)",
            WebkitMaskImage: "linear-gradient(to left, #000 35%, transparent)",
          }}
        >
          <CharImg id={charId} name={nickname} size={150} radius={0} zoom={2} className="!bg-transparent" />
        </span>
      )}
      <div className="relative flex items-center justify-between">
        <span className="text-xs font-bold text-primary">내 전적 · 공식전</span>
        <span className="flex items-center gap-1 text-[11px] text-gray-500">
          <Icon name="refresh" size={12} />
          {data ? agoShort(data.fetchedAt) : err ? "불러오지 못했어요" : "불러오는 중"}
        </span>
      </div>
      <div className="relative grid gap-0.5">
        <span className="text-lg font-bold text-gray-100">{nickname}</span>
        <span className="flex items-baseline gap-1.5">
          <span className="text-4xl font-extrabold tracking-[-0.03em] text-primary">
            {rp !== null ? rp.toLocaleString() : "-"}
          </span>
          <span className="text-[13px] font-bold text-gray-200">
            RP{rank ? ` · 공식전 ${rank.toLocaleString()}위` : ""}
          </span>
        </span>
      </div>
      {data ? (
        <>
          <div className="relative flex gap-4 text-xs text-gray-400">
            <span>
              승률 <b className="text-gray-100">{data.winRate !== null ? `${data.winRate}%` : "-"}</b>
            </span>
            <span>
              KDA <b className="text-gray-100">{data.kda !== null ? data.kda.toFixed(2) : "-"}</b>
            </span>
            <span>
              {data.wins.toLocaleString()}승 {data.losses.toLocaleString()}패
            </span>
          </div>
          <div className="relative">
            <WinLossStrip results={data.recent} />
          </div>
        </>
      ) : err ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setTick((t) => t + 1);
          }}
          className="relative inline-flex h-9 w-fit items-center gap-1.5 rounded-full border border-line px-4 text-[13px] font-semibold text-gray-200"
        >
          <Icon name="refresh" size={15} />
          다시 시도
        </button>
      ) : (
        <div className="relative grid gap-2">
          <Skel className="h-4 w-48 rounded" />
          <Skel className="h-[22px] rounded-md" />
        </div>
      )}
    </Link>
  );
}

/* ── 즐겨찾기 ────────────────────────────────── */

/** 즐겨찾기 가로 목록 (기기 저장) */
export function HomeFavs() {
  const hydrated = useHydrated();
  const favs = useFavs();
  return (
    <section className="grid grid-cols-1 gap-2.5">
      <SectionHead title="즐겨찾기" href="/account" cta="편집" />
      {!hydrated ? (
        <div className="flex gap-2.5 overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <Skel key={i} className="h-[86px] w-[74px] shrink-0 rounded-[14px]" />
          ))}
        </div>
      ) : favs.length === 0 ? (
        <div className="a-tile grid justify-items-center gap-1.5 px-4 py-4 text-center">
          <p className="text-[13px] font-semibold text-gray-200">아직 즐겨찾기한 플레이어가 없어요</p>
          <p className="text-xs text-gray-500">플레이어 화면 위쪽의 별을 누르면 여기에 모여요.</p>
          <Link href="/search" className="mt-1 text-xs font-bold text-primary">
            플레이어 검색하기
          </Link>
        </div>
      ) : (
        <div className="a-hscroll a-bleed gap-2.5">
          {favs.map((f) => (
            <Link
              key={f.playerId}
              href={`/players/${f.playerId}`}
              className="a-tile a-press grid w-[74px] shrink-0 justify-items-center gap-1 px-1 py-2.5"
            >
              <CharImg id={f.characterId} name={f.nickname} size={40} radius={20} />
              <span className="w-full truncate text-center text-[11px] font-bold text-gray-100">{f.nickname}</span>
              <span className="text-[10px] tabular-nums text-gray-500">{f.rp ? f.rp.toLocaleString() : "-"}</span>
            </Link>
          ))}
          <Link
            href="/search"
            className="grid w-[74px] shrink-0 place-items-center rounded-[14px] border border-dashed border-line text-gray-500"
            aria-label="즐겨찾기 추가"
          >
            <span className="grid justify-items-center gap-1 text-[11px]">
              <Icon name="plus" size={18} />
              추가
            </span>
          </Link>
        </div>
      )}
    </section>
  );
}

/* ── 역할군별 캐릭터 TOP3 ────────────────────── */

/** 역할군 TOP3 카드 한 묶음 */
export interface RoleTopGroup {
  /** 역할군 키 (vanguard …) — 공식 체계가 아니면 기존 포지션 키 */
  key: string;
  /** 역할군 이름 */
  label: string;
  /** 공식 역할군 아이콘을 쓸 수 있는지 */
  official: boolean;
  /** 상위 3개 (픽률 순) */
  list: {
    characterId: string;
    characterName: string | null;
    pickRate: number;
    winRate: number;
    /** 궁극기 구분 (1st|2nd) — 2차 보유 캐릭터만 배지 */
    ultimateType?: string;
    /** 2차 궁극기 보유 여부 */
    dual?: boolean;
  }[];
}

/**
 * 역할군별 캐릭터 TOP3 — 칩으로 역할군을 바꾼다.
 * @param groups 역할군 묶음 목록
 */
export function HomeRoleTop3({ groups }: { groups: RoleTopGroup[] }) {
  const [key, setKey] = useState(groups[0]?.key ?? "");
  const cur = groups.find((g) => g.key === key) ?? groups[0];
  return (
    <section className="a-card grid grid-cols-1 gap-3 p-4">
      <SectionHead title={cur?.official === false ? "포지션별 캐릭터 TOP3" : "역할군별 캐릭터 TOP3"} href="/meta" cta="캐릭터 티어" />
      <ChipRow className="!mx-[-16px] !px-4">
        {groups.map((g) => (
          <Chip key={g.key} active={g.key === cur?.key} onClick={() => setKey(g.key)}>
            {g.official && <OfficialRoleIcon role={g.key} size={14} />}
            {g.label}
          </Chip>
        ))}
      </ChipRow>
      {!cur || cur.list.length === 0 ? (
        <p className="py-5 text-center text-xs text-gray-500">이 역할군은 아직 표본이 없어요.</p>
      ) : (
        <div className="grid">
          {cur.list.map((c, i) => (
            <Link
              key={`${c.characterId}:${c.ultimateType ?? ""}`}
              href={characterHref(c.characterId, c.ultimateType)}
              className="flex items-center gap-3 py-2"
            >
              <span className="w-4 text-center text-sm font-extrabold text-primary">{i + 1}</span>
              <CharImg id={c.characterId} name={c.characterName} size={38} radius={10} />
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                <span className="truncate text-sm font-bold text-gray-100">{c.characterName ?? c.characterId}</span>
                {c.dual && c.ultimateType && <UltBadge label={c.ultimateType === "2nd" ? "2차" : "1차"} />}
              </span>
              <span className="w-16 text-right text-xs tabular-nums text-gray-400">픽 {c.pickRate}%</span>
              <span className={`w-[68px] text-right text-xs font-bold tabular-nums ${wrClass(c.winRate)}`}>
                승 {c.winRate}%
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

/* ── 소식·커뮤니티 ───────────────────────────── */

/** 소식 목록 한 줄 */
export interface NewsItem {
  /** 글 ID */
  id: string;
  /** 글 주소 */
  href: string;
  /** 분류 배지 글자 (공지/자유/질문 …) */
  badge: string;
  /** 제목 */
  title: string;
  /** 보조 줄 (작성자 · 날짜 · 댓글) */
  meta: string;
}

/**
 * 소식·커뮤니티 — 공지 / 최근 글 전환.
 * @param notices 공지 목록
 * @param recent 최근 글 목록
 */
export function HomeNews({ notices, recent }: { notices: NewsItem[]; recent: NewsItem[] }) {
  const [tab, setTab] = useState<"notice" | "recent">(notices.length > 0 ? "notice" : "recent");
  const list = tab === "notice" ? notices : recent;
  return (
    <section className="a-card grid grid-cols-1 gap-3 p-4">
      <SectionHead title="소식 · 커뮤니티" href="/community" cta="커뮤니티" />
      <Segmented
        size="sm"
        value={tab}
        onChange={(k) => setTab(k as "notice" | "recent")}
        items={[
          { key: "notice", label: "공지" },
          { key: "recent", label: "최근 글" },
        ]}
      />
      {list.length === 0 ? (
        <div className="grid justify-items-center gap-1.5 py-4 text-center">
          <p className="text-xs text-gray-500">{tab === "notice" ? "등록된 공지가 없어요." : "아직 게시글이 없어요."}</p>
          {tab === "recent" && (
            <Link href="/community/rating/write" className="text-xs font-bold text-primary">
              첫 글 남기기
            </Link>
          )}
        </div>
      ) : (
        <div className="grid divide-y divide-line">
          {list.map((n) => (
            <Link key={n.id} href={n.href} className="grid gap-1 py-2.5">
              <span className="flex min-w-0 items-center gap-1.5">
                <Badge tone={n.badge === "공지" ? "grad" : "mute"}>{n.badge}</Badge>
                <span className="truncate text-[13px] font-semibold text-gray-100">{n.title}</span>
              </span>
              <span className="text-[11px] text-gray-500">{n.meta}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
