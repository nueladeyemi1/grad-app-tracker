import { useEffect, useMemo, useRef, useState } from "react"
import { ProfilePanel } from "./components/ProfilePanel"
import { SchemeDetail } from "./components/SchemeDetail"
import { deadlineChip, deadlineTone, daysUntil, formatDay } from "./lib/dates"
import { fetchLiveJobs } from "./lib/live"
import { evaluate, fitLabel, isRecommended } from "./lib/match"
import { buildPrompt } from "./lib/prompt"
import {
  downloadBackup,
  emptyProfile,
  loadStore,
  parseBackup,
  saveStore,
  stamp,
  todayISO,
} from "./lib/storage"
import {
  APPLIED_STATUSES,
  STATUS_LABEL,
  STATUS_ORDER,
  type Application,
  type Profile,
  type Scheme,
  type Status,
} from "./types"

type SortKey = "fit" | "deadline" | "employer"

function matchesQuery(scheme: Scheme, query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [
    scheme.employer,
    scheme.programme,
    scheme.summary,
    scheme.locations.join(" "),
    scheme.interests.join(" "),
    scheme.courses.join(" "),
    scheme.streams.join(" "),
  ]
    .join(" ")
    .toLowerCase()
    .includes(needle)
}

function hasApplied(status: Status | undefined) {
  return status ? APPLIED_STATUSES.includes(status) : false
}

export default function App() {
  const initial = loadStore()
  const [profile, setProfile] = useState<Profile>(initial.profile)
  const [apps, setApps] = useState<Record<string, Application>>(initial.applications)
  const [query, setQuery] = useState("")
  const [view, setView] = useState<"discover" | "tracker">("discover")
  const [sort, setSort] = useState<SortKey>("fit")
  const [showAll, setShowAll] = useState(false)
  const [specialistOnly, setSpecialistOnly] = useState(false)
  const [showNoSponsor, setShowNoSponsor] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusPrompt, setFocusPrompt] = useState(false)
  const [message, setMessage] = useState("")
  const [schemes, setSchemes] = useState<Scheme[]>([])
  const [total, setTotal] = useState(0)
  const [fetchedAt, setFetchedAt] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [reload, setReload] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const interestKey = profile.interests.join("|")

  useEffect(() => {
    saveStore({ version: 1, profile, applications: apps })
  }, [profile, apps])

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError("")
      void fetchLiveJobs(
        { course: profile.course, interests: profile.interests, broad: showAll },
        controller.signal,
      )
        .then((payload) => {
          setSchemes(payload.schemes)
          setTotal(payload.total)
          setFetchedAt(payload.fetchedAt)
        })
        .catch((reason: unknown) => {
          if (reason instanceof DOMException && reason.name === "AbortError") return
          setError("Live listings could not be fetched. Your tracked applications are still saved in this browser.")
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, 250)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [profile.course, interestKey, showAll, reload])

  const hasCourse = profile.course !== "" && profile.course !== "Other / not listed"

  const ranked = useMemo(() => {
    return schemes
      .map((scheme) => ({ scheme, fit: evaluate(scheme, profile) }))
      .filter(({ scheme }) => matchesQuery(scheme, query))
      .filter(({ scheme }) => showAll || !specialistOnly || isRecommended(scheme, profile, true))
      .filter(({ scheme }) => showNoSponsor || !(profile.needsSponsorship && scheme.sponsorship === "no"))
      .sort((a, b) => {
        if (sort === "employer") return a.scheme.employer.localeCompare(b.scheme.employer, "en-GB")
        if (sort === "deadline") {
          const left = daysUntil(a.scheme.deadline)
          const right = daysUntil(b.scheme.deadline)
          if (left === null && right === null) return b.fit.score - a.fit.score
          if (left === null) return 1
          if (right === null) return -1
          return left - right
        }
        return b.fit.score - a.fit.score || a.scheme.employer.localeCompare(b.scheme.employer, "en-GB")
      })
  }, [schemes, profile, query, showAll, specialistOnly, showNoSponsor, sort])

  const hiddenForSponsor = schemes.filter(
    (scheme) =>
      profile.needsSponsorship &&
      scheme.sponsorship === "no" &&
      matchesQuery(scheme, query) &&
      (showAll || !specialistOnly || isRecommended(scheme, profile, true)),
  ).length

  const closingSoon = ranked.filter(({ scheme }) => {
    const days = daysUntil(scheme.deadline)
    return days !== null && days >= 0 && days <= 21
  })

  const appliedCount = Object.values(apps).filter((item) => hasApplied(item.status)).length
  const tracked = Object.values(apps).sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))

  function schemeFor(schemeId: string): Scheme | undefined {
    return schemes.find((scheme) => scheme.id === schemeId) ?? apps[schemeId]?.snapshot
  }

  const selected = selectedId ? schemeFor(selectedId) ?? null : null

  function saveApplication(schemeId: string, next: Application | null) {
    setApps((current) => {
      const copy = { ...current }
      if (!next) {
        delete copy[schemeId]
        return copy
      }
      copy[schemeId] = stamp({
        schemeId: next.schemeId,
        status: next.status,
        appliedOn: next.appliedOn,
        personalDeadline: next.personalDeadline,
        notes: next.notes,
        snapshot: schemes.find((scheme) => scheme.id === schemeId) ?? current[schemeId]?.snapshot,
      })
      return copy
    })
  }

  function markApplied(scheme: Scheme) {
    const current = apps[scheme.id]
    setApps((previous) => ({
      ...previous,
      [scheme.id]: stamp({
        schemeId: scheme.id,
        status: "applied",
        appliedOn: current?.appliedOn ?? todayISO(),
        personalDeadline: current?.personalDeadline ?? null,
        notes: current?.notes ?? "",
        snapshot: scheme,
      }),
    }))
    setMessage(`Marked ${scheme.employer} as applied.`)
  }

  async function copyPrompt(scheme: Scheme) {
    try {
      await navigator.clipboard.writeText(buildPrompt(profile, scheme))
      setMessage(`Copied a prompt for ${scheme.employer}.`)
    } catch {
      setSelectedId(scheme.id)
      setMessage("Clipboard was blocked. Copy the prompt from the scheme panel.")
    }
  }

  function restore(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = parseBackup(String(reader.result ?? ""))
      if (!parsed) {
        setMessage("That file is not a UK Grad Tracker backup.")
        return
      }
      setProfile(parsed.profile)
      setApps(parsed.applications)
      setMessage("Backup restored in this browser.")
    }
    reader.readAsText(file)
  }

  return (
    <div className="page">
      <header className="top">
        <div>
          <p className="eyebrow">2027 UK intake</p>
          <h1>UK Grad Tracker</h1>
          <p className="lede">
            Live graduate jobs are fetched for your course or interests. Mark the ones you have applied to, and generate a prompt for the application.
          </p>
        </div>
        <div className="top-actions">
          <button type="button" onClick={() => downloadBackup({ version: 1, profile, applications: apps })}>
            Backup
          </button>
          <button type="button" onClick={() => fileRef.current?.click()}>
            Restore
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Clear your profile and tracked applications from this browser?")) {
                setProfile(emptyProfile)
                setApps({})
                setMessage("Cleared this browser’s copy.")
              }
            }}
          >
            Reset
          </button>
          <input
            ref={fileRef}
            className="hidden-file"
            type="file"
            accept="application/json"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) restore(file)
              event.target.value = ""
            }}
          />
        </div>
      </header>

      {message ? (
        <p className="toast" role="status">
          {message}
        </p>
      ) : null}

      <div className="layout">
        <ProfilePanel profile={profile} onChange={setProfile} />

        <main>
          <div className="view-bar">
            <div className="tabs" role="tablist">
              <button type="button" role="tab" aria-selected={view === "discover"} onClick={() => setView("discover")}>
                Schemes
                <span>{ranked.length}</span>
              </button>
              <button type="button" role="tab" aria-selected={view === "tracker"} onClick={() => setView("tracker")}>
                Applied
                <span>{appliedCount}</span>
              </button>
            </div>
            <p className="reviewed">
              {loading
                ? "Fetching live listings from targetjobs…"
                : fetchedAt
                  ? `Live from targetjobs · ${schemes.length} of ${total} · fetched ${new Date(fetchedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}. Confirm every deadline on the employer page.`
                  : "Listings are fetched live from targetjobs. Confirm every deadline on the employer page."}
            </p>
          </div>

          {view === "discover" ? (
            <>
              <div className="filters">
                <label className="field grow">
                  <span>Search</span>
                  <input
                    value={query}
                    placeholder="Employer, city, or stream"
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Sort</span>
                  <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
                    <option value="fit">Best match</option>
                    <option value="deadline">Soonest published deadline</option>
                    <option value="employer">Employer</option>
                  </select>
                </label>
              </div>
              <div className="toggles">
                <label className="check">
                  <input type="checkbox" checked={showAll} onChange={(event) => setShowAll(event.target.checked)} />
                  <span>Show general graduate jobs</span>
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={specialistOnly}
                    disabled={!hasCourse}
                    onChange={(event) => setSpecialistOnly(event.target.checked)}
                  />
                  <span>Only listings that match my course</span>
                </label>
                {profile.needsSponsorship ? (
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={showNoSponsor}
                      onChange={(event) => setShowNoSponsor(event.target.checked)}
                    />
                    <span>Include schemes that do not sponsor{hiddenForSponsor && !showNoSponsor ? ` (${hiddenForSponsor} hidden)` : ""}</span>
                  </label>
                ) : null}
              </div>

              {error ? (
                <p className="note">
                  {error}{" "}
                  <button type="button" className="text-button" onClick={() => setReload((count) => count + 1)}>
                    Try again
                  </button>
                </p>
              ) : null}

              {!profile.course && profile.interests.length === 0 ? (
                <p className="note">
                  Choose a course or at least one interest to search for a closer match. Until then, open graduate jobs are shown without a personal ranking.
                </p>
              ) : (
                <p className="note">
                  {profile.course ? `Course: ${profile.course}. ` : ""}
                  {profile.interests.length > 0 ? `Interests: ${profile.interests.join(", ")}. ` : ""}
                  {showAll
                    ? "Showing a general graduate search, including listings that do not name your course."
                    : specialistOnly
                      ? "Only listings that match your course search are shown."
                      : "Results are the live search for your course and interests, with closer matches first."}
                </p>
              )}

              {closingSoon.length > 0 ? (
                <section className="soon" aria-label="Closing soon">
                  <h2>Closing soon</h2>
                  <div className="soon-row">
                    {closingSoon.map(({ scheme }) => (
                      <button key={scheme.id} type="button" className="soon-card" onClick={() => setSelectedId(scheme.id)}>
                        <strong>{scheme.employer}</strong>
                        <span>{deadlineChip(scheme.deadline, scheme.deadlineDetail)}</span>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {loading && schemes.length === 0 ? (
                <div className="empty">
                  <h2>Fetching live listings</h2>
                  <p>Graduate jobs are loading from targetjobs.</p>
                </div>
              ) : ranked.length === 0 ? (
                <div className="empty">
                  <h2>No listings match</h2>
                  <p>Try another course or interest, or show general graduate jobs. Deadlines that have already passed are left out.</p>
                </div>
              ) : (
                <ul className="cards">
                  {ranked.map(({ scheme, fit }) => {
                    const application = apps[scheme.id]
                    const applied = hasApplied(application?.status)
                    const tone = deadlineTone(scheme.deadline)
                    return (
                      <li key={scheme.id} className="card">
                        <div className="card-top">
                          <div>
                            <p className="employer">{scheme.employer}</p>
                            <h2>{scheme.programme}</h2>
                          </div>
                          <p className={`fit fit-${fitLabel(fit.score).split(" ")[0].toLowerCase()}`}>
                            <strong>{fit.score}</strong>
                            <span>{fitLabel(fit.score)}</span>
                          </p>
                        </div>
                        <p className="summary">{scheme.summary}</p>
                        <div className="meta">
                          <span className={`deadline-chip ${tone}`}>{deadlineChip(scheme.deadline, scheme.deadlineDetail)}</span>
                          <span>{scheme.locations.join(" · ")}</span>
                          {application ? <span className="badge">{STATUS_LABEL[application.status]}</span> : null}
                        </div>
                        {fit.reasons.length > 0 ? <p className="reasons">{fit.reasons.join(" · ")}</p> : null}
                        <div className="card-actions">
                          {applied ? (
                            <button type="button" className="primary" onClick={() => setSelectedId(scheme.id)}>
                              Applied{application?.appliedOn ? ` · ${formatDay(application.appliedOn)}` : ""}
                            </button>
                          ) : (
                            <button type="button" className="primary" onClick={() => markApplied(scheme)}>
                              Mark applied
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setFocusPrompt(true)
                              setSelectedId(scheme.id)
                              void copyPrompt(scheme)
                            }}
                          >
                            Generate prompt
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFocusPrompt(false)
                              setSelectedId(scheme.id)
                            }}
                          >
                            Details
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          ) : (
            <section className="tracker">
              <h2>Applications you are tracking</h2>
              <p className="note">
                {appliedCount} marked applied, including later stages. Saved schemes stay here but are not counted as applied.
              </p>
              {tracked.length === 0 ? (
                <div className="empty">
                  <h2>No applications yet</h2>
                  <p>Mark a scheme as applied from the Schemes tab. You can then move it through tests, assessment centre, interview, and offer.</p>
                </div>
              ) : (
                <ul className="track-list">
                  {tracked.map((application) => {
                    const scheme = schemeFor(application.schemeId)
                    return (
                      <li key={application.schemeId} className="track-row">
                        <div>
                          <p className="employer">{scheme?.employer ?? "Not in the latest results"}</p>
                          <h3>{scheme?.programme ?? application.schemeId}</h3>
                          <p className="fine">
                            {application.appliedOn ? `Applied ${formatDay(application.appliedOn)}` : "No applied date"}
                            {application.personalDeadline ? ` · Your deadline ${formatDay(application.personalDeadline)}` : ""}
                            {scheme?.deadline ? ` · Published ${formatDay(scheme.deadline)}` : ""}
                          </p>
                        </div>
                        <label className="field">
                          <span>Status</span>
                          <select
                            value={application.status}
                            onChange={(event) => {
                              const status = event.target.value as Status
                              saveApplication(application.schemeId, {
                                ...application,
                                status,
                                appliedOn: hasApplied(status) ? application.appliedOn ?? todayISO() : application.appliedOn,
                              })
                            }}
                          >
                            {STATUS_ORDER.map((status) => (
                              <option key={status} value={status}>
                                {STATUS_LABEL[status]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="card-actions">
                          {scheme ? (
                            <button type="button" onClick={() => setSelectedId(scheme.id)}>
                              Open
                            </button>
                          ) : null}
                          <button type="button" className="text-button danger" onClick={() => saveApplication(application.schemeId, null)}>
                            Remove
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          )}

          <footer className="foot">
            <p>
              Listings are fetched from targetjobs when you open the app or change your course and interests. Salaries, deadlines, and visa rules are copied from those listings and can be missing or change without notice. Confirm them on the employer page before you apply.
            </p>
          </footer>
        </main>
      </div>

      {selected ? (
        <SchemeDetail
          scheme={selected}
          application={apps[selected.id]}
          profile={profile}
          focusPrompt={focusPrompt}
          onClose={() => setSelectedId(null)}
          onSave={(next) => saveApplication(selected.id, next)}
        />
      ) : null}
    </div>
  )
}
