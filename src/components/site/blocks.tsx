import Link from "next/link";
import type { ReactNode } from "react";
import { Illustration } from "@/components/Illustration";
import { IconChevronRight } from "@/components/icons";
import { FABLES } from "@/lib/illustrations";
import { Woodcut } from "./Wordmark";

/** Eyebrow, headline and body for a section. Left-aligned by default. */
export function SectionHead({
  eyebrow,
  title,
  children,
  center,
  id,
  as: Tag = "h2",
}: {
  eyebrow?: string;
  title: ReactNode;
  children?: ReactNode;
  center?: boolean;
  id?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className="s-head" data-center={center || undefined} data-reveal="">
      {eyebrow && <p className="s-eyebrow">{eyebrow}</p>}
      <Tag className={Tag === "h1" ? "s-h1" : "s-h2"} id={id}>
        {title}
      </Tag>
      {children && <div className="s-head-body">{children}</div>}
    </div>
  );
}

/** Text link with a chevron, Apple style. */
export function MoreLink({ href, children }: { href: string; children: ReactNode }) {
  const external = href.startsWith("mailto:");
  const inner = (
    <>
      {children}
      <IconChevronRight size={15} />
    </>
  );
  return external ? (
    <a href={href} className="s-more">
      {inner}
    </a>
  ) : (
    <Link href={href} className="s-more">
      {inner}
    </Link>
  );
}

/** Header for the inner pages: centered type over a large engraving. */
export function PageHeader({
  eyebrow,
  title,
  lede,
  actions,
  art,
  artAlt,
}: {
  eyebrow: string;
  title: ReactNode;
  lede: ReactNode;
  actions?: ReactNode;
  art?: string;
  artAlt?: string;
}) {
  return (
    <header className="s-pagehead">
      <div className="s-wrap">
        <div className="s-pagehead-copy">
          <p className="s-eyebrow">{eyebrow}</p>
          <h1 className="s-h1">{title}</h1>
          <p className="s-lede">{lede}</p>
          {actions && <div className="s-actions">{actions}</div>}
        </div>
        {art && (
          <div className="s-pagehead-art">
            <Illustration id={art} alt={artAlt} priority sizes="(min-width: 1080px) 960px, 100vw" />
          </div>
        )}
      </div>
    </header>
  );
}

/** The six fable engravings with titles and morals. A scroll row on phones, a grid above. */
export function FableGallery() {
  return (
    <ul className="s-fables" aria-label="Fables and tales">
      {FABLES.map((f) => (
        <li key={f.id} className="s-fable">
          <div className="s-fable-art">
            <Illustration id={f.id} sizes="(min-width: 1080px) 380px, (min-width: 720px) 45vw, 80vw" />
          </div>
          <p className="s-fable-title">{f.title}</p>
          <p className="s-fable-moral">{f.moral}</p>
        </li>
      ))}
    </ul>
  );
}

/** The closing brand moment: the woodcut of the boy under the oak, a line and the actions. */
export function ClosingCTA({ title, body, children, band }: { title: ReactNode; body: ReactNode; children: ReactNode; band?: boolean }) {
  return (
    <section className={band ? "s-section s-band s-close" : "s-section s-close"} aria-labelledby="s-close-title">
      <div className="s-wrap s-close-inner">
        <Woodcut className="s-close-mark" />
        <h2 className="s-h2" id="s-close-title">
          {title}
        </h2>
        <p className="s-lede">{body}</p>
        <div className="s-actions" data-center="">
          {children}
        </div>
      </div>
    </section>
  );
}

/** Questions and answers with native disclosure. */
export function Faq({ items }: { items: { q: string; a: ReactNode }[] }) {
  return (
    <div className="s-faq">
      {items.map((it) => (
        <details key={it.q} className="s-faq-item">
          <summary>
            <span>{it.q}</span>
            <span className="s-faq-icon" aria-hidden="true" />
          </summary>
          <div className="s-faq-a">{it.a}</div>
        </details>
      ))}
    </div>
  );
}
