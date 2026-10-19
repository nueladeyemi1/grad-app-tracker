import type { Scheme } from "../types"

export type LiveJobs = {
  fetchedAt: string
  total: number
  source: string
  schemes: Scheme[]
}

export async function fetchLiveJobs(
  input: { course: string; interests: string[]; broad: boolean },
  signal: AbortSignal,
): Promise<LiveJobs> {
  const params = new URLSearchParams()
  if (input.course) params.set("course", input.course)
  if (input.interests.length > 0) params.set("interests", input.interests.join("|"))
  if (input.broad) params.set("broad", "1")
  const response = await fetch(`/api/jobs?${params.toString()}`, { signal })
  if (!response.ok) throw new Error("Live listings could not be fetched.")
  return response.json() as Promise<LiveJobs>
}
