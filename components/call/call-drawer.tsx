"use client"

import {
  fromRecord,
  KeyValueEditor,
  KeyValuePair,
  toRecord,
} from "@/components/call/key-value-editor"
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
import { Textarea } from "@/components/ui/textarea"
import {
  AvailableVariables,
  CallVariables,
  DraftCallVariables,
} from "@/components/variable/call-variables"
import { VariableInput } from "@/components/variable/variable-input"
import { useCall, useCreateCall, useUpdateCall } from "@/lib/call/hooks"
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

const SELECT_CLASS_NAME =
  "h-8 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"

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
  const [draftVariables, setDraftVariables] = useState<
    CallVariableCreateInput[]
  >([])
  const [isCreatingVariables, setIsCreatingVariables] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

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

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      createMutation.reset()
      updateMutation.reset()
      setDraftVariables([])
      setCreateError(null)
      setIsCreatingVariables(false)
    }
    onOpenChange(next)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit call" : "New call"}</SheetTitle>
        </SheetHeader>

        {isEdit && callQuery.isLoading ? (
          <p className="px-4 text-muted-foreground">Loading…</p>
        ) : isEdit && callQuery.error ? (
          <p className="px-4 text-destructive">{callQuery.error.message}</p>
        ) : open ? (
          <>
            <CallForm
              key={callQuery.data?.id ?? "new"}
              workflowId={workflowId}
              callId={callId}
              call={isEdit ? callQuery.data : undefined}
              isPending={isPending}
              error={
                createError ??
                (isEdit ? updateMutation : createMutation).error?.message ??
                null
              }
              onSubmit={handleSubmit}
            />
            <div className="flex flex-col gap-4 border-t p-4">
              {callId ? (
                <>
                  <CallVariables workflowId={workflowId} callId={callId} />
                  <AvailableVariables workflowId={workflowId} callId={callId} />
                </>
              ) : (
                <DraftCallVariables
                  drafts={draftVariables}
                  onChange={setDraftVariables}
                />
              )}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
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
  error: string | null
  onSubmit: (input: CallInput) => Promise<void>
}

function CallForm({
  workflowId,
  callId,
  call,
  isPending,
  error,
  onSubmit,
}: CallFormProps) {
  const variables = useCallFormVariables(workflowId, callId)

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
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="call-name">Name</Label>
        <Input
          id="call-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={100}
          required
        />
      </div>

      <div className="flex gap-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="call-method">Method</Label>
          <select
            id="call-method"
            value={method}
            onChange={(event) => setMethod(event.target.value as CallMethod)}
            className={SELECT_CLASS_NAME}
          >
            {METHODS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="call-url">URL</Label>
          <VariableInput
            id="call-url"
            value={url}
            onChange={setUrl}
            variables={variables}
            placeholder="https://api.example.com/{{path}}"
            maxLength={2048}
            required
          />
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="call-timeout">Timeout (ms)</Label>
          <Input
            id="call-timeout"
            type="number"
            min={100}
            max={60000}
            value={timeoutMs}
            onChange={(event) => setTimeoutMs(event.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="call-ip-version">IP version</Label>
          <select
            id="call-ip-version"
            value={ipVersion}
            onChange={(event) =>
              setIpVersion(event.target.value as CallIpVersion)
            }
            className={SELECT_CLASS_NAME}
          >
            {IP_VERSIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="call-verify-tls"
          checked={verifyTls}
          onCheckedChange={setVerifyTls}
        />
        <Label htmlFor="call-verify-tls">Verify TLS</Label>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="call-proxy">Proxy URL (optional)</Label>
        <VariableInput
          id="call-proxy"
          value={proxyUrl}
          onChange={setProxyUrl}
          variables={variables}
          maxLength={2048}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="call-body">Body (optional)</Label>
        <Textarea
          id="call-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="font-mono"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Headers</Label>
        <KeyValueEditor
          pairs={headers}
          onChange={setHeaders}
          variables={variables}
          keyPlaceholder="Header"
          valuePlaceholder="Value"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Query</Label>
        <KeyValueEditor
          pairs={query}
          onChange={setQuery}
          variables={variables}
          keyPlaceholder="Param"
          valuePlaceholder="Value"
        />
      </div>

      {error && <p className="text-destructive">{error}</p>}

      <SheetFooter className="px-0">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : call ? "Save" : "Create"}
        </Button>
      </SheetFooter>
    </form>
  )
}
