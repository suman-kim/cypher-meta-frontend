import Link from "next/link";
import { isBoard, type CommunityPost } from "@/lib/community";

export default function NoticeCard({ notices }: { notices: CommunityPost[] }) {
  return (
    <div className="card p-4">
      <h3 className="flex items-center gap-1.5 text-sm font-bold text-gray-100">📢 공지사항</h3>
      <ul className="mt-3 space-y-2">
        {notices.length === 0 && (
          <li className="text-xs text-gray-500">등록된 공지가 없습니다.</li>
        )}
        {notices.map((n) => {
          const board = isBoard(n.boardType) ? n.boardType : "free";
          return (
            <li key={n.id}>
              <Link
                href={`/community/${board}/${n.id}`}
                className="block truncate text-sm text-gray-300 hover:text-primary"
              >
                {n.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
