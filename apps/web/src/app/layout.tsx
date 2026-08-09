import type { Metadata } from "next";
import { TRPCProvider } from "@/lib/trpc-provider";

export const metadata: Metadata = {
  title: "SpecLoop",
  description:
    "Evidence-grounded research specification assistant. PLANNED scaffold.",
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
