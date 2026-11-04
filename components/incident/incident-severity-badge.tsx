import { Badge } from "@/components/ui/badge"
import type { IncidentSeverity } from "@/lib/incident/types"
import { cn } from "@/lib/utils"

export function severityBadgeClass(severity: IncidentSeverity | string) {
  switch (severity) {
    case "critical":
      return "border-transparent bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300"
    case "warning":
      return "border-transparent bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-300"
    case "info":
      return "border-transparent bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
    default:
      return "border-transparent bg-muted text-muted-foreground"
  }
}

export function severityBadgeLabel(severity: IncidentSeverity | string) {
  switch (severity) {
    case "critical":
      return "Critical"
    case "warning":
      return "Warning"
    case "info":
      return "Info"
    default:
      return String(severity)
  }
}

export function IncidentSeverityBadge({
  severity,
  className,
}: {
  severity: IncidentSeverity | string
  className?: string
}) {
  return (
    <Badge
      variant="outline"
      className={cn("text-[10px]", severityBadgeClass(severity), className)}
    >
      {severityBadgeLabel(severity)}
    </Badge>
  )
}
