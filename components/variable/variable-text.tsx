import { cn } from "@/lib/utils"

/** Same treatment as call-list URL preview (inline). */
export const VARIABLE_TEXT_CLASS =
  "font-semibold text-sky-600 dark:text-sky-400"

/** Chip highlight matching the Flow timeline mock. */
export const VARIABLE_CHIP_CLASS =
  "inline-block rounded bg-[#EAF3FD] px-1.5 py-0.5 font-medium text-[#0B63C6] dark:bg-sky-950 dark:text-sky-300"

/** Renders plain text with `{{var}}` segments highlighted. */
export function VariableText({
  text,
  className,
  variant = "text",
}: {
  text: string
  className?: string
  variant?: "text" | "chip"
}) {
  const parts = text.split(/(\{\{[^}]+\}\})/g)
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.startsWith("{{") ? (
          <span
            key={i}
            className={cn(
              variant === "chip" ? VARIABLE_CHIP_CLASS : VARIABLE_TEXT_CLASS,
              variant === "chip" && "me-0.5"
            )}
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  )
}
