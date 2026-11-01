/** Shared links and labels for the marketing site. */

export const NAV_LINKS = [
  { href: "/method", label: "Method" },
  { href: "/schools", label: "Schools" },
  { href: "/pricing", label: "Pricing" },
  { href: "/susan", label: "Susan" },
] as const;

/**
 * Where "Talk to us" goes. Placeholder address for the walkthrough;
 * replace with the real inbox before the site is public.
 */
export const CONTACT_EMAIL = "hello@heritagereaders.com";

export function contactHref(subject = "Heritage Readers") {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

export const FOOTER_COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/app", label: "Open the app" },
      { href: "/app/onboarding", label: "Begin placement" },
      { href: "/#lesson", label: "How a lesson works" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Method",
    links: [
      { href: "/method#ladder", label: "The 40 rungs" },
      { href: "/method#mastery", label: "Mastery" },
      { href: "/method#engine", label: "What the AI decides" },
      { href: "/method#sources", label: "Sources" },
    ],
  },
  {
    title: "Schools",
    links: [
      { href: "/schools", label: "For schools and co-ops" },
      { href: "/schools#roles", label: "Roles" },
      { href: "/schools#privacy", label: "Privacy" },
      { href: "/schools#funding", label: "Funding" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/susan", label: "Susan Weaver, M.A." },
      { href: "/pricing#referral", label: "Give a month" },
      { href: "/pricing#faq", label: "Questions" },
    ],
  },
];
