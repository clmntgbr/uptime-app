import { Badge } from "@/components/ui/badge"
import { formatRunStatusLabel } from "@/lib/stats/format"
import { cn } from "@/lib/utils"
import { CheckIcon, Loader2Icon, MinusIcon, XIcon } from "lucide-react"

/** Soft status tint — muted fills, never flashy solids. */
export function runStatusBadgeClass(status: string | undefined) {
  switch (status) {
    case "success":
      return "border-transparent bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
    case "failed":
      return "border-transparent bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300"
    case "error":
      return "border-transparent bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300"
    case "running":
      return "border-transparent bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"
    case "skipped":
      return "border-transparent bg-muted text-muted-foreground"
    default:
      return undefined
  }
}

function RunStatusIcon({ status }: { status: string }) {
  if (status === "success") return <CheckIcon className="size-3" />
  if (status === "failed" || status === "error") {
    return <XIcon className="size-3" />
  }
  if (status === "running") {
    return <Loader2Icon className="size-3 animate-spin" />
  }
  if (status === "skipped") return <MinusIcon className="size-3" />
  return null
}

export function RunStatusBadge({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  return (
    <Badge
      variant="outline"
      className={cn(runStatusBadgeClass(status), className)}
    >
      <RunStatusIcon status={status} />
      {formatRunStatusLabel(status)}
    </Badge>
  )
}
