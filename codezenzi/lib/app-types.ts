import type { LanguageId } from "./languages"
import type { Severity } from "./analysis/types"

export type ViewId = "editor" | "generator" | "projects" | "history" | "settings" | "about"

export interface ProjectFile {
  id: string
  name: string
  language: LanguageId
  code: string
  updatedAt: number
}

export interface Project {
  id: string
  name: string
  files: ProjectFile[]
  createdAt: number
}

export interface HistoryEntry {
  id: string
  /** unique key combining type+line so repeats update in place */
  key: string
  type: string
  severity: Severity
  line: number
  message: string
  language: LanguageId
  firstSeen: number
  status: "active" | "fixed"
}

export interface Settings {
  aiExplanations: boolean
  beginnerMode: boolean
  autoAnalyze: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  aiExplanations: true,
  beginnerMode: true,
  autoAnalyze: true,
}
