import type { Interest, Profile, Scheme, SchemeCourse } from "../types"

export type Fit = {
  score: number
  reasons: string[]
  courseMatch: "specific" | "any" | "none"
  interestHits: Interest[]
}

export function evaluate(scheme: Scheme, profile: Profile): Fit {
  const selectedCourse = profile.course
  const hasCourse = selectedCourse !== "" && selectedCourse !== "Other / not listed"
  const specific = hasCourse && scheme.courses.includes(selectedCourse as SchemeCourse)
  const anyDegree = scheme.courses.includes("Any degree")
  const interestHits = profile.interests.filter((interest) => scheme.interests.includes(interest))

  let score = 16
  if (specific) score += 48
  else if (anyDegree && hasCourse) score += 18
  else if (!hasCourse) score += 8

  if (profile.interests.length > 0) {
    score += Math.round(28 * (interestHits.length / profile.interests.length))
    if (interestHits.length > 0) score += 8
  } else {
    score += 6
  }

  if (profile.needsSponsorship && scheme.sponsorship === "no") score -= 35
  if (profile.needsSponsorship && scheme.sponsorship === "yes") score += 4

  const reasons: string[] = []
  if (specific && selectedCourse) reasons.push(`Names ${selectedCourse}`)
  else if (anyDegree) reasons.push("Open to any degree")
  if (interestHits.length > 0) reasons.push(`Interests: ${interestHits.join(", ")}`)
  if (profile.needsSponsorship && scheme.sponsorship === "no") reasons.push("Does not sponsor visas")

  return {
    score: Math.max(0, Math.min(100, score)),
    reasons,
    courseMatch: specific ? "specific" : anyDegree ? "any" : "none",
    interestHits,
  }
}

export function isRecommended(scheme: Scheme, profile: Profile, specialistOnly: boolean): boolean {
  const fit = evaluate(scheme, profile)
  const hasCourse = profile.course !== "" && profile.course !== "Other / not listed"
  const hasInterests = profile.interests.length > 0

  if (specialistOnly) return hasCourse && fit.courseMatch === "specific"
  if (!hasCourse && !hasInterests) return true
  if (hasCourse && fit.courseMatch !== "none") return true
  return fit.interestHits.length > 0
}

export function fitLabel(score: number): string {
  if (score >= 78) return "Strong match"
  if (score >= 54) return "Good match"
  if (score >= 40) return "Possible"
  return "Broad"
}
