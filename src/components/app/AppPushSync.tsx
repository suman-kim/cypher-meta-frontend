"use client";

/**
 * AppPushSync — 앱 레이아웃에 한 번 두는 푸시 알림 연결자 (화면에는 아무것도 그리지 않는다).
 *  - 앱이 열리면 푸시를 준비하고(리스너·채널·토큰 갱신), 알림을 누르면 해당 화면으로 이동한다.
 *  - 기기 저장값(내 계정·즐겨찾기·알림 설정·알림 켠 채널)이 바뀌면 서버 구독을 맞춘다.
 *    앱을 열 때마다 한 번은 꼭 동기화하고(서버 상태 복구), 그 뒤로는 바뀔 때만 보낸다.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAlertPrefs, useFavs, useLiveAlerts, useMe, type AlertPrefs, type SavedPlayer } from "@/lib/app-storage";
import {
  reRegister,
  refreshPermission,
  startPush,
  syncSubscriptions,
  usePushState,
  type PushData,
  type PushSubscriptionPayload,
} from "@/lib/app-push";
import { toast } from "./AppChrome";

/** 서버가 받는 방송 플랫폼 */
const LIVE_PLATFORMS = new Set(["chzzk", "youtube", "soop"]);
/** 동기화 실패 뒤 다시 시도할 때까지(ms) */
const RETRY_MS = 30_000;
/** 서버에서 기기가 사라졌을 때 한 번 실행 중 다시 등록을 시도할 최대 횟수 */
const MAX_REREGISTER = 2;
/** 서버 제한과 같은 최대 개수 */
const MAX_PLAYERS = 31;
const MAX_LIVES = 100;

/**
 * 기기 저장값으로 서버 구독 대상을 만든다.
 * @param me 연동한 내 플레이어
 * @param favs 즐겨찾기
 * @param prefs 알림 설정
 * @param liveAlerts 알림 켠 채널 { 플랫폼:채널ID: 이름|true }
 */
export function buildPayload(
  me: SavedPlayer | null,
  favs: SavedPlayer[],
  prefs: AlertPrefs,
  liveAlerts: Record<string, string | boolean>,
): PushSubscriptionPayload {
  const players: PushSubscriptionPayload["players"] = [];
  if (prefs.match) {
    const seen = new Set<string>();
    for (const p of [...(me ? [me] : []), ...favs]) {
      if (!/^[0-9a-f]{32}$/.test(p.playerId) || seen.has(p.playerId)) continue;
      seen.add(p.playerId);
      players.push({ playerId: p.playerId, nickname: p.nickname.slice(0, 40) });
    }
  }
  const lives: PushSubscriptionPayload["lives"] = [];
  if (prefs.live) {
    for (const [key, v] of Object.entries(liveAlerts)) {
      if (!v) continue;
      const i = key.indexOf(":");
      const plat = key.slice(0, i);
      const channelId = key.slice(i + 1);
      if (i < 1 || !channelId || !LIVE_PLATFORMS.has(plat)) continue;
      lives.push({
        platform: plat as PushSubscriptionPayload["lives"][number]["platform"],
        channelId: channelId.slice(0, 128),
        channelName: (typeof v === "string" ? v : channelId).slice(0, 80),
      });
    }
  }
  return { players: players.slice(0, MAX_PLAYERS), lives: lives.slice(0, MAX_LIVES) };
}

/** 앱 푸시 연결자 */
export default function AppPushSync() {
  const router = useRouter();
  const push = usePushState();
  const me = useMe();
  const favs = useFavs();
  const prefs = useAlertPrefs();
  const liveAlerts = useLiveAlerts();
  /** 이번 실행에서 서버에 마지막으로 맞춘 구독 (문자열 비교용) */
  const synced = useRef<string | null>(null);
  /** 이번 실행에서 다시 등록한 횟수 (무한 반복 방지) */
  const reRegistered = useRef(0);
  /** 실패 뒤 다시 시도를 일으키는 값 */
  const [retry, setRetry] = useState(0);

  // 1) 푸시 준비 — 알림 탭 이동·앱 사용 중 수신 처리
  useEffect(() => {
    /**
     * 알림이 가리키는 주소를 연다. 외부 방송 주소는 앱 밖 브라우저로, 앱 경로는 화면 이동.
     * @param data 알림 데이터
     */
    const open = (data: PushData) => {
      const url = typeof data.url === "string" ? data.url : "";
      if (/^https?:\/\//.test(url)) {
        const browser = (window as any)?.Capacitor?.Plugins?.Browser;
        if (browser?.open) browser.open({ url }).catch?.(() => window.open(url, "_blank"));
        else window.open(url, "_blank");
      } else if (url.startsWith("/")) {
        router.push(url);
      }
    };
    void startPush({ onReceive: (title) => toast(title), onOpen: open });

    // 기기 설정에서 알림을 켜고 돌아왔을 때 권한을 다시 읽는다
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshPermission(false);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);

  // 2) 구독 동기화 — 등록된 뒤에만, 바뀐 값은 잠깐 모았다가 보낸다
  const payload = useMemo(() => buildPayload(me, favs, prefs, liveAlerts), [me, favs, prefs, liveAlerts]);
  const sig = useMemo(() => JSON.stringify(payload), [payload]);
  useEffect(() => {
    if (!push.registered || synced.current === sig) return;
    const t = window.setTimeout(async () => {
      const r = await syncSubscriptions(payload);
      if (r === "ok") {
        synced.current = sig;
      } else if (r === "missing" && reRegistered.current < MAX_REREGISTER) {
        reRegistered.current += 1;
        synced.current = null;
        await reRegister();
      } else {
        window.setTimeout(() => setRetry((n) => n + 1), RETRY_MS);
      }
    }, 1200);
    return () => window.clearTimeout(t);
  }, [push.registered, sig, payload, retry]);

  return null;
}
