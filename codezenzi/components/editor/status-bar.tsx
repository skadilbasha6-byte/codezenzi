"use client"

import { AlertCircle, AlertTriangle, Lightbulb, Loader2, Radio } from "lucide-react"
import { getLanguage, type LanguageId } from "@/lib/languages"
import type { AnalysisStatus } from "@/hooks/use-code-analysis"

interface Props {
  errorCount: number
  warningCount: number
  suggestionCount: number
  status: AnalysisStatus
  usedRealParser: boolean
  language: LanguageId
}

export function StatusBar({ errorCount, warningCount, suggestionCount, status, usedRealParser, language }: Props) {
  const cfg = getLanguage(language)
  return (
    <div className="flex items-center gap-4 border-t border-border bg-card px-4 py-1.5 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <AlertCircle className="h-3.5 w-3.5 text-red-400" />
        Errors: <span className="font-medium text-foreground">{errorCount}</span>
      </span>
      <span className="flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
        Warnings: <span className="font-medium text-foreground">{warningCount}</span>
      </span>
      <span className="hidden items-center gap-1.5 sm:flex">
        <Lightbulb className="h-3.5 w-3.5 text-sky-400" />
        Suggestions: <span className="font-medium text-foreground">{suggestionCount}</span>
      </span>
      <div className="ml-auto flex items-center gap-3">
        <span className="hidden md:inline">{usedRealParser ? "Real parser" : "Structural checks"}</span>
        <span>{cfg.label}</span>
        <span className="flex items-center gap-1.5">
          {status === "analyzing" ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span className="text-primary">Analyzing</span>
            </>
          ) : (
            <>
              <Radio className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Monitoring</span>
            </>
          )}
        </span>
      </div>
    </div>
  )
}
