"use client";

/**
 * app-push.ts — 앱(Capacitor) 푸시 알림 연동 (클라이언트 전용).
 *
 * 앱 셸에 설치된 @capacitor/push-notifications 플러그인을 원격 페이지에서 window.Capacitor.Plugins 로 부른다.
 * (프론트 번들에 @capacitor/core 를 넣지 않는다 — 다른 네이티브 연동과 같은 방식)
 *
 * 흐름: 권한 요청 → register() → 'registration' 이벤트로 FCM 토큰 → 서버에 기기 등록(POST /api/app/push/devices)
 *       → 구독 대상(내 계정·즐겨찾기·알림 켠 채널)을 서버에 동기화(PUT /api/app/push/subscriptions).
 * 알림 상태는 작은 외부 저장소(usePushState)로 화면과 공유한다.
 */
import { useSyncExternalStore } from "react";
import { getInstallId } from "@/lib/app-storage";

/** 푸시 지원 상태 — web: 앱이 아님 / outdated: 예전 앱 셸(플러그인 없음) / native: 사용 가능 */
export type PushSupport = "web" | "outdated" | "native";

/** 알림 권한 상태 (플러그인 값을 단순화) */
export type PushPermission = "unknown" | "prompt" | "granted" | "denied";

/** 화면이 구독하는 푸시 상태 */
export interface PushState {
  /** 지원 상태 (하이드레이션 전에는 web 으로 둔다) */
  support: PushSupport;
  /** 알림 권한 */
  permission: PushPermission;
  /** 서버에 기기 등록까지 끝났는지 */
  registered: boolean;
  /** 마지막 오류를 쉬운 말로 (없으면 null) */
  error: string | null;
  /** 지난 등록 중 앱이 종료돼 자동 등록을 멈춘 상태 — 사용자가 [다시 시도]를 눌러야 다시 등록한다 */
  blocked: boolean;
  /**
   * 사용자가 앱 안에서 [알림 켜기]를 눌렀는지.
   * Android 12 이하는 기기 알림이 기본 허용이라, 이 값이 참일 때만 서버에 등록한다(직접 켠 사람만 수집).
   */
  optedIn: boolean;
}

/** 서버에 보내는 구독 대상 */
export interface PushSubscriptionPayload {
  /** 전적 갱신 알림을 받을 플레이어 */
  players: { playerId: string; nickname: string }[];
  /** 방송 시작 알림을 받을 채널 */
  lives: { platform: "chzzk" | "youtube" | "soop"; channelId: string; channelName: string }[];
}

/** 알림을 눌렀을 때·앱이 켜져 있을 때 받은 알림 내용 (서버 발송 형식과 같음) */
export interface PushData {
  /** 알림 종류 */
  kind?: "match" | "live" | "test";
  /** 열 주소 — 앱 안 경로(/players/…) 또는 외부 방송 주소(https://…) */
  url?: string;
}

/** 안드로이드 알림 채널 — 서버가 android.notification.channelId 로 지정한다 */
const CHANNELS = [
  { id: "match", name: "전적 갱신", description: "내 계정·즐겨찾기 플레이어의 새 경기", importance: 3 },
  { id: "live", name: "방송 시작", description: "알림을 켠 스트리머의 사이퍼즈 방송 시작", importance: 4 },
] as const;

/* ── 작은 외부 저장소 ─────────────────────────── */

let state: PushState = {
  support: "web",
  permission: "unknown",
  registered: false,
  error: null,
  blocked: false,
  optedIn: false,
};

/** 앱 안에서 알림을 켰는지 저장하는 키 */
const OPTIN = "cm_app_push_optin";

/** 저장된 켜짐 여부 */
function readOptIn(): boolean {
  try {
    return window.localStorage.getItem(OPTIN) === "1";
  } catch {
    return false;
  }
}

/**
 * 켜짐 여부를 저장하고 상태에 반영한다.
 * @param on 켜짐 여부
 */
function writeOptIn(on: boolean): void {
  try {
    if (on) window.localStorage.setItem(OPTIN, "1");
    else window.localStorage.removeItem(OPTIN);
  } catch {
    /* 무시 */
  }
  setState({ optedIn: on });
}

/**
 * 등록 중 표시 — register() 직전에 남기고 토큰/오류 이벤트에서 지운다.
 * 앱이 등록 도중 종료되면(예: Firebase 설정이 빠진 빌드) 표시가 남으므로, 다음 실행에서 자동 등록을 멈춰 종료가 되풀이되지 않게 한다.
 */
const REG_MARK = "cm_app_push_registering";

/** 등록 중 표시를 지운다 */
function clearMark(): void {
  try {
    window.localStorage.removeItem(REG_MARK);
  } catch {
    /* 무시 */
  }
}

/** 지난 등록이 끝나지 못하고 앱이 종료됐는지 */
function hasStaleMark(): boolean {
  try {
    return window.localStorage.getItem(REG_MARK) !== null;
  } catch {
    return false;
  }
}

/**
 * 등록 중 표시를 남기고 플러그인 register() 를 부른다.
 * @param p 푸시 플러그인
 */
async function safeRegister(p: any): Promise<void> {
  try {
    window.localStorage.setItem(REG_MARK, String(Date.now()));
  } catch {
    /* 무시 */
  }
  try {
    await p.register();
  } catch {
    clearMark();
    setState({ registered: false, error: "알림 등록에 실패했어요. 잠시 뒤 다시 시도해 주세요." });
  }
}
const SERVER_STATE: PushState = state;
const listeners = new Set<() => void>();

/**
 * 상태 일부를 바꾸고 구독자에게 알린다.
 * @param patch 바꿀 값
 */
function setState(patch: Partial<PushState>): void {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

/** 푸시 상태 구독 훅 */
export function usePushState(): PushState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => SERVER_STATE,
  );
}

/* ── 플러그인 접근 ─────────────────────────── */

/** 원격 페이지에 주입된 Capacitor 객체 (앱이 아니면 undefined) */
function capacitor(): any {
  return typeof window === "undefined" ? undefined : (window as any).Capacitor;
}

/** 푸시 플러그인 (없으면 undefined) */
function plugin(): any {
  const cap = capacitor();
  if (!cap?.isNativePlatform?.()) return undefined;
  return cap.Plugins?.PushNotifications;
}

/** 지금 환경의 지원 상태 */
export function detectSupport(): PushSupport {
  const cap = capacitor();
  if (!cap?.isNativePlatform?.()) return "web";
  return cap.Plugins?.PushNotifications ? "native" : "outdated";
}

/** 기기 플랫폼 (android | ios) */
function platform(): "android" | "ios" {
  return capacitor()?.getPlatform?.() === "ios" ? "ios" : "android";
}

/**
 * 플러그인 권한 값을 단순화한다.
 * @param receive checkPermissions/requestPermissions 의 receive 값
 */
function toPermission(receive: string | undefined): PushPermission {
  if (receive === "granted") return "granted";
  if (receive === "denied") return "denied";
  if (receive === "prompt" || receive === "prompt-with-rationale") return "prompt";
  return "unknown";
}

/* ── 서버 호출 (같은 출처 /api/app/push/* → 백엔드 /push/*) ─────────────────────────── */

/**
 * JSON 요청을 보내고 상태 코드와 본문을 돌려준다.
 * @param path 경로
 * @param method HTTP 메서드
 * @param body 보낼 값
 */
async function call(path: string, method: string, body?: unknown): Promise<{ status: number; data: any }> {
  try {
    const res = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { status: res.status, data };
  } catch {
    return { status: 0, data: null };
  }
}

/**
 * 서버에 이 기기를 등록한다.
 * @param token FCM 등록 토큰
 * @returns 성공 여부
 */
async function registerDevice(token: string): Promise<boolean> {
  const { status } = await call("/api/app/push/devices", "POST", {
    installId: getInstallId(),
    token,
    platform: platform(),
  });
  return status >= 200 && status < 300;
}

/**
 * 구독 대상을 서버에 동기화한다(전체 교체).
 * @param payload 구독 대상
 * @returns ok: 성공 / missing: 서버에 기기가 없음(다시 등록 필요) / fail: 그 밖의 실패
 */
export async function syncSubscriptions(payload: PushSubscriptionPayload): Promise<"ok" | "missing" | "fail"> {
  const { status } = await call("/api/app/push/subscriptions", "PUT", { installId: getInstallId(), ...payload });
  if (status >= 200 && status < 300) return "ok";
  if (status === 404) return "missing";
  return "fail";
}

/**
 * 이 기기에 테스트 알림을 보내 달라고 요청한다.
 * @returns 사용자에게 보여 줄 결과 문구
 */
export async function sendTestPush(): Promise<string> {
  const { status, data } = await call("/api/app/push/test", "POST", { installId: getInstallId() });
  if (status >= 200 && status < 300) {
    return data?.ok ? "테스트 알림을 보냈어요. 잠시 뒤 도착해요." : "서버의 알림 발송 설정이 아직 끝나지 않았어요.";
  }
  if (status === 404) return "기기 등록이 아직 안 됐어요. 잠시 뒤 다시 눌러 주세요.";
  if (status === 400 && typeof data?.message === "string") return data.message;
  return "테스트 알림을 보내지 못했어요. 잠시 뒤 다시 시도해 주세요.";
}

/* ── 초기화·권한 ─────────────────────────── */

let started = false;

/**
 * 앱이 열릴 때 한 번 호출한다: 리스너·알림 채널을 준비하고, 이미 허용돼 있으면 토큰을 다시 받는다.
 * @param handlers 알림 수신·탭 처리 함수
 */
export async function startPush(handlers: {
  /** 앱이 켜져 있을 때 알림을 받음 */
  onReceive: (title: string, data: PushData) => void;
  /** 사용자가 알림을 눌러 앱을 엶 */
  onOpen: (data: PushData) => void;
}): Promise<void> {
  const support = detectSupport();
  setState({ support, optedIn: readOptIn() });
  const p = plugin();
  if (!p || started) return;
  started = true;

  await p.addListener("registration", async (t: { value: string }) => {
    clearMark();
    const ok = await registerDevice(t.value);
    setState({ registered: ok, error: ok ? null : "알림 서버에 기기를 등록하지 못했어요." });
  });
  await p.addListener("registrationError", () => {
    clearMark();
    setState({ registered: false, error: "알림 등록에 실패했어요. 앱을 다시 열어 주세요." });
  });
  await p.addListener("pushNotificationReceived", (n: any) => {
    handlers.onReceive(String(n?.title ?? "새 알림"), (n?.data ?? {}) as PushData);
  });
  await p.addListener("pushNotificationActionPerformed", (a: any) => {
    handlers.onOpen((a?.notification?.data ?? {}) as PushData);
  });

  if (platform() === "android") {
    for (const c of CHANNELS) {
      try {
        await p.createChannel({ ...c, visibility: 1 });
      } catch {
        /* 채널 생성 실패는 기본 채널로 대체된다 */
      }
    }
  }
  await refreshPermission(true);
}

/**
 * 현재 권한을 다시 읽는다. 허용 상태이고 register 가 참이면 토큰을 다시 받는다(토큰 갱신 대비).
 * @param register 허용 상태일 때 register() 를 부를지
 */
export async function refreshPermission(register = false): Promise<PushPermission> {
  const p = plugin();
  if (!p) return "unknown";
  try {
    const r = await p.checkPermissions();
    const perm = toPermission(r?.receive);
    setState({ permission: perm });
    if (perm === "granted" && register && state.optedIn) {
      if (hasStaleMark()) {
        // 지난번 등록 중 앱이 종료됨 → 자동으로 다시 부르지 않는다(종료 반복 방지)
        setState({
          blocked: true,
          error: "지난번 알림 등록 중 앱이 종료됐어요. 앱을 최신 버전으로 업데이트한 뒤 다시 시도해 주세요.",
        });
      } else {
        await safeRegister(p);
      }
    }
    return perm;
  } catch {
    return "unknown";
  }
}

/**
 * 사용자가 [알림 켜기]·[다시 시도]를 눌렀을 때: 권한을 요청하고 허용되면 등록한다.
 * @returns 처리 뒤 권한
 */
export async function enablePush(): Promise<PushPermission> {
  const p = plugin();
  if (!p) return "unknown";
  try {
    clearMark();
    const r = await p.requestPermissions();
    const perm = toPermission(r?.receive);
    setState({ permission: perm, error: null, blocked: false });
    if (perm === "granted") {
      writeOptIn(true);
      await safeRegister(p);
    }
    return perm;
  } catch {
    setState({ error: "알림 권한을 요청하지 못했어요." });
    return "unknown";
  }
}

/**
 * [알림 모두 끄기]: 서버에서 이 기기의 등록·구독을 지우고, 기기 토큰도 해제한다.
 * @returns 서버 삭제 성공 여부
 */
export async function disablePush(): Promise<boolean> {
  writeOptIn(false);
  setState({ registered: false, error: null, blocked: false });
  clearMark();
  const { status } = await call(`/api/app/push/devices/${encodeURIComponent(getInstallId())}`, "DELETE");
  try {
    await plugin()?.unregister?.();
  } catch {
    /* 토큰 해제 실패는 무시 — 서버 등록은 이미 지웠다 */
  }
  return status >= 200 && status < 300;
}

/** 서버에서 기기가 사라졌을 때(토큰 만료 등) 다시 등록한다 */
export async function reRegister(): Promise<void> {
  setState({ registered: false });
  await refreshPermission(true);
}
