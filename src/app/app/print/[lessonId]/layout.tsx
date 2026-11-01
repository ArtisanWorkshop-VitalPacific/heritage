import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ lessonId: string }> }): Promise<Metadata> {
  const { lessonId } = await params;
  const m = /-r(\d{1,2})$/.exec(decodeURIComponent(lessonId));
  return { title: m ? `Rung ${m[1]} lesson packet` : "Lesson packet" };
}

export default function PacketLayout({ children }: { children: React.ReactNode }) {
  return children;
}
