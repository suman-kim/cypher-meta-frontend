"use client";

import { useEffect, useRef } from "react";

/**
 * 프로필 조회 시 "개인 히스토리 적립"을 비차단으로 트리거하는 훅 컴포넌트.
 * 렌더 결과는 없고(null), 마운트 시 1회만 POST(fire-and-forget)한다.
 * 실패해도 페이지에는 영향이 없다. 서버는 이 호출로 watchlist 등록 + 최근분 적립을 수행.
 */
export default function TrackOnView({
  playerId,
  nickname,
}: {
  playerId: string;
  nickname?: string | null;
}) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !playerId) return;
    done.current = true;
    fetch("/api/meta/history/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, nickname: nickname ?? undefined }),
      keepalive: true,
    }).catch(() => {
      /* 무시 */
    });
  }, [playerId, nickname]);
  return null;
}
