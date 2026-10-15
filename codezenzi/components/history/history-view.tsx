"use client"

import { AlertCircle, AlertTriangle, CheckCircle2, History, Lightbulb, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getLanguage } from "@/lib/languages"
import type { HistoryEntry } from "@/lib/app-types"
import { cn } from "@/lib/utils"

interface Props {
  history: HistoryEntry[]
  onJump: (line: number) => void
  onClear: () => void
}

export function HistoryView({ history, onJump, onClear }: Props) {
  const active = history.filter((h) => h.status === "active").length
  const fixed = history.filter((h) => h.status === "fixed").length

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-5 overflow-y-auto p-5 md:p-8">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
            <History className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Error History</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {active} active · {fixed} fixed. Click an entry to jump to its line.
            </p>
          </div>
        </div>
        {history.length > 0 && (
          <Button size="sm" variant="outline" className="gap-1.5 bg-transparent" onClick={onClear}>
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </header>

      {history.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
          <History className="h-8 w-8 opacity-40" />
          <p className="text-sm">No errors recorded yet. Start writing code in the editor.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          {history.map((h, i) => (
            <HistoryRow key={h.id} entry={h} onJump={onJump} isLast={i === history.length - 1} />
          ))}
        </div>
      )}
    </div>
  )
}

function HistoryRow({ entry, onJump, isLast }: { entry: HistoryEntry; onJump: (l: number) => void; isLast: boolean }) {
  const isFixed = entry.status === "fixed"
  const Icon = isFixed
    ? CheckCircle2
    : entry.severity === "warning"
      ? AlertTriangle
      : entry.severity === "suggestion"
        ? Lightbulb
        : AlertCircle
  const color = isFixed
    ? "text-emerald-400"
    : entry.severity === "warning"
      ? "text-amber-400"
      : entry.severity === "suggestion"
        ? "text-sky-400"
        : "text-red-400"

  return (
    <button
      type="button"
      onClick={() => onJump(entry.line)}
      className={cn(
        "flex w-full items-center gap-3 bg-card px-4 py-3 text-left transition-colors hover:bg-muted/50",
        !isLast && "border-b border-border",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", color)} />
      <span className="w-16 shrink-0 text-xs text-muted-foreground">Line {entry.line}</span>
      <span className="w-32 shrink-0 truncate text-sm font-medium">{entry.type}</span>
      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{entry.message}</span>
      <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
        {getLanguage(entry.language).label}
      </span>
      <span
        className={cn(
          "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold",
          isFixed ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400",
        )}
      >
        {isFixed ? "Fixed" : "Active"}
      </span>
    </button>
  )
}
