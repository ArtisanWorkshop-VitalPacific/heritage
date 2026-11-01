import "@/styles/site.css";
import { RevealController } from "@/components/site/RevealController";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="s-root">
      <a href="#s-main" className="s-skip">
        Skip to content
      </a>
      <SiteNav />
      <main id="s-main" className="s-main" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter />
      <RevealController />
    </div>
  );
}
