"use client";

/**
 * 앱 알림 (시안 15) — 앱을 열었을 때 볼 새 소식 모음.
 *  - 방송: 방송 시작 알림(종)을 켠 스트리머 중 지금 방송 중인 사람
 *  - 업데이트: Cyphers Meta 새 기능 소식(업데이트 노트)
 *  - 공지: 커뮤니티 공지
 * 푸시 알림은 다음 단계라 지금은 이 화면에서 모아 보여 준다(안내 문구로 알린다).
 */
import Link from "next/link";
import { useHydrated, useLiveAlerts } from "@/lib/app-storage";
import type { LiveStream } from "@/lib/live";
import { AppTopBar } from "../../AppChrome";
import { Icon, type IconName } from "../../icons";
import { uptime } from "../../live";
import { AppPage, GhostLink, SectionHead, Skel } from "../../ui";
import { APP_FEATURES } from "@/lib/app-features";
import { PushStatusNote } from "./MoreClient";

/** 업데이트·공지 한 줄 */
export interface NotiItem {
  /** 고유 키 */
  id: string;
  /** 이동 주소 */
  href: string;
  /** 제목 */
  title: string;
  /** 보조 줄(날짜 등) */
  meta: string;
}

/** 알림 화면이 받는 값 */
export interface AppNotificationsProps {
  /** 지금 방송 중 전체 (알림 켠 채널만 골라 보여 준다) */
  lives: LiveStream[];
  /** 최근 업데이트 노트 */
  updates: NotiItem[];
  /** 최근 공지 */
  notices: NotiItem[];
  /** 서버 렌더 시각(ms) — 방송 시간 계산 기준 */
  now: number;
}

/** 아이콘 타일 + 글 한 줄 */
function Row({
  href,
  external,
  icon,
  tone,
  title,
  meta,
}: {
  href: string;
  external?: boolean;
  icon: IconName;
  tone: "live" | "ac" | "mute";
  title: string;
  meta: string;
}) {
  const tile = {
    live: "bg-app-loss-bg text-app-live",
    ac: "bg-app-ac-soft text-app-ac-tx",
    mute: "bg-surface-2 text-gray-300",
  }[tone];
  const inner = (
    <>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tile}`}>
        <Icon name={icon} size={19} />
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="line-clamp-2 text-sm font-semibold leading-snug text-gray-100">{title}</span>
        <span className="text-[11px] text-gray-500">{meta}</span>
      </span>
    </>
  );
  const cls = "flex items-start gap-3 py-3";
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  );
}

/**
 * @param props AppNotificationsProps
 */
export default function AppNotifications({ lives, updates, notices, now }: AppNotificationsProps) {
  const hydrated = useHydrated();
  const alerts = useLiveAlerts();
  const onAir = lives.filter((s) => alerts[s.id]);
  const anyAlert = Object.keys(alerts).length > 0;

  return (
    <>
      <AppTopBar title="알림" backHref="/" />
      <AppPage className="!gap-4">
        <PushStatusNote />

        <section className="grid">
          <SectionHead title="방송" />
          {!hydrated ? (
            <Skel className="mt-2 h-14 rounded-xl" />
          ) : onAir.length > 0 ? (
            <div className="grid divide-y divide-line">
              {onAir.map((s) => (
                <Row
                  key={s.id}
                  href={s.url}
                  external
                  icon="video"
                  tone="live"
                  title={`${s.channelName} 님이 방송 중이에요 · ${s.title}`}
                  meta={[uptime(s.openDate, now) && `${uptime(s.openDate, now)}째`, `시청 ${s.viewerCount.toLocaleString()}명`]
                    .filter(Boolean)
                    .join(" · ")}
                />
              ))}
            </div>
          ) : (
            <div className="grid justify-items-start gap-2 py-3">
              <p className="text-[13px] text-gray-500">
                {anyAlert
                  ? "알림을 켠 스트리머 중 지금 방송 중인 사람이 없어요."
                  : "방송 · 동영상 화면에서 종을 누르면, 그 스트리머가 방송할 때 여기에 보여요."}
              </p>
              <GhostLink href="/videos" icon="video">
                방송 보러 가기
              </GhostLink>
            </div>
          )}
        </section>

        <section className="grid">
          <SectionHead title="업데이트" href="/updates" />
          {updates.length === 0 ? (
            <p className="py-3 text-[13px] text-gray-500">새 업데이트 소식이 없어요.</p>
          ) : (
            <div className="grid divide-y divide-line">
              {updates.map((u) => (
                <Row key={u.id} href={u.href} icon="sparkle" tone="ac" title={u.title} meta={u.meta} />
              ))}
            </div>
          )}
        </section>

        {/* 공지는 커뮤니티 글이라 앱 커뮤니티가 꺼져 있으면 감춘다 — APP_FEATURES.community */}
        {APP_FEATURES.community && (
        <section className="grid">
          <SectionHead title="공지" href="/community" cta="커뮤니티" />
          {notices.length === 0 ? (
            <p className="py-3 text-[13px] text-gray-500">등록된 공지가 없어요.</p>
          ) : (
            <div className="grid divide-y divide-line">
              {notices.map((n) => (
                <Row key={n.id} href={n.href} icon="bell" tone="mute" title={n.title} meta={n.meta} />
              ))}
            </div>
          )}
        </section>
        )}
      </AppPage>
    </>
  );
}
