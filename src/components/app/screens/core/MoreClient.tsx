"use client";

/**
 * 더보기 화면의 상호작용 조각 — 내 계정 카드(기기 저장), 테마 설정, 알림 설정, 알림 화면 안내.
 */
import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  setAlertPref,
  setAppTheme,
  useAlertPrefs,
  useAppTheme,
  useFavs,
  useHydrated,
  useLiveAlerts,
  useMe,
  type AppTheme,
} from "@/lib/app-storage";
import { disablePush, enablePush, sendTestPush, usePushState } from "@/lib/app-push";
import { toast } from "../../AppChrome";
import { Icon } from "../../icons";
import { CharImg, Segmented, Skel } from "../../ui";

/** 더보기 맨 위 내 계정 카드 — 연동 전이면 연동 안내 */
export function MoreProfileCard() {
  const hydrated = useHydrated();
  const me = useMe();
  const favs = useFavs();
  if (!hydrated) return <Skel className="h-[76px] rounded-[20px]" />;
  return (
    <Link href="/account" className="a-card a-press flex items-center gap-3 px-4 py-3.5">
      {me ? (
        <CharImg id={me.characterId} name={me.nickname} size={46} radius={23} />
      ) : (
        <span className="a-grad grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full">
          <Icon name="user" size={22} />
        </span>
      )}
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="truncate text-base font-bold text-gray-100">{me ? me.nickname : "내 닉네임 연동하기"}</span>
        <span className="truncate text-xs text-gray-500">
          {me ? `연동된 계정 · 즐겨찾기 ${favs.length}명` : `홈에서 바로 내 전적을 볼 수 있어요 · 즐겨찾기 ${favs.length}명`}
        </span>
      </span>
      <span className="text-gray-500">
        <Icon name="chevronRight" size={16} />
      </span>
    </Link>
  );
}

/** 테마 선택 (시스템 · 라이트 · 다크) — 바로 적용된다 */
export function ThemeSetting() {
  const theme = useAppTheme();
  return (
    <div className="grid gap-2.5">
      <span className="text-sm font-bold text-gray-100">테마</span>
      <Segmented
        value={theme}
        onChange={(k) => setAppTheme(k as AppTheme)}
        items={[
          { key: "system", label: "시스템" },
          { key: "light", label: "라이트" },
          { key: "dark", label: "다크" },
        ]}
      />
      <span className="text-[11px] text-gray-500">시스템을 고르면 기기의 밝기 설정을 따라가요.</span>
    </div>
  );
}

/**
 * 켜고 끄는 스위치 한 줄.
 * @param title 제목
 * @param desc 설명
 * @param on 켜짐 여부
 * @param onChange 바꿀 때 호출
 * @param disabled 누를 수 없음
 */
function SwitchRow({
  title,
  desc,
  on,
  onChange,
  disabled = false,
}: {
  title: string;
  desc: ReactNode;
  on: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className={`text-sm font-bold ${disabled ? "text-gray-500" : "text-gray-100"}`}>{title}</span>
        <span className="text-[11px] leading-snug text-gray-500">{desc}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={title}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
          on && !disabled ? "bg-primary" : "bg-surface-3"
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-[left] duration-200 ${
            on && !disabled ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

/**
 * 알림 설정 — 권한 상태에 따라 [알림 켜기] / 기기 설정 안내 / 전적·방송 스위치를 보여 준다.
 * 앱이 아니거나 예전 앱이면 앱에서만(업데이트 후) 쓸 수 있다고 안내한다.
 */
export function PushSettings() {
  const hydrated = useHydrated();
  const push = usePushState();
  const prefs = useAlertPrefs();
  const liveAlerts = useLiveAlerts();
  const me = useMe();
  const favs = useFavs();
  const [busy, setBusy] = useState(false);

  if (!hydrated) return <Skel className="h-24 rounded-xl" />;

  const liveCount = Object.values(liveAlerts).filter(Boolean).length;
  const playerCount = new Set([...(me ? [me.playerId] : []), ...favs.map((f) => f.playerId)]).size;
  const ready = push.support === "native" && push.permission === "granted" && push.optedIn && !push.blocked;
  /** [알림 켜기]를 보여 줄 때 — 아직 묻지 않았거나, 기기는 허용인데 앱에서 켜지 않았을 때 */
  const askEnable =
    push.support === "native" && (push.permission === "prompt" || (push.permission === "granted" && !push.optedIn));

  /** [알림 켜기] — 권한 요청 */
  async function onEnable() {
    setBusy(true);
    const perm = await enablePush();
    setBusy(false);
    if (perm === "granted") toast("알림을 켰어요");
    else if (perm === "denied") toast("알림이 허용되지 않았어요");
  }

  /** [알림 모두 끄기] — 서버 등록·구독 삭제 */
  async function onDisable() {
    setBusy(true);
    const ok = await disablePush();
    setBusy(false);
    toast(ok ? "알림을 모두 껐어요" : "알림은 껐지만 서버 정리에 실패했어요. 90일 뒤 자동으로 지워져요.");
  }

  /** [테스트 알림 보내기] */
  async function onTest() {
    setBusy(true);
    const msg = await sendTestPush();
    setBusy(false);
    toast(msg);
  }

  return (
    <div className="grid gap-3">
      <span className="text-sm font-bold text-gray-100">알림</span>

      {push.support === "web" && (
        <p className="rounded-xl bg-surface-2 px-3 py-2.5 text-[12px] leading-relaxed text-gray-400">
          알림은 Cyphers Meta 앱에서 받을 수 있어요.
        </p>
      )}
      {push.support === "outdated" && (
        <p className="rounded-xl bg-surface-2 px-3 py-2.5 text-[12px] leading-relaxed text-gray-400">
          앱을 최신 버전으로 업데이트하면 알림을 받을 수 있어요.
        </p>
      )}
      {askEnable && (
        <div className="grid gap-2 rounded-xl bg-app-ac-soft px-3.5 py-3">
          <p className="text-[12px] leading-relaxed text-app-ac-tx">
            내 계정·즐겨찾기 플레이어의 새 경기와 스트리머 방송 시작을 알려 드려요.
          </p>
          <button
            type="button"
            onClick={onEnable}
            disabled={busy}
            className="a-press h-10 rounded-full bg-primary text-[13px] font-bold text-white disabled:opacity-60"
          >
            알림 켜기
          </button>
        </div>
      )}
      {push.support === "native" && push.permission === "denied" && (
        <p className="rounded-xl bg-surface-2 px-3 py-2.5 text-[12px] leading-relaxed text-gray-400">
          알림이 꺼져 있어요. 기기의 설정 › 애플리케이션 › Cyphers Meta › 알림에서 허용한 뒤 다시 돌아오면 바로 켜져요.
        </p>
      )}
      {push.error && (
        <div className="grid gap-2">
          <p className="text-[12px] leading-relaxed text-app-loss-tx">{push.error}</p>
          {push.blocked && (
            <button
              type="button"
              onClick={onEnable}
              disabled={busy}
              className="a-press h-9 justify-self-start rounded-full border border-line px-4 text-[12px] font-semibold text-gray-300 disabled:opacity-50"
            >
              다시 시도
            </button>
          )}
        </div>
      )}

      <SwitchRow
        title="전적 갱신 알림"
        desc={
          <>
            내 계정·즐겨찾기 플레이어가 새 경기를 하면 알려요{playerCount > 0 ? ` (${playerCount}명)` : ""}. 전적은 경기 후 최대
            1시간쯤 뒤에 반영돼요.
          </>
        }
        on={prefs.match}
        onChange={(v) => setAlertPref("match", v)}
        disabled={!ready}
      />
      <SwitchRow
        title="방송 시작 알림"
        desc={
          <>
            종을 누른 스트리머가 사이퍼즈 방송을 켜면 알려요{liveCount > 0 ? ` (${liveCount}명)` : ""}.{" "}
            <Link href="/videos" className="font-semibold text-primary">
              방송 화면에서 고르기
            </Link>
          </>
        }
        on={prefs.live}
        onChange={(v) => setAlertPref("live", v)}
        disabled={!ready}
      />
      {ready && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onTest}
            disabled={busy || !push.registered}
            className="a-press h-9 rounded-full border border-line px-4 text-[12px] font-semibold text-gray-300 disabled:opacity-50"
          >
            {push.registered ? "테스트 알림 보내기" : "기기 등록 중…"}
          </button>
          <button
            type="button"
            onClick={onDisable}
            disabled={busy}
            className="a-press h-9 rounded-full px-3 text-[12px] font-semibold text-gray-500 disabled:opacity-50"
          >
            알림 모두 끄기
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * 알림 화면 맨 위 안내 — 푸시 상태에 맞춰 다음에 할 일을 보여 준다.
 */
export function PushStatusNote() {
  const hydrated = useHydrated();
  const push = usePushState();
  if (!hydrated) return <Skel className="h-11 rounded-xl" />;
  const on = push.support === "native" && push.permission === "granted" && push.optedIn && !push.blocked;
  return (
    <p className="flex items-start gap-2 rounded-xl bg-surface-2 px-3.5 py-2.5 text-xs leading-relaxed text-gray-300">
      <span className="mt-px text-gray-500">
        <Icon name={on ? "bell" : "info"} size={15} />
      </span>
      <span>
        {on ? (
          <>방송 시작·전적 갱신 알림을 받고 있어요. </>
        ) : push.support === "native" ? (
          <>알림을 켜면 앱을 열지 않아도 새 경기와 방송 시작을 알려 드려요. </>
        ) : (
          <>앱을 열었을 때 이곳에서 새 소식을 확인할 수 있어요. </>
        )}
        {push.support !== "web" && (
          <Link href="/more" className="font-semibold text-primary">
            알림 설정
          </Link>
        )}
      </span>
    </p>
  );
}
