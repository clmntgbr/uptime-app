import { cn } from "@/lib/utils"

/** Same treatment as call-list URL preview (inline). */
export const VARIABLE_TEXT_CLASS =
  "font-semibold text-sky-600 dark:text-sky-400"

/** Chip highlight matching the Flow timeline mock. */
export const VARIABLE_CHIP_CLASS =
  "inline-block rounded bg-[#EAF3FD] px-1.5 py-0.5 font-semibold text-[#0B63C6] dark:bg-sky-950 dark:text-sky-300"

/** Renders plain text with `{{var}}` segments highlighted. */
export function VariableText({
  text,
  className,
  variant = "text",
  values,
}: {
  text: string
  className?: string
  variant?: "text" | "chip"
  /** Known variable values. Matching `{{name}}` renders the value, still highlighted. */
  values?: Record<string, string>
}) {
  const parts = text.split(/(\{\{[^}]+\}\})/g)
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (!part.startsWith("{{")) return <span key={i}>{part}</span>

        const name = part.slice(2, -2).trim()
        const resolved = values?.[name]
        const highlightClass =
          variant === "chip" ? VARIABLE_CHIP_CLASS : VARIABLE_TEXT_CLASS

        return (
          <span
            key={i}
            title={resolved ? part : undefined}
            className={cn(highlightClass, variant === "chip" && "me-0.5")}
          >
            {resolved ?? part}
          </span>
        )
      })}
    </span>
  )
}
