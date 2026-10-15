import { parse } from "@babel/parser"
import { normalizeAll, type RawDiagnostic } from "./normalize"
import type { AnalysisResult } from "./types"

interface BabelError extends SyntaxError {
  loc?: { line: number; column: number }
  reasonCode?: string
}

/**
 * Uses Babel's real JavaScript/TypeScript parser to detect genuine syntax errors.
 * Babel reports precise positions and human-readable reasons.
 */
export function analyzeJavaScript(code: string, typescript: boolean): AnalysisResult {
  const raws: RawDiagnostic[] = []
  try {
    parse(code, {
      sourceType: "module",
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true,
      allowSuperOutsideMethod: true,
      errorRecovery: false,
      plugins: typescript ? ["typescript", "jsx"] : ["jsx"],
    })
  } catch (err) {
    const e = err as BabelError
    const line = e.loc?.line ?? 1
    const column = (e.loc?.column ?? 0) + 1
    // Babel appends "(line:col)" to messages; strip it for a cleaner display.
    const message = e.message.replace(/\s*\(\d+:\d+\)\s*$/, "").trim()
    raws.push({
      type: "SyntaxError",
      line,
      column,
      message: message || "Invalid syntax",
      source: "parser",
    })
  }

  return {
    diagnostics: normalizeAll(raws, code),
    usedRealParser: true,
  }
}
