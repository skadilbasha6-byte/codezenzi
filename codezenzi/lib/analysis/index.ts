"use client"

import { getLanguage, type LanguageId } from "../languages"
import type { AnalysisResult } from "./types"
import { analyzePython } from "./python"
import { analyzeJavaScript } from "./javascript"
import { analyzeDelimiters, analyzeCss, analyzeHtml } from "./structural"

export type { AnalysisResult } from "./types"
export type { Diagnostic, Severity } from "./types"

/**
 * Central entry point. Routes each language to its most accurate available
 * analyzer: a real parser/compiler where one runs in the browser (Python via
 * Pyodide/CPython, JS/TS via Babel), and genuine structural checks otherwise.
 */
export async function analyzeCode(code: string, language: LanguageId): Promise<AnalysisResult> {
  const cfg = getLanguage(language)

  switch (cfg.analysis) {
    case "python-ast":
      return analyzePython(code)
    case "js-parser":
      return analyzeJavaScript(code, language === "typescript")
    case "css":
      return analyzeCss(code)
    case "html":
      return analyzeHtml(code)
    case "delimiter":
    default:
      return analyzeDelimiters(code, delimiterOptionsFor(language))
  }
}

function delimiterOptionsFor(language: LanguageId) {
  switch (language) {
    case "sql":
      return {
        lineComment: "--",
        blockComment: ["/*", "*/"] as [string, string],
        strings: ["'"],
        note: "Structural checks for SQL: balanced parentheses and quotes. Use AI analysis for query semantics.",
      }
    case "java":
    case "c":
    case "cpp":
    default:
      return {
        lineComment: "//",
        blockComment: ["/*", "*/"] as [string, string],
        strings: ['"', "'"],
      }
  }
}
