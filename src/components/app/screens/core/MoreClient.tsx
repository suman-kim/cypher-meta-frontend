"use client";

/**
 * 더보기 화면의 상호작용 조각 — 내 계정 카드(기기 저장), 테마 설정.
 */
import Link from "next/link";
import { setAppTheme, useAppTheme, useFavs, useHydrated, useMe, type AppTheme } from "@/lib/app-storage";
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
