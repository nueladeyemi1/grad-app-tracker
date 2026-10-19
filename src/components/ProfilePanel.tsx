import { COURSES, INTERESTS, type Profile } from "../types"

const YEARS = ["2026", "2027", "2028", "2029", "2030"]

export function ProfilePanel({
  profile,
  onChange,
}: {
  profile: Profile
  onChange: (profile: Profile) => void
}) {
  function toggleInterest(interest: (typeof INTERESTS)[number]) {
    const interests = profile.interests.includes(interest)
      ? profile.interests.filter((item) => item !== interest)
      : [...profile.interests, interest]
    onChange({ ...profile, interests })
  }

  return (
    <section className="panel" aria-labelledby="profile-heading">
      <div className="panel-head">
        <h2 id="profile-heading">Your course and interests</h2>
        <p>This is stored in this browser and used to rank schemes and write the application prompt.</p>
      </div>

      <label className="field">
        <span>Course</span>
        <select
          value={profile.course}
          onChange={(event) => onChange({ ...profile, course: event.target.value as Profile["course"] })}
        >
          <option value="">Choose a course</option>
          {COURSES.map((course) => (
            <option key={course} value={course}>
              {course}
            </option>
          ))}
        </select>
      </label>

      <div className="split">
        <label className="field">
          <span>University</span>
          <input
            value={profile.university}
            placeholder="Optional"
            onChange={(event) => onChange({ ...profile, university: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Graduation year</span>
          <select
            value={profile.graduationYear}
            onChange={(event) => onChange({ ...profile, graduationYear: event.target.value })}
          >
            <option value="">Year</option>
            {YEARS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="field">
        <legend>Interests</legend>
        <div className="pills">
          {INTERESTS.map((interest) => {
            const on = profile.interests.includes(interest)
            return (
              <button
                key={interest}
                type="button"
                className={on ? "pill on" : "pill"}
                aria-pressed={on}
                onClick={() => toggleInterest(interest)}
              >
                {interest}
              </button>
            )
          })}
        </div>
      </fieldset>

      <label className="check">
        <input
          type="checkbox"
          checked={profile.needsSponsorship}
          onChange={(event) => onChange({ ...profile, needsSponsorship: event.target.checked })}
        />
        <span>I need visa sponsorship</span>
      </label>

      <label className="field">
        <span>Evidence for the prompt</span>
        <textarea
          rows={5}
          value={profile.evidence}
          placeholder="Modules, projects, jobs, societies, or grades you are happy to mention. The prompt will not invent anything you leave out."
          onChange={(event) => onChange({ ...profile, evidence: event.target.value })}
        />
      </label>
    </section>
  )
}
