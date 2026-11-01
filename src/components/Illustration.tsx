"use client";

import { useState, type CSSProperties } from "react";
import { illustration } from "@/lib/illustrations";

export interface IllustrationProps {
  id: string;
  className?: string;
  style?: CSSProperties;
  /** Override the alt text; pass "" for decorative use. */
  alt?: string;
  /** Load eagerly (hero, above the fold). */
  priority?: boolean;
  /** Engravings: draw on a paper plate (use on dark surfaces). */
  plate?: boolean;
  sizes?: string;
}

/**
 * Renders a generated illustration with the right treatment for its kind.
 * Engravings print onto the page (grayscale + multiply). Spots keep their color.
 * If the file cannot load (offline local dev), a quiet placeholder keeps the layout.
 */
export function Illustration({ id, className, style, alt, priority, plate, sizes }: IllustrationProps) {
  const ill = illustration(id);
  const [failed, setFailed] = useState(false);
  if (!ill || ill.kind === "video") return null;

  const ratio = `${ill.width} / ${ill.height}`;
  const cls = [ill.kind === "engraving" ? "engraving" : "spot", className].filter(Boolean).join(" ");

  if (failed) {
    return (
      <span
        role="img"
        aria-label={alt ?? ill.alt}
        className={className}
        style={{
          display: "block",
          aspectRatio: ratio,
          maxWidth: "100%",
          borderRadius: ill.kind === "spot" ? "50%" : "45% / 40%",
          background: "radial-gradient(closest-side, rgba(26,23,20,.08), rgba(26,23,20,0))",
          ...style,
        }}
      />
    );
  }

  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ill.src}
      alt={alt ?? ill.alt}
      width={ill.width}
      height={ill.height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      sizes={sizes}
      className={cls}
      style={{ aspectRatio: ratio, height: "auto", ...style }}
      onError={() => setFailed(true)}
      draggable={false}
    />
  );

  if (plate && ill.kind === "engraving") return <span className="plate" style={{ display: "block" }}>{img}</span>;
  return img;
}
