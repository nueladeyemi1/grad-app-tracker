import { searchLiveJobs } from "../server/jobs.js"

function first(value) {
  if (Array.isArray(value)) return value[0] ?? ""
  return typeof value === "string" ? value : ""
}

function queryOf(req) {
  const fromUrl = new URL(req.url || "/", "https://localhost").searchParams
  const query = req.query ?? {}
  return {
    course: first(query.course) || fromUrl.get("course") || "",
    interests: first(query.interests) || fromUrl.get("interests") || "",
    broad: first(query.broad) || fromUrl.get("broad") || "",
  }
}

export const config = { runtime: "nodejs" }

export default async function handler(req, res) {
  if (req.method && req.method !== "GET") {
    res.status(405).json({ error: "Use GET" })
    return
  }

  const query = queryOf(req)
  const course = query.course
  const interests = query.interests
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean)
  const broad = query.broad === "1"

  try {
    const payload = await searchLiveJobs({ course, interests, broad })
    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=1800")
    res.status(200).json(payload)
  } catch {
    res.status(502).json({ error: "Live listings could not be fetched." })
  }
}
