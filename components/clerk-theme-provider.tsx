"use client"

import { dark } from "@clerk/themes"
import { ClerkProvider } from "@clerk/nextjs"
import { useTheme } from "next-themes"
import type { ReactNode } from "react"

export function ClerkThemeProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  return (
    <ClerkProvider
      appearance={{
        baseTheme: isDark ? dark : undefined,
        variables: isDark
          ? undefined
          : {
              colorBackground: "#ffffff",
              colorForeground: "#121212",
            },
      }}
    >
      {children}
    </ClerkProvider>
  )
}
