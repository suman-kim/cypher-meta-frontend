"use client";

import { useState } from "react";

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  /** 이미지 로드 실패 시 표시할 텍스트(보통 이름 첫 글자) */
  fallbackText?: string;
}

/**
 * 외부(Neople) 이미지 로드 실패 시 폴백 UI 를 보여주는 이미지 컴포넌트.
 */
export default function SafeImage({
  src,
  alt,
  className = "",
  fallbackClassName = "",
  fallbackText,
}: SafeImageProps) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div
        className={`flex items-center justify-center bg-bg-hover text-gray-500 ${className} ${fallbackClassName}`}
        aria-label={alt}
      >
        <span className="text-xs font-bold">{fallbackText ?? "?"}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={className}
      onError={() => setErrored(true)}
    />
  );
}
