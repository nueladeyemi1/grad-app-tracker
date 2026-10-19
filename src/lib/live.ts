import type { Scheme } from "../types"

export type LiveJobs = {
  fetchedAt: string
  total: number
  limit: number
  offset: number
  source: string
  schemes: Scheme[]
}

export async function fetchLiveJobs(
  input: { course: string; interests: string[]; broad: boolean; offset: number },
  signal: AbortSignal,
): Promise<LiveJobs> {
  const params = new URLSearchParams()
  if (input.course) params.set("course", input.course)
  if (input.interests.length > 0) params.set("interests", input.interests.join("|"))
  if (input.broad) params.set("broad", "1")
  if (input.offset > 0) params.set("offset", String(input.offset))
  const response = await fetch(`/api/jobs?${params.toString()}`, { signal })
  if (!response.ok) throw new Error("Live listings could not be fetched.")
  return response.json() as Promise<LiveJobs>
}
