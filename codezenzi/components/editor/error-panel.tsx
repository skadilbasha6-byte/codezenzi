"use client"

import { useState } from "react"
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Info,
  Loader2,
  Lightbulb,
  MapPin,
  Sparkles,
  WifiOff,
  Wand2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { AnalysisResult, Diagnostic, Severity } from "@/lib/analysis"
import type { AnalysisStatus } from "@/hooks/use-code-analysis"
import type { LanguageId } from "@/lib/languages"
import type { Settings } from "@/lib/app-types"
import { DiffView } from "./diff-view"

interface Props {
  result: AnalysisResult | null
  status: AnalysisStatus
  errorMessage: string | null
  language: LanguageId
  code: string
  settings: Settings
  onApplyFix: (d: Diagnostic) => void
  onJumpToLine: (line: number) => void
  activeLine: number | null
}

const SEVERITY_META: Record<Severity, { label: string; icon: typeof AlertCircle; className: string; badge: string }> = {
  error: {
    label: "ERROR",
    icon: AlertCircle,
    className: "text-red-400",
    badge: "border-red-500/30 bg-red-500/10 text-red-400",
  },
  warning: {
    label: "WARNING",
    icon: AlertTriangle,
    className: "text-amber-400",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  },
  suggestion: {
    label: "SUGGESTION",
    icon: Lightbulb,
    className: "text-sky-400",
    badge: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  },
  info: {
    label: "INFO",
    icon: Info,
    className: "text-muted-foreground",
    badge: "border-border bg-muted text-muted-foreground",
  },
}

export function ErrorPanel(props: Props) {
  const { result, status, errorMessage } = props
  const diagnostics = result?.diagnostics ?? []

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold tracking-tight">Analysis</h2>
          {status === "analyzing" && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Analyzing…
            </span>
          )}
        </div>
        {diagnostics.length > 0 && (
          <Badge variant="outline" className="text-xs">
            {diagnostics.length} {diagnostics.length === 1 ? "issue" : "issues"}
          </Badge>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {status === "error" ? (
          <BackendError message={errorMessage} />
        ) : diagnostics.length === 0 && (status === "done" || status === "idle") ? (
          <NoErrors />
        ) : diagnostics.length === 0 && status === "analyzing" && !result ? (
          <LoadingState />
        ) : (
          <div className="flex flex-col gap-3 p-4">
            {result && !result.usedRealParser && result.note && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300/90">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{result.note}</span>
              </div>
            )}
            {diagnostics.map((d) => (
              <DiagnosticCard key={d.id} diagnostic={d} usedRealParser={result?.usedRealParser ?? false} {...props} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function NoErrors() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
        <CheckCircle2 className="h-7 w-7 text-emerald-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-emerald-400">No errors detected</p>
        <p className="mt-1 text-sm text-muted-foreground">Your code looks good.</p>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Analyzing your code…</p>
    </div>
  )
}

function BackendError({ message }: { message: string | null }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10">
        <WifiOff className="h-6 w-6 text-amber-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-amber-400">Unable to analyze code</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          {message ?? "Check your connection and try again. Your code is safe."}
        </p>
      </div>
    </div>
  )
}

interface AiExplanation {
  explanation: string
  suggestedFix: string
  reason: string
  alternative: string
}

function DiagnosticCard({
  diagnostic: d,
  usedRealParser,
  language,
  code,
  settings,
  onApplyFix,
  onJumpToLine,
  activeLine,
}: Props & { diagnostic: Diagnostic; usedRealParser: boolean }) {
  const meta = SEVERITY_META[d.severity]
  const Icon = meta.icon
  const [open, setOpen] = useState(d.severity === "error")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [aiState, setAiState] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [ai, setAi] = useState<AiExplanation | null>(null)

  const isActive = activeLine === d.line

  async function fetchAi() {
    setAiState("loading")
    try {
      const lines = code.split("\n")
      const nearby = lines.slice(Math.max(0, d.line - 3), d.line + 2).join("\n")
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          code,
          errorType: d.type,
          errorMessage: d.message,
          line: d.line,
          nearbyCode: nearby,
          analyzerOutput: `${d.type} at line ${d.line}:${d.column} — ${d.message}`,
        }),
      })
      if (!res.ok) throw new Error("failed")
      const data = (await res.json()) as AiExplanation
      setAi(data)
      setAiState("done")
    } catch {
      setAiState("error")
    }
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-background transition-colors",
        isActive ? "border-primary/50 ring-1 ring-primary/30" : "border-border",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-3 px-3 py-3 text-left hover:bg-muted/40"
      >
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", meta.className)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide", meta.badge)}>
              {meta.label}
            </span>
            <span className="truncate text-sm font-medium">{d.type}</span>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">{d.message}</p>
        </div>
        <ChevronDown className={cn("mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="border-t border-border px-3 py-3">
          <button
            type="button"
            onClick={() => onJumpToLine(d.line)}
            className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <MapPin className="h-3 w-3" />
            Line {d.line}
            {d.column ? `, Col ${d.column}` : ""}
          </button>

          <p className="text-sm leading-relaxed text-foreground/90">{d.message}</p>

          <div className="mt-2 flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                d.source === "parser"
                  ? "border-emerald-500/30 text-emerald-400"
                  : d.source === "ai"
                    ? "border-violet-500/30 text-violet-400"
                    : "border-border text-muted-foreground",
              )}
            >
              {d.source === "parser"
                ? usedRealParser
                  ? "Actual parser"
                  : "Static analysis"
                : d.source === "ai"
                  ? "AI suggestion"
                  : d.source === "linter"
                    ? "Linter"
                    : "Structural check"}
            </Badge>
            {d.lowConfidence && <span className="text-[10px] text-amber-400">Possible issue — low confidence</span>}
          </div>

          {d.explanation && (
            <div className="mt-3 rounded-md border border-border bg-muted/40 p-2.5">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Lightbulb className="h-3 w-3" /> Why?
              </p>
              <p className="mt-1 text-xs leading-relaxed text-foreground/80">{d.explanation}</p>
            </div>
          )}

          {d.suggestedFix && (
            <div className="mt-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-400">
                <Check className="h-3 w-3" /> Correct code
              </p>
              <DiffView before={d.suggestedFix.before} after={d.suggestedFix.after} />
              <Button size="sm" className="mt-2 h-7 gap-1.5 text-xs" onClick={() => setConfirmOpen(true)}>
                <Wand2 className="h-3.5 w-3.5" />
                Apply Fix
              </Button>
            </div>
          )}

          {settings.aiExplanations && (
            <div className="mt-3 border-t border-border pt-3">
              {aiState === "idle" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 text-xs bg-transparent"
                  onClick={fetchAi}
                >
                  <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                  Explain with AI
                </Button>
              )}
              {aiState === "loading" && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Asking Codezenzi AI…
                </p>
              )}
              {aiState === "error" && (
                <p className="text-xs text-amber-400">AI explanation is unavailable right now.</p>
              )}
              {aiState === "done" && ai && (
                <div className="space-y-2 rounded-md border border-violet-500/20 bg-violet-500/5 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-violet-400">
                    <Sparkles className="h-3 w-3" /> AI suggestion
                  </p>
                  <p className="text-xs leading-relaxed text-foreground/85">{ai.explanation}</p>
                  {ai.suggestedFix && (
                    <pre className="overflow-x-auto rounded bg-background/80 p-2 text-[11px] leading-relaxed text-foreground/90">
                      <code>{ai.suggestedFix}</code>
                    </pre>
                  )}
                  {ai.reason && (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      <span className="font-medium text-foreground/70">Why it works: </span>
                      {ai.reason}
                    </p>
                  )}
                  {ai.alternative && (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      <span className="font-medium text-foreground/70">Alternative: </span>
                      {ai.alternative}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {d.suggestedFix && (
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply suggested fix?</DialogTitle>
              <DialogDescription>
                Codezenzi will replace line {d.suggestedFix.line}. Review the change before applying — your code is never
                modified silently.
              </DialogDescription>
            </DialogHeader>
            <DiffView before={d.suggestedFix.before} after={d.suggestedFix.after} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onApplyFix(d)
                  setConfirmOpen(false)
                }}
              >
                Apply Fix
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
