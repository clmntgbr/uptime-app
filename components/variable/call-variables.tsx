"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import {
  useAvailableVariables,
  useCallVariable,
  useCallVariables,
  useCreateCallVariable,
  useDeleteCallVariable,
  useResponseKeys,
  useUpdateCallVariable,
} from "@/lib/variable/hooks"
import { validateVariableName, VARIABLE_NAME_HINT } from "@/lib/variable/name"
import {
  CallVariable,
  CallVariableCreateInput,
  CallVariableSource,
} from "@/lib/variable/types"
import { useState } from "react"

const SOURCES: { value: CallVariableSource; label: string; hint: string }[] = [
  { value: "json", label: "JSON", hint: "$.access_token" },
  { value: "header", label: "Header", hint: "X-Request-Id" },
  { value: "status", label: "Status code", hint: "" },
  { value: "regex", label: "Regex", hint: "token=(\\w+)" },
]

interface CallVariablesProps {
  workflowId: string
  callId: string
}

export function CallVariables({ workflowId, callId }: CallVariablesProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editedName, setEditedName] = useState<string | null>(null)

  const variablesQuery = useCallVariables(workflowId, callId)
  const deleteMutation = useDeleteCallVariable(workflowId, callId)

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
        <h3 className="font-semibold">Call variables</h3>
        <Button size="sm" type="button" onClick={() => openDrawer(null)}>
          New call variable
        </Button>
      </div>

      {variablesQuery.isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : variablesQuery.error ? (
        <p className="text-destructive">{variablesQuery.error.message}</p>
      ) : !variablesQuery.data?.length ? (
        <p className="text-muted-foreground">
          No variables extracted from this call.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {variablesQuery.data.map((variable) => (
            <li
              key={variable.name}
              className="flex items-center justify-between gap-2 px-3 py-2"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="font-mono">{`{{${variable.name}}}`}</span>
                <span className="truncate text-muted-foreground">
                  {variable.source}
                  {variable.path ? ` · ${variable.path}` : ""}
                </span>
                {variable.secret && (
                  <span className="text-muted-foreground">(secret)</span>
                )}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => openDrawer(variable.name)}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  type="button"
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

      <CallVariableDrawer
        workflowId={workflowId}
        callId={callId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        variableName={editedName}
      />
    </section>
  )
}

/** Local drafts while creating a call (persisted after the call is created). */
export function DraftCallVariables({
  drafts,
  onChange,
}: {
  drafts: CallVariableCreateInput[]
  onChange: (drafts: CallVariableCreateInput[]) => void
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editedIndex, setEditedIndex] = useState<number | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const openCreate = () => {
    setEditedIndex(null)
    setFormError(null)
    setDrawerOpen(true)
  }

  const openEdit = (index: number) => {
    setEditedIndex(index)
    setFormError(null)
    setDrawerOpen(true)
  }

  const handleDelete = (index: number) => {
    const draft = drafts[index]
    if (!draft || !window.confirm(`Delete variable "${draft.name}"?`)) return
    onChange(drafts.filter((_, i) => i !== index))
  }

  const handleSubmit = async (
    name: string,
    source: CallVariableSource,
    path: string,
    secret: boolean
  ) => {
    const input: CallVariableCreateInput =
      source === "status"
        ? { name, secret: secret || undefined }
        : { name, source, path, secret: secret || undefined }

    const duplicate = drafts.some(
      (draft, index) =>
        draft.name === name && (editedIndex === null || index !== editedIndex)
    )
    if (duplicate) {
      setFormError(`Variable "${name}" already exists.`)
      return
    }

    if (editedIndex === null) {
      onChange([...drafts, input])
    } else {
      onChange(drafts.map((draft, index) => (index === editedIndex ? input : draft)))
    }
    setDrawerOpen(false)
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Call variables</h3>
        <Button size="sm" type="button" onClick={openCreate}>
          New call variable
        </Button>
      </div>

      {!drafts.length ? (
        <p className="text-muted-foreground">
          No variables yet. They will be created with the call.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {drafts.map((variable, index) => (
            <li
              key={`${variable.name}-${index}`}
              className="flex items-center justify-between gap-2 px-3 py-2"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="font-mono">{`{{${variable.name}}}`}</span>
                <span className="truncate text-muted-foreground">
                  {variable.source ?? "json"}
                  {variable.path ? ` · ${variable.path}` : ""}
                </span>
                {variable.secret && (
                  <span className="text-muted-foreground">(secret)</span>
                )}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => openEdit(index)}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  type="button"
                  onClick={() => handleDelete(index)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {editedIndex === null ? "New call variable" : "Edit call variable"}
            </SheetTitle>
          </SheetHeader>
          {drawerOpen && (
            <CallVariableForm
              key={editedIndex ?? "new"}
              workflowId=""
              callId={null}
              variable={
                editedIndex === null
                  ? undefined
                  : {
                      name: drafts[editedIndex].name,
                      type: "call",
                      source: drafts[editedIndex].source ?? "json",
                      path: drafts[editedIndex].path,
                      secret: drafts[editedIndex].secret,
                    }
              }
              isPending={false}
              error={formError}
              onSubmit={handleSubmit}
            />
          )}
        </SheetContent>
      </Sheet>
    </section>
  )
}

/** Globals, workflow statics and extractions of previous calls. */
export function AvailableVariables({ workflowId, callId }: CallVariablesProps) {
  const variablesQuery = useAvailableVariables(workflowId, callId)

  if (!variablesQuery.data?.length) return null

  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-semibold">Available variables</h3>
      <ul className="flex flex-wrap gap-2">
        {variablesQuery.data.map((variable) => (
          <li
            key={`${variable.type}-${variable.name}`}
            className="rounded-md border px-2 py-1 font-mono"
            title={
              "callName" in variable
                ? `From call "${variable.callName}"`
                : variable.type
            }
          >
            {`{{${variable.name}}}`}
            <span className="ms-1 text-muted-foreground">{variable.type}</span>
            {variable.secret && (
              <span className="ms-1 text-muted-foreground">· secret</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

interface CallVariableDrawerProps extends CallVariablesProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `null` opens the drawer in create mode. */
  variableName: string | null
}

function CallVariableDrawer({
  workflowId,
  callId,
  open,
  onOpenChange,
  variableName,
}: CallVariableDrawerProps) {
  const isEdit = variableName !== null
  const variableQuery = useCallVariable(
    workflowId,
    callId,
    open ? variableName : null
  )
  const createMutation = useCreateCallVariable(workflowId, callId)
  const updateMutation = useUpdateCallVariable(workflowId, callId)

  const mutation = isEdit ? updateMutation : createMutation

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      createMutation.reset()
      updateMutation.reset()
    }
    onOpenChange(next)
  }

  const handleSubmit = async (
    name: string,
    source: CallVariableSource,
    path: string,
    secret: boolean
  ) => {
    if (variableName) {
      await updateMutation.mutateAsync({
        name: variableName,
        input:
          source === "status"
            ? { secret: secret || undefined }
            : { source, path, secret: secret || undefined },
      })
    } else {
      await createMutation.mutateAsync(
        source === "status"
          ? { name, secret: secret || undefined }
          : { name, source, path, secret: secret || undefined }
      )
    }
    handleOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {isEdit ? "Edit call variable" : "New call variable"}
          </SheetTitle>
        </SheetHeader>

        {isEdit && variableQuery.isLoading ? (
          <p className="px-4 text-muted-foreground">Loading…</p>
        ) : isEdit && variableQuery.error ? (
          <p className="px-4 text-destructive">{variableQuery.error.message}</p>
        ) : open ? (
          <CallVariableForm
            key={variableQuery.data?.name ?? "new"}
            workflowId={workflowId}
            callId={callId}
            variable={isEdit ? variableQuery.data : undefined}
            isPending={mutation.isPending}
            error={mutation.error?.message ?? null}
            onSubmit={handleSubmit}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

interface CallVariableFormProps {
  workflowId: string
  /** `null` while drafting a variable on a call that does not exist yet. */
  callId: string | null
  variable?: CallVariable
  isPending: boolean
  error: string | null
  onSubmit: (
    name: string,
    source: CallVariableSource,
    path: string,
    secret: boolean
  ) => Promise<void>
}

/** Response keys are dotted paths; JSONPath expressions must start with `$`. */
function toJsonPath(key: string) {
  return key.startsWith("$") ? key : `$.${key}`
}

function CallVariableForm({
  workflowId,
  callId,
  variable,
  isPending,
  error,
  onSubmit,
}: CallVariableFormProps) {
  const [name, setName] = useState(variable?.name ?? "")
  const [source, setSource] = useState<CallVariableSource>(
    variable?.source ?? "json"
  )
  const [path, setPath] = useState(variable?.path ?? "")
  const [secret, setSecret] = useState(variable?.secret ?? false)
  const [pathFocused, setPathFocused] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  const responseKeysQuery = useResponseKeys(
    workflowId,
    callId ?? "",
    source === "json" && !!callId
  )

  const query = path.replace(/^\$\.?/, "").toLowerCase()
  const suggestions = (responseKeysQuery.data ?? []).filter(
    (key) => !query || key.toLowerCase().includes(query)
  )
  const showSuggestions =
    source === "json" && pathFocused && suggestions.length > 0

  const sourceHint = SOURCES.find((option) => option.value === source)?.hint

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!variable) {
      const invalid = validateVariableName(name)
      setNameError(invalid)
      if (invalid) return
    }
    try {
      await onSubmit(name.trim(), source, path.trim(), secret)
    } catch {
      // Displayed through the mutation error.
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="call-variable-name">Name</Label>
        <Input
          id="call-variable-name"
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
        <Label htmlFor="call-variable-source">Source</Label>
        <select
          id="call-variable-source"
          value={source}
          onChange={(event) =>
            setSource(event.target.value as CallVariableSource)
          }
          className="h-8 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {SOURCES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {source !== "status" && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="call-variable-path">Path</Label>
          <Input
            id="call-variable-path"
            value={path}
            onChange={(event) => setPath(event.target.value)}
            onFocus={() => setPathFocused(true)}
            onBlur={() => {
              // Let mousedown on a suggestion apply before closing.
              window.setTimeout(() => setPathFocused(false), 150)
            }}
            placeholder={sourceHint}
            maxLength={512}
            required
            autoComplete="off"
          />
          {showSuggestions && (
            <ul className="max-h-40 overflow-y-auto rounded-md border bg-popover">
              {suggestions.map((key) => (
                <li key={key}>
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-start font-mono hover:bg-muted"
                    onMouseDown={(event) => {
                      event.preventDefault()
                      setPath(toJsonPath(key))
                      setPathFocused(false)
                    }}
                  >
                    {toJsonPath(key)}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {source === "json" &&
            pathFocused &&
            !responseKeysQuery.isLoading &&
            (responseKeysQuery.data?.length ?? 0) === 0 && (
              <p className="text-muted-foreground">
                No keys from the last run yet.
              </p>
            )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Switch
          id="call-variable-secret"
          checked={secret}
          onCheckedChange={setSecret}
        />
        <Label htmlFor="call-variable-secret">Secret</Label>
      </div>

      {error && <p className="text-destructive">{error}</p>}

      <SheetFooter className="px-0">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : variable ? "Save" : "Create"}
        </Button>
      </SheetFooter>
    </form>
  )
}
