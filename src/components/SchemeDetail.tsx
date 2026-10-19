import { useEffect, useRef, useState } from "react"
import type { Application, Profile, Scheme, Status } from "../types"
import { APPLIED_STATUSES, STATUS_LABEL, STATUS_ORDER } from "../types"
import { deadlineTone, formatDay, formatDeadline } from "../lib/dates"
import { buildPrompt } from "../lib/prompt"
import { todayISO } from "../lib/storage"

export function SchemeDetail({
  scheme,
  application,
  profile,
  focusPrompt,
  onClose,
  onSave,
}: {
  scheme: Scheme
  application?: Application
  profile: Profile
  focusPrompt?: boolean
  onClose: () => void
  onSave: (next: Application | null) => void
}) {
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const promptRef = useRef<HTMLElement>(null)
  const prompt = buildPrompt(profile, scheme)
  const tone = deadlineTone(scheme.deadline)

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    if (focusPrompt) promptRef.current?.scrollIntoView({ block: "start" })
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose, focusPrompt, scheme.id])

  function base(): Omit<Application, "updatedAt"> {
    return {
      schemeId: scheme.id,
      status: application?.status ?? "saved",
      appliedOn: application?.appliedOn ?? null,
      personalDeadline: application?.personalDeadline ?? null,
      notes: application?.notes ?? "",
    }
  }

  function setStatus(status: Status) {
    const current = base()
    onSave({
      ...current,
      status,
      appliedOn: APPLIED_STATUSES.includes(status) ? current.appliedOn ?? todayISO() : current.appliedOn,
      updatedAt: "",
    })
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      setCopyFailed(false)
    } catch {
      setCopied(false)
      setCopyFailed(true)
    }
  }

  return (
    <div className="dialog-back" onMouseDown={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="dialog-top">
          <p className="eyebrow">{scheme.employer}</p>
          <h2 id="detail-title">{scheme.programme}</h2>
          <button type="button" className="text-button" onClick={onClose}>
            Close
          </button>
        </div>

        <p className="summary">{scheme.summary}</p>
        <p className={`deadline-chip ${tone}`}>{formatDeadline(scheme)}</p>

        <dl className="facts">
          <div>
            <dt>Degree</dt>
            <dd>{scheme.degreeNote}</dd>
          </div>
          <div>
            <dt>Streams</dt>
            <dd>{scheme.streams.join(", ")}</dd>
          </div>
          <div>
            <dt>Locations</dt>
            <dd>{scheme.locations.join(", ")}</dd>
          </div>
          <div>
            <dt>Start</dt>
            <dd>{scheme.startNote}</dd>
          </div>
          <div>
            <dt>Salary</dt>
            <dd>{scheme.salaryNote}</dd>
          </div>
          <div>
            <dt>Sponsorship</dt>
            <dd>{scheme.sponsorshipNote}</dd>
          </div>
        </dl>

        <p className="fine">{scheme.closingNote}</p>
        <a className="official" href={scheme.url} target="_blank" rel="noreferrer">
          Open the official page
        </a>

        <section className="block">
          <h3>Your application</h3>
          <div className="status-row">
            {STATUS_ORDER.map((status) => (
              <button
                key={status}
                type="button"
                className={application?.status === status ? "status on" : "status"}
                onClick={() => setStatus(status)}
              >
                {STATUS_LABEL[status]}
              </button>
            ))}
          </div>
          <div className="split">
            <label className="field">
              <span>Date applied</span>
              <input
                type="date"
                value={application?.appliedOn ?? ""}
                onChange={(event) =>
                  onSave({
                    ...base(),
                    status: application?.status ?? "applied",
                    appliedOn: event.target.value || null,
                    updatedAt: "",
                  })
                }
              />
            </label>
            <label className="field">
              <span>My deadline</span>
              <input
                type="date"
                value={application?.personalDeadline ?? ""}
                onChange={(event) =>
                  onSave({
                    ...base(),
                    status: application?.status ?? "saved",
                    personalDeadline: event.target.value || null,
                    updatedAt: "",
                  })
                }
              />
            </label>
          </div>
          <label className="field">
            <span>Notes</span>
            <textarea
              rows={3}
              value={application?.notes ?? ""}
              placeholder="Reference number, assessment date, contact."
              onChange={(event) =>
                onSave({
                  ...base(),
                  status: application?.status ?? "saved",
                  notes: event.target.value,
                  updatedAt: "",
                })
              }
            />
          </label>
          {application ? (
            <button type="button" className="text-button danger" onClick={() => onSave(null)}>
              Remove from my tracker
            </button>
          ) : (
            <p className="fine">Choose a status to start tracking this scheme. Applied is the one to use once you have submitted.</p>
          )}
          {application?.appliedOn ? <p className="fine">Applied date on file: {formatDay(application.appliedOn)}</p> : null}
        </section>

        <section className="block" ref={promptRef}>
          <div className="block-head">
            <h3>Application prompt</h3>
            <button type="button" className="primary" onClick={copyPrompt}>
              {copied ? "Copied" : "Copy prompt"}
            </button>
          </div>
          <p className="fine">
            Paste this into the AI you use for writing. It carries your course, interests, and this scheme, and it tells the model not to invent experience.
          </p>
          <textarea className="prompt" readOnly value={prompt} aria-label="Generated application prompt" />
          {copyFailed ? <p className="fine warn">Clipboard permission was blocked. Select the prompt and copy it manually.</p> : null}
        </section>
      </div>
    </div>
  )
}
