"use client"

import { DrawerFormActions } from "@/components/ui/drawer-form-actions"
import { DrawerFormSkeleton } from "@/components/ui/drawer-form-skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { ApiError } from "@/lib/api-error"
import {
  useCreateStaticVariable,
  useDeleteStaticVariable,
  useStaticVariable,
  useUpdateStaticVariable,
} from "@/lib/variable/hooks"
import { validateVariableName, VARIABLE_NAME_HINT } from "@/lib/variable/name"
import type { StaticVariable } from "@/lib/variable/types"
import { useState } from "react"

function formatDeleteError(error: Error) {
  return error instanceof ApiError && error.code === "VARIABLE_IN_USE"
    ? "This variable is used by a call and cannot be deleted."
    : error.message
}

export function StaticVariableDrawer({
  workflowId,
  open,
  onOpenChange,
  variableName,
  nested = false,
}: {
  workflowId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `null` opens the drawer in create mode. */
  variableName: string | null
  /** Stack above an already-open sheet (higher z-index). */
  nested?: boolean
}) {
  const isEdit = variableName !== null
  const variableQuery = useStaticVariable(
    workflowId,
    open ? variableName : null
  )
  const createMutation = useCreateStaticVariable(workflowId)
  const updateMutation = useUpdateStaticVariable(workflowId)
  const deleteMutation = useDeleteStaticVariable(workflowId)
  const mutation = isEdit ? updateMutation : createMutation

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      createMutation.reset()
      updateMutation.reset()
      deleteMutation.reset()
    }
    onOpenChange(next)
  }

  const handleSubmit = async (name: string, value: string, secret: boolean) => {
    if (variableName) {
      await updateMutation.mutateAsync({
        name: variableName,
        input: { value, secret },
      })
    } else {
      await createMutation.mutateAsync({ name, value, secret })
    }
    handleOpenChange(false)
  }

  const handleDelete = async () => {
    if (!variableName || !variableQuery.data) return
    if (!window.confirm(`Delete variable "${variableQuery.data.name}"?`)) return
    await deleteMutation.mutateAsync(variableName)
    handleOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        nested={nested}
        className="w-full overflow-y-auto sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle>
            {isEdit ? "Edit static variable" : "New static variable"}
          </SheetTitle>
        </SheetHeader>

        {isEdit && variableQuery.isLoading ? (
          <DrawerFormSkeleton fields={3} />
        ) : isEdit && variableQuery.error ? (
          <p className="px-4 text-destructive">{variableQuery.error.message}</p>
        ) : open ? (
          <StaticVariableForm
            key={variableQuery.data?.name ?? "new"}
            variable={isEdit ? variableQuery.data : undefined}
            isPending={mutation.isPending}
            isDeleting={deleteMutation.isPending}
            error={
              mutation.error?.message ??
              (deleteMutation.error
                ? formatDeleteError(deleteMutation.error)
                : null)
            }
            onSubmit={handleSubmit}
            onCancel={() => handleOpenChange(false)}
            onDelete={isEdit ? handleDelete : undefined}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function StaticVariableForm({
  variable,
  isPending,
  isDeleting = false,
  error,
  onSubmit,
  onCancel,
  onDelete,
}: {
  variable?: StaticVariable
  isPending: boolean
  isDeleting?: boolean
  error: string | null
  onSubmit: (name: string, value: string, secret: boolean) => Promise<void>
  onCancel: () => void
  onDelete?: () => void
}) {
  const [name, setName] = useState(variable?.name ?? "")
  const [value, setValue] = useState(
    variable && !variable.secret ? variable.value : ""
  )
  const [secret, setSecret] = useState(variable?.secret ?? false)
  const [nameError, setNameError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!variable) {
      const invalid = validateVariableName(name)
      setNameError(invalid)
      if (invalid) return
    }
    try {
      await onSubmit(name.trim(), value, secret)
    } catch {
      // Displayed through the mutation error.
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="static-variable-name">Name</Label>
        <Input
          id="static-variable-name"
          className="h-9 bg-background dark:bg-background"
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            setNameError(null)
          }}
          maxLength={64}
          disabled={!!variable}
          pattern="^[A-Za-z_][A-Za-z0-9_]*$"
          title={VARIABLE_NAME_HINT}
          required
        />
        {!variable ? (
          <p className="text-muted-foreground">{VARIABLE_NAME_HINT}</p>
        ) : null}
        {nameError ? <p className="text-destructive">{nameError}</p> : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="static-variable-value">Value</Label>
        <Input
          id="static-variable-value"
          className="h-9 bg-background dark:bg-background"
          type={secret ? "password" : "text"}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={variable?.secret ? "Re-enter the secret value" : ""}
          maxLength={4096}
          required
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="static-variable-secret"
          checked={secret}
          onCheckedChange={setSecret}
        />
        <Label htmlFor="static-variable-secret">Secret</Label>
      </div>

      {error ? <p className="text-destructive">{error}</p> : null}

      <DrawerFormActions
        isEdit={Boolean(variable)}
        isPending={isPending}
        isDeleting={isDeleting}
        submitLabel={variable ? "Save" : "Create"}
        onCancel={onCancel}
        onDelete={onDelete}
      />
    </form>
  )
}
