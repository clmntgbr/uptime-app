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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import {
  ChevronsUpDownIcon,
  Loader2Icon,
  PlusIcon,
  SearchIcon,
  UploadIcon,
} from "lucide-react"
import { SHEET_CLOSE_MS } from "@/components/ui/sheet"
import { useEffect, useMemo, useRef, useState } from "react"
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
  /** Nested sheet close can bubble to the parent — ignore dismiss briefly. */
  const ignoreParentCloseRef = useRef(false)

  const keepLibraryOpenWhileNestedCloses = () => {
    ignoreParentCloseRef.current = true
    window.setTimeout(() => {
      ignoreParentCloseRef.current = false
    }, SHEET_CLOSE_MS + 50)
  }

  const handleLibraryOpenChange = (next: boolean) => {
    if (!next && (editorOpen || importOpen || ignoreParentCloseRef.current)) {
      return
    }
    onOpenChange(next)
  }

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      SEARCH_DEBOUNCE_MS
    )
    return () => window.clearTimeout(timer)
  }, [search])

  const {
    data: itemsPages,
    error: itemsError,
    isLoading: itemsLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useLibraryItems(debouncedSearch, methods, open)
  const deleteMutation = useDeleteLibraryItem()
  const workflowId = useCurrentWorkflowId()
  const insertMutation = useInsertLibraryItem(workflowId ?? "")
  const items = useMemo(
    () => itemsPages?.pages.flatMap((page) => page.members) ?? [],
    [itemsPages]
  )
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const root = scrollRef.current
    const sentinel = sentinelRef.current
    if (!root || !sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage()
        }
      },
      { root, rootMargin: "200px" }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [
    open,
    items.length,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  ])

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
      <Sheet open={open} onOpenChange={handleLibraryOpenChange} modal={false}>
        <SheetContent
          side="left"
          overlay={false}
          showCloseButton
          className="!inset-y-2 !left-2 !flex !h-[calc(100%-1rem)] !w-[22rem] !max-w-[22rem] !overflow-hidden !rounded-xl border sm:!max-w-[22rem]"
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

          <div className="px-4 pt-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 w-full justify-between gap-2 px-2 text-xs"
                  aria-label="Filter by method"
                >
                  {methods.length > 0 ? (
                    <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
                      {methods.slice(0, 4).map((method) => (
                        <span
                          key={method}
                          className={cn(
                            "shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold",
                            methodClass(method)
                          )}
                        >
                          {method}
                        </span>
                      ))}
                      {methods.length > 4 ? (
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          +{methods.length - 4}
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Methods</span>
                  )}
                  <ChevronsUpDownIcon className="size-3.5 shrink-0 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                <DropdownMenuLabel className="flex items-center justify-between gap-2 font-normal">
                  <span>Methods</span>
                  {methods.length > 0 ? (
                    <button
                      type="button"
                      className="text-[10px] text-muted-foreground underline-offset-2 hover:underline"
                      onClick={() => setMethods([])}
                    >
                      Clear
                    </button>
                  ) : null}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {LIBRARY_METHODS.map((method) => (
                  <DropdownMenuCheckboxItem
                    key={method}
                    checked={methods.includes(method)}
                    onCheckedChange={() => toggleMethod(method)}
                    onSelect={(event) => event.preventDefault()}
                    className="font-mono text-xs"
                  >
                    {method}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-auto px-4 py-4"
          >
            {itemsLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : itemsError ? (
              <p className="text-sm text-destructive">{itemsError.message}</p>
            ) : items.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                {debouncedSearch
                  ? "No calls match this search."
                  : methods.length > 0
                    ? "No calls match these methods."
                    : "No library items yet. Create one to reuse it across workflows."}
              </p>
            ) : (
              <>
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
                <div ref={sentinelRef} className="h-4 w-full" aria-hidden />
                {isFetchingNextPage ? (
                  <div className="flex justify-center py-3">
                    <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
                  </div>
                ) : null}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <LibraryImportDrawer
        open={importOpen}
        onOpenChange={(next) => {
          if (!next) keepLibraryOpenWhileNestedCloses()
          setImportOpen(next)
        }}
      />

      <LibraryItemDrawer
        open={editorOpen}
        onOpenChange={(next) => {
          if (!next) keepLibraryOpenWhileNestedCloses()
          setEditorOpen(next)
        }}
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
