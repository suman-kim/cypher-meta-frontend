/**
 * nav-menu.tsx — 헤더 메뉴 구성(데스크톱 드롭다운·모바일 메뉴 공용).
 * 상위 메뉴는 단일 링크 또는 2단 묶음(메타 / 검색 / 정보)이며, 표시 순서는 NAV_ENTRIES 순서를 따른다.
 */
import type { ReactNode } from "react";

/** 하위 메뉴 1개 */
export interface NavItem {
  href: string;
  label: string;
  /** 드롭다운에 함께 보이는 짧은 설명 */
  desc: string;
  icon: ReactNode;
}

/** 2단 메뉴 묶음 */
export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** 상위 메뉴 1개 — 단일 링크 또는 묶음 */
export type NavEntry = { kind: "link"; href: string; label: string } | ({ kind: "group" } & NavGroup);

/** 메뉴 아이콘 공통 속성 */
const svg = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** 헤더 메뉴(표시 순서) */
export const NAV_ENTRIES: NavEntry[] = [
  {
    kind: "group",
    label: "메타",
    items: [
      {
        href: "/meta",
        label: "캐릭터 티어",
        desc: "역할별 티어 · 커뮤니티 투표",
        icon: (
          <svg {...svg}>
            <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
          </svg>
        ),
      },
      {
        href: "/meta/comp",
        label: "조합 티어",
        desc: "조합 통계 · 추천 투표",
        icon: (
          <svg {...svg}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 010 7.75" />
          </svg>
        ),
      },
    ],
  },
  { kind: "link", href: "/ranking", label: "랭킹" },
  {
    kind: "group",
    label: "검색",
    items: [
      {
        href: "/players/compare",
        label: "플레이어 비교",
        desc: "두 플레이어의 함께한 경기 · 상대 전적",
        icon: (
          <svg {...svg}>
            <path d="M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4" />
          </svg>
        ),
      },
      {
        href: "/players/multi",
        label: "멀티서치",
        desc: "내 팀 · 상대 팀 최근 전적을 한 화면에",
        icon: (
          <svg {...svg}>
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
        ),
      },
    ],
  },
  {
    kind: "group",
    label: "정보",
    items: [
      {
        href: "/characters",
        label: "캐릭터",
        desc: "공식 역할군 · 스킬 · 추천 빌드",
        icon: (
          <svg {...svg}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8" />
          </svg>
        ),
      },
      {
        href: "/items",
        label: "아이템",
        desc: "캐릭터별 부위 아이템 채택률",
        icon: (
          <svg {...svg}>
            <path d="M21 8 12 3 3 8v8l9 5 9-5V8z" />
            <path d="m3 8 9 5 9-5M12 13v8" />
          </svg>
        ),
      },
      {
        href: "/costumes",
        label: "코스튬",
        desc: "캐릭터별 코스튬 · 출시년도별",
        icon: (
          <svg {...svg}>
            <path d="M20.4 6.6 16 3h-2a2 2 0 0 1-4 0H8L3.6 6.6a1 1 0 0 0 0 1.4L6 10v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V10l2.4-2a1 1 0 0 0 0-1.4z" />
          </svg>
        ),
      },
    ],
  },
  { kind: "link", href: "/videos", label: "동영상" },
  { kind: "link", href: "/community", label: "커뮤니티" },
  { kind: "link", href: "/updates", label: "업데이트" },
];

/**
 * 메뉴 항목이 현재 페이지인지. "/meta" 는 하위(/meta/comp)와 겹치지 않게 정확히 같을 때만.
 * @param pathname — 현재 경로
 * @param href — 메뉴 경로
 * @returns 활성 여부
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  return href === "/meta" ? pathname === "/meta" : pathname === href || pathname.startsWith(`${href}/`);
}
