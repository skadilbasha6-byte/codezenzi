"use client"

import { Settings as SettingsIcon, Sparkles, GraduationCap, Zap, ShieldCheck } from "lucide-react"
import type { Settings } from "@/lib/app-types"

interface Props {
  settings: Settings
  onChange: (settings: Settings) => void
}

export function SettingsView({ settings, onChange }: Props) {
  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-5 overflow-y-auto p-5 md:p-8">
      <header className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
          <SettingsIcon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Control how Codezenzi analyzes and explains your code.</p>
        </div>
      </header>

      <div className="flex flex-col gap-2">
        <ToggleRow
          icon={<Zap className="h-4 w-4 text-emerald-400" />}
          title="Real-time analysis"
          description="Automatically analyze your code as you type, before you run it."
          checked={settings.autoAnalyze}
          onChange={(v) => onChange({ ...settings, autoAnalyze: v })}
        />
        <ToggleRow
          icon={<Sparkles className="h-4 w-4 text-violet-400" />}
          title="AI explanations"
          description="Allow the optional AI layer to explain errors in plain language. Runs only when you click Explain with AI."
          checked={settings.aiExplanations}
          onChange={(v) => onChange({ ...settings, aiExplanations: v })}
        />
        <ToggleRow
          icon={<GraduationCap className="h-4 w-4 text-sky-400" />}
          title="Beginner mode"
          description="Prefer simpler, step-by-step explanations aimed at newcomers."
          checked={settings.beginnerMode}
          onChange={(v) => onChange({ ...settings, beginnerMode: v })}
        />
      </div>

      <div className="mt-2 flex items-start gap-3 rounded-lg border border-border bg-card p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
        <div className="text-sm">
          <p className="font-medium">Privacy</p>
          <p className="mt-1 text-muted-foreground">
            Static analysis runs entirely in your browser — your code is never uploaded for error detection. Code is
            only sent to the server when you explicitly use AI explanations or the AI Code Generator. Codezenzi never
            records your screen.
          </p>
        </div>
      </div>
    </div>
  )
}

function ToggleRow({
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode
  title: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  )
}
