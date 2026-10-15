"use client"

import { getPyodide } from "./pyodide-loader"
import { normalizeAll, type RawDiagnostic } from "./normalize"
import type { AnalysisResult } from "./types"

export async function analyzePython(code: string): Promise<AnalysisResult> {
  const pyodide = await getPyodide()
  pyodide.globals.set("__codelens_source", code)
  const jsonStr = pyodide.runPython("_analyze(__codelens_source)") as string
  const raws = JSON.parse(jsonStr) as RawDiagnostic[]
  return {
    diagnostics: normalizeAll(raws, code),
    usedRealParser: true,
  }
}
