"use client"

import { Button } from "@/components/ui/button"
import { DrawerFormActions } from "@/components/ui/drawer-form-actions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import {
  useCreateStaticVariable,
  useDeleteStaticVariable,
  useStaticVariable,
  useStaticVariables,
  useUpdateStaticVariable,
} from "@/lib/variable/hooks"
import { validateVariableName, VARIABLE_NAME_HINT } from "@/lib/variable/name"
import { StaticVariable } from "@/lib/variable/types"
import { useState } from "react"

export function StaticVariables({ workflowId }: { workflowId: string }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editedName, setEditedName] = useState<string | null>(null)

  const variablesQuery = useStaticVariables(workflowId)
  const deleteMutation = useDeleteStaticVariable(workflowId)

  const openDrawer = (name: string | null) => {
    setEditedName(name)
    setDrawerOpen(true)
  }

  const handleDelete = (name: string) => {
    if (!window.confirm(`Delete variable "${name}"?`)) return
    deleteMutation.mutate(name)
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Workflow variables</h2>
        <Button size="sm" onClick={() => openDrawer(null)}>
          New workflow variable
        </Button>
      </div>

      {variablesQuery.isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : variablesQuery.error ? (
        <p className="text-destructive">{variablesQuery.error.message}</p>
      ) : !variablesQuery.data?.length ? (
        <p className="text-muted-foreground">No workflow variables yet.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {variablesQuery.data.map((variable) => (
            <li
              key={variable.name}
              className="flex items-center justify-between gap-2 px-4 py-2"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="font-mono">{`{{${variable.name}}}`}</span>
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
                  onClick={() => openDrawer(variable.name)}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={
                    deleteMutation.isPending &&
                    deleteMutation.variables === variable.name
                  }
                  onClick={() => handleDelete(variable.name)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {deleteMutation.error && (
        <p className="text-destructive">{deleteMutation.error.message}</p>
      )}

      <StaticVariableDrawer
        workflowId={workflowId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        variableName={editedName}
      />
    </section>
  )
}

interface StaticVariableDrawerProps {
  workflowId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `null` opens the drawer in create mode. */
  variableName: string | null
}

function StaticVariableDrawer({
  workflowId,
  open,
  onOpenChange,
  variableName,
}: StaticVariableDrawerProps) {
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

  const handleSubmit = async (
    name: string,
    value: string,
    secret: boolean
  ) => {
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
    if (!variableName) return
    if (!window.confirm(`Delete variable "${variableName}"?`)) return
    await deleteMutation.mutateAsync(variableName)
    handleOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {isEdit ? "Edit workflow variable" : "New workflow variable"}
          </SheetTitle>
        </SheetHeader>

        {isEdit && variableQuery.isLoading ? (
          <p className="px-4 text-muted-foreground">Loading…</p>
        ) : isEdit && variableQuery.error ? (
          <p className="px-4 text-destructive">{variableQuery.error.message}</p>
        ) : open ? (
          <StaticVariableForm
            key={variableQuery.data?.name ?? "new"}
            variable={isEdit ? variableQuery.data : undefined}
            isPending={mutation.isPending}
            isDeleting={deleteMutation.isPending}
            error={
              mutation.error?.message ?? deleteMutation.error?.message ?? null
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

interface StaticVariableFormProps {
  variable?: StaticVariable
  isPending: boolean
  isDeleting?: boolean
  error: string | null
  onSubmit: (name: string, value: string, secret: boolean) => Promise<void>
  onCancel: () => void
  onDelete?: () => void
}

function StaticVariableForm({
  variable,
  isPending,
  isDeleting = false,
  error,
  onSubmit,
  onCancel,
  onDelete,
}: StaticVariableFormProps) {
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
        <Label htmlFor="static-variable-name">Name</Label>
        <Input
          id="static-variable-name"
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
        <Label htmlFor="static-variable-value">Value</Label>
        <Input
          id="static-variable-value"
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
