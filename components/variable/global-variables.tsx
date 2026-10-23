"use client"

import { Button } from "@/components/ui/button"
import { DrawerFormActions } from "@/components/ui/drawer-form-actions"
import { DrawerFormSkeleton } from "@/components/ui/drawer-form-skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { VARIABLE_TEXT_CLASS } from "@/components/variable/variable-text"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { ApiError } from "@/lib/api-error"
import {
  useCreateGlobalVariable,
  useDeleteGlobalVariable,
  useGlobalVariable,
  useGlobalVariables,
  useUpdateGlobalVariable,
} from "@/lib/variable/hooks"
import { validateVariableName, VARIABLE_NAME_HINT } from "@/lib/variable/name"
import { GlobalVariable } from "@/lib/variable/types"
import { useState } from "react"

function formatDeleteError(error: Error) {
  return error instanceof ApiError && error.code === "VARIABLE_IN_USE"
    ? "This variable is used by a workflow and cannot be deleted."
    : error.message
}

export function GlobalVariables() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editedId, setEditedId] = useState<string | null>(null)

  const variablesQuery = useGlobalVariables()
  const deleteMutation = useDeleteGlobalVariable()

  const openDrawer = (id: string | null) => {
    setEditedId(id)
    setDrawerOpen(true)
  }

  const handleDelete = (variable: GlobalVariable) => {
    if (!window.confirm(`Delete variable "${variable.name}"?`)) return
    deleteMutation.mutate(variable.id)
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Global variables</h2>
        <Button size="sm" onClick={() => openDrawer(null)}>
          New global variable
        </Button>
      </div>

      {variablesQuery.isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : variablesQuery.error ? (
        <p className="text-destructive">{variablesQuery.error.message}</p>
      ) : !variablesQuery.data?.length ? (
        <p className="text-muted-foreground">No global variables yet.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {variablesQuery.data.map((variable) => (
            <li
              key={variable.id}
              className="flex items-center justify-between gap-2 px-4 py-2"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className={VARIABLE_TEXT_CLASS}>{`{{${variable.name}}}`}</span>
                <span className="truncate text-muted-foreground">
                  {variable.value}
                </span>
                {variable.secret && (
                  <span className="text-muted-foreground">(secret)</span>
                )}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openDrawer(variable.id)}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={
                    deleteMutation.isPending &&
                    deleteMutation.variables === variable.id
                  }
                  onClick={() => handleDelete(variable)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {deleteMutation.error && (
        <p className="text-destructive">
          {formatDeleteError(deleteMutation.error)}
        </p>
      )}

      <GlobalVariableDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        variableId={editedId}
      />
    </section>
  )
}

interface GlobalVariableDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `null` opens the drawer in create mode. */
  variableId: string | null
}

function GlobalVariableDrawer({
  open,
  onOpenChange,
  variableId,
}: GlobalVariableDrawerProps) {
  const isEdit = variableId !== null
  const variableQuery = useGlobalVariable(open ? variableId : null)
  const createMutation = useCreateGlobalVariable()
  const updateMutation = useUpdateGlobalVariable()
  const deleteMutation = useDeleteGlobalVariable()

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
    if (variableId) {
      await updateMutation.mutateAsync({
        id: variableId,
        input: { value, secret },
      })
    } else {
      await createMutation.mutateAsync({ name, value, secret })
    }
    handleOpenChange(false)
  }

  const handleDelete = async () => {
    if (!variableId || !variableQuery.data) return
    if (!window.confirm(`Delete variable "${variableQuery.data.name}"?`)) return
    await deleteMutation.mutateAsync(variableId)
    handleOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {isEdit ? "Edit global variable" : "New global variable"}
          </SheetTitle>
        </SheetHeader>

        {isEdit && variableQuery.isLoading ? (
          <DrawerFormSkeleton fields={3} />
        ) : isEdit && variableQuery.error ? (
          <p className="px-4 text-destructive">{variableQuery.error.message}</p>
        ) : open ? (
          <GlobalVariableForm
            key={variableQuery.data?.id ?? "new"}
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

interface GlobalVariableFormProps {
  variable?: GlobalVariable
  isPending: boolean
  isDeleting?: boolean
  error: string | null
  onSubmit: (name: string, value: string, secret: boolean) => Promise<void>
  onCancel: () => void
  onDelete?: () => void
}

function GlobalVariableForm({
  variable,
  isPending,
  isDeleting = false,
  error,
  onSubmit,
  onCancel,
  onDelete,
}: GlobalVariableFormProps) {
  const [name, setName] = useState(variable?.name ?? "")
  // Secret values come back masked, so they must be re-entered.
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
        <Label htmlFor="global-variable-name">Name</Label>
        <Input
          id="global-variable-name"
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
        {!variable && (
          <p className="text-muted-foreground">{VARIABLE_NAME_HINT}</p>
        )}
        {nameError && <p className="text-destructive">{nameError}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="global-variable-value">Value</Label>
        <Input
          id="global-variable-value"
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
          id="global-variable-secret"
          checked={secret}
          onCheckedChange={setSecret}
        />
        <Label htmlFor="global-variable-secret">Secret</Label>
      </div>

      {error && <p className="text-destructive">{error}</p>}

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
