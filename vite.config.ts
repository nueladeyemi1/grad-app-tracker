import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import { searchLiveJobs } from "./server/jobs.js"

function liveJobsPlugin(): Plugin {
  const attach = (middlewares: { use: (path: string, handler: (req: IncomingRequest, res: ServerResponse) => void) => void }) => {
    middlewares.use("/api/jobs", (req, res) => {
      const raw = req.url ?? ""
      const search = raw.includes("?") ? raw.slice(raw.indexOf("?")) : ""
      const url = new URL(search || "/", "http://localhost")
      const course = url.searchParams.get("course") ?? ""
      const interests = (url.searchParams.get("interests") ?? "")
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean)
      const broad = url.searchParams.get("broad") === "1"
      const offset = Number(url.searchParams.get("offset")) || 0
      void searchLiveJobs({ course, interests, broad, offset })
        .then((payload) => {
          res.statusCode = 200
          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify(payload))
        })
        .catch(() => {
          res.statusCode = 502
          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify({ error: "Live listings could not be fetched." }))
        })
    })
  }

  return {
    name: "live-jobs",
    configureServer(server) {
      attach(server.middlewares)
    },
    configurePreviewServer(server) {
      attach(server.middlewares)
    },
  }
}

type IncomingRequest = { url?: string }
type ServerResponse = {
  statusCode: number
  setHeader: (name: string, value: string) => void
  end: (body: string) => void
}

export default defineConfig({
  plugins: [react(), liveJobsPlugin()],
  server: { port: 5173, strictPort: true },
})
