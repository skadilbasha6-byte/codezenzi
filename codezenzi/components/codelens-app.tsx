"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AppSidebar } from "./app-sidebar"
import { EditorView } from "./editor/editor-view"
import { GeneratorView } from "./generator/generator-view"
import { ProjectsView } from "./projects/projects-view"
import { HistoryView } from "./history/history-view"
import { SettingsView } from "./settings/settings-view"
import { AboutView } from "./about/about-view"
import { useCodeAnalysis } from "@/hooks/use-code-analysis"
import { getLanguage, type LanguageId } from "@/lib/languages"
import {
  DEFAULT_SETTINGS,
  type HistoryEntry,
  type Project,
  type Settings,
  type ViewId,
} from "@/lib/app-types"
import type { Diagnostic } from "@/lib/analysis"

const LS_PROJECTS = "codelens.projects"
const LS_HISTORY = "codelens.history"
const LS_SETTINGS = "codelens.settings"

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export function CodeLensApp() {
  const [view, setView] = useState<ViewId>("editor")
  const [language, setLanguage] = useState<LanguageId>("python")
  const [code, setCode] = useState<string>(getLanguage("python").sample)
  const [projects, setProjects] = useState<Project[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [jumpLine, setJumpLine] = useState<number | null>(null)
  const hydrated = useRef(false)

  const { result, status, errorMessage, runNow } = useCodeAnalysis(code, language, settings.autoAnalyze)

  // Hydrate persisted state.
  useEffect(() => {
    try {
      const p = localStorage.getItem(LS_PROJECTS)
      if (p) setProjects(JSON.parse(p))
      const h = localStorage.getItem(LS_HISTORY)
      if (h) setHistory(JSON.parse(h))
      const s = localStorage.getItem(LS_SETTINGS)
      if (s) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(s) })
    } catch {
      // ignore corrupt storage
    }
    hydrated.current = true
  }, [])

  useEffect(() => {
    if (hydrated.current) localStorage.setItem(LS_PROJECTS, JSON.stringify(projects))
  }, [projects])
  useEffect(() => {
    if (hydrated.current) localStorage.setItem(LS_HISTORY, JSON.stringify(history))
  }, [history])
  useEffect(() => {
    if (hydrated.current) localStorage.setItem(LS_SETTINGS, JSON.stringify(settings))
  }, [settings])

  // Build / update error history from analysis results.
  useEffect(() => {
    if (status !== "done" || !result) return
    const tracked = result.diagnostics.filter((d) => d.severity === "error" || d.severity === "warning")
    const activeKeys = new Set(tracked.map((d) => `${language}:${d.type}:${d.line}`))

    setHistory((prev) => {
      const next = [...prev]
      const index = new Map(next.map((e, i) => [e.key, i]))

      // Mark previously-active entries for this language as fixed if gone.
      for (let i = 0; i < next.length; i++) {
        const e = next[i]
        if (e.language === language && e.status === "active" && !activeKeys.has(e.key)) {
          next[i] = { ...e, status: "fixed" }
        }
      }

      // Upsert current active diagnostics.
      for (const d of tracked) {
        const key = `${language}:${d.type}:${d.line}`
        const existing = index.get(key)
        if (existing === undefined) {
          next.unshift({
            id: uid(),
            key,
            type: d.type,
            severity: d.severity,
            line: d.line,
            message: d.message,
            language,
            firstSeen: Date.now(),
            status: "active",
          })
        } else if (next[existing].status === "fixed") {
          next[existing] = { ...next[existing], status: "active", message: d.message }
        }
      }
      return next.slice(0, 100)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, status])

  const handleLanguageChange = useCallback(
    (l: LanguageId) => {
      setLanguage(l)
      setCode((c) => (c.trim() === "" ? getLanguage(l).sample : c))
    },
    [],
  )

  const applyFix = useCallback(
    (d: Diagnostic) => {
      if (!d.suggestedFix) return
      setCode((current) => {
        const lines = current.split("\n")
        const idx = d.suggestedFix!.line - 1
        if (idx < 0 || idx >= lines.length) return current
        lines[idx] = d.suggestedFix!.after
        return lines.join("\n")
      })
    },
    [],
  )

  const insertGenerated = useCallback((generated: string, lang: LanguageId) => {
    setLanguage(lang)
    setCode(generated)
    setView("editor")
  }, [])

  const jumpToLine = useCallback((line: number) => {
    setView("editor")
    setJumpLine(line)
  }, [])

  // Projects
  const createProject = useCallback((name: string, lang: LanguageId) => {
    const now = Date.now()
    const project: Project = {
      id: uid(),
      name,
      createdAt: now,
      files: [{ id: uid(), name: `main.${getLanguage(lang).ext}`, language: lang, code: getLanguage(lang).sample, updatedAt: now }],
    }
    setProjects((p) => [project, ...p])
  }, [])

  const saveCurrent = useCallback(() => {
    const now = Date.now()
    const name = `Snippet ${new Date().toLocaleString()}`
    const project: Project = {
      id: uid(),
      name,
      createdAt: now,
      files: [{ id: uid(), name: `main.${getLanguage(language).ext}`, language, code, updatedAt: now }],
    }
    setProjects((p) => [project, ...p])
    setView("projects")
  }, [code, language])

  const openProject = useCallback((project: Project) => {
    const file = project.files[0]
    if (file) {
      setLanguage(file.language)
      setCode(file.code)
      setView("editor")
    }
  }, [])

  const deleteProject = useCallback((id: string) => {
    setProjects((p) => p.filter((x) => x.id !== id))
  }, [])

  const errorCount = useMemo(
    () => (result?.diagnostics ?? []).filter((d) => d.severity === "error").length,
    [result],
  )

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <AppSidebar view={view} onNavigate={setView} errorCount={errorCount} />
      <main className="min-w-0 flex-1 overflow-hidden">
        {view === "editor" && (
          <EditorView
            code={code}
            onCodeChange={setCode}
            language={language}
            onLanguageChange={handleLanguageChange}
            result={result}
            status={status}
            errorMessage={errorMessage}
            runNow={runNow}
            settings={settings}
            onApplyFix={applyFix}
            onClear={() => setCode("")}
            jumpLine={jumpLine}
            onJumpConsumed={() => setJumpLine(null)}
          />
        )}
        {view === "generator" && (
          <GeneratorView language={language} onLanguageChange={handleLanguageChange} onInsert={insertGenerated} />
        )}
        {view === "projects" && (
          <ProjectsView
            projects={projects}
            onCreate={createProject}
            onOpen={openProject}
            onDelete={deleteProject}
            onSaveCurrent={saveCurrent}
            hasUnsaved={code.trim().length > 0}
          />
        )}
        {view === "history" && (
          <HistoryView history={history} onJump={jumpToLine} onClear={() => setHistory([])} />
        )}
        {view === "settings" && <SettingsView settings={settings} onChange={setSettings} />}
        {view === "about" && <AboutView />}
      </main>
    </div>
  )
}
