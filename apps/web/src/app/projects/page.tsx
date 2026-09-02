"use client";

import { Calendar, Folder, Hash, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AppShell } from "@/components/workflow/shared/app-shell";
import { trpc } from "@/lib/trpc";

export default function ProjectsPage() {
  const { data, isLoading, error } = trpc.projects.list.useQuery({
    limit: 20,
  });

  return (
    <AppShell activeStep={1}>
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-6 pt-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Folder size={22} aria-hidden="true" />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Dự án
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              Danh sách dự án
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Quản lý và tiếp tục các bản đặc tả nghiên cứu đang thực hiện.
            </p>
          </div>
          <Link href="/projects/new">
            <Button className="shrink-0">
              <Plus size={16} className="mr-2" aria-hidden="true" />
              Tạo dự án mới
            </Button>
          </Link>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <p className="text-sm font-medium text-foreground">Tất cả dự án</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Đang tải...</p>
            ) : error ? (
              <p className="text-sm text-destructive">
                Không thể tải danh sách dự án.
              </p>
            ) : data && data.items.length > 0 ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {data.items.map((project) => (
                  <li key={project.id}>
                    <Link
                      href={`/projects/${project.id}/understanding`}
                      className="group block rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-semibold text-foreground group-hover:text-primary">
                            {project.title}
                          </h3>
                          {project.domain ? (
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {project.domain}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Hash size={12} aria-hidden="true" />
                          {project.id.slice(0, 8)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={12} aria-hidden="true" />
                          {new Date(project.createdAt).toLocaleDateString(
                            "vi-VN"
                          )}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Chưa có dự án nào. Hãy tạo dự án đầu tiên để bắt đầu.
                </p>
                <Link href="/projects/new" className="mt-4 inline-flex">
                  <Button variant="secondary">Tạo dự án mới</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
