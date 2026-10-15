"use client"

import { forwardRef, useCallback, useImperativeHandle, useRef } from "react"
import Editor, { type OnMount } from "@monaco-editor/react"
import type { editor as MonacoEditor, IDisposable } from "monaco-editor"
import type { Diagnostic } from "@/lib/analysis"
import { getLanguage, type LanguageId } from "@/lib/languages"

export interface MonacoHandle {
  format: () => void
  revealLine: (line: number) => void
  focus: () => void
}

interface Props {
  code: string
  language: LanguageId
  onChange: (value: string) => void
  diagnostics: Diagnostic[]
  onErrorLineClick?: (line: number) => void
}

type MonacoNS = typeof import("monaco-editor")

function toMarkerSeverity(monaco: MonacoNS, d: Diagnostic): MonacoEditor.IMarkerData["severity"] {
  switch (d.severity) {
    case "error":
      return monaco.MarkerSeverity.Error
    case "warning":
      return monaco.MarkerSeverity.Warning
    case "suggestion":
      return monaco.MarkerSeverity.Hint
    default:
      return monaco.MarkerSeverity.Info
  }
}

export const MonacoCodeEditor = forwardRef<MonacoHandle, Props>(function MonacoCodeEditor(
  { code, language, onChange, diagnostics, onErrorLineClick },
  ref,
) {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<MonacoNS | null>(null)
  const clickDisposable = useRef<IDisposable | null>(null)

  useImperativeHandle(ref, () => ({
    format: () => {
      editorRef.current?.getAction("editor.action.formatDocument")?.run()
    },
    revealLine: (line: number) => {
      const ed = editorRef.current
      if (!ed) return
      ed.revealLineInCenter(line)
      ed.setPosition({ lineNumber: line, column: 1 })
      ed.focus()
    },
    focus: () => editorRef.current?.focus(),
  }))

  const applyMarkers = useCallback((diags: Diagnostic[]) => {
    const monaco = monacoRef.current
    const ed = editorRef.current
    if (!monaco || !ed) return
    const model = ed.getModel()
    if (!model) return
    const markers: MonacoEditor.IMarkerData[] = diags.map((d) => {
      const startLine = Math.max(1, d.line)
      const startCol = Math.max(1, d.column)
      const endLine = d.endLine ?? startLine
      const endCol = d.endColumn ?? model.getLineMaxColumn(Math.min(endLine, model.getLineCount()))
      return {
        severity: toMarkerSeverity(monaco, d),
        startLineNumber: startLine,
        startColumn: startCol,
        endLineNumber: endLine,
        endColumn: Math.max(endCol, startCol + 1),
        message: `${d.type}: ${d.message}`,
        source: d.source === "ai" ? "Codezenzi AI" : "Codezenzi",
      }
    })
    monaco.editor.setModelMarkers(model, "codelens", markers)
  }, [])

  const handleMount: OnMount = (ed, monaco) => {
    editorRef.current = ed
    monacoRef.current = monaco

    // Our analyzers are the single source of truth for markers.
    monaco.languages.typescript?.javascriptDefaults?.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true,
    })
    monaco.languages.typescript?.typescriptDefaults?.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true,
    })

    clickDisposable.current?.dispose()
    clickDisposable.current = ed.onMouseDown((e) => {
      const target = e.target
      const isGutter =
        target?.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN ||
        target?.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS
      if (isGutter && target.position && onErrorLineClick) {
        onErrorLineClick(target.position.lineNumber)
      }
    })

    applyMarkers(diagnostics)
  }

  // Re-apply markers whenever diagnostics change.
  const lastDiagKey = useRef<string>("")
  const diagKey = diagnostics.map((d) => `${d.id}`).join("|")
  if (diagKey !== lastDiagKey.current) {
    lastDiagKey.current = diagKey
    applyMarkers(diagnostics)
  }

  return (
    <Editor
      className="h-full w-full"
      theme="vs-dark"
      language={getLanguage(language).monaco}
      value={code}
      onChange={(v) => onChange(v ?? "")}
      onMount={handleMount}
      options={{
        fontSize: 14,
        lineHeight: 21,
        fontFamily:
          "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        renderLineHighlight: "all",
        cursorBlinking: "smooth",
        smoothScrolling: true,
        padding: { top: 14, bottom: 14 },
        bracketPairColorization: { enabled: true },
        guides: { bracketPairs: true, indentation: true },
        folding: true,
        matchBrackets: "always",
        formatOnPaste: true,
        suggestOnTriggerCharacters: true,
        quickSuggestions: true,
        multiCursorModifier: "ctrlCmd",
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
      }}
    />
  )
})
