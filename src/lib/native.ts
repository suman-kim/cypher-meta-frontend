"use client";

/**
 * native.ts — Capacitor 네이티브 앱 환경 감지/보조 유틸.
 *
 * 웹 프론트엔드에 @capacitor/* 패키지를 추가하지 않고, 네이티브 앱(Capacitor 셸)이
 * WebView 에 주입하는 전역 브릿지 window.Capacitor 만 방어적으로 사용한다.
 * → 웹 브라우저에서는 window.Capacitor 가 없으므로 전부 no-op / false 로 동작한다.
 *   즉 이 파일과 관련 컴포넌트는 "웹 버전 동작에 아무 영향이 없다".
 */
import { useEffect, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: Record<string, any>;
};

function cap(): CapacitorGlobal | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

/** 지금 네이티브 앱(iOS/Android) 안에서 실행 중인가. 웹이면 false. */
export function isNativeApp(): boolean {
  try {
    return !!cap()?.isNativePlatform?.();
  } catch {
    return false;
  }
}

/** 플랫폼 문자열. 웹이면 "web". */
export function nativePlatform(): "ios" | "android" | "web" {
  const p = cap()?.getPlatform?.();
  return p === "ios" || p === "android" ? p : "web";
}

/**
 * 마운트 후 네이티브 여부를 알려주는 훅.
 * SSR·웹에서는 항상 false 를 유지하므로 하이드레이션 불일치가 없다.
 */
export function useIsNative(): boolean {
  const [native, setNative] = useState(false);
  useEffect(() => {
    setNative(isNativeApp());
  }, []);
  return native;
}

/** 가벼운 햅틱(네이티브 + 플러그인 있을 때만, 없으면 조용히 무시). */
export function haptic(style: "light" | "medium" = "light"): void {
  try {
    cap()?.Plugins?.Haptics?.impact?.({ style: style === "light" ? "LIGHT" : "MEDIUM" });
  } catch {
    /* 무시 */
  }
}

/**
 * 네이티브 공유 시트. 성공 시 true, 불가(웹/플러그인 없음/취소) 시 false.
 * 호출부에서 false 면 웹 공유(navigator.share/클립보드)로 폴백하면 된다.
 */
export async function nativeShare(opts: {
  title?: string;
  text?: string;
  url?: string;
}): Promise<boolean> {
  const share = cap()?.Plugins?.Share;
  if (!share?.share) return false;
  try {
    await share.share(opts);
    return true;
  } catch {
    return false;
  }
}
