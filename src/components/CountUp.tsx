"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 숫자 카운트업 애니메이션.
 * 마운트 시(또는 뷰포트 진입 시) 0 → end 까지 easeOutCubic 으로 증가한다.
 * prefers-reduced-motion 이면 즉시 최종값을 표시한다.
 */
export function CountUp({
  end,
  duration = 1500,
  className,
  format = true,
}: {
  end: number;
  duration?: number;
  className?: string;
  /** true 면 천단위 콤마(ko-KR) 포맷 */
  format?: boolean;
}) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);
  const done = useRef(false);

  useEffect(() => {
    const target = Number.isFinite(end) ? end : 0;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setVal(target);
      return;
    }

    let raf = 0;
    const run = () => {
      if (done.current) return;
      done.current = true;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
        setVal(Math.round(target * eased));
        if (t < 1) raf = requestAnimationFrame(tick);
        else setVal(target);
      };
      raf = requestAnimationFrame(tick);
    };

    // 뷰포트에 들어올 때 시작(히어로는 즉시 시작됨)
    const el = ref.current;
    if (el && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            run();
            io.disconnect();
          }
        },
        { threshold: 0.2 },
      );
      io.observe(el);
      return () => {
        io.disconnect();
        cancelAnimationFrame(raf);
      };
    }

    run();
    return () => cancelAnimationFrame(raf);
  }, [end, duration]);

  return (
    <span ref={ref} className={className}>
      {format ? val.toLocaleString("ko-KR") : val}
    </span>
  );
}

export default CountUp;
