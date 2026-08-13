"use client"

import { useState, type ReactNode } from "react"
import {
  Infinity,
  House,
  Folder,
  History,
  CircleHelp,
  ChevronDown,
  User,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useIsDesktop } from "@/hooks/use-is-desktop"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { SpecPreviewPanel, SpecPreviewCollapsedRail } from "@/components/spec-preview-panel"

type NavItem = {
  label: string
  icon: typeof House
  active?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: "Trang chủ", icon: House, active: true },
  { label: "Dự án", icon: Folder },
  { label: "Lịch sử phiên bản", icon: History },
  { label: "Trợ giúp", icon: CircleHelp },
]

export function AppShell({ children }: { children: ReactNode }) {
  const [panelOpen, setPanelOpen] = useState(true)
  const isDesktop = useIsDesktop()

  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-8 px-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand text-brand-foreground">
              <Infinity className="size-5" />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-ink">SpecResearch Loop</span>
          </div>

          {/* Nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.label}
                type="button"
                // TODO: wire to real API / router navigation
                className={cn(
                  "relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  item.active
                    ? "text-brand"
                    : "text-slate-500 hover:text-slate-800",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
                {item.active && (
                  <span className="absolute inset-x-2 -bottom-[9px] h-0.5 rounded-full bg-brand" />
                )}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {/* Spec preview panel toggle */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setPanelOpen((value) => !value)}
              aria-label={panelOpen ? "Ẩn bảng xem trước spec" : "Hiện bảng xem trước spec"}
              className="text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              {panelOpen ? <PanelRightClose className="size-5" /> : <PanelRightOpen className="size-5" />}
            </Button>

            {/* Avatar */}
            <button
              type="button"
              // TODO: wire to real API / account menu
              className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 text-slate-500 transition-colors hover:bg-slate-100"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <User className="size-4" />
              </span>
              <ChevronDown className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        <main className="min-w-0 flex-1 px-6 py-8">{children}</main>

        {/* Desktop persistent sidebar / collapsed rail */}
        <aside
          className={cn(
            "sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 border-l border-slate-200 lg:block",
            panelOpen ? "w-[380px]" : "w-14",
          )}
        >
          {panelOpen ? (
            <SpecPreviewPanel className="h-full" />
          ) : (
            <SpecPreviewCollapsedRail onExpand={() => setPanelOpen(true)} />
          )}
        </aside>
      </div>

      {/* Mobile slide-over drawer (only mounted once we know we're on a mobile viewport) */}
      {isDesktop === false && (
        <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
          <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
            <SheetTitle className="sr-only">Bản đặc tả hiện tại</SheetTitle>
            <SpecPreviewPanel className="h-full" />
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
