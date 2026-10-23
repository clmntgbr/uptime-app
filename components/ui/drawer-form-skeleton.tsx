import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/** Placeholder layout while a drawer fetches its entity. */
export function DrawerFormSkeleton({
  className,
  fields = 4,
}: {
  className?: string
  fields?: number
}) {
  return (
    <div
      className={cn("flex flex-col gap-6 px-4 py-4", className)}
      aria-busy
      aria-label="Loading"
    >
      {Array.from({ length: fields }, (_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <div className="mt-2 flex justify-end gap-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  )
}

/** Wider skeleton matching the call drawer sections. */
export function CallDrawerSkeleton() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      aria-busy
      aria-label="Loading"
    >
      <div className="min-h-0 flex-1 space-y-10 overflow-auto px-6 py-8">
        {Array.from({ length: 3 }, (_, section) => (
          <div
            key={section}
            className="grid grid-cols-1 gap-10 md:grid-cols-3"
          >
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
            <div className="flex flex-col gap-6 md:col-span-2">
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-9 w-full" />
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-9 w-[8.5rem]" />
                <Skeleton className="h-9 flex-1" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2 border-t px-6 py-4">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
  )
}
