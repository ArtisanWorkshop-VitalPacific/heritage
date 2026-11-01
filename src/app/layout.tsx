import type { Metadata, Viewport } from "next";
import "@fontsource/andika/400.css";
import "@fontsource/andika/700.css";
import "@fontsource/libre-caslon-text/400.css";
import "@fontsource/libre-caslon-text/400-italic.css";
import "@fontsource/libre-caslon-text/700.css";
import "@fontsource/libre-caslon-display/400.css";
import "./globals.css";

// Share images need an absolute base. Vercel provides the production host; local builds use localhost.
const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Heritage Readers",
    template: "%s · Heritage Readers",
  },
  description:
    "A classical reading tutor that listens. Hay & Wingo phonics and the McGuffey tradition, taught one child at a time, on paper first.",
  applicationName: "Heritage Readers",
  // A walkthrough demo with sample families: keep it out of search until launch.
  robots: { index: false, follow: false },
  openGraph: {
    title: "Heritage Readers",
    description: "A classical reading tutor that listens.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#efe6d2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
