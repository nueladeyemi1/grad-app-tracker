import type { Scheme } from "../types"

export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = parseISODate(iso)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

export function formatDay(iso: string | null): string {
  if (!iso) return "No date"
  return parseISODate(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function formatDeadline(scheme: Scheme): string {
  if (!scheme.deadline) return "No deadline published on the listing"
  const day = parseISODate(scheme.deadline).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  return scheme.deadlineDetail ? `${day} · ${scheme.deadlineDetail}` : day
}

export function deadlineTone(iso: string | null): "soon" | "past" | "later" | "none" {
  const days = daysUntil(iso)
  if (days === null) return "none"
  if (days < 0) return "past"
  if (days <= 14) return "soon"
  return "later"
}

export function deadlineChip(iso: string | null, detail: string): string {
  const days = daysUntil(iso)
  if (days === null) return "Deadline unconfirmed"
  if (days < 0) return "Published date has passed"
  if (days === 0) return detail ? `Closes today · ${detail}` : "Closes today"
  if (days === 1) return "Closes tomorrow"
  if (days <= 14) return `Closes in ${days} days`
  return formatDeadline({
    deadline: iso,
    deadlineDetail: detail,
  } as Scheme)
}
