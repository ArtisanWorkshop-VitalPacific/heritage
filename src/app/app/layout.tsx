import type { Metadata } from "next";
import { AppFrame } from "@/components/app/AppFrame";
import "@/styles/student.css";
import "@/styles/app.css";
import "@/styles/print.css";

export const metadata: Metadata = {
  title: "App",
  robots: { index: false },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppFrame>{children}</AppFrame>;
}
