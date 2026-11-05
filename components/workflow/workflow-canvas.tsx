"use client"

import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { cn } from "@/lib/utils"

function WorkflowCanvasInner() {
  return (
    <ReactFlow
      className={cn(
        "h-full w-full bg-card",
        "[--xy-controls-button-background-color:var(--card)]",
        "[--xy-controls-button-background-color-hover:var(--muted)]",
        "[--xy-controls-button-color:var(--foreground)]",
        "[--xy-controls-button-color-hover:var(--foreground)]",
        "[--xy-controls-button-border-color:var(--border)]",
        "[--xy-controls-box-shadow:0_0_0_1px_var(--border)]"
      )}
      nodes={[]}
      edges={[]}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnScroll
      zoomOnScroll
      minZoom={0.25}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      defaultViewport={{ x: 0, y: 0, zoom: 1 }}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={16}
        size={1.25}
        color="color-mix(in oklch, var(--muted-foreground) 55%, transparent)"
      />
      <Controls showInteractive={false} />
    </ReactFlow>
  )
}

/** Full-width dotted zoom/pan surface under the overview (calls graph later). */
export function WorkflowCanvas() {
  return (
    <div className="h-[600px] w-full overflow-hidden rounded-xl border bg-card">
      <ReactFlowProvider>
        <WorkflowCanvasInner />
      </ReactFlowProvider>
    </div>
  )
}
