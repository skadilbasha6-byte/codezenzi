export type Severity = "error" | "warning" | "suggestion" | "info"

export type AnalysisSource = "parser" | "linter" | "heuristic" | "ai"

export interface Diagnostic {
  /** Stable id derived from position + message so we can de-dupe and track fixes. */
  id: string
  severity: Severity
  /** e.g. "SyntaxError", "NameError", "UnusedVariable" */
  type: string
  message: string
  /** 1-based line number */
  line: number
  /** 1-based column number */
  column: number
  /** 1-based end line (defaults to line) */
  endLine?: number
  /** 1-based end column (defaults to end of line) */
  endColumn?: number
  /** Where this diagnostic came from. The parser is authoritative. */
  source: AnalysisSource
  /**
   * A confident, ready-to-apply replacement for the affected line(s).
   * When present, the UI can offer "Apply Fix".
   */
  suggestedFix?: {
    /** the original line text being replaced */
    before: string
    /** the corrected line text */
    after: string
    /** 1-based line the fix applies to */
    line: number
  }
  /** Human-friendly reason the fix works. */
  explanation?: string
  /** True when the analyzer is not confident about the fix. */
  lowConfidence?: boolean
}

export interface AnalysisResult {
  diagnostics: Diagnostic[]
  /** True when the analysis was produced by a real parser/compiler, false for heuristic-only. */
  usedRealParser: boolean
  /** Optional note surfaced to the user, e.g. "Heuristic checks only for this language." */
  note?: string
}

export function makeDiagnosticId(d: Pick<Diagnostic, "type" | "line" | "column">): string {
  return `${d.type}:${d.line}:${d.column}`
}

export function emptyResult(usedRealParser: boolean, note?: string): AnalysisResult {
  return { diagnostics: [], usedRealParser, note }
}
