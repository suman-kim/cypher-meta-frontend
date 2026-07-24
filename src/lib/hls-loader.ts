"use client";

/**
 * hls.js 를 CDN 에서 1회만 지연 로드하는 헬퍼(호버 미리보기 시점에만 로드).
 * npm 의존성/빌드 부담 없이, 필요할 때만 스크립트를 주입한다.
 * 반환값은 Hls 생성자(로드 실패 시 null).
 */
const HLS_CDN = "https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js";

let promise: Promise<unknown> | null = null;

export function loadHls(): Promise<unknown> {
  if (typeof window === "undefined") return Promise.resolve(null);
  const w = window as unknown as { Hls?: unknown };
  if (w.Hls) return Promise.resolve(w.Hls);
  if (promise) return promise;
  promise = new Promise((resolve) => {
    const el = document.createElement("script");
    el.src = HLS_CDN;
    el.async = true;
    el.onload = () => resolve((window as unknown as { Hls?: unknown }).Hls ?? null);
    el.onerror = () => resolve(null);
    document.head.appendChild(el);
  });
  return promise;
}
