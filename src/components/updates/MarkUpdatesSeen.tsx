"use client";

import { useEffect } from "react";
import { markUpdatesSeen } from "@/lib/updates-client";

/** /updates 페이지 방문 시 최신 업데이트를 "확인함"으로 표시(헤더 NEW 뱃지 해제) */
export default function MarkUpdatesSeen({ latestId }: { latestId: string }) {
  useEffect(() => {
    markUpdatesSeen(latestId);
  }, [latestId]);
  return null;
}
