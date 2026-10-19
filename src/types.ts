export const COURSES = [
  "Computer Science",
  "Software Engineering",
  "Data Science / AI",
  "Cyber Security",
  "Mathematics",
  "Physics",
  "Engineering (general)",
  "Mechanical Engineering",
  "Electrical / Electronic Engineering",
  "Aerospace Engineering",
  "Civil Engineering",
  "Chemical Engineering",
  "Economics",
  "Finance / Accounting",
  "Business / Management",
  "Law",
  "Politics / International Relations",
  "Biological Sciences",
  "Chemistry",
  "Pharmacy / Pharmacology",
  "Medicine / Healthcare",
  "Psychology",
  "Geography / Environmental Science",
  "Architecture / Design",
  "Humanities",
  "Other / not listed",
] as const

export const INTERESTS = [
  "Software & technology",
  "Data & AI",
  "Cyber security",
  "Consulting",
  "Investment banking",
  "Markets & trading",
  "Asset management",
  "Retail & commercial banking",
  "Audit & accounting",
  "Tax",
  "Actuarial",
  "Commercial law",
  "Public policy",
  "Economics",
  "Healthcare leadership",
  "Life sciences",
  "Engineering & manufacturing",
  "Energy & climate",
  "Infrastructure",
  "Aerospace & defence",
  "FMCG & brand",
  "Media",
  "Teaching",
  "Telecommunications",
] as const

export type Course = (typeof COURSES)[number]
export type Interest = (typeof INTERESTS)[number]
export type Sponsorship = "yes" | "no" | "check"

export type SchemeCourse = Course | "Any degree"

export type Scheme = {
  id: string
  employer: string
  programme: string
  summary: string
  courses: SchemeCourse[]
  interests: Interest[]
  locations: string[]
  streams: string[]
  degreeNote: string
  salaryNote: string
  startNote: string
  deadline: string | null
  deadlineDetail: string
  closingNote: string
  url: string
  sponsorship: Sponsorship
  sponsorshipNote: string
}

export type Status =
  | "saved"
  | "applied"
  | "testing"
  | "assessment"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn"

export type Application = {
  schemeId: string
  status: Status
  appliedOn: string | null
  personalDeadline: string | null
  notes: string
  updatedAt: string
  snapshot?: Scheme
}

export type Profile = {
  course: Course | ""
  university: string
  graduationYear: string
  interests: Interest[]
  evidence: string
  needsSponsorship: boolean
}

export type Store = {
  version: 1
  profile: Profile
  applications: Record<string, Application>
}

export const APPLIED_STATUSES: Status[] = [
  "applied",
  "testing",
  "assessment",
  "interview",
  "offer",
  "rejected",
]

export const STATUS_LABEL: Record<Status, string> = {
  saved: "Saved",
  applied: "Applied",
  testing: "Online tests",
  assessment: "Assessment centre",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
}

export const STATUS_ORDER: Status[] = [
  "saved",
  "applied",
  "testing",
  "assessment",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
]
