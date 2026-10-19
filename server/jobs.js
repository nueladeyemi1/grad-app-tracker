const SEARCH_URL = "https://targetjobs.co.uk/ext/svc/inferno-search-service-1-0/search"
const CACHE_MS = 10 * 60 * 1000
const LIMIT = 48

const COURSE_KEYS = {
  "Computer Science": ["computer science", "software engineering"],
  "Software Engineering": ["software engineering", "software developer"],
  "Data Science / AI": ["data science", "machine learning"],
  "Cyber Security": ["cyber security", "cybersecurity"],
  Mathematics: ["mathematics graduate"],
  Physics: ["physics graduate"],
  "Engineering (general)": ["engineering graduate"],
  "Mechanical Engineering": ["mechanical engineering"],
  "Electrical / Electronic Engineering": ["electrical engineering"],
  "Aerospace Engineering": ["aerospace engineering"],
  "Civil Engineering": ["civil engineering"],
  "Chemical Engineering": ["chemical engineering"],
  Economics: ["economics graduate"],
  "Finance / Accounting": ["accounting graduate", "finance graduate"],
  "Business / Management": ["management graduate"],
  Law: ["law graduate", "training contract"],
  "Politics / International Relations": ["public policy graduate"],
  "Biological Sciences": ["biology graduate", "life sciences"],
  Chemistry: ["chemistry graduate"],
  "Pharmacy / Pharmacology": ["pharmacy graduate"],
  "Medicine / Healthcare": ["healthcare graduate"],
  Psychology: ["psychology graduate"],
  "Geography / Environmental Science": ["environmental science"],
  "Architecture / Design": ["architecture graduate"],
  Humanities: ["humanities graduate"],
}

const INTEREST_KEYS = {
  "Software & technology": "software graduate",
  "Data & AI": "data science",
  "Cyber security": "cyber security",
  Consulting: "consulting graduate",
  "Investment banking": "investment banking",
  "Markets & trading": "trading graduate",
  "Asset management": "asset management",
  "Retail & commercial banking": "commercial banking",
  "Audit & accounting": "audit graduate",
  Tax: "tax graduate",
  Actuarial: "actuarial graduate",
  "Commercial law": "commercial law",
  "Public policy": "civil service graduate",
  Economics: "economics graduate",
  "Healthcare leadership": "nhs graduate",
  "Life sciences": "life sciences",
  "Engineering & manufacturing": "engineering graduate",
  "Energy & climate": "energy graduate",
  Infrastructure: "infrastructure graduate",
  "Aerospace & defence": "aerospace graduate",
  "FMCG & brand": "fmcg graduate",
  Media: "media graduate",
  Teaching: "teaching graduate",
  Telecommunications: "telecom graduate",
}

const COURSE_PATTERNS = [
  ["Computer Science", /computer science|computing degree/i],
  ["Software Engineering", /software engineering/i],
  ["Data Science / AI", /data science|machine learning|artificial intelligence/i],
  ["Cyber Security", /cyber security|cybersecurity/i],
  ["Mathematics", /mathematics|maths degree|maths graduate/i],
  ["Physics", /physics degree|physics graduate|\bphysics\b/i],
  ["Engineering (general)", /any engineering|engineering graduate/i],
  ["Mechanical Engineering", /mechanical engineering/i],
  ["Electrical / Electronic Engineering", /electrical engineering|electronic engineering/i],
  ["Aerospace Engineering", /aerospace engineering/i],
  ["Civil Engineering", /civil engineering/i],
  ["Chemical Engineering", /chemical engineering/i],
  ["Economics", /economics degree|economics graduate|\beconomics\b/i],
  ["Finance / Accounting", /accounting|finance degree|finance graduate/i],
  ["Business / Management", /business management|management graduate|business degree/i],
  ["Law", /law degree|law graduate|training contract|\bllb\b/i],
  ["Politics / International Relations", /international relations|public policy/i],
  ["Biological Sciences", /biological science|biology graduate|life science/i],
  ["Chemistry", /chemistry degree|chemistry graduate|\bchemistry\b/i],
  ["Pharmacy / Pharmacology", /pharmacy|pharmacology/i],
  ["Medicine / Healthcare", /medicine|healthcare graduate|\bnhs\b/i],
  ["Psychology", /psychology/i],
  ["Geography / Environmental Science", /environmental science|geography graduate/i],
  ["Architecture / Design", /architecture/i],
  ["Humanities", /humanities/i],
]

const INTEREST_PATTERNS = [
  ["Software & technology", /software|technology|computing|digital/i],
  ["Data & AI", /data science|artificial intelligence|machine learning/i],
  ["Cyber security", /cyber/i],
  ["Consulting", /consult/i],
  ["Investment banking", /investment bank/i],
  ["Markets & trading", /trading|markets/i],
  ["Asset management", /asset management|investment management/i],
  ["Retail & commercial banking", /banking/i],
  ["Audit & accounting", /audit|account/i],
  ["Tax", /\btax\b/i],
  ["Actuarial", /actuar/i],
  ["Commercial law", /\blaw\b|legal/i],
  ["Public policy", /public sector|government|civil service|policy/i],
  ["Economics", /econom/i],
  ["Healthcare leadership", /health|nhs|medical/i],
  ["Life sciences", /life science|pharma|biotech/i],
  ["Engineering & manufacturing", /engineering|manufactur/i],
  ["Energy & climate", /energy|climate|environment|utilit/i],
  ["Infrastructure", /infrastructure|construction/i],
  ["Aerospace & defence", /aerospace|defence|defense/i],
  ["FMCG & brand", /fmcg|consumer goods|brand/i],
  ["Media", /media|journal/i],
  ["Teaching", /teach|education/i],
  ["Telecommunications", /telecom/i],
]

const cache = new Map()

function keysFor({ course, interests, broad }) {
  if (broad) return ["graduate scheme"]
  const keys = []
  const courseKeys = COURSE_KEYS[course] ?? []
  keys.push(...courseKeys)
  for (const interest of interests) {
    const key = INTEREST_KEYS[interest]
    if (key && !keys.includes(key)) keys.push(key)
  }
  return keys.slice(0, 8).length > 0 ? keys.slice(0, 8) : ["graduate scheme"]
}

function stripHtml(value) {
  return String(value ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim()
}

function excerpt(text, max = 240) {
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1).replace(/\s+\S*$/, "")
  return `${cut}…`
}

function isoDate(seconds) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) return null
  const date = new Date(seconds * 1000)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

function formatUtc(iso) {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
}

function salaryNote(salary) {
  if (!salary || typeof salary !== "object") return "Not stated on the listing. Check the employer page."
  if (Array.isArray(salary.ranges) && salary.ranges.length > 0) return salary.ranges.map(String).join(", ")
  const lower = Number(salary.lower)
  const upper = Number(salary.upper)
  const money = (amount) => `£${amount.toLocaleString("en-GB")}`
  if (Number.isFinite(lower) && lower > 0 && Number.isFinite(upper) && upper > 0) {
    return lower === upper ? money(lower) : `${money(lower)}–${money(upper)}`
  }
  if (Number.isFinite(lower) && lower > 0) return `From ${money(lower)}`
  return "Not stated on the listing. Check the employer page."
}

function sponsorshipFrom(text) {
  const negative = /unable to (offer |provide )?sponsor|cannot sponsor|can't sponsor|can’t sponsor|do not sponsor|does not sponsor|will not sponsor|won't sponsor|no visa sponsorship|sponsorship is not|not able to sponsor/i
  const positive = /visa sponsorship (is |may be )?(available|offered|provided)|we (can|will|do) sponsor|sponsorship is available/i
  const blocks = negative.test(text)
  const offers = positive.test(text)
  if (blocks && !offers) return "no"
  if (offers && !blocks) return "yes"
  return "check"
}

function sponsorshipNote(sponsorship) {
  if (sponsorship === "no") return "The listing text says sponsorship is not offered. Confirm that on the employer page."
  if (sponsorship === "yes") return "The listing text says sponsorship is available. Confirm the visa type on the employer page."
  return "The listing does not state a visa policy. Check the employer page."
}

function listingUrl(doc) {
  if (typeof doc.applicationUrl === "string" && /^https?:\/\//i.test(doc.applicationUrl)) return doc.applicationUrl
  if (typeof doc.path === "string" && doc.path.startsWith("/")) return `https://targetjobs.co.uk${doc.path}`
  return "https://targetjobs.co.uk/search"
}

function locationsOf(doc) {
  const values = []
  if (Array.isArray(doc.city)) values.push(...doc.city)
  if (typeof doc.location === "string") values.push(...doc.location.split(/[,/]/))
  const clean = [...new Set(values.map((value) => String(value).trim()).filter(Boolean))]
  return clean.slice(0, 6).length > 0 ? clean.slice(0, 6) : ["Location on the listing"]
}

function tagged(text, patterns) {
  return patterns.filter(([, pattern]) => pattern.test(text)).map(([name]) => name)
}

function toScheme(doc, course) {
  const id = String(doc.uuid || doc.nid || doc.path || "")
  const programme = String(doc.title || "").trim()
  if (!id || !programme) return null

  const plain = stripHtml(doc.body)
  const sample = plain.slice(0, 2000)
  const sectorText = Array.isArray(doc.sectors) ? doc.sectors.join(" ") : ""
  const matchText = `${programme} ${sectorText} ${sample}`
  const courses = tagged(matchText, COURSE_PATTERNS)
  const coursePhrases = COURSE_KEYS[course] ?? []
  const lowered = matchText.toLowerCase()
  if (course && coursePhrases.some((phrase) => lowered.includes(phrase)) && !courses.includes(course)) {
    courses.push(course)
  }
  if (/any degree|all degrees|any discipline|any subject|all subjects/i.test(matchText) && !courses.includes("Any degree")) {
    courses.push("Any degree")
  }

  const deadline = isoDate(doc.applicationDeadline)
  const start = isoDate(doc.opportunityStartDate)
  const sponsorship = sponsorshipFrom(sample)
  const employer = String(doc.organisation?.title || "").trim() || "Employer on listing"

  return {
    id,
    employer,
    programme,
    summary: excerpt(plain) || "Open the employer page for the description.",
    courses,
    interests: tagged(`${programme} ${sectorText}`, INTEREST_PATTERNS),
    locations: locationsOf(doc),
    streams: Array.isArray(doc.opportunityType) && doc.opportunityType.length > 0 ? doc.opportunityType.map(String) : ["Graduate job"],
    degreeNote: "Degree requirements are on the employer page. Course tags here are read from the listing text.",
    salaryNote: salaryNote(doc.salary),
    startNote: start ? `Listed start date: ${formatUtc(start)}.` : "Start date is on the employer page.",
    deadline,
    deadlineDetail: deadline ? "" : "No deadline on the listing",
    closingNote:
      doc.applicationOpen === false
        ? "Targetjobs does not mark this application as open. Check the employer page."
        : "Taken from the live listing. Confirm the deadline on the employer page in case it closes early.",
    url: listingUrl(doc),
    sponsorship,
    sponsorshipNote: sponsorshipNote(sponsorship),
  }
}

async function loadLiveJobs(input) {
  const keys = keysFor(input)
  const response = await fetch(SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Origin: "https://targetjobs.co.uk",
    },
    body: JSON.stringify({
      keys,
      limit: LIMIT,
      offset: 0,
      includePromoted: false,
      returnUnpublishedContent: false,
      hostContentOnly: true,
      conditionGroup: {
        conjunction: "AND",
        groups: [
          {
            conjunction: "AND",
            conditions: [
              { name: "type", value: "opportunity" },
              { name: "opportunity_type", value: "Graduate job" },
              { name: "application_deadline_date", operator: "NOT BETWEEN", value: ["0", "NOW"] },
            ],
          },
        ],
      },
    }),
    signal: AbortSignal.timeout(8000),
  })

  if (!response.ok) throw new Error(`Listing search failed (${response.status})`)
  const data = await response.json()
  const documents = Array.isArray(data.search?.documents) ? data.search.documents : []
  const seen = new Set()
  const schemes = []
  for (const doc of documents) {
    if (doc?.status === false) continue
    const scheme = toScheme(doc, input.course)
    if (!scheme || seen.has(scheme.id)) continue
    seen.add(scheme.id)
    schemes.push(scheme)
  }

  return {
    fetchedAt: new Date().toISOString(),
    total: Number(data.search?.result_count) || schemes.length,
    source: "targetjobs",
    query: keys,
    schemes,
  }
}

export async function searchLiveJobs(input) {
  const course = COURSE_KEYS[input.course] ? input.course : ""
  const interests = (Array.isArray(input.interests) ? input.interests : []).filter((interest) => INTEREST_KEYS[interest])
  const broad = Boolean(input.broad)
  const key = JSON.stringify({ course, interests, broad })
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value
  const value = await loadLiveJobs({ course, interests, broad })
  cache.set(key, { at: Date.now(), value })
  return value
}
