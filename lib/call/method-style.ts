export function methodClass(method: string | undefined) {
  switch ((method ?? "").toUpperCase()) {
    case "GET":
      return "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
    case "POST":
      return "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-300"
    case "PUT":
      return "bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
    case "PATCH":
      return "bg-violet-50 text-violet-800 dark:bg-violet-950 dark:text-violet-300"
    case "DELETE":
      return "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300"
    default:
      return "bg-muted text-muted-foreground"
  }
}
