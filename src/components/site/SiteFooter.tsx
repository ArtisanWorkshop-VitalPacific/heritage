import Link from "next/link";
import { FOOTER_COLUMNS } from "./site-config";
import { Wordmark } from "./Wordmark";

export function SiteFooter() {
  return (
    <footer id="s-footer" className="s-footer">
      <div className="s-wrap">
        <div className="s-footer-top">
          <div className="s-footer-brand">
            <Link href="/" aria-label="Heritage Readers, home" className="s-footer-mark">
              <Wordmark />
            </Link>
            <p>A phonics tutor for children ages 4 to 8, based on the teaching of Susan Weaver, M.A.</p>
          </div>
          <nav className="s-footer-cols" aria-label="Footer">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title} className="s-footer-col">
                <h2>{col.title}</h2>
                <ul>
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href}>{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="s-footer-base">
          <p>Demo build. Not affiliated with the publishers of Reading with Phonics or the McGuffey Readers.</p>
          <p>© 2026 Heritage Readers</p>
        </div>
      </div>
    </footer>
  );
}
