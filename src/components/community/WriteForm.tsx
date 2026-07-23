"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { CATEGORIES } from "@/lib/community";
import { postJSON } from "@/lib/api-client";

export default function WriteForm({ board }: { board: string }) {
  const router = useRouter();
  const [category, setCategory] = useState("free");
  const [guestName, setGuestName] = useState("");
  const [password, setPassword] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!guestName.trim() || !password.trim() || !title.trim() || !content.trim()) {
      setError("닉네임, 비밀번호, 제목, 내용을 모두 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await postJSON<{ id: string }>("/api/community/posts", {
        board,
        category,
        title,
        content,
        guestName,
        password,
      });
      router.push(`/community/${board}/${res.id}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[140px_1fr_1fr]">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">분류</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input"
          >
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">닉네임</label>
          <input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            maxLength={20}
            placeholder="비회원 닉네임"
            className="input"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={30}
            placeholder="삭제 시 필요"
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-500">제목</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="제목을 입력하세요"
          className="input"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-500">내용</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={12}
          placeholder="내용을 입력하세요"
          className="input resize-y"
        />
      </div>

      {error && (
        <p className="rounded-md bg-lose/10 px-3 py-2 text-sm text-red-300">{error}</p>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => router.push(`/community/${board}`)}
          className="btn-ghost"
        >
          취소
        </button>
        <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
          {submitting ? "등록 중…" : "등록"}
        </button>
      </div>

      <p className="text-xs text-gray-500">
        * 로그인 기능은 준비 중입니다. 현재는 비회원으로 작성되며, 입력한 비밀번호로 삭제할 수 있습니다.
      </p>
    </form>
  );
}
