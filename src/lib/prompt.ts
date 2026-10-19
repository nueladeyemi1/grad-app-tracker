import type { Profile, Scheme } from "../types"
import { formatDeadline } from "./dates"

export function buildPrompt(profile: Profile, scheme: Scheme): string {
  const course = profile.course || "not set"
  const interests = profile.interests.length > 0 ? profile.interests.join(", ") : "not set"
  const evidence = profile.evidence.trim() || "I have not provided evidence yet."
  const sponsorship = profile.needsSponsorship
    ? "I need visa sponsorship to work in the UK."
    : "I do not need visa sponsorship."

  return `You are helping me prepare one UK graduate-scheme application. Use only the facts I give you. Do not invent work experience, grades, projects, prizes, or reasons I care about the employer. If a draft needs a fact I have not given, stop and ask me for it. Use UK spelling.

Applicant
- Course: ${course}
- University: ${profile.university.trim() || "not set"}
- Graduation year: ${profile.graduationYear || "not set"}
- Interests: ${interests}
- Right to work: ${sponsorship}
- Evidence I am willing to use: ${evidence}

Target
- Employer: ${scheme.employer}
- Programme: ${scheme.programme}
- What it is: ${scheme.summary}
- Degree note: ${scheme.degreeNote}
- Streams named publicly: ${scheme.streams.join("; ")}
- Locations: ${scheme.locations.join(", ")}
- Start: ${scheme.startNote}
- Deadline: ${formatDeadline(scheme)}
- Closing note: ${scheme.closingNote}
- Sponsorship: ${scheme.sponsorshipNote}
- Salary note: ${scheme.salaryNote}
- Official page: ${scheme.url}

Do this:
1. In three sentences, say whether this is a credible fit for my course and interests. Name one thing I must verify on the official page before I apply.
2. If my evidence section says I have not provided evidence, do not draft any paragraph that claims experience. Ask me for three specific examples instead, then stop.
3. Otherwise draft a 180–220 word motivation answer. Every claim must come from my evidence. No lines about passion, synergy, or "leveraging".
4. Give a STAR outline for one example from my evidence. Label Situation, Task, Action, Result. If the result is missing, write "Result: ask me".
5. List five things to check on the official page: eligibility, deadline, location, sponsorship, and the exact question on the form.
6. Suggest four likely application questions for this kind of UK scheme, each with a one-line angle based only on my evidence.

Keep it specific and modest.`
}
