"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Play, Sparkles, Trash2, WandSparkles, ShieldCheck, Terminal, RotateCcw, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MonacoCodeEditor, type MonacoHandle } from "./monaco-editor"
import { ErrorPanel } from "./error-panel"
import { LanguageSelect } from "@/components/language-select"
import { StatusBar } from "./status-bar"
import type { AnalysisResult, Diagnostic } from "@/lib/analysis"
import type { AnalysisStatus } from "@/hooks/use-code-analysis"
import type { LanguageId } from "@/lib/languages"
import type { Settings } from "@/lib/app-types"

interface Props {
  code: string
  onCodeChange: (code: string) => void
  language: LanguageId
  onLanguageChange: (l: LanguageId) => void
  result: AnalysisResult | null
  status: AnalysisStatus
  errorMessage: string | null
  runNow: () => void
  settings: Settings
  onApplyFix: (d: Diagnostic) => void
  onClear: () => void
  jumpLine: number | null
  onJumpConsumed: () => void
}

export function EditorView(props: Props) {
  const {
    code,
    onCodeChange,
    language,
    onLanguageChange,
    result,
    status,
    errorMessage,
    runNow,
    settings,
    onApplyFix,
    onClear,
    jumpLine,
    onJumpConsumed,
  } = props
  const editorRef = useRef<MonacoHandle>(null)
  const [activeLine, setActiveLine] = useState<number | null>(null)
  const [input, setInput] = useState("")
  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  const [output, setOutput] = useState("")
  const [ioTab, setIoTab] = useState<"input" | "output">("input")
  const [isIoMinimized, setIsIoMinimized] = useState(false)
  const inputNames = useMemo(() => {
    const names = new Set<string>()
    const pattern = language === "python"
      ? /(?:^|\n)\s*([A-Za-z_]\w*)\s*=\s*(?:(?:int|float|str)\s*\(\s*)?input\s*\(/g
      : /(?:^|\n)\s*(?:const|let|var)\s+([A-Za-z_]\w*)\s*=\s*prompt\s*\(/g
    let match: RegExpExecArray | null
    while ((match = pattern.exec(code)) !== null) names.add(match[1])
    return Array.from(names)
  }, [code, language])

  function runWithInput() {
    const source = code.trim()
    const values: Record<string, string> = { ...inputValues }
    if (input.trim()) {
      const pendingNames = inputNames.filter((name) => !values[name])
      if (pendingNames.length === 1) values[pendingNames[0]] = input.trim()
      else if (inputNames.length === 0) values.__stdin = input.trim()
    }
    const printedValues: string[] = []
    const printPattern = language === "python" ? /print\s*\(([^\n]*)\)/g : /console\.log\s*\(([^\n]*)\)/g
    let match: RegExpExecArray | null

    while ((match = printPattern.exec(source)) !== null) {
      const expressions = match[1].split(/,(?=(?:[^\"'`]*[\"'`][^\"'`]*[\"'`])*[^\"'`]*$)/)
      const resolved = expressions.map((part) => {
        const expression = part.trim()
        const quoted = expression.match(/^[\"'`]([\\s\\S]*)[\"'`]$/)
        if (quoted) return quoted[1]

        const variable = expression.match(/^[A-Za-z_]\w*$/)
        if (variable && values[variable[0]] !== undefined) return values[variable[0]]

        const arithmetic = expression.match(/^([A-Za-z_]\w*)\s*([+*/-])\s*(-?\d+(?:\.\d+)?)$/)
        if (arithmetic && values[arithmetic[1]] !== undefined) {
          const left = Number(values[arithmetic[1]])
          const right = Number(arithmetic[3])
          const result = arithmetic[2] === "+" ? left + right : arithmetic[2] === "-" ? left - right : arithmetic[2] === "*" ? left * right : left / right
          return String(result)
        }
        return expression
      })
      printedValues.push(resolved.join(" "))
    }

    setIoTab("output")
    setOutput(printedValues.length > 0 ? printedValues.join("\\n") : "No output detected. Add a print statement or provide input, then run again.")
  }

  // Consume a jump request coming from other views (e.g. History).
  useEffect(() => {
    if (jumpLine == null) return
    setActiveLine(jumpLine)
    let tries = 0
    const attempt = () => {
      if (editorRef.current) {
        editorRef.current.revealLine(jumpLine)
        onJumpConsumed()
        return
      }
      if (tries++ < 20) setTimeout(attempt, 60)
      else onJumpConsumed()
    }
    attempt()
  }, [jumpLine, onJumpConsumed])

  const diagnostics = result?.diagnostics ?? []
  const errorCount = diagnostics.filter((d) => d.severity === "error").length
  const warningCount = diagnostics.filter((d) => d.severity === "warning").length
  const suggestionCount = diagnostics.filter((d) => d.severity === "suggestion").length

  function jump(line: number) {
    setActiveLine(line)
    editorRef.current?.revealLine(line)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-4 py-2.5">
        <LanguageSelect value={language} onChange={onLanguageChange} />
        <div className="mx-1 hidden h-5 w-px bg-border sm:block" />
        <Button size="sm" variant="outline" className="h-8 gap-1.5 bg-transparent" onClick={runNow}>
          <Play className="h-3.5 w-3.5" />
          Analyze
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 bg-transparent"
          onClick={() => editorRef.current?.format()}
        >
          <WandSparkles className="h-3.5 w-3.5" />
          Format
        </Button>
        <Button size="sm" variant="outline" className="h-8 gap-1.5 bg-transparent" onClick={onClear}>
          <Trash2 className="h-3.5 w-3.5" />
          Clear
        </Button>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400/80" />
          <span className="hidden md:inline">Analyzed in your browser</span>
        </div>
      </div>

      {/* Editor + panel */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="relative min-h-[280px] border-b border-border lg:border-b-0 lg:border-r">
          <MonacoCodeEditor
            ref={editorRef}
            code={code}
            language={language}
            onChange={onCodeChange}
            diagnostics={diagnostics}
            onErrorLineClick={(line) => {
              const d = diagnostics.find((x) => x.line === line)
              if (d) setActiveLine(line)
            }}
          />
        </div>
        <div className="min-h-[280px] overflow-hidden">
          <ErrorPanel
            result={result}
            status={status}
            errorMessage={errorMessage}
            language={language}
            code={code}
            settings={settings}
            onApplyFix={onApplyFix}
            onJumpToLine={jump}
            activeLine={activeLine}
          />
        </div>
      </div>

      <div className="border-t border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <div className="flex items-center gap-1">
            <Terminal className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
            {(["input", "output"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setIoTab(tab)}
                className={`rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                  ioTab === tab ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setInput(""); setInputValues({}); setOutput("") }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" /> Clear
            </button>
            {!isIoMinimized && (
              <>
                <Button size="sm" className="h-7 gap-1.5 px-2.5 text-xs" onClick={runWithInput}>
                  <Play className="h-3 w-3" /> Run
                </Button>
              </>
            )}
            <button
              type="button"
              onClick={() => setIsIoMinimized((current) => !current)}
              aria-expanded={!isIoMinimized}
              aria-label={isIoMinimized ? "Expand input and output panel" : "Minimize input and output panel"}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {isIoMinimized ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
        {!isIoMinimized && <div className="min-h-[112px] p-3">
          {ioTab === "input" ? (
            <div className="space-y-3">
              {inputNames.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {inputNames.map((name, index) => (
                    <label key={name} className="space-y-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-2"><span className="font-mono text-primary">{name}</span><span>input {index + 1}</span></span>
                      <input
                        value={inputValues[name] ?? ""}
                        onChange={(event) => setInputValues((current) => ({ ...current, [name]: event.target.value }))}
                        placeholder={`Value for ${name}`}
                        aria-label={`Input for ${name}`}
                        className="h-9 w-full rounded-md border border-border bg-background px-2.5 font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary"
                      />
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Write an input call in your code to create an input block automatically.</p>
              )}
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={inputNames.length > 0 ? "Additional stdin (optional)" : "Enter program input (stdin)…"}
                aria-label="Program input"
                className="min-h-[52px] w-full resize-y bg-transparent font-mono text-xs leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/60"
              />
            </div>
          ) : (
            <pre className="min-h-[88px] whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted-foreground">
              {output || "Output will appear here after you run the code."}
            </pre>
          )}
        </div>}
      </div>

      <StatusBar
        errorCount={errorCount}
        warningCount={warningCount}
        suggestionCount={suggestionCount}
        status={status}
        usedRealParser={result?.usedRealParser ?? false}
        language={language}
      />
    </div>
  )
}
