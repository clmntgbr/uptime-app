"use client"

import { Button } from "@/components/ui/button"
import { SheetFooter } from "@/components/ui/sheet"

export function DrawerFormActions({
  isEdit,
  isPending = false,
  isDeleting = false,
  submitLabel,
  onCancel,
  onDelete,
}: {
  isEdit: boolean
  isPending?: boolean
  isDeleting?: boolean
  submitLabel: string
  onCancel: () => void
  onDelete?: () => void
}) {
  const busy = isPending || isDeleting

  return (
    <SheetFooter className="flex-row items-center justify-between gap-2 px-0 sm:flex-row sm:justify-between">
      <div className="min-w-0">
        {isEdit && onDelete ? (
          <Button
            type="button"
            variant="destructive"
            disabled={busy}
            onClick={onDelete}
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
        ) : null}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {isPending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </SheetFooter>
  )
}
