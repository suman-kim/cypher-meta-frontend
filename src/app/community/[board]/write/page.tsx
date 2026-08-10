import Link from "next/link";
import { notFound } from "next/navigation";
import { boardLabel, isBoard } from "@/lib/community";
import WriteForm from "@/components/community/WriteForm";

export const runtime = "edge";

export const metadata = { title: "글쓰기" };

export default function WritePage({ params }: { params: { board: string } }) {
  if (!isBoard(params.board)) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-gray-50">{boardLabel(params.board)} 글쓰기</h1>
        <Link
          href={`/community/${params.board}`}
          className="text-sm text-gray-400 hover:text-primary"
        >
          ← 목록으로
        </Link>
      </div>
      <WriteForm board={params.board} />
    </div>
  );
}
