import { CircleHelp } from "lucide-react";

import { AppShell } from "@/components/workflow/shared/app-shell";

export default function HelpPage() {
  return (
    <AppShell activeStep={1}>
      <div className="mx-auto flex min-h-full max-w-3xl items-start justify-center pt-12">
        <section className="w-full rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CircleHelp size={22} aria-hidden="true" />
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Trợ giúp
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            Tính năng đang phát triển
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Trung tâm trợ giúp chưa được triển khai. Nội dung hướng dẫn sử dụng
            workflow sẽ được bổ sung tại đây.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
