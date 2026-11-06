"use client";

/**
 * SiteNoticeHost — 웹 레이아웃에 한 번 두는 안내 모달 관리자.
 *  - 첫 화면이 열리면 잠시 뒤 SITE_NOTICES 중 지금 해당되는 안내 하나를 띄운다.
 *  - 접속 팝업은 '접속 안내 → 새 업데이트(WhatsNewPopup)' 순서로 하나씩 뜬다.
 *    띄울 안내가 없거나 안내를 닫으면 finishNoticeTurn() 으로 차례를 넘기고, 그때 업데이트 팝업이 뜬다.
 *  - 다른 화면이 openNotice(id) 로 부르면 닫은 기록과 상관없이 바로 연다.
 * 새 안내를 추가하려면 SITE_NOTICES 와 NOTICE_VIEWS 에 한 줄씩 더한다.
 */
import { useEffect, useState, type ComponentType } from "react";
import { ANDROID_BETA_NOTICE } from "@/lib/android-beta";
import {
  OPEN_NOTICE_EVENT,
  finishNoticeTurn,
  hideNotice,
  pickNotice,
  readNoticeRecord,
  snoozeNotice,
  type SiteNotice,
} from "@/lib/site-notices";
import { trackEvent } from "@/lib/track";
import AndroidBetaNotice, { type NoticeCloseReason } from "./AndroidBetaNotice";

/** 자동으로 띄울 수 있는 안내(앞쪽 우선) */
const SITE_NOTICES: SiteNotice[] = [ANDROID_BETA_NOTICE];

/** 안내 ID → 모달 화면 */
const NOTICE_VIEWS: Record<string, ComponentType<{ onClose: (reason: NoticeCloseReason) => void }>> = {
  [ANDROID_BETA_NOTICE.id]: AndroidBetaNotice,
};

/** 첫 화면이 열리고 안내를 띄우기까지 기다리는 시간(ms) — 로드 직후 깜빡임 방지 */
const SHOW_DELAY_MS = 700;

/** 웹 안내 모달 관리자 */
export default function SiteNoticeHost() {
  /** 지금 열린 안내 ID */
  const [activeId, setActiveId] = useState<string | null>(null);

  // 1) 첫 화면에서 한 번 — 해당되는 안내가 있으면 띄우고, 없으면 바로 다음 팝업에 차례를 넘긴다
  useEffect(() => {
    const notice = pickNotice(
      SITE_NOTICES,
      {
        pathname: window.location.pathname,
        userAgent: navigator.userAgent,
        touchPoints: navigator.maxTouchPoints || 0,
        now: Date.now(),
      },
      readNoticeRecord,
    );
    if (!notice) {
      finishNoticeTurn();
      return;
    }
    const t = window.setTimeout(() => {
      setActiveId(notice.id);
      trackEvent(`notice_show_${notice.id}`.slice(0, 32));
    }, SHOW_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  // 2) 다른 화면에서 직접 열기
  useEffect(() => {
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id && NOTICE_VIEWS[id]) setActiveId(id);
    };
    window.addEventListener(OPEN_NOTICE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_NOTICE_EVENT, onOpen);
  }, []);

  if (!activeId) return null;
  const View = NOTICE_VIEWS[activeId];
  const notice = SITE_NOTICES.find((n) => n.id === activeId);
  if (!View || !notice) return null;

  /**
   * 안내를 닫고 닫은 방법을 기억한다.
   * @param reason 닫기(며칠 뒤 다시) / 다시 보지 않기 / 끝까지 진행
   */
  const onClose = (reason: NoticeCloseReason) => {
    if (reason === "close") snoozeNotice(notice.id, notice.snoozeHours);
    else hideNotice(notice.id);
    setActiveId(null);
    finishNoticeTurn(); // 이어서 새 업데이트 팝업이 뜰 수 있게
  };

  return <View onClose={onClose} />;
}
