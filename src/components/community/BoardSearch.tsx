"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function BoardSearch({
  board,
  defaultValue = "",
}: {
  board: string;
  defaultValue?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = value.trim();
    router.push(q ? `/community/${board}?q=${encodeURIComponent(q)}` : `/community/${board}`);
  }

  return (
    <form onSubmit={onSubmit} className="relative">
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="게시글 제목, 내용 검색"
        className="input pl-9"
        aria-label="게시글 검색"
      />
    </form>
  );
}
