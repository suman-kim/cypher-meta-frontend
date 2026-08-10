import Link from "next/link";
import { redirect } from "next/navigation";
import { searchPlayers, NeopleApiError } from "@/lib/neople";
import { Avatar } from "@/components/CharacterAvatar";
import { EmptyState, ErrorState, SectionTitle } from "@/components/ui";
import SearchBar from "@/components/SearchBar";
import type { PlayerSearchRow } from "@/lib/types";

export const runtime = "edge";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { nickname?: string };
}

export function generateMetadata({ searchParams }: Props) {
  // 검색 결과 페이지는 색인에서 제외(무한한 쿼리 조합 방지). 링크는 따라가도록 follow.
  return {
    title: searchParams.nickname ? `"${searchParams.nickname}" 검색` : "검색",
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const nickname = (searchParams.nickname ?? "").trim();

  if (!nickname) {
    return <EmptyState title="검색어를 입력하세요" description="플레이어 닉네임으로 검색합니다." />;
  }

  let rows: PlayerSearchRow[] = [];
  try {
    const res = await searchPlayers(nickname, { wordType: "match", limit: 30 });
    rows = res.rows ?? [];
  } catch (e) {
    const err = e as NeopleApiError;
    return (
      <div className="space-y-4">
        <div className="max-w-md">
          <SearchBar defaultValue={nickname} />
        </div>
        <ErrorState
          message={err.message}
          hint={err.code === "NO_API_KEY" ? ".env.local 에 NEOPLE_API_KEY 를 설정했는지 확인하세요." : `code: ${err.code}`}
        />
      </div>
    );
  }

  // 정확히 1명이면 바로 프로필로 이동
  if (rows.length === 1) {
    redirect(`/players/${rows[0].playerId}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <SearchBar defaultValue={nickname} />
      </div>
      <SectionTitle>
        &ldquo;{nickname}&rdquo; 검색 결과 <span className="text-gray-500">({rows.length})</span>
      </SectionTitle>

      {rows.length === 0 ? (
        <EmptyState
          title="검색 결과가 없습니다"
          description="닉네임을 정확히 입력했는지 확인하세요."
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((p) => (
            <li key={p.playerId}>
              <Link
                href={`/players/${p.playerId}`}
                className="card flex items-center gap-3 px-4 py-3 transition-colors hover:bg-bg-hover"
              >
                <Avatar size={40} />
                <div className="min-w-0">
                  <div className="truncate font-semibold text-gray-100">{p.nickname}</div>
                  {p.clanName && (
                    <div className="truncate text-xs text-gray-500">클랜 · {p.clanName}</div>
                  )}
                </div>
                <span className="ml-auto text-sm text-gray-500">전적 보기 →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
