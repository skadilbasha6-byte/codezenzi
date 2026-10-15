"use client"

import { Bot, Code2, Eye, FolderOpen, History, Info, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ViewId } from "@/lib/app-types"

interface NavItem {
  id: ViewId
  label: string
  icon: typeof Code2
}

const NAV: NavItem[] = [
  { id: "editor", label: "Code Editor", icon: Code2 },
  { id: "generator", label: "AI Code Generator", icon: Bot },
  { id: "projects", label: "Projects", icon: FolderOpen },
  { id: "history", label: "History", icon: History },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "about", label: "About", icon: Info },
]

interface Props {
  view: ViewId
  onNavigate: (v: ViewId) => void
  errorCount: number
}

export function AppSidebar({ view, onNavigate, errorCount }: Props) {
  return (
    <aside className="flex shrink-0 flex-col border-r border-border bg-sidebar md:w-60">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Eye className="h-4.5 w-4.5" />
        </div>
        <div className="hidden md:block">
          <p className="text-sm font-semibold leading-none tracking-tight">Codezenzi</p>
          <p className="mt-1 text-[10px] leading-none text-muted-foreground">Write. Detect. Fix.</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-2">
        {NAV.map((item) => {
          const Icon = item.icon
          const isActive = view === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
              )}
              title={item.label}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden md:inline">{item.label}</span>
              {item.id === "editor" && errorCount > 0 && (
                <span className="ml-auto hidden rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-400 md:inline">
                  {errorCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="hidden border-t border-border p-3 md:block">
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Analysis runs in your browser. Code is sent to the server only for AI features.
        </p>
      </div>
    </aside>
  )
}
