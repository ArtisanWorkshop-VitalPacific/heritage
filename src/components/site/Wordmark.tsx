/** The HERITAGE letterpress wordmark (Matt's logo). Height is set by the parent's CSS. */
export function Wordmark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/heritage-wordmark.png"
      alt="Heritage"
      width={918}
      height={148}
      className={["s-wordmark", className].filter(Boolean).join(" ")}
      draggable={false}
    />
  );
}

/** The logomark for the navbar: the woodcut at icon size. Decorative; the link around it carries the name. */
export function Logomark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/heritage-mark-96.webp"
      alt=""
      width={96}
      height={96}
      className={["s-logomark", className].filter(Boolean).join(" ")}
      draggable={false}
    />
  );
}

/** The square woodcut: a boy reading under an oak. White lines are transparent, so the ground shows through. */
export function Woodcut({ size = 512, className, alt = "" }: { size?: 240 | 512; className?: string; alt?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={size === 240 ? "/brand/heritage-mark-240.webp" : "/brand/heritage-mark-512.webp"}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={["s-woodcut", className].filter(Boolean).join(" ")}
      draggable={false}
    />
  );
}
