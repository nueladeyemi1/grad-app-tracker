import { searchLiveJobs } from "../server/jobs.js"

function first(value) {
  if (Array.isArray(value)) return value[0] ?? ""
  return typeof value === "string" ? value : ""
}

export default async function handler(req, res) {
  if (req.method && req.method !== "GET") {
    res.status(405).json({ error: "Use GET" })
    return
  }

  const course = first(req.query?.course)
  const interests = first(req.query?.interests)
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean)
  const broad = first(req.query?.broad) === "1"

  try {
    const payload = await searchLiveJobs({ course, interests, broad })
    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=1800")
    res.status(200).json(payload)
  } catch {
    res.status(502).json({ error: "Live listings could not be fetched." })
  }
}
