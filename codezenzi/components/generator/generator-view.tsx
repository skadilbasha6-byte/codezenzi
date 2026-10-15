"use client"

import { useState } from "react"
import Editor from "@monaco-editor/react"
import { Bot, Check, Copy, Download, FileInput, Loader2, RotateCw, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LanguageSelect } from "@/components/language-select"
import { getLanguage, type LanguageId } from "@/lib/languages"

interface Props {
  language: LanguageId
  onLanguageChange: (l: LanguageId) => void
  onInsert: (code: string, language: LanguageId) => void
}

type GenState = "idle" | "loading" | "done" | "error"

const EXAMPLE_PROMPTS = [
  "Create a Python program that checks whether a number is prime.",
  "Build a Java program for student grade calculation.",
  "Create a C++ binary search implementation.",
  "Write an SQL query to find the top 5 highest-paid employees.",
  "Create CSS for a responsive navigation bar.",
]

export function GeneratorView({ language, onLanguageChange, onInsert }: Props) {
  const [prompt, setPrompt] = useState("")
  const [framework, setFramework] = useState("none")
  const [state, setState] = useState<GenState>("idle")
  const [generated, setGenerated] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const cfg = getLanguage(language)
  const frameworks = cfg.frameworks

  async function generate() {
    if (!prompt.trim() || state === "loading") return
    setState("loading")
    setError(null)
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 30000)

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, language, framework }),
        signal: controller.signal,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Generation failed. Please try again.")
        setState("error")
        return
      }
      setGenerated(data.code)
      setState("done")
    } catch (err) {
      setError(
        err instanceof DOMException && err.name === "AbortError"
          ? "The AI request took too long. Please try again with a shorter prompt."
          : "Could not reach the generator. Check your connection and try again.",
      )
      setState("error")
    } finally {
      window.clearTimeout(timeout)
    }
  }

  function reset() {
    setPrompt("")
    setGenerated("")
    setError(null)
    setState("idle")
  }

  async function copy() {
    await navigator.clipboard.writeText(generated)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function download() {
    const blob = new Blob([generated], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `codelens-generated.${cfg.ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col gap-5 overflow-y-auto p-5 md:p-8">
      <header className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-violet-500/30 bg-violet-500/10">
          <Bot className="h-5 w-5 text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">AI Code Generator</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Describe what you want to build, and Codezenzi will generate the code for you.
          </p>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Left: prompt */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Programming Language</label>
              <LanguageSelect value={language} onChange={onLanguageChange} className="h-9 w-[160px] text-sm" />
            </div>
            {frameworks && frameworks.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Framework / Library</label>
                <Select value={framework} onValueChange={(v) => setFramework(v ?? "none")}>
                  <SelectTrigger className="h-9 w-[180px] text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {frameworks.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Describe what to build</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  generate()
                }
              }}
              placeholder="e.g. Create a Python calculator with add, subtract, multiply, and divide functions."
              className="min-h-[140px] resize-none font-sans text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Press <kbd className="rounded border border-border bg-muted px-1">⌘/Ctrl</kbd> +{" "}
              <kbd className="rounded border border-border bg-muted px-1">Enter</kbd> to generate.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={generate} disabled={!prompt.trim() || state === "loading"} className="gap-1.5">
              {state === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Generate Code
                </>
              )}
            </Button>
            <Button variant="outline" onClick={reset} className="gap-1.5 bg-transparent">
              <X className="h-4 w-4" /> Clear
            </Button>
          </div>

          <div className="mt-1">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Try an example</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setPrompt(ex)}
                  className="rounded-full border border-border bg-card px-3 py-1 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: output */}
        <div className="flex min-h-[320px] flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold">Generated Code</span>
              <Badge variant="outline" className="text-[10px]">
                {cfg.label}
              </Badge>
            </div>
            {state === "done" && (
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={copy}>
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={download}>
                  <Download className="h-3.5 w-3.5" /> Download
                </Button>
                <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={generate}>
                  <RotateCw className="h-3.5 w-3.5" /> Regenerate
                </Button>
              </div>
            )}
          </div>

          <div className="relative min-h-0 flex-1">
            {state === "idle" && (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
                <Bot className="h-8 w-8 opacity-40" />
                <p className="text-sm">Your generated code will appear here.</p>
              </div>
            )}
            {state === "loading" && (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="text-sm">Generating code…</p>
              </div>
            )}
            {state === "error" && (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                <p className="text-sm text-amber-400">{error}</p>
                <Button size="sm" variant="outline" onClick={generate} className="gap-1.5 bg-transparent">
                  <RotateCw className="h-3.5 w-3.5" /> Retry
                </Button>
              </div>
            )}
            {state === "done" && (
              <Editor
                className="h-full w-full"
                theme="vs-dark"
                language={cfg.monaco}
                value={generated}
                options={{
                  readOnly: true,
                  fontSize: 13,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 12, bottom: 12 },
                  lineNumbers: "on",
                  folding: true,
                }}
              />
            )}
          </div>

          {state === "done" && (
            <div className="border-t border-border p-3">
              <Button className="w-full gap-1.5" onClick={() => onInsert(generated, language)}>
                <FileInput className="h-4 w-4" />
                Insert into Editor &amp; Analyze
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
