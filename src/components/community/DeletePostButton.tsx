"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { postJSON } from "@/lib/api-client";

export default function DeletePostButton({
  postId,
  board,
}: {
  postId: string;
  board: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await postJSON(`/api/community/posts/${postId}/delete`, { password });
      router.push(`/community/${board}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-gray-500 hover:text-lose"
      >
        삭제
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="비밀번호"
        className="input h-9 w-36 py-1"
        autoFocus
      />
      <button type="submit" disabled={busy} className="btn-primary py-1.5 disabled:opacity-50">
        {busy ? "삭제 중…" : "확인"}
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setError(null);
        }}
        className="btn-ghost py-1.5"
      >
        취소
      </button>
      {error && <span className="w-full text-xs text-red-300">{error}</span>}
    </form>
  );
}
