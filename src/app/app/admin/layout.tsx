import type { Metadata } from "next";

export const metadata: Metadata = { title: "Organization" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
