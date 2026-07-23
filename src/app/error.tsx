"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="text-4xl">⚠️</div>
      <div>
        <p className="text-lg font-bold text-gray-100">문제가 발생했습니다</p>
        <p className="mt-1 max-w-md text-sm text-gray-500">{error.message}</p>
      </div>
      <button onClick={reset} className="btn-primary">
        다시 시도
      </button>
    </div>
  );
}
