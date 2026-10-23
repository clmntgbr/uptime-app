"use client"

import { JsonBodyInput } from "@/components/call/json-body-input"
import {
  fromRecord,
  KeyValueEditor,
  KeyValuePair,
  toRecord,
} from "@/components/call/key-value-editor"
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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import {
  CallVariables,
  DraftCallVariables,
} from "@/components/variable/call-variables"
import { VariableInput } from "@/components/variable/variable-input"
import {
  useCall,
  useCreateCall,
  useDeleteCall,
  useUpdateCall,
} from "@/lib/call/hooks"
import {
  CallDetail,
  CallInput,
  CallIpVersion,
  CallMethod,
} from "@/lib/call/types"
import { queryKeys } from "@/lib/query/keys"
import { createCallVariable } from "@/lib/variable/api"
import { useCallFormVariables } from "@/lib/variable/hooks"
import { CallVariableCreateInput } from "@/lib/variable/types"
import { useQueryClient } from "@tanstack/react-query"
import { Loader2Icon, Trash2Icon } from "lucide-react"
import { useState } from "react"

const METHODS: CallMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]

const IP_VERSIONS: CallIpVersion[] = ["any", "ipv4", "ipv6"]

function capitalizeLabel(value: string): string {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

const FIELD_CLASS_NAME =
  "h-9 bg-background dark:bg-background"
/** Overrides SelectTrigger's default `data-[size=default]:h-7` and grey fill. */
const SELECT_TRIGGER_CLASS_NAME =
  "h-9 w-full bg-background data-[size=default]:h-9 dark:bg-background dark:hover:bg-background"

interface CallDrawerProps {
  workflowId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `null` opens the drawer in create mode. */
  callId: string | null
}

export function CallDrawer({
  workflowId,
  open,
  onOpenChange,
  callId,
}: CallDrawerProps) {
  const isEdit = callId !== null
  const queryClient = useQueryClient()
  const callQuery = useCall(workflowId, open ? callId : null)
  const createMutation = useCreateCall(workflowId)
  const updateMutation = useUpdateCall(workflowId)
  const deleteMutation = useDeleteCall(workflowId)
  const [draftVariables, setDraftVariables] = useState<
    CallVariableCreateInput[]
  >([])
  const [isCreatingVariables, setIsCreatingVariables] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const isPending =
    createMutation.isPending || updateMutation.isPending || isCreatingVariables

  const handleSubmit = async (input: CallInput) => {
    setCreateError(null)
    if (callId) {
      await updateMutation.mutateAsync({ callId, input })
      onOpenChange(false)
      return
    }

    const created = await createMutation.mutateAsync(input)
    if (draftVariables.length) {
      setIsCreatingVariables(true)
      try {
        for (const draft of draftVariables) {
          await createCallVariable(workflowId, created.id, draft)
        }
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: queryKeys.workflows.detail(workflowId),
          }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.availableVariables.all,
          }),
        ])
      } catch (error) {
        setCreateError(
          error instanceof Error
            ? `Call created, but a variable failed: ${error.message}`
            : "Call created, but a variable failed."
        )
        return
      } finally {
        setIsCreatingVariables(false)
      }
    }
    onOpenChange(false)
  }

  const confirmDelete = async () => {
    if (!callId) return
    await deleteMutation.mutateAsync(callId)
    setDeleteOpen(false)
    onOpenChange(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      createMutation.reset()
      updateMutation.reset()
      deleteMutation.reset()
      setDraftVariables([])
      setCreateError(null)
      setIsCreatingVariables(false)
      setDeleteOpen(false)
    }
    onOpenChange(next)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          showCloseButton
          className="flex h-full w-[80vw]! max-w-[80vw]! flex-col gap-0 p-0 sm:max-w-[80vw]!"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{isEdit ? "Edit call" : "New call"}</SheetTitle>
          </SheetHeader>

          {isEdit && callQuery.isLoading ? (
            <p className="px-6 py-8 text-muted-foreground">Loading…</p>
          ) : isEdit && callQuery.error ? (
            <p className="px-6 py-8 text-destructive">
              {callQuery.error.message}
            </p>
          ) : open ? (
            <CallForm
              key={callQuery.data?.id ?? "new"}
              workflowId={workflowId}
              callId={callId}
              call={isEdit ? callQuery.data : undefined}
              isPending={isPending}
              isDeleting={deleteMutation.isPending}
              error={
                createError ??
                (isEdit ? updateMutation : createMutation).error?.message ??
                deleteMutation.error?.message ??
                null
              }
              draftVariables={draftVariables}
              onDraftVariablesChange={setDraftVariables}
              onSubmit={handleSubmit}
              onCancel={() => handleOpenChange(false)}
              onDelete={isEdit ? () => setDeleteOpen(true) : undefined}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete call?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">
                {callQuery.data?.name ?? "this call"}
              </span>
              . This action cannot be undone.
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
                void confirmDelete()
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

const DEFAULT_HEADERS: KeyValuePair[] = [
  { key: "Content-Type", value: "application/json" },
]

interface CallFormProps {
  workflowId: string
  callId: string | null
  call?: CallDetail
  isPending: boolean
  isDeleting?: boolean
  error: string | null
  draftVariables: CallVariableCreateInput[]
  onDraftVariablesChange: (drafts: CallVariableCreateInput[]) => void
  onSubmit: (input: CallInput) => Promise<void>
  onCancel: () => void
  onDelete?: () => void
}

function CallForm({
  workflowId,
  callId,
  call,
  isPending,
  isDeleting = false,
  error,
  draftVariables,
  onDraftVariablesChange,
  onSubmit,
  onCancel,
  onDelete,
}: CallFormProps) {
  const variables = useCallFormVariables(workflowId, callId)
  const busy = isPending || isDeleting

  const [name, setName] = useState(call?.name ?? "")
  const [method, setMethod] = useState<CallMethod>(call?.method ?? "GET")
  const [url, setUrl] = useState(call?.url ?? "")
  const [timeoutMs, setTimeoutMs] = useState(String(call?.timeoutMs ?? 30000))
  const [verifyTls, setVerifyTls] = useState(call?.verifyTls ?? true)
  const [ipVersion, setIpVersion] = useState<CallIpVersion>(
    call?.ipVersion ?? "any"
  )
  const [proxyUrl, setProxyUrl] = useState(call?.proxyUrl ?? "")
  const [body, setBody] = useState(call?.body ?? "")
  const [headers, setHeaders] = useState<KeyValuePair[]>(
    call ? fromRecord(call.headers) : DEFAULT_HEADERS
  )
  const [query, setQuery] = useState<KeyValuePair[]>(fromRecord(call?.query))

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      await onSubmit({
        name: name.trim(),
        method,
        url: url.trim(),
        timeoutMs: Number(timeoutMs),
        verifyTls,
        ipVersion,
        proxyUrl: proxyUrl.trim() || undefined,
        body: body || undefined,
        headers: toRecord(headers),
        query: toRecord(query),
      })
    } catch {
      // Displayed through the mutation error.
    }
  }

  return (
    <form
      id="call-form"
      onSubmit={handleSubmit}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="min-h-0 flex-1 overflow-auto px-6 py-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <div className="space-y-1">
            <h2 className="font-semibold">General Information</h2>
            <p className="text-sm text-muted-foreground">
              Define the call name, URL, and HTTP method.
            </p>
          </div>
          <div className="flex flex-col gap-6 md:col-span-2">
            <div className="space-y-2">
              <Label htmlFor="call-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                The name of the call
              </p>
              <Input
                id="call-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                required
                className={FIELD_CLASS_NAME}
              />
            </div>

            <div className="flex items-start gap-3">
              <div className="w-[8.5rem] shrink-0 space-y-2">
                <Label htmlFor="call-method">Method</Label>
                <Select
                  value={method}
                  onValueChange={(value) => setMethod(value as CallMethod)}
                >
                  <SelectTrigger
                    id="call-method"
                    className={SELECT_TRIGGER_CLASS_NAME}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METHODS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {capitalizeLabel(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="call-url">
                  URL <span className="text-destructive">*</span>
                </Label>
                <VariableInput
                  id="call-url"
                  value={url}
                  onChange={setUrl}
                  variables={variables}
                  placeholder="https://api.example.com/{{path}}"
                  maxLength={2048}
                  required
                  className={FIELD_CLASS_NAME}
                />
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-10" />

        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <div className="space-y-1">
            <h2 className="font-semibold">Request</h2>
            <p className="text-sm text-muted-foreground">
              Configure headers, query parameters, and body.
            </p>
          </div>
          <div className="flex flex-col gap-6 md:col-span-2">
            <KeyValueEditor
              label="Headers"
              description="Optional HTTP headers"
              pairs={headers}
              onChange={setHeaders}
              variables={variables}
              keyPlaceholder="Header"
              valuePlaceholder="Value"
              addLabel="Add header"
            />

            <KeyValueEditor
              label="Query"
              description="Optional query string parameters"
              pairs={query}
              onChange={setQuery}
              variables={variables}
              keyPlaceholder="Param"
              valuePlaceholder="Value"
              addLabel="Add query"
            />

            <div className="space-y-2">
              <div className="space-y-1">
                <Label>Body</Label>
                <p className="text-xs text-muted-foreground">
                  Optional JSON request body
                </p>
              </div>
              <JsonBodyInput value={body} onChange={setBody} title="Body" />
            </div>
          </div>
        </div>

        <Separator className="my-10" />

        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <div className="space-y-1">
            <h2 className="font-semibold">Execution</h2>
            <p className="text-sm text-muted-foreground">
              Timeout, TLS, and network settings.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:col-span-2">
            <div className="space-y-2">
              <Label htmlFor="call-timeout">
                Timeout (ms) <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                Between 100 and 60000 ms
              </p>
              <Input
                id="call-timeout"
                type="number"
                min={100}
                max={60000}
                value={timeoutMs}
                onChange={(event) => setTimeoutMs(event.target.value)}
                required
                className={FIELD_CLASS_NAME}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="call-ip-version">IP version</Label>
              <p className="text-xs text-muted-foreground">
                Prefer IPv4, IPv6, or any
              </p>
              <Select
                value={ipVersion}
                onValueChange={(value) => setIpVersion(value as CallIpVersion)}
              >
                <SelectTrigger
                  id="call-ip-version"
                  className={SELECT_TRIGGER_CLASS_NAME}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IP_VERSIONS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {capitalizeLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex h-9 items-center justify-between gap-4 rounded-md border border-input px-3 sm:col-span-2">
              <Label htmlFor="call-verify-tls">Verify TLS certificate</Label>
              <Switch
                id="call-verify-tls"
                checked={verifyTls}
                onCheckedChange={setVerifyTls}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="call-proxy">Proxy URL</Label>
              <p className="text-xs text-muted-foreground">
                Optional HTTP proxy
              </p>
              <VariableInput
                id="call-proxy"
                value={proxyUrl}
                onChange={setProxyUrl}
                variables={variables}
                maxLength={2048}
                className={FIELD_CLASS_NAME}
              />
            </div>
          </div>
        </div>

        <Separator className="my-10" />

        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <div className="space-y-1">
            <h2 className="font-semibold">Variables</h2>
            <p className="text-sm text-muted-foreground">
              Extract values from the response for later calls.
            </p>
          </div>
          <div className="flex flex-col gap-6 md:col-span-2">
            {callId ? (
              <>
                <CallVariables workflowId={workflowId} callId={callId} />
              </>
            ) : (
              <DraftCallVariables
                drafts={draftVariables}
                onChange={onDraftVariablesChange}
              />
            )}
          </div>
        </div>

        {error && <p className="mt-6 text-sm text-destructive">{error}</p>}
      </div>

      <div className="shrink-0 border-t bg-background px-6 py-4">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {onDelete ? (
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
                disabled={busy}
              >
                <Trash2Icon className="size-4" />
                Delete
              </Button>
            ) : null}
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={onCancel}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={busy}>
              {call ? "Update" : "Create"}
              {isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
