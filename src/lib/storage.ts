import type { Application, Profile, Store } from "../types"

const KEY = "uk-grad-tracker-v1"

export const emptyProfile: Profile = {
  course: "",
  university: "",
  graduationYear: "",
  interests: [],
  evidence: "",
  needsSponsorship: false,
}

export function emptyStore(): Store {
  return { version: 1, profile: emptyProfile, applications: {} }
}

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw) as Partial<Store>
    if (parsed.version !== 1 || !parsed.profile || !parsed.applications) return emptyStore()
    return {
      version: 1,
      profile: { ...emptyProfile, ...parsed.profile, interests: parsed.profile.interests ?? [] },
      applications: parsed.applications,
    }
  } catch {
    return emptyStore()
  }
}

export function saveStore(store: Store) {
  localStorage.setItem(KEY, JSON.stringify(store))
}

export function todayISO(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${now.getFullYear()}-${month}-${day}`
}

export function stamp(application: Omit<Application, "updatedAt">): Application {
  return { ...application, updatedAt: new Date().toISOString() }
}

export function downloadBackup(store: Store) {
  const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "uk-grad-tracker-backup.json"
  link.click()
  URL.revokeObjectURL(url)
}

export function parseBackup(raw: string): Store | null {
  try {
    const parsed = JSON.parse(raw) as Partial<Store>
    if (parsed.version !== 1 || !parsed.profile || !parsed.applications) return null
    return {
      version: 1,
      profile: { ...emptyProfile, ...parsed.profile, interests: parsed.profile.interests ?? [] },
      applications: parsed.applications,
    }
  } catch {
    return null
  }
}
