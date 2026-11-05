/**
 * 앱 화면용 선 아이콘 모음 (24×24 viewBox, stroke 기반).
 * 앱 화면에는 이모지·글자 아이콘을 쓰지 않고 이 SVG 아이콘만 쓴다.
 * 경로는 시안(design/app/CyphersMetaApp.dc.html)과 같은 모양을 기준으로 했다.
 */

/** 아이콘 이름 → path d 값 */
export const ICON_PATHS = {
  home: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z",
  search: "M11 4a7 7 0 1 1 0 14a7 7 0 1 1 0-14zM20 20l-3.5-3.5",
  meta: "M5 20V11M12 20V4M19 20v-6",
  rank: "M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  community: "M4 5h16v11H8l-4 4z",
  bell: "M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0",
  back: "M15 5l-7 7 7 7",
  chevronRight: "M9 6l6 6-6 6",
  chevronDown: "M6 9l6 6 6-6",
  chevronUp: "M6 15l6-6 6 6",
  refresh: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
  star: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z",
  share: "M12 3v12M7 8l5-5 5 5M5 14v6h14v-6",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6",
  info: "M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18zM12 11v5M12 8h.01",
  alert: "M12 3l10 18H2zM12 10v5M12 18h.01",
  close: "M6 6l12 12M18 6L6 18",
  plus: "M12 5v14M5 12h14",
  swap: "M7 4v16M7 4L3 8M7 4l4 4M17 20V4M17 20l-4-4M17 20l4-4",
  users: "M9 11a4 4 0 1 0 0-8a4 4 0 0 0 0 8zM2 21c0-4 3-6 7-6s7 2 7 6M16 3.5a4 4 0 0 1 0 7.5M22 21c0-3-1.5-5-4-5.7",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 1 0 6a3 3 0 1 1 0-6z",
  thumb: "M7 10v11H3V10zM7 10l4-7c1.7 0 3 1.3 3 3v3h5.5a2 2 0 0 1 2 2.3l-1.3 8A2 2 0 0 1 18.2 21H7",
  comment: "M4 5h16v11H8l-4 4z",
  pen: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 3v4M17 5h4",
  clock: "M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18zM12 7v5l3 2",
  check: "M5 12l5 5L20 7",
  play: "M8 5v14l11-7z",
  reply: "M10 8L5 13l5 5M5 13h10a5 5 0 0 0 5-5V6",
  lock: "M6 11h12v10H6zM8 11V7a4 4 0 1 1 8 0v4",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  user: "M12 12a4.5 4.5 0 1 0 0-9a4.5 4.5 0 0 0 0 9zM4 21c0-4.4 3.6-7 8-7s8 2.6 8 7",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  external: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
  filter: "M4 6h16M7 12h10M10 18h4",
  trophy: "M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z",
  crown: "M3 18h18M4 8l4 4 4-7 4 7 4-4-1.5 10h-13z",
  trendUp: "M4 16l6-6 4 4 6-7M14 7h6v6",
  wave: "M3 12h3l3-7 4 14 3-7h5",
  shield: "M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z",
  target: "M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18zM12 8a4 4 0 1 1 0 8a4 4 0 1 1 0-8z",
  heart: "M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-3 4.5 4.5 0 0 1 8 3c0 6-8 11-8 11z",
  sword: "M5 19L19 5M14 5h5v5M5 14l5 5M3 21l3-3",
  bars: "M5 20V11M12 20V5M19 20v-6",
  flame: "M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8.5z",
  coin: "M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18zM9 9.5c0-1 1.3-1.8 3-1.8s3 .8 3 1.8-1.3 1.6-3 2-3 1-3 2 1.3 1.8 3 1.8 3-.8 3-1.8M12 6v1.7M12 16.3V18",
  map: "M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14",
  video: "M3 6h12v12H3zM15 10l6-3v10l-6-3",
  book: "M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6M20 4v14h-6",
  gear: "M12 9a3 3 0 1 1 0 6a3 3 0 1 1 0-6zM19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z",
} as const;

/** 아이콘 이름 */
export type IconName = keyof typeof ICON_PATHS;

/**
 * 선 아이콘 하나를 그린다.
 * @param name 아이콘 이름
 * @param size 한 변 크기(px), 기본 20
 * @param stroke 선 두께, 기본 2
 * @param fill 채우기 색 (별 아이콘 채움 등), 기본 none
 * @param className 추가 클래스 (색은 currentColor 를 따른다)
 */
export function Icon({
  name,
  size = 20,
  stroke = 2,
  fill = "none",
  className = "",
}: {
  name: IconName;
  size?: number;
  stroke?: number;
  fill?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
