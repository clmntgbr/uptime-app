"use client"

import { BodyExampleHover } from "@/components/call/body-example-hover"
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
import { VariableInput } from "@/components/variable/variable-input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { CallDrawerSkeleton } from "@/components/ui/drawer-form-skeleton"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { CallIpVersion, CallMethod } from "@/lib/call/types"
import {
  useCreateLibraryItem,
  useDeleteLibraryItem,
  useLibraryItem,
  useUpdateLibraryItem,
} from "@/lib/library/hooks"
import { libraryVariables } from "@/lib/library/variables"
import type { LibraryItem, LibraryItemInput } from "@/lib/library/types"
import { useGlobalVariables } from "@/lib/variable/hooks"
import type { AvailableVariable } from "@/lib/variable/types"
import { Loader2Icon, Trash2Icon, XIcon } from "lucide-react"
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

const IP_VERSIONS: { value: Exclude<CallIpVersion, "any">; label: string }[] = [
  { value: "ipv4", label: "IPV4" },
  { value: "ipv6", label: "IPV6" },
]

const FIELD_CLASS_NAME = "h-9 bg-background dark:bg-background"
const SELECT_TRIGGER_CLASS_NAME =
  "h-9 w-full bg-background data-[size=default]:h-9 dark:bg-background dark:hover:bg-background"
const DEFAULT_HEADERS: KeyValuePair[] = [
  { key: "Content-Type", value: "application/json" },
]

interface LibraryItemDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `null` opens the drawer in create mode. */
  itemId: string | null
}

/** Create or edit a library item. Stacks above the library drawer. */
export function LibraryItemDrawer({
  open,
  onOpenChange,
  itemId,
}: LibraryItemDrawerProps) {
  const isEdit = itemId !== null
  const itemQuery = useLibraryItem(open && itemId ? itemId : null)
  const createMutation = useCreateLibraryItem()
  const updateMutation = useUpdateLibraryItem()
  const deleteMutation = useDeleteLibraryItem()
  const globalsQuery = useGlobalVariables()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const isPending = createMutation.isPending || updateMutation.isPending
  const mutationError =
    (isEdit ? updateMutation.error : createMutation.error)?.message ??
    deleteMutation.error?.message ??
    null

  const handleSubmit = async (input: LibraryItemInput) => {
    if (itemId) {
      await updateMutation.mutateAsync({ id: itemId, input })
    } else {
      await createMutation.mutateAsync(input)
    }
    onOpenChange(false)
  }

  const confirmDelete = async () => {
    if (!itemId) return
    await deleteMutation.mutateAsync(itemId)
    setDeleteOpen(false)
    onOpenChange(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      createMutation.reset()
      updateMutation.reset()
      deleteMutation.reset()
      setDeleteOpen(false)
    }
    onOpenChange(next)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          nested
          showCloseButton
          className="flex h-full w-[80vw]! max-w-[80vw]! flex-col gap-0 p-0 sm:max-w-[80vw]!"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>
              {isEdit ? "Edit library item" : "New library item"}
            </SheetTitle>
          </SheetHeader>

          {isEdit && itemQuery.isLoading ? (
            <CallDrawerSkeleton />
          ) : isEdit && itemQuery.error ? (
            <p className="px-6 py-8 text-destructive">
              {itemQuery.error.message}
            </p>
          ) : open ? (
            <LibraryItemForm
              key={itemQuery.data?.id ?? "new"}
              item={isEdit ? itemQuery.data : undefined}
              isPending={isPending}
              isDeleting={deleteMutation.isPending}
              variables={libraryVariables(globalsQuery.data)}
              error={mutationError}
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
            <AlertDialogTitle>Delete library item?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes{" "}
              <span className="font-medium text-foreground">
                {itemQuery.data?.name ?? "this item"}
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

interface LibraryItemFormProps {
  item?: LibraryItem
  variables: AvailableVariable[]
  isPending: boolean
  isDeleting: boolean
  error: string | null
  onSubmit: (input: LibraryItemInput) => Promise<void>
  onCancel: () => void
  onDelete?: () => void
}

function LibraryItemForm({
  item,
  variables,
  isPending,
  isDeleting,
  error,
  onSubmit,
  onCancel,
  onDelete,
}: LibraryItemFormProps) {
  const busy = isPending || isDeleting

  const [name, setName] = useState(item?.name ?? "")
  const [description, setDescription] = useState(item?.description ?? "")
  const [method, setMethod] = useState<CallMethod>(
    (item?.method as CallMethod | undefined) ?? "GET"
  )
  const [url, setUrl] = useState(item?.url ?? "")
  const [timeoutMs, setTimeoutMs] = useState(String(item?.timeoutMs ?? 30000))
  const [verifyTls, setVerifyTls] = useState(item?.verifyTls ?? true)
  const [ipVersion, setIpVersion] = useState<
    Exclude<CallIpVersion, "any"> | undefined
  >(
    item?.ipVersion === "ipv4" || item?.ipVersion === "ipv6"
      ? item.ipVersion
      : undefined
  )
  const [proxyUrl, setProxyUrl] = useState(item?.proxyUrl ?? "")
  const [body, setBody] = useState(item?.body ?? "")
  const bodyExample = item?.bodyExample ?? ""
  const [headers, setHeaders] = useState<KeyValuePair[]>(
    item ? fromRecord(item.headers) : DEFAULT_HEADERS
  )
  const [query, setQuery] = useState<KeyValuePair[]>(fromRecord(item?.query))

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        method,
        url: url.trim(),
        timeoutMs: Number(timeoutMs),
        verifyTls,
        ipVersion: ipVersion ?? "any",
        proxyUrl: proxyUrl.trim() || undefined,
        body: body || undefined,
        bodyExample: bodyExample || undefined,
        headers: toRecord(headers),
        query: toRecord(query),
        // Alert rules are not editable here yet; send them back unchanged.
        rules: item?.rules ?? [],
      })
    } catch {
      // Displayed through the mutation error.
    }
  }

  return (
    <form
      id="library-item-form"
      onSubmit={handleSubmit}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="min-h-0 flex-1 overflow-auto px-6 py-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <div className="space-y-1">
            <h2 className="font-semibold">General Information</h2>
            <p className="text-sm text-muted-foreground">
              Name, method, and URL. Use {"{{name}}"} for global variables;
              other placeholders are filled when the item is added to a
              workflow.
            </p>
          </div>
          <div className="flex flex-col gap-6 md:col-span-2">
            <div className="space-y-2">
              <Label htmlFor="library-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="library-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                required
                className={FIELD_CLASS_NAME}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="library-description">Description</Label>
              <Textarea
                id="library-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={500}
                rows={2}
                className={FIELD_CLASS_NAME}
              />
            </div>

            <div className="flex items-start gap-3">
              <div className="w-[8.5rem] shrink-0 space-y-2">
                <Label htmlFor="library-method">Method</Label>
                <Select
                  value={method}
                  onValueChange={(value) => setMethod(value as CallMethod)}
                >
                  <SelectTrigger
                    id="library-method"
                    className={SELECT_TRIGGER_CLASS_NAME}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METHODS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="library-url">
                  URL <span className="text-destructive">*</span>
                </Label>
                <VariableInput
                  id="library-url"
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
              Headers, query parameters, and body.
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
                <BodyExampleHover
                  label="Optional JSON request body"
                  example={bodyExample}
                  onUse={setBody}
                />
              </div>
              <JsonBodyInput
                value={body}
                onChange={setBody}
                title="Body"
                variables={variables}
              />
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
              <Label htmlFor="library-timeout">
                Timeout (ms) <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                Between 100 and 60000 ms
              </p>
              <Input
                id="library-timeout"
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
              <Label htmlFor="library-ip-version">IP version</Label>
              <p className="text-xs text-muted-foreground">
                When empty, any IP version is used.
              </p>
              <div className="relative">
                <Select
                  value={ipVersion ?? ""}
                  onValueChange={(value) =>
                    setIpVersion(value as Exclude<CallIpVersion, "any">)
                  }
                >
                  <SelectTrigger
                    id="library-ip-version"
                    className={SELECT_TRIGGER_CLASS_NAME}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IP_VERSIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {ipVersion && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute end-8 top-1/2 size-6 -translate-y-1/2"
                    aria-label="Clear IP version"
                    onClick={() => setIpVersion(undefined)}
                  >
                    <XIcon className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:col-span-2">
              <Switch
                id="library-verify-tls"
                checked={verifyTls}
                onCheckedChange={setVerifyTls}
              />
              <Label htmlFor="library-verify-tls">Verify TLS certificate</Label>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="library-proxy">Proxy URL</Label>
              <p className="text-xs text-muted-foreground">
                Optional HTTP proxy for this request.
              </p>
              <VariableInput
                id="library-proxy"
                value={proxyUrl}
                onChange={setProxyUrl}
                variables={variables}
                maxLength={2048}
                className={FIELD_CLASS_NAME}
              />
            </div>
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
              {item ? "Save" : "Create"}
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
