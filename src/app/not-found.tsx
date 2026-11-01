import type { Metadata } from "next";
import { RecoveryPanel } from "@/components/RecoveryPanel";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <RecoveryPanel
      title="Page not found."
      body="The page you asked for is not here. Start from the home page or open the app."
      illustrationId="bookshelf"
    />
  );
}
