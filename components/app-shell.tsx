"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { UserButton } from "@clerk/nextjs"

export function AppShell({
  children,
  defaultSidebarOpen = true,
}: {
  children: React.ReactNode
  defaultSidebarOpen?: boolean
}) {
  return (
    <SidebarProvider
      defaultOpen={defaultSidebarOpen}
      style={
        {
          "--sidebar-width": "19rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ms-1" />
          <Separator
            orientation="vertical"
            className="me-2 data-vertical:h-6 data-vertical:self-auto"
          />
          <div className="ms-auto flex h-full items-center">
            <UserButton
              appearance={{
                elements: {
                  rootBox: "flex items-center",
                  userButtonBox: "flex items-center",
                  userButtonTrigger: "flex items-center focus:shadow-none",
                  userButtonAvatarBox: "size-7",
                },
              }}
            />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
