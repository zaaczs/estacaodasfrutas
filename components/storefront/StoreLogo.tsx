"use client";

import { useCallback, useState } from "react";

/** JPG e SVG existem no repo; PNG é opcional (evita ícone quebrado no 1º paint). */
const CHAIN = ["/logo.jpg", "/logo.png", "/mercadinho-logo.svg"] as const;

type Props = {
  alt: string;
  className?: string;
  width?: number;
  height?: number;
};

export function StoreLogo({ alt, className, width, height }: Props) {
  const [i, setI] = useState(0);
  const src = CHAIN[Math.min(i, CHAIN.length - 1)];

  const onError = useCallback(() => {
    setI((prev) => (prev + 1 < CHAIN.length ? prev + 1 : prev));
  }, []);

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={onError}
      decoding="async"
    />
  );
}
