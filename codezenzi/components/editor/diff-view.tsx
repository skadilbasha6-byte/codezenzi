interface Props {
  before: string
  after: string
}

export function DiffView({ before, after }: Props) {
  return (
    <div className="overflow-hidden rounded-md border border-border font-mono text-[11px] leading-relaxed">
      <div className="flex items-start gap-2 bg-red-500/10 px-2 py-1 text-red-300">
        <span className="select-none text-red-400/70">-</span>
        <code className="whitespace-pre-wrap break-all">{before || " "}</code>
      </div>
      <div className="flex items-start gap-2 bg-emerald-500/10 px-2 py-1 text-emerald-300">
        <span className="select-none text-emerald-400/70">+</span>
        <code className="whitespace-pre-wrap break-all">{after || " "}</code>
      </div>
    </div>
  )
}
