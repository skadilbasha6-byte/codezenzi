import type { Diagnostic, Severity, AnalysisSource } from "./types"
import { makeDiagnosticId } from "./types"

export interface RawDiagnostic {
  type: string
  line: number
  column: number
  message: string
  source: AnalysisSource
  endLine?: number
  endColumn?: number
  /** For NameError: the undefined identifier */
  name?: string
  /** For NameError: a close-match correction */
  suggestion?: string
  lowConfidence?: boolean
}

const WARNING_TYPES = new Set([
  "UnusedImport",
  "UnusedVariable",
  "UnreachableCode",
  "Warning",
  "PossibleTypeIssue",
])

const SUGGESTION_TYPES = new Set(["Naming", "Simplification", "Suggestion", "Style"])

function severityFor(type: string): Severity {
  if (WARNING_TYPES.has(type)) return "warning"
  if (SUGGESTION_TYPES.has(type)) return "suggestion"
  return "error"
}

const EXPLANATIONS: Record<string, string> = {
  SyntaxError: "The parser could not make sense of this line. Check for missing punctuation such as colons, commas, brackets, or quotes.",
  IndentationError: "Python uses indentation to define blocks. Make sure this line is indented consistently with its surrounding block.",
  NameError: "This name is used before it is defined. Define it first, or check for a typo.",
  UnusedImport: "This import is never referenced, so it can be safely removed to keep the code clean.",
  UnusedVariable: "This variable is assigned but never read. Remove it or use it.",
}

/**
 * Derives a confident single-line fix from the parser's own message where possible.
 * The logic is message-driven (not example-driven), so it generalizes.
 */
function deriveFix(
  raw: RawDiagnostic,
  lines: string[],
): { before: string; after: string; line: number } | undefined {
  const idx = raw.line - 1
  const original = lines[idx] ?? ""
  const msg = raw.message.toLowerCase()

  // Missing colon after a compound statement header (def/if/for/while/class/else/elif/try/except/with)
  if (msg.includes("expected ':'") || (msg.includes("expected") && msg.includes("':'"))) {
    const trimmedEnd = original.replace(/\s+$/, "")
    if (trimmedEnd.length && !trimmedEnd.endsWith(":")) {
      return { before: original, after: trimmedEnd + ":", line: raw.line }
    }
  }

  // Undefined name with a close match -> replace the identifier on that line.
  if (raw.type === "NameError" && raw.name && raw.suggestion) {
    const re = new RegExp(`\\b${escapeRegExp(raw.name)}\\b`)
    if (re.test(original)) {
      return { before: original, after: original.replace(re, raw.suggestion), line: raw.line }
    }
  }

  // Unclosed bracket / parenthesis / brace reported by the parser.
  const closerMatch = msg.match(/'(\[|\(|\{)' was never closed/)
  if (closerMatch) {
    const closer = { "[": "]", "(": ")", "{": "}" }[closerMatch[1]]
    const trimmedEnd = original.replace(/\s+$/, "")
    return { before: original, after: trimmedEnd + closer, line: raw.line }
  }

  // Missing closing parenthesis (common phrasing across parsers).
  if (msg.includes("'(' was never closed") || msg.includes("unexpected eof") || msg.includes("missing )")) {
    const opens = (original.match(/\(/g) || []).length
    const closes = (original.match(/\)/g) || []).length
    if (opens > closes) {
      return { before: original, after: original.replace(/\s+$/, "") + ")".repeat(opens - closes), line: raw.line }
    }
  }

  return undefined
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function normalizeDiagnostic(raw: RawDiagnostic, lines: string[]): Diagnostic {
  const severity = severityFor(raw.type)
  const fix = deriveFix(raw, lines)
  const explanation =
    (raw.suggestion && raw.type === "NameError"
      ? `Did you mean "${raw.suggestion}"? The name "${raw.name}" is not defined anywhere in scope.`
      : undefined) ?? EXPLANATIONS[raw.type]

  return {
    id: makeDiagnosticId(raw),
    severity,
    type: raw.type,
    message: raw.message,
    line: raw.line,
    column: raw.column,
    endLine: raw.endLine,
    endColumn: raw.endColumn,
    source: raw.source,
    suggestedFix: fix,
    explanation,
    lowConfidence: raw.lowConfidence,
  }
}

export function normalizeAll(raws: RawDiagnostic[], code: string): Diagnostic[] {
  const lines = code.split("\n")
  const seen = new Set<string>()
  const out: Diagnostic[] = []
  for (const raw of raws) {
    const d = normalizeDiagnostic(raw, lines)
    if (seen.has(d.id)) continue
    seen.add(d.id)
    out.push(d)
  }
  return out.sort((a, b) => a.line - b.line || a.column - b.column)
}
