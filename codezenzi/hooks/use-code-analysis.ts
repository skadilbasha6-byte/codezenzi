"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { analyzeCode, type AnalysisResult } from "@/lib/analysis"
import type { LanguageId } from "@/lib/languages"

export type AnalysisStatus = "idle" | "analyzing" | "done" | "error"

interface UseCodeAnalysisReturn {
  result: AnalysisResult | null
  status: AnalysisStatus
  errorMessage: string | null
  /** Force an immediate analysis (used by the "Analyze" button). */
  runNow: () => void
}

const DEBOUNCE_MS = 500

export function useCodeAnalysis(code: string, language: LanguageId, enabled: boolean): UseCodeAnalysisReturn {
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [status, setStatus] = useState<AnalysisStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const tokenRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const run = useCallback(
    async (currentCode: string, lang: LanguageId) => {
      const token = ++tokenRef.current
      setStatus("analyzing")
      setErrorMessage(null)
      try {
        const res = await analyzeCode(currentCode, lang)
        if (token !== tokenRef.current) return // stale, a newer run started
        setResult(res)
        setStatus("done")
      } catch (err) {
        if (token !== tokenRef.current) return
        console.log("[codezenzi] analysis error:", err instanceof Error ? err.message : String(err))
        setStatus("error")
        setErrorMessage("Unable to analyze code. The analysis engine may still be loading — try again in a moment.")
      }
    },
    [],
  )

  const runNow = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    void run(code, language)
  }, [code, language, run])

  useEffect(() => {
    if (!enabled) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      void run(code, language)
    }, DEBOUNCE_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [code, language, enabled, run])

  return { result, status, errorMessage, runNow }
}
