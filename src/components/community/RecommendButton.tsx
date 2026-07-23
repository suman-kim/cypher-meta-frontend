"use client";

import { useState } from "react";
import { postJSON } from "@/lib/api-client";

export default function RecommendButton({
  postId,
  initialLikes,
}: {
  postId: string;
  initialLikes: number;
}) {
  const [likes, setLikes] = useState(initialLikes);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onClick() {
    if (busy || done) return;
    setBusy(true);
    try {
      const res = await postJSON<{ likes: number }>(`/api/community/posts/${postId}/like`);
      setLikes(res.likes);
      setDone(true);
    } catch {
      // 조용히 무시 (네트워크 오류 시 카운트 유지)
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || done}
      className="btn-navy min-w-[110px] disabled:opacity-70"
    >
      👍 추천 {likes}
    </button>
  );
}
