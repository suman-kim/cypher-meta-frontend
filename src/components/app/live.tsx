/**
 * 앱 방송 카드 부품 — 홈 "지금 방송 중" 가로 목록과 방송·동영상 화면이 함께 쓴다.
 * 방송 주소는 플랫폼 페이지라 앱 밖(기기 브라우저·플랫폼 앱)으로 연다.
 */
import type { LiveStream } from "@/lib/live";
import { Icon } from "./icons";

/** 플랫폼 표시 이름과 배지 색 */
export const PLATFORM_LOOK: Record<string, { label: string; bg: string }> = {
  chzzk: { label: "CHZZK", bg: "#00b86b" },
  youtube: { label: "YouTube", bg: "#e62117" },
  soop: { label: "SOOP", bg: "#2c64f6" },
};

/**
 * 방송 시작 시각으로부터 지난 시간을 "1시간 57분" 꼴로 적는다.
 * @param openDate 방송 시작 시각 문자열 (플랫폼 원본, KST 로 보고 해석)
 * @param now 기준 시각(ms) — 서버·클라이언트 표시를 맞추려면 같은 값을 넘긴다
 * @returns 모르면 빈 문자열
 */
export function uptime(openDate: string | null, now: number = Date.now()): string {
  if (!openDate) return "";
  const iso = /[zZ]|[+-]\d\d:?\d\d$/.test(openDate) ? openDate : `${openDate.replace(" ", "T")}+09:00`;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const m = Math.max(0, Math.floor((now - t) / 60000));
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}시간 ${m % 60}분` : `${m}분`;
}

/**
 * 홈 가로 목록용 방송 카드 (폭 200).
 * @param s 방송 정보
 * @param now 지난 시간 계산 기준 시각(ms)
 */
export function LiveCard({ s, now }: { s: LiveStream; now: number }) {
  const look = PLATFORM_LOOK[s.platform] ?? { label: s.platform, bg: "#4a5262" };
  const up = uptime(s.openDate, now);
  return (
    <a
      href={s.url}
      target="_blank"
      rel="noopener noreferrer"
      className="a-press grid w-[200px] shrink-0 grid-cols-1 gap-1.5"
    >
      <span className="relative block h-[112px] overflow-hidden rounded-xl bg-app-ph">
        {s.thumbnailUrl && (
          // 외부 썸네일이라 next/image 최적화 없이 그대로 쓴다
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        )}
        <span className="absolute left-1.5 top-1.5 flex gap-1">
          <span className="rounded bg-app-live px-[5px] py-0.5 text-[9px] font-extrabold text-white">LIVE</span>
          <span className="rounded px-[5px] py-0.5 text-[9px] font-extrabold text-white" style={{ background: look.bg }}>
            {look.label}
          </span>
        </span>
        <span className="absolute bottom-1.5 left-1.5 flex items-center gap-[3px] rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          <Icon name="eye" size={11} />
          {s.viewerCount.toLocaleString()}명
        </span>
        {up && (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {up}
          </span>
        )}
      </span>
      <span className="truncate text-[13px] font-bold text-gray-100">{s.title}</span>
      <span className="-mt-1 truncate text-[11px] text-gray-500">{s.channelName}</span>
    </a>
  );
}
