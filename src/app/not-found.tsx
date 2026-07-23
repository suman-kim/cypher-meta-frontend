import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="text-5xl font-black text-brand">404</div>
      <p className="text-sm text-gray-500">요청하신 페이지를 찾을 수 없습니다.</p>
      <Link href="/" className="btn-primary">
        홈으로
      </Link>
    </div>
  );
}
