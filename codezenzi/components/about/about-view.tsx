"use client"

import { Code2, Cpu, Eye, GitBranch, Sparkles, Zap } from "lucide-react"
import { LANGUAGE_LIST } from "@/lib/languages"

export function AboutView() {
  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 overflow-y-auto p-5 md:p-8">
      <header className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
          <Eye className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">About Codezenzi</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            &quot;Codezenzi catches coding mistakes while you write, not only after you run.&quot;
          </p>
        </div>
      </header>

      <p className="text-sm leading-relaxed text-foreground/85">
        Codezenzi is a real-time coding assistant. As you type, it detects programming errors through genuine static
        analysis — before you ever press Run — and shows you what is wrong, where it is, how to fix it, and why the fix
        works.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Feature icon={<Zap className="h-4 w-4 text-emerald-400" />} title="Real-time analysis">
          Debounced, incremental checks run as you type. No Run button required for statically detectable errors.
        </Feature>
        <Feature icon={<Cpu className="h-4 w-4 text-sky-400" />} title="Real parsers">
          Python runs on CPython via WebAssembly (Pyodide); JavaScript &amp; TypeScript use the Babel parser — not a
          guessing LLM.
        </Feature>
        <Feature icon={<Sparkles className="h-4 w-4 text-violet-400" />} title="AI explanation layer">
          An optional AI layer explains errors in plain language and suggests fixes — clearly separated from the actual
          parser output.
        </Feature>
        <Feature icon={<Code2 className="h-4 w-4 text-amber-400" />} title="AI Code Generator">
          Describe what you want; Codezenzi generates idiomatic code and pipes it straight into the analysis engine.
        </Feature>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Supported languages</h2>
        <div className="flex flex-wrap gap-2">
          {LANGUAGE_LIST.map((l) => (
            <span
              key={l.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs"
            >
              {l.label}
              <span className={l.hasRealParser ? "text-emerald-400" : "text-muted-foreground"}>
                {l.hasRealParser ? "· parser" : "· structural"}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
        <GitBranch className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="text-sm">
          <p className="font-medium">How it works</p>
          <p className="mt-1 text-muted-foreground">
            Editor → change detector → debounce → real parser / static analysis → diagnostics → solution engine →
            optional AI explanation → error panel. The parser is always the authoritative source for factual syntax
            errors.
          </p>
        </div>
      </div>
    </div>
  )
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>
    </div>
  )
}
