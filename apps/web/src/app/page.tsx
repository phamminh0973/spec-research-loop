import Link from "next/link";
import { ArrowRight, Home } from "lucide-react";

import { AppShell } from "@/components/workflow/shared/app-shell";

export default function HomePage() {
  return (
    <AppShell activeStep={1}>
      <div className="mx-auto flex min-h-full max-w-4xl items-start justify-center pt-12">
        <section className="w-full rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Home size={22} aria-hidden="true" />
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            SpecResearch Loop
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            Trang chủ
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Bắt đầu hoặc tiếp tục xây dựng bản đặc tả nghiên cứu của bạn từ khu
            vực Dự án.
          </p>
          <Link
            href="/projects"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Mở Dự án
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
