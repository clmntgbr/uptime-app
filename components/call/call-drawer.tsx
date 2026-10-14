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
import { Textarea } from "@/components/ui/textarea"
import { useCall, useCreateCall, useUpdateCall } from "@/lib/call/hooks"
import {
  CallDetail,
  CallInput,
  CallIpVersion,
  CallMethod,
} from "@/lib/call/types"
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
  const callQuery = useCall(workflowId, open ? callId : null)
  const createMutation = useCreateCall(workflowId)
  const updateMutation = useUpdateCall(workflowId)

  const mutation = isEdit ? updateMutation : createMutation

  const handleSubmit = async (input: CallInput) => {
    if (callId) {
      await updateMutation.mutateAsync({ callId, input })
    } else {
      await createMutation.mutateAsync(input)
    }
    onOpenChange(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      createMutation.reset()
      updateMutation.reset()
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
          <CallForm
            key={callQuery.data?.id ?? "new"}
            call={isEdit ? callQuery.data : undefined}
            isPending={mutation.isPending}
            error={mutation.error?.message ?? null}
            onSubmit={handleSubmit}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function parseJsonField<T>(label: string, value: string): T | undefined {
  if (!value.trim()) return undefined
  try {
    return JSON.parse(value) as T
  } catch {
    throw new Error(`${label} must be valid JSON.`)
  }
}

function formatJsonField(value?: Record<string, string>): string {
  return value && Object.keys(value).length
    ? JSON.stringify(value, null, 2)
    : ""
}

interface CallFormProps {
  call?: CallDetail
  isPending: boolean
  error: string | null
  onSubmit: (input: CallInput) => Promise<void>
}

function CallForm({ call, isPending, error, onSubmit }: CallFormProps) {
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
  const [headers, setHeaders] = useState(formatJsonField(call?.headers))
  const [query, setQuery] = useState(formatJsonField(call?.query))
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    let input: CallInput
    try {
      input = {
        name: name.trim(),
        method,
        url: url.trim(),
        timeoutMs: Number(timeoutMs),
        verifyTls,
        ipVersion,
        proxyUrl: proxyUrl.trim() || undefined,
        body: body || undefined,
        headers: parseJsonField("Headers", headers),
        query: parseJsonField("Query", query),
      }
    } catch (parseError) {
      setFormError((parseError as Error).message)
      return
    }

    try {
      await onSubmit(input)
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
          <Input
            id="call-url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
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
        <Input
          id="call-proxy"
          value={proxyUrl}
          onChange={(event) => setProxyUrl(event.target.value)}
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
        <Label htmlFor="call-headers">Headers (JSON, optional)</Label>
        <Textarea
          id="call-headers"
          value={headers}
          onChange={(event) => setHeaders(event.target.value)}
          className="font-mono"
          placeholder='{ "Content-Type": "application/json" }'
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="call-query">Query (JSON, optional)</Label>
        <Textarea
          id="call-query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="font-mono"
          placeholder='{ "page": "1" }'
        />
      </div>

      {(formError ?? error) && (
        <p className="text-destructive">{formError ?? error}</p>
      )}

      <SheetFooter className="px-0">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : call ? "Save" : "Create"}
        </Button>
      </SheetFooter>
    </form>
  )
}
