import { cn } from "@/lib/utils"

/** Same treatment as call-list URL preview. */
export const VARIABLE_TEXT_CLASS =
  "font-semibold text-sky-600 dark:text-sky-400"

/** Renders plain text with `{{var}}` segments highlighted. */
export function VariableText({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  const parts = text.split(/(\{\{[^}]+\}\})/g)
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.startsWith("{{") ? (
          <span key={i} className={VARIABLE_TEXT_CLASS}>
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  )
}
