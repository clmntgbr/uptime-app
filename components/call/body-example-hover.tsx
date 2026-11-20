"use client"

import { InfoIcon } from "lucide-react"

import { JsonBodyInput } from "@/components/call/json-body-input"
import { Button } from "@/components/ui/button"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

interface BodyExampleHoverProps {
  /** Text shown on the left of the row, e.g. "Optional JSON request body". */
  label: string
  /** Reference payload kept on the call or library item. Empty: only the label shows. */
  example: string
  /** Copies the example into the editable body. */
  onUse: (value: string) => void
}

/**
 * Row with the label on the left and an "Example" hover card on the right.
 * Hovering anywhere on the row (label or button) opens the example.
 */
export function BodyExampleHover({
  label,
  example,
  onUse,
}: BodyExampleHoverProps) {
  if (!example.trim()) {
    return <p className="text-xs text-muted-foreground">{label}</p>
  }

  return (
    <div className="flex min-w-0 items-center justify-between gap-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <HoverCard openDelay={150} closeDelay={100}>
        <HoverCardTrigger asChild>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto shrink-0 gap-1 px-0 text-xs text-muted-foreground"
          >
            <InfoIcon data-icon="inline-start" />
            Example
          </Button>
        </HoverCardTrigger>
        <HoverCardContent
          align="end"
          className="w-[min(36rem,calc(100vw-2rem))] space-y-3 p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onUse(example)}
            >
              Use as body
            </Button>
          </div>
          <JsonBodyInput
            value={example}
            onChange={() => {}}
            readOnly
            editorClassName="max-h-[28rem] min-h-64"
          />
        </HoverCardContent>
      </HoverCard>
    </div>
  )
}
