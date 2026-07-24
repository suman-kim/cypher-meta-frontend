"use client";

import { useEffect, useState } from "react";

/** 갱신 경과 시간을 한국어 상대표현으로. */
function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return "방금 갱신";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}분 전 갱신`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전 갱신`;
  return `${Math.floor(h / 24)}일 전 갱신`;
}

/**
 * "N분 전 갱신" 표시 — 데이터가 마지막으로 원본에서 받아진 시각 기준.
 * 클라이언트에서 30초마다 상대시간을 갱신한다(SSR 불일치 방지 위해 마운트 후 렌더).
 */
export function LastUpdated({ iso }: { iso: string }) {
  const [text, setText] = useState("");

  useEffect(() => {
    const update = () => setText(relTime(iso));
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [iso]);

  if (!text) return null;
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] text-gray-500"
      title={new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-win" />
      {text}
    </span>
  );
}

export default LastUpdated;
