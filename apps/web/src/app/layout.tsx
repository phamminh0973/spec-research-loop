import type { Metadata } from "next";
import { TRPCProvider } from "@/lib/trpc-provider";

export const metadata: Metadata = {
  title: "SpecLoop · Structured decomposition",
  description:
    "Reviewable typed research cards, relations and explicit warnings.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
