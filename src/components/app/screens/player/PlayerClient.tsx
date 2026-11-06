"use client";

/**
 * 앱 플레이어 화면의 상호작용 조각들.
 *
 * - PlayerTopBar: 큰 그림 위에서는 투명, 내려가면 유리 배경 + 닉네임이 보이는 상단바 (뒤로·즐겨찾기·공유)
 * - PlayerSavedSync: 화면이 열리면 기기에 저장된 요약(내 계정·즐겨찾기)을 최신 RP·순위로 고친다
 * - PlayerLinkBand: 내 계정 화면에서 검색해 들어왔을 때(?link=1) "내 계정으로 연동" 띠
 * - PlayerRefresh: 전적 갱신 버튼(5분 쿨다운) + 마지막 갱신 시각 — 웹 RefreshStatsButton 과 같은 방식
 */
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { haptic, nativeShare } from "@/lib/native";
import { refreshSaved, setMe, toggleFav, useHydrated, useIsFav, useMe, type SavedPlayer } from "@/lib/app-storage";
import { AppTopBar, TopIconButton, toast } from "../../AppChrome";
import { Icon } from "../../icons";

/* ── 상단바 ─────────────────────────────────────── */

/** 이 높이(px)보다 내려가면 상단바에 배경과 제목을 보인다 */
const SOLID_AFTER = 150;

/**
 * 플레이어 화면 상단바.
 * @param player 즐겨찾기에 저장할 플레이어 요약
 */
export function PlayerTopBar({ player }: { player: SavedPlayer }) {
  const [solid, setSolid] = useState(false);
  const fav = useIsFav(player.playerId);

  useEffect(() => {
    const on = () => setSolid(window.scrollY > SOLID_AFTER);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  /** 즐겨찾기 넣기·빼기 */
  const onFav = () => {
    haptic("light");
    const on = toggleFav(player);
    toast(on ? "즐겨찾기에 추가했어요" : "즐겨찾기에서 뺐어요");
  };

  /** 공유 — 앱 공유 시트 → 브라우저 공유 → 주소 복사 순서로 시도 */
  const onShare = async () => {
    const url = `${window.location.origin}/players/${player.playerId}`;
    const title = `${player.nickname} 전적 · Cyphers Meta`;
    if (await nativeShare({ title, text: title, url })) return;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return; // 사용자가 공유를 취소함
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("플레이어 주소를 복사했어요");
    } catch {
      toast("공유하지 못했어요. 잠시 뒤 다시 시도해 주세요");
    }
  };

  return (
    <AppTopBar
      variant="back"
      transparent={!solid}
      title={solid ? player.nickname : undefined}
      backHref="/search"
      right={
        <>
          <TopIconButton icon="star" label={fav ? "즐겨찾기에서 빼기" : "즐겨찾기에 추가"} onClick={onFav} active={fav} />
          <TopIconButton icon="share" label="공유" onClick={() => void onShare()} />
        </>
      }
    />
  );
}

/* ── 저장된 요약 갱신 ─────────────────────────── */

/**
 * 화면이 열리면 내 계정·즐겨찾기에 저장된 이 플레이어의 요약을 최신 값으로 고친다. (그리는 것 없음)
 * @param player 화면에서 읽은 최신 요약
 */
export function PlayerSavedSync({ player }: { player: SavedPlayer }) {
  useEffect(() => {
    refreshSaved(player);
    // 같은 플레이어·같은 값이면 다시 쓸 필요가 없다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.playerId, player.rp, player.rank, player.tierName, player.characterId, player.nickname]);
  return null;
}

/* ── 내 계정 연동 띠 ─────────────────────────── */

/**
 * "이 플레이어를 내 계정으로 연동할까요?" 띠. 이미 이 플레이어가 연동돼 있으면 아무것도 그리지 않는다.
 * @param player 연동할 플레이어 요약
 */
export function PlayerLinkBand({ player }: { player: SavedPlayer }) {
  const hydrated = useHydrated();
  const me = useMe();
  const [linked, setLinked] = useState(false);

  if (!hydrated) return null;

  // 방금 연동했으면 결과와 다음 할 일을 보여 준다
  if (linked) {
    return (
      <div className="flex items-center gap-3 rounded-[14px] bg-app-win-bg px-3.5 py-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-app-ac-soft text-app-ac-tx">
          <Icon name="check" size={17} stroke={2.4} />
        </span>
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="text-[13px] font-bold text-gray-100">내 계정으로 연동했어요</span>
          <span className="text-[11px] text-gray-500">홈에서 내 전적을 바로 볼 수 있어요</span>
        </span>
        <Link href="/" className="a-press shrink-0 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-gray-200">
          홈으로
        </Link>
      </div>
    );
  }

  if (me?.playerId === player.playerId) return null;

  const replacing = !!me;
  return (
    <div className="flex items-center gap-3 rounded-[14px] bg-app-ac-soft px-3.5 py-3">
      <span className="text-app-ac-tx">
        <Icon name="link" size={18} />
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="text-[13px] font-bold text-gray-100">
          {replacing ? "내 계정을 이 플레이어로 바꿀까요?" : "이 플레이어를 내 계정으로 연동할까요?"}
        </span>
        <span className="truncate text-[11px] text-gray-500">
          {replacing ? `지금 연동: ${me?.nickname}` : "연동 정보는 이 기기에만 저장돼요"}
        </span>
      </span>
      <button
        type="button"
        onClick={() => {
          haptic("medium");
          setMe(player);
          setLinked(true);
          toast(replacing ? "내 계정을 바꿨어요" : "내 계정으로 연동했어요");
        }}
        className="a-grad a-press shrink-0 rounded-full px-3.5 py-2 text-xs font-bold"
      >
        {replacing ? "바꾸기" : "연동하기"}
      </button>
    </div>
  );
}

/* ── 전적 갱신 ─────────────────────────────────── */

/** 다시 갱신할 수 있을 때까지 기다리는 시간 (웹과 같은 5분) */
const COOLDOWN_MS = 5 * 60 * 1000;

/**
 * 경과 시간을 짧은 말로.
 * @param ms 경과 시간(ms)
 */
function agoText(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return "방금 전";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

/** 주소에 남은 refresh 값을 조용히 지운다(기록만 바꿔서 다시 불러오지 않음) */
function cleanParam(): void {
  const u = new URL(window.location.href);
  if (!u.searchParams.has("refresh")) return;
  u.searchParams.delete("refresh");
  const qs = u.searchParams.toString();
  window.history.replaceState(window.history.state, "", u.pathname + (qs ? `?${qs}` : ""));
}

/**
 * 전적 갱신 버튼 + 비교하기 버튼 + 마지막 갱신 시각.
 * 갱신은 주소에 refresh=시각 을 붙여 서버가 모든 캐시를 건너뛰고 다시 불러오게 한다(웹과 같은 방식).
 * @param cachedAt 데이터를 원본에서 마지막으로 받은 시각(ISO, 모르면 null)
 * @param compareHref 비교하기 화면 주소
 */
export function PlayerRefresh({ cachedAt, compareHref }: { cachedAt: string | null; compareHref: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    cleanParam();
  }, []);
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending) {
      cleanParam();
      toast("전적을 새로 불러왔어요");
    }
    wasPending.current = pending;
  }, [pending]);

  const cachedMs = cachedAt ? new Date(cachedAt).getTime() : NaN;
  const known = now !== null && !Number.isNaN(cachedMs);
  const remaining = known ? Math.max(0, COOLDOWN_MS - (now - cachedMs)) : 0;
  const cooling = remaining > 0;
  const sec = Math.ceil(remaining / 1000);
  const countdown = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

  /** 갱신 — 쿨다운 중이거나 이미 갱신 중이면 무시 */
  const onRefresh = () => {
    if (pending || cooling) return;
    haptic("light");
    const params = new URLSearchParams(window.location.search);
    params.set("refresh", String(Date.now()));
    start(() => router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false }));
  };

  return (
    <div className="grid gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRefresh}
          disabled={pending || cooling}
          aria-label={cooling ? `${countdown} 뒤에 다시 갱신할 수 있어요` : "전적 갱신"}
          className={`a-press flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-bold transition-opacity ${
            cooling ? "bg-surface-2 text-gray-500" : "a-grad a-glow"
          } ${pending ? "opacity-70" : ""}`}
        >
          <span className={pending ? "animate-spin" : ""}>
            <Icon name={cooling ? "clock" : "refresh"} size={17} stroke={2.2} />
          </span>
          <span className="tabular-nums">{pending ? "갱신 중…" : cooling ? `${countdown} 뒤 갱신 가능` : "전적 갱신"}</span>
        </button>
        <Link
          href={compareHref}
          className="a-press flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-line bg-surface text-sm font-semibold text-gray-100 shadow-[var(--a-shadow)]"
        >
          <Icon name="swap" size={16} />
          비교하기
        </Link>
      </div>
      {cachedAt && (
        <span className="text-[11px] text-gray-500">{known ? `마지막 갱신 ${agoText(now - cachedMs)}` : "\u00a0"}</span>
      )}
    </div>
  );
}
