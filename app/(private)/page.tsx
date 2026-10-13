"use client"

import { useUser } from "@/lib/user/hooks"

export default function Page() {
  const { user } = useUser()

  return (
    <>
      <pre>{JSON.stringify(user, null, 2)}</pre>
    </>
  )
}
