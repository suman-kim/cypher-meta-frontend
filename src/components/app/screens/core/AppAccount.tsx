"use client";

/**
 * 앱 내 계정 · 즐겨찾기 (시안 14).
 * - 연동 전: 닉네임 검색 → 결과 → 내 플레이어 화면에서 [연동하기] (link=1 흐름)
 * - 연동 후: 내 전적 보기 · 연동 해제
 * - 즐겨찾기 목록(별을 눌러 빼기), 최근 검색 기록 삭제
 * 모두 기기에만 저장된다는 안내를 함께 보인다.
 */
import Link from "next/link";
import { clearRecent, removeFav, setMe, useFavs, useHydrated, useMe, useRecent } from "@/lib/app-storage";
import { AppTopBar, toast } from "../../AppChrome";
import { Icon } from "../../icons";
import { AppPage, CharImg, SectionHead, Skel } from "../../ui";
import { AppSearchInput } from "./SearchClient";

/** RP · 순위 한 줄 */
function rpLine(rp?: number, rank?: number | null): string {
  const parts = [rp ? `${rp.toLocaleString()} RP` : "", rank ? `공식전 ${rank.toLocaleString()}위` : ""].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "순위 정보 없음";
}

export default function AppAccount() {
  const hydrated = useHydrated();
  const me = useMe();
  const favs = useFavs();
  const recent = useRecent();

  return (
    <>
      <AppTopBar title="내 계정 · 즐겨찾기" backHref="/more" />
      <AppPage>
        {!hydrated ? (
          <Skel className="h-[140px] rounded-[20px]" />
        ) : me ? (
          <div className="a-card grid gap-3.5 p-4">
            <div className="flex items-center gap-3">
              <CharImg id={me.characterId} name={me.nickname} size={52} radius={26} />
              <span className="grid min-w-0 gap-0.5">
                <span className="truncate text-lg font-bold text-gray-100">{me.nickname}</span>
                <span className="text-xs text-gray-500">{rpLine(me.rp, me.rank)}</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={`/players/${me.playerId}`}
                className="a-press grid h-11 place-items-center rounded-[22px] bg-app-ac-soft text-sm font-bold text-app-ac-tx"
              >
                내 전적 보기
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMe(null);
                  toast("연동을 해제했어요");
                }}
                className="a-press h-11 rounded-[22px] border border-line text-sm font-bold text-gray-200"
              >
                연동 해제
              </button>
            </div>
          </div>
        ) : (
          <div className="a-card grid gap-3 p-4">
            <div className="grid gap-1">
              <span className="text-base font-bold text-gray-100">내 닉네임 연동</span>
              <span className="text-xs leading-relaxed text-gray-500">
                닉네임을 검색해 내 플레이어 화면에서 [연동하기]를 누르면 홈에 내 전적 카드가 생겨요.
              </span>
            </div>
            <AppSearchInput link placeholder="내 닉네임 입력" />
          </div>
        )}

        <p className="flex items-start gap-2 rounded-xl bg-surface-2 px-3.5 py-2.5 text-xs leading-relaxed text-gray-300">
          <span className="mt-px text-gray-500">
            <Icon name="info" size={15} />
          </span>
          닉네임 연동과 즐겨찾기는 이 기기에만 저장돼요. 앱을 지우거나 기기를 바꾸면 사라져요.
        </p>

        <section className="grid gap-1">
          <SectionHead title="즐겨찾기 플레이어" sub={hydrated ? favs.length : undefined} />
          {!hydrated ? (
            <Skel className="h-14 rounded-xl" />
          ) : favs.length === 0 ? (
            <div className="grid justify-items-center gap-1.5 py-5 text-center">
              <p className="text-[13px] text-gray-400">아직 즐겨찾기한 플레이어가 없어요.</p>
              <p className="text-xs text-gray-500">플레이어 화면 위쪽의 별을 누르면 여기에 모여요.</p>
              <Link href="/search" className="mt-1 text-xs font-bold text-primary">
                플레이어 검색하기
              </Link>
            </div>
          ) : (
            <ul className="grid divide-y divide-line">
              {favs.map((f) => (
                <li key={f.playerId} className="flex items-center gap-3 py-2.5">
                  <Link href={`/players/${f.playerId}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <CharImg id={f.characterId} name={f.nickname} size={40} radius={20} />
                    <span className="grid min-w-0">
                      <span className="truncate text-sm font-bold text-gray-100">{f.nickname}</span>
                      <span className="text-[11px] text-gray-500">{rpLine(f.rp, f.rank)}</span>
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      removeFav(f.playerId);
                      toast(`${f.nickname} 님을 즐겨찾기에서 뺐어요`);
                    }}
                    className="grid h-10 w-10 place-items-center rounded-full text-[#f5b301] active:bg-surface-2"
                    aria-label={`${f.nickname} 즐겨찾기 빼기`}
                  >
                    <Icon name="star" size={22} fill="currentColor" stroke={1.6} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <button
          type="button"
          disabled={!hydrated || recent.length === 0}
          onClick={() => {
            clearRecent();
            toast("최근 검색 기록을 지웠어요");
          }}
          className="a-press h-12 rounded-3xl border border-line text-sm font-bold text-gray-200 disabled:opacity-40"
        >
          {hydrated && recent.length === 0 ? "최근 검색 기록 없음" : "최근 검색 기록 삭제"}
        </button>
      </AppPage>
    </>
  );
}
