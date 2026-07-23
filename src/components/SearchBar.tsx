"use client";

import { useRouter } from "next/navigation";
import { useState, FormEvent } from "react";

interface Props {
  defaultValue?: string;
  size?: "lg" | "md";
  autoFocus?: boolean;
}

export default function SearchBar({ defaultValue = "", size = "md", autoFocus }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    router.push(`/search?nickname=${encodeURIComponent(q)}`);
  }

  const big = size === "lg";

  return (
    <form onSubmit={onSubmit} className="w-full">
      <div
        className={`flex items-center gap-2 rounded-lg border border-bg-border bg-bg-soft focus-within:border-brand ${
          big ? "px-4 py-3" : "px-3 py-2"
        }`}
      >
        <svg
          className={big ? "h-5 w-5 text-gray-500" : "h-4 w-4 text-gray-500"}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => setValue(e.target.value)}
          placeholder="플레이어 닉네임 검색"
          className={`w-full bg-transparent text-gray-100 placeholder:text-gray-500 focus:outline-none ${
            big ? "text-base" : "text-sm"
          }`}
        />
        <button
          type="submit"
          className={`btn-primary shrink-0 ${big ? "px-4 py-2" : "px-3 py-1.5 text-xs"}`}
        >
          검색
        </button>
      </div>
    </form>
  );
}
