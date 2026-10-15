"use client"

import { useState } from "react"
import { FolderOpen, Plus, Trash2, FileCode, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { getLanguage, type LanguageId } from "@/lib/languages"
import { LanguageSelect } from "@/components/language-select"
import type { Project } from "@/lib/app-types"

interface Props {
  projects: Project[]
  onCreate: (name: string, language: LanguageId) => void
  onOpen: (project: Project) => void
  onDelete: (id: string) => void
  onSaveCurrent: () => void
  hasUnsaved: boolean
}

export function ProjectsView({ projects, onCreate, onOpen, onDelete, onSaveCurrent, hasUnsaved }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState("")
  const [language, setLanguage] = useState<LanguageId>("python")

  function submit() {
    if (!name.trim()) return
    onCreate(name.trim(), language)
    setName("")
    setLanguage("python")
    setDialogOpen(false)
  }

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-5 overflow-y-auto p-5 md:p-8">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
            <FolderOpen className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">My Projects</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Save and reopen your code. Projects are stored locally in your browser.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 bg-transparent" onClick={onSaveCurrent}>
            <Save className="h-3.5 w-3.5" /> Save current
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> New project
          </Button>
        </div>
      </header>

      {projects.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
          <FolderOpen className="h-8 w-8 opacity-40" />
          <p className="text-sm">No projects yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {projects.map((p) => {
            const file = p.files[0]
            return (
              <div
                key={p.id}
                className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{p.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDelete(p.id)}
                    className="text-muted-foreground opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                    aria-label={`Delete ${p.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{file ? getLanguage(file.language).label : "Empty"}</span>
                  <span>·</span>
                  <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                </div>
                <Button size="sm" variant="outline" className="mt-1 bg-transparent" onClick={() => onOpen(p)}>
                  Open in editor
                </Button>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>Create a new project seeded with a starter snippet.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Project name</label>
              <Textarea
                value={name}
                onChange={(e) => setName(e.target.value.replace(/\n/g, ""))}
                placeholder="e.g. Python Practice"
                className="min-h-[40px] resize-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Language</label>
              <LanguageSelect value={language} onChange={setLanguage} className="h-9 w-full text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
