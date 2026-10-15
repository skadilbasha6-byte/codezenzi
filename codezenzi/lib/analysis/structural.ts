import { normalizeAll, type RawDiagnostic } from "./normalize"
import type { AnalysisResult } from "./types"

const NOTE_HEURISTIC =
  "Structural checks only. This language has no in-browser compiler, so Codezenzi verifies balanced brackets, quotes, and blocks. Use the AI explanation for deeper analysis."

interface Pos {
  line: number
  column: number
}

const PAIRS: Record<string, string> = { "(": ")", "[": "]", "{": "}" }
const CLOSERS = new Set([")", "]", "}"])

/**
 * Genuine balanced-delimiter and unterminated-string analysis. Works for any
 * C-like / SQL-like language. This is real static analysis, not AI guessing.
 */
export function analyzeDelimiters(
  code: string,
  opts: { lineComment?: string; blockComment?: [string, string]; strings?: string[]; note?: string } = {},
): AnalysisResult {
  const lineComment = opts.lineComment ?? "//"
  const blockComment = opts.blockComment ?? ["/*", "*/"]
  const stringChars = opts.strings ?? ['"', "'"]
  const raws: RawDiagnostic[] = []

  const stack: { ch: string; pos: Pos }[] = []
  let line = 1
  let column = 1
  let i = 0
  const n = code.length

  let stringStart: Pos | null = null
  let stringChar = ""
  let inLineComment = false
  let inBlockComment = false

  const advance = (ch: string) => {
    if (ch === "\n") {
      line++
      column = 1
    } else {
      column++
    }
  }

  while (i < n) {
    const ch = code[i]
    const rest = code.slice(i)

    if (inLineComment) {
      if (ch === "\n") inLineComment = false
      advance(ch)
      i++
      continue
    }
    if (inBlockComment) {
      if (rest.startsWith(blockComment[1])) {
        for (let k = 0; k < blockComment[1].length; k++) {
          advance(code[i])
          i++
        }
        inBlockComment = false
        continue
      }
      advance(ch)
      i++
      continue
    }
    if (stringStart) {
      if (ch === "\\") {
        advance(ch)
        i++
        if (i < n) {
          advance(code[i])
          i++
        }
        continue
      }
      if (ch === stringChar) {
        stringStart = null
      } else if (ch === "\n") {
        raws.push({
          type: "SyntaxError",
          line: stringStart.line,
          column: stringStart.column,
          message: `${stringChar} string literal was never closed`,
          source: "heuristic",
        })
        stringStart = null
      }
      advance(ch)
      i++
      continue
    }

    // not in string/comment
    if (rest.startsWith(lineComment)) {
      inLineComment = true
      for (let k = 0; k < lineComment.length; k++) {
        advance(code[i])
        i++
      }
      continue
    }
    if (rest.startsWith(blockComment[0])) {
      inBlockComment = true
      for (let k = 0; k < blockComment[0].length; k++) {
        advance(code[i])
        i++
      }
      continue
    }
    if (stringChars.includes(ch)) {
      stringStart = { line, column }
      stringChar = ch
      advance(ch)
      i++
      continue
    }
    if (ch in PAIRS) {
      stack.push({ ch, pos: { line, column } })
    } else if (CLOSERS.has(ch)) {
      const top = stack[stack.length - 1]
      if (!top || PAIRS[top.ch] !== ch) {
        raws.push({
          type: "SyntaxError",
          line,
          column,
          message: `Unexpected '${ch}' — no matching opening bracket`,
          source: "heuristic",
        })
      } else {
        stack.pop()
      }
    }
    advance(ch)
    i++
  }

  for (const open of stack) {
    raws.push({
      type: "SyntaxError",
      line: open.pos.line,
      column: open.pos.column,
      message: `'${open.ch}' was never closed`,
      source: "heuristic",
    })
  }
  if (stringStart) {
    raws.push({
      type: "SyntaxError",
      line: stringStart.line,
      column: stringStart.column,
      message: `${stringChar} string literal was never closed`,
      source: "heuristic",
    })
  }

  return {
    diagnostics: normalizeAll(raws, code),
    usedRealParser: false,
    note: opts.note ?? NOTE_HEURISTIC,
  }
}

/** CSS: brace balance + missing semicolons inside rule bodies + unterminated strings. */
export function analyzeCss(code: string): AnalysisResult {
  const base = analyzeDelimiters(code, {
    lineComment: "\u0000", // CSS has no line comments
    blockComment: ["/*", "*/"],
    strings: ['"', "'"],
    note: "Structural checks for CSS: balanced braces, strings, and declaration syntax.",
  })
  const raws: RawDiagnostic[] = base.diagnostics.map((d) => ({
    type: d.type,
    line: d.line,
    column: d.column,
    message: d.message,
    source: d.source,
  }))

  // Detect declarations missing a semicolon (e.g. `color: red` followed by `}` or another prop).
  const lines = code.split("\n")
  let depth = 0
  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx]
    const line = rawLine.replace(/\/\*.*?\*\//g, "").trim()
    const opens = (line.match(/\{/g) || []).length
    const closes = (line.match(/\}/g) || []).length
    const insideBlock = depth > 0
    if (
      insideBlock &&
      line.length > 0 &&
      line.includes(":") &&
      !line.endsWith(";") &&
      !line.endsWith("{") &&
      !line.endsWith("}") &&
      !line.endsWith(",")
    ) {
      raws.push({
        type: "Warning",
        line: idx + 1,
        column: rawLine.length + 1,
        message: "Missing ';' at the end of this declaration",
        source: "heuristic",
      })
    }
    depth += opens - closes
    if (depth < 0) depth = 0
  }

  return { diagnostics: normalizeAll(raws, code), usedRealParser: false, note: base.note }
}

const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr",
])

/** HTML: unclosed tag detection via a tag stack, ignoring void elements. */
export function analyzeHtml(code: string): AnalysisResult {
  const raws: RawDiagnostic[] = []
  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9-]*)([^>]*?)(\/?)>/g
  const stack: { tag: string; line: number; column: number }[] = []

  const lineAt = (index: number) => {
    const before = code.slice(0, index)
    const line = before.split("\n").length
    const column = index - before.lastIndexOf("\n")
    return { line, column }
  }

  let m: RegExpExecArray | null
  while ((m = tagRe.exec(code))) {
    const full = m[0]
    const tag = m[1].toLowerCase()
    const selfClosing = m[3] === "/" || VOID_TAGS.has(tag)
    const isClosing = full.startsWith("</")
    const { line, column } = lineAt(m.index)
    if (tag === "!doctype") continue
    if (isClosing) {
      // find matching open
      let found = -1
      for (let k = stack.length - 1; k >= 0; k--) {
        if (stack[k].tag === tag) {
          found = k
          break
        }
      }
      if (found === -1) {
        raws.push({
          type: "Warning",
          line,
          column,
          message: `Closing tag </${tag}> has no matching opening tag`,
          source: "heuristic",
        })
      } else {
        // anything above `found` is unclosed
        for (let k = stack.length - 1; k > found; k--) {
          const u = stack[k]
          raws.push({
            type: "Warning",
            line: u.line,
            column: u.column,
            message: `<${u.tag}> is not closed before </${tag}>`,
            source: "heuristic",
          })
        }
        stack.length = found
      }
    } else if (!selfClosing) {
      stack.push({ tag, line, column })
    }
  }

  for (const open of stack) {
    raws.push({
      type: "Warning",
      line: open.line,
      column: open.column,
      message: `<${open.tag}> tag is never closed`,
      source: "heuristic",
    })
  }

  return {
    diagnostics: normalizeAll(raws, code),
    usedRealParser: false,
    note: "Structural checks for HTML: unclosed tags and mismatched elements.",
  }
}
