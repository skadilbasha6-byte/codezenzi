"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LANGUAGE_LIST, type LanguageId } from "@/lib/languages"

interface Props {
  value: LanguageId
  onChange: (value: LanguageId) => void
  className?: string
}

/** Single source of truth for the language selector used across the app. */
export function LanguageSelect({ value, onChange, className }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as LanguageId)}>
      <SelectTrigger className={className ?? "h-8 w-[150px] text-sm"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LANGUAGE_LIST.map((lang) => (
          <SelectItem key={lang.id} value={lang.id}>
            <span className="flex items-center gap-2">
              {lang.label}
              {!lang.hasRealParser && (
                <span className="text-[10px] text-muted-foreground">structural</span>
              )}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
