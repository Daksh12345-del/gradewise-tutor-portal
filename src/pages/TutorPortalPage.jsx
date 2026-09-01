import { useState, useEffect } from 'react'
import { applyAsTutor, fetchTutorDashboard, addTutorSlot, fetchTuitionJoinLink, uploadTeacherDocument } from '../lib/api'

const EXPERIENCE_LEVELS = [
  'Currently studying (not yet graduated)',
  'Fresher / recently graduated',
  '1-2 years',
  '3-5 years',
  '5-10 years',
  '10+ years',
]
const YEARS_OF_STUDY = ['1st year', '2nd year', '3rd year', '4th year']
const YEARS_OF_STUDY_FOR_STUDYING = ['3rd year', '4th year']

// The "college" field means something different depending on where someone
// is in their career — asking a working tutor "which college do you study
// at" (or a student "which college do you teach at") reads as a mistake,
// so both the label and the kind of proof requested adapt to what was
// picked above it.
function collegeContext(experienceLevel) {
  if (experienceLevel === 'Currently studying (not yet graduated)') {
    return { label: 'College / institute you study at', proofLabel: 'Proof of enrollment (student ID card or admission letter)' }
  }
  if (experienceLevel === 'Fresher / recently graduated') {
    return { label: 'College you graduated from', proofLabel: 'Proof of graduation (degree certificate, marksheet, or college ID)' }
  }
  return { label: 'College / institute you teach (or taught) at', proofLabel: 'Proof of teaching (employment ID, offer letter, or similar)' }
}

function FileField({ label, file, onChange, error }) {
  return (
    <div>
      <label className="portal-label">{label}</label>
      <input
        className="portal-input" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={e => onChange(e.target.files?.[0] || null)}
      />
      {file && <div className="portal-dim" style={{ marginTop: 4 }}>Selected: {file.name}</div>}
      {error && <div className="portal-error">{error}</div>}
    </div>
  )
}

function ApplyForm({ user, onApplied }) {
  const [subjects, setSubjects] = useState('')
  const [bio, setBio] = useState('')
  const [qualifications, setQualifications] = useState('')
  const [college, setCollege] = useState('')
  const [experienceLevel, setExperienceLevel] = useState(EXPERIENCE_LEVELS[0])
  const [yearOfStudy, setYearOfStudy] = useState(YEARS_OF_STUDY[0])
  const [aadharNumber, setAadharNumber] = useState('')
  const [panNumber, setPanNumber] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [aadharFile, setAadharFile] = useState(null)
  const [panFile, setPanFile] = useState(null)
  const [collegeProofFile, setCollegeProofFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState('') // shown while uploading docs after profile is created
  const [error, setError] = useState('')

  const isStudying = experienceLevel === 'Currently studying (not yet graduated)'
  const college_ = collegeContext(experienceLevel)

  async function submit(e) {
    e.preventDefault()
    setError('')
    const subjectList = subjects.split(',').map(s => s.trim()).filter(Boolean)
    if (subjectList.length === 0) return setError('Add at least one subject (comma separated).')
    if (!qualifications.trim()) return setError('Enter your qualifications.')
    if (isStudying && !['3rd year', '4th year'].includes(yearOfStudy)) return setError('Currently studying tutors must be at least in their 3rd year.')
    if (!college.trim()) return setError(`Enter your ${college_.label.toLowerCase()}.`)
    if (!bio.trim()) return setError('Enter a short bio.')
    const aadharDigits = aadharNumber.replace(/\s/g, '')
    if (!/^\d{12}$/.test(aadharDigits)) return setError('Aadhar number must be exactly 12 digits.')
    const pan = panNumber.trim().toUpperCase()
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) return setError('PAN number format looks wrong — should be like ABCDE1234F.')
    if (!hourlyRate || Number(hourlyRate) <= 0) return setError('Enter a valid hourly rate.')
    if (!aadharFile || !panFile || !collegeProofFile) return setError('Please upload all three documents — Aadhar photo, PAN photo, and your college/institute proof.')

    setSubmitting(true)
    try {
      setProgress('Creating your application…')
      const created = await applyAsTutor({
        user_id: user.id,
        name: user.name,
        email: user.email,
        aadhar_number: aadharDigits,
        pan_number: pan,
        college: college.trim(),
        subjects: subjectList,
        bio,
        qualifications,
        experience_level: experienceLevel,
        year_of_study: isStudying ? yearOfStudy : '',
        hourly_rate: Number(hourlyRate),
      })
      const teacherId = created.teacher_id

      setProgress('Uploading Aadhar photo…')
      await uploadTeacherDocument(teacherId, 'aadhar', user.id, aadharFile)
      setProgress('Uploading PAN photo…')
      await uploadTeacherDocument(teacherId, 'pan', user.id, panFile)
      setProgress(`Uploading ${college_.proofLabel.split('(')[0].trim().toLowerCase()}…`)
      await uploadTeacherDocument(teacherId, 'college_proof', user.id, collegeProofFile)

      onApplied()
    } catch (e) {
      setError(e.message || 'Could not submit your application')
    } finally {
      setSubmitting(false)
      setProgress('')
    }
  }

  return (
    <form onSubmit={submit} className="portal-card" style={{ maxWidth: 520, margin: '0 auto' }}>
      <h2>Apply to Tutor</h2>
      <p className="portal-dim">A GradeWallah admin reviews every application — including a manual identity check — before your profile goes live and students can book you.</p>

      <label className="portal-label">Subjects (comma separated)</label>
      <input className="portal-input" value={subjects} onChange={e => setSubjects(e.target.value)} placeholder="e.g. Calculus, Data Structures" />

      <div className="portal-row-2">
        <div>
          <label className="portal-label">Qualifications</label>
          <input className="portal-input" value={qualifications} onChange={e => setQualifications(e.target.value)} placeholder="e.g. B.Tech CSE" />
        </div>
        <div>
          <label className="portal-label">Experience</label>
          <select className="portal-input" value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)}>
            {EXPERIENCE_LEVELS.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
          </select>
        </div>
      </div>

      {isStudying && (
        <>
          <label className="portal-label">Which year are you in? (must be at least 3rd year)</label>
          <select className="portal-input" value={yearOfStudy} onChange={e => setYearOfStudy(e.target.value)}>
            {YEARS_OF_STUDY_FOR_STUDYING.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </>
      )}

      <label className="portal-label">{college_.label}</label>
      <input className="portal-input" value={college} onChange={e => setCollege(e.target.value)} placeholder="e.g. IIT Delhi" />

      <label className="portal-label">Short bio</label>
      <textarea className="portal-input" rows={3} value={bio} onChange={e => setBio(e.target.value)} placeholder="What do you teach, and how?" />

      <div className="portal-verify-note">
        🔒 Everything below is for identity verification only — used solely by the GradeWallah admin to confirm you're a real person before approving your application. None of it is ever shown to students or displayed on your public profile.
      </div>

      <div className="portal-row-2">
        <div>
          <label className="portal-label">Aadhar number</label>
          <input
            className="portal-input" inputMode="numeric" maxLength={14}
            value={aadharNumber} onChange={e => setAadharNumber(e.target.value)}
            placeholder="12-digit number"
          />
        </div>
        <div>
          <label className="portal-label">PAN number</label>
          <input
            className="portal-input" maxLength={10} style={{ textTransform: 'uppercase' }}
            value={panNumber} onChange={e => setPanNumber(e.target.value.toUpperCase())}
            placeholder="e.g. ABCDE1234F"
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 10 }}>
        <FileField label="Photo of Aadhar card" file={aadharFile} onChange={setAadharFile} />
        <FileField label="Photo of PAN card" file={panFile} onChange={setPanFile} />
        <FileField label={college_.proofLabel} file={collegeProofFile} onChange={setCollegeProofFile} />
      </div>

      <label className="portal-label">Hourly rate (₹)</label>
      <input className="portal-input" type="number" min="1" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} placeholder="e.g. 300" />

      {progress && <div className="portal-dim" style={{ marginTop: 10 }}>{progress}</div>}
      {error && <div className="portal-error">{error}</div>}
      <button className="portal-btn-primary" type="submit" disabled={submitting} style={{ marginTop: 12 }}>
        {submitting ? 'Submitting…' : 'Submit application'}
      </button>
    </form>
  )
}

function AddSlotForm({ teacherId, user, onAdded }) {
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!date || !startTime || !endTime) return setError('Fill in date, start and end time.')
    setSubmitting(true)
    try {
      await addTutorSlot(teacherId, { user_id: user.id, date, start_time: startTime, end_time: endTime })
      setDate(''); setStartTime(''); setEndTime('')
      onAdded()
    } catch (e) {
      setError(e.message || 'Could not add slot')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 20 }}>
      <div>
        <label className="portal-label">Date</label>
        <input className="portal-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>
      <div>
        <label className="portal-label">Start</label>
        <input className="portal-input" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
      </div>
      <div>
        <label className="portal-label">End</label>
        <input className="portal-input" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
      </div>
      <button className="portal-btn-primary" type="submit" disabled={submitting}>{submitting ? 'Adding…' : 'Add slot'}</button>
      {error && <div className="portal-error" style={{ width: '100%' }}>{error}</div>}
    </form>
  )
}

function formatDateTime(iso) {
  const d = new Date(iso)
  if (isNaN(d)) return iso
  return d.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// Fetches a fresh, time-boxed, moderator-flagged join link right when the
// tutor clicks Join — never pre-fetched, so it always reflects whether
// the session window is currently open (see
// GET /api/tuition/bookings/{id}/join on the backend).
function JoinCallButton({ bookingId, user }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function join() {
    setError('')
    setLoading(true)
    try {
      const { join_url } = await fetchTuitionJoinLink(bookingId, user.id)
      window.open(join_url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      setError(e.message || 'Could not open the video call')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button className="portal-btn-primary" onClick={join} disabled={loading}>
        {loading ? 'Opening…' : 'Join Video Call →'}
      </button>
      {error && <div className="portal-error" style={{ marginTop: 6 }}>{error}</div>}
    </div>
  )
}

const STATUS_COLORS = { approved: '#10b981', rejected: '#ef4444', pending: '#f59e0b' }

export default function TutorPortalPage({ user }) {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading')

  async function load() {
    try {
      setData(await fetchTutorDashboard(user.id))
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }
  useEffect(() => { load() }, [user.id])

  if (status === 'loading') return <div className="portal-loading">Loading…</div>
  if (status === 'error') return <div className="portal-loading" style={{ color: '#ef4444' }}>Could not load your tutor profile. Try refreshing.</div>

  if (!data?.profile) {
    return <div className="portal-body"><ApplyForm user={user} onApplied={load} /></div>
  }

  const { profile, slots = [], bookings = [] } = data

  return (
    <div className="portal-body">
      <div className="portal-profile-header">
        <div>
          <h1 style={{ margin: 0 }}>{profile.name}</h1>
          <div className="portal-dim">{(profile.subjects || []).join(', ')} · ₹{profile.hourly_rate}/hr</div>
        </div>
        <span className="portal-badge" style={{ color: STATUS_COLORS[profile.approval_status], background: STATUS_COLORS[profile.approval_status] + '22' }}>
          {profile.approval_status === 'approved' ? '✓ Approved' : profile.approval_status === 'rejected' ? 'Not approved' : 'Pending review'}
        </span>
      </div>

      {profile.approval_status === 'pending' && (
        <div className="portal-card">Your application is awaiting admin review. You'll be able to open time slots once approved — check back soon.</div>
      )}
      {profile.approval_status === 'rejected' && (
        <div className="portal-card">Your application wasn't approved this time. Contact the GradeWallah admin if you'd like to know more.</div>
      )}

      {profile.approval_status === 'approved' && (
        <>
          <section className="portal-card">
            <h3>Open a new slot</h3>
            <AddSlotForm teacherId={profile.id} user={user} onAdded={load} />
            <h4>Your upcoming slots ({slots.filter(s => !s.is_booked).length} open)</h4>
            <div className="portal-list">
              {slots.map(s => (
                <div key={s.id} className="portal-list-row">
                  <span>📅 {formatDateTime(s.scheduled_start)}</span>
                  <span className="portal-badge" style={{
                    color: s.is_booked ? '#10b981' : '#8b5cf6',
                    background: (s.is_booked ? '#10b981' : '#8b5cf6') + '1c',
                  }}>
                    {s.is_booked ? '✓ Booked' : 'Open'}
                  </span>
                </div>
              ))}
              {slots.length === 0 && <div className="portal-dim">No slots yet — add one above.</div>}
            </div>
          </section>

          <section className="portal-card">
            <h3>Bookings ({bookings.length})</h3>
            <div className="portal-list">
              {bookings.map(b => (
                <div key={b.id} className="portal-booking-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="portal-avatar">{(b.student_name || '?').slice(0, 2).toUpperCase()}</div>
                    <div>
                      <strong>{b.student_name}</strong> — {b.subject}
                      <div className="portal-dim">📅 {formatDateTime(b.scheduled_start)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="portal-badge" style={{
                      color: b.status === 'confirmed' ? '#10b981' : '#f59e0b',
                      background: (b.status === 'confirmed' ? '#10b981' : '#f59e0b') + '1c',
                    }}>
                      {b.status === 'confirmed' ? '✓ Confirmed' : 'Pending'}
                    </span>
                    {b.status === 'confirmed' && <JoinCallButton bookingId={b.id} user={user} />}
                  </div>
                </div>
              ))}
              {bookings.length === 0 && <div className="portal-dim">No bookings yet.</div>}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
