"use client"

import { LibraryItemCard } from "@/components/library/library-item-card"
import { LibraryImportDrawer } from "@/components/library/library-import-drawer"
import { LibraryItemDrawer } from "@/components/library/library-item-drawer"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  useDeleteLibraryItem,
  useInsertLibraryItem,
  useLibraryItems,
} from "@/lib/library/hooks"
import { methodClass } from "@/lib/call/method-style"
import { cn } from "@/lib/utils"
import { useCurrentWorkflowId } from "@/lib/workflow/current"
import type { LibraryItemSummary } from "@/lib/library/types"
import { PlusIcon, SearchIcon, UploadIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

const SEARCH_DEBOUNCE_MS = 250
const LIBRARY_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const

interface LibraryDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Left panel opened from the sidebar. Non-modal: no backdrop, so items can be
 * dragged onto the workflow canvas while the panel stays open.
 */
export function LibraryDrawer({ open, onOpenChange }: LibraryDrawerProps) {
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [methods, setMethods] = useState<string[]>([])
  const [editorOpen, setEditorOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editedId, setEditedId] = useState<string | null>(null)
  const [itemToDelete, setItemToDelete] = useState<LibraryItemSummary | null>(
    null
  )

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      SEARCH_DEBOUNCE_MS
    )
    return () => window.clearTimeout(timer)
  }, [search])

  const itemsQuery = useLibraryItems(debouncedSearch, methods)
  const deleteMutation = useDeleteLibraryItem()
  const workflowId = useCurrentWorkflowId()
  const insertMutation = useInsertLibraryItem(workflowId ?? "")
  const items = itemsQuery.data?.members ?? []

  const toggleMethod = (method: string) => {
    setMethods((current) =>
      current.includes(method)
        ? current.filter((value) => value !== method)
        : [...current, method]
    )
  }

  const openCreate = () => {
    setEditedId(null)
    setEditorOpen(true)
  }

  const openEdit = (id: string) => {
    setEditedId(id)
    setEditorOpen(true)
  }

  const addToWorkflow = (item: LibraryItemSummary) => {
    if (!workflowId) return
    insertMutation.mutate(item.id, {
      onSuccess: () => toast.success(`Added "${item.name}" to the workflow`),
    })
  }

  const confirmDelete = () => {
    if (!itemToDelete) return
    deleteMutation.mutate(itemToDelete.id, {
      onSuccess: () => setItemToDelete(null),
    })
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
        <SheetContent
          side="left"
          overlay={false}
          showCloseButton
          className="!inset-y-2 !left-2 !h-auto !w-[22rem] !max-w-[22rem] !rounded-xl border sm:!max-w-[22rem]"
        >
          <SheetHeader className="gap-1 border-b px-4 py-4 pe-12">
            <SheetTitle>Library</SheetTitle>
            <SheetDescription>
              Drag a call onto the canvas to add it at the end of the workflow.
            </SheetDescription>
          </SheetHeader>

          <div className="flex items-center gap-2 px-4 pt-4">
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search library"
                placeholder="Search calls"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-8 ps-8 text-xs"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => setImportOpen(true)}
            >
              <UploadIcon className="size-3.5" />
              Import
            </Button>
            <Button size="sm" className="h-8" onClick={openCreate}>
              <PlusIcon className="size-3.5" />
              New
            </Button>
          </div>

          <div className="flex flex-wrap gap-1 px-4 pt-3">
            {LIBRARY_METHODS.map((method) => {
              const active = methods.includes(method)
              return (
                <button
                  key={method}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleMethod(method)}
                  className={cn(
                    "rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold transition-opacity",
                    methodClass(method),
                    active
                      ? "ring-2 ring-primary ring-offset-1 ring-offset-card"
                      : "opacity-50 hover:opacity-100"
                  )}
                >
                  {method}
                </button>
              )
            })}
            {methods.length > 0 ? (
              <button
                type="button"
                onClick={() => setMethods([])}
                className="px-1.5 py-0.5 text-[10px] text-muted-foreground underline-offset-2 hover:underline"
              >
                Clear
              </button>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
            {itemsQuery.isLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : itemsQuery.error ? (
              <p className="text-sm text-destructive">
                {itemsQuery.error.message}
              </p>
            ) : items.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                {debouncedSearch
                  ? "No calls match this search."
                  : methods.length > 0
                    ? "No calls match these methods."
                    : "No library items yet. Create one to reuse it across workflows."}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {items.map((item) => (
                  <li key={item.id}>
                    <LibraryItemCard
                      item={item}
                      onEdit={() => openEdit(item.id)}
                      onDelete={() => setItemToDelete(item)}
                      onAddToWorkflow={
                        workflowId ? () => addToWorkflow(item) : undefined
                      }
                      addPending={
                        insertMutation.isPending &&
                        insertMutation.variables === item.id
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <LibraryImportDrawer open={importOpen} onOpenChange={setImportOpen} />

      <LibraryItemDrawer
        open={editorOpen}
        onOpenChange={setEditorOpen}
        itemId={editedId}
      />

      <AlertDialog
        open={itemToDelete != null}
        onOpenChange={(next) => {
          if (!next) setItemToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete library item?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes{" "}
              <span className="font-medium text-foreground">
                {itemToDelete?.name}
              </span>{" "}
              from the library. Calls already added to workflows are not
              affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault()
                confirmDelete()
              }}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
