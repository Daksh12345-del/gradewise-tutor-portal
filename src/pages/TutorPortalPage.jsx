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

const WIZARD_STEPS = [
  { key: 'about',     label: 'About You',       icon: '👋', desc: 'Tell students what you teach and your background.' },
  { key: 'background', label: 'Your Background', icon: '🎓', desc: 'Where you study or teach, and a short bio.' },
  { key: 'identity',  label: 'Verify Identity',  icon: '🔒', desc: 'Upload documents so we can confirm you\'re real.' },
  { key: 'pricing',   label: 'Set Your Rate',    icon: '💰', desc: 'How much do you charge per hour?' },
]

function ApplyForm({ user, onApplied }) {
  const [step, setStep] = useState(0)
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
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [slideDir, setSlideDir] = useState('right')

  const isStudying = experienceLevel === 'Currently studying (not yet graduated)'
  const college_ = collegeContext(experienceLevel)

  function goNext() {
    setError('')
    // validate current step
    if (step === 0) {
      const subjectList = subjects.split(',').map(s => s.trim()).filter(Boolean)
      if (subjectList.length === 0) return setError('Add at least one subject (comma separated).')
      if (!qualifications.trim()) return setError('Enter your qualifications.')
    }
    if (step === 1) {
      if (isStudying && !['3rd year', '4th year'].includes(yearOfStudy)) return setError('Currently studying tutors must be at least in their 3rd year.')
      if (!college.trim()) return setError(`Enter your ${college_.label.toLowerCase()}.`)
      if (!bio.trim()) return setError('Enter a short bio.')
    }
    if (step === 2) {
      const aadharDigits = aadharNumber.replace(/\s/g, '')
      if (!/^\d{12}$/.test(aadharDigits)) return setError('Aadhar number must be exactly 12 digits.')
      const pan = panNumber.trim().toUpperCase()
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) return setError('PAN number format looks wrong — should be like ABCDE1234F.')
      if (!aadharFile || !panFile || !collegeProofFile) return setError('Please upload all three documents — Aadhar photo, PAN photo, and your college/institute proof.')
    }
    setSlideDir('right')
    setStep(s => Math.min(s + 1, WIZARD_STEPS.length - 1))
  }

  function goBack() {
    setError('')
    setSlideDir('left')
    setStep(s => Math.max(s - 1, 0))
  }

  // Stepper click: jump to any already-visited (<= current) step. Forward
  // jumps are intentionally disabled in the markup — those stay gated behind
  // per-step validation in goNext().
  function goToStep(i) {
    if (i === step || i > step) return
    setError('')
    setSlideDir(i < step ? 'right' : 'left')
    setStep(i)
  }

  async function submit() {
    setError('')
    if (!hourlyRate || Number(hourlyRate) <= 0) return setError('Enter a valid hourly rate.')
    const aadharDigits = aadharNumber.replace(/\s/g, '')
    const pan = panNumber.trim().toUpperCase()
    const subjectList = subjects.split(',').map(s => s.trim()).filter(Boolean)

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

  const current = WIZARD_STEPS[step]
  const isLast = step === WIZARD_STEPS.length - 1

  return (
    <div className="wizard-root">
      {/* Left panel — progress & context */}
      <aside className="wizard-sidebar">
        <div className="wizard-sidebar-inner">
          <h1 className="wizard-title">Apply to Tutor</h1>
          <p className="wizard-subtitle">A GradeWallah admin reviews every application before your profile goes live.</p>

          <div className="wizard-steps">
            {WIZARD_STEPS.map((s, i) => {
              const isActive = i === step
              const isDone = i < step
              return (
                <button
                  key={s.key}
                  type="button"
                  className={`wizard-step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
                  onClick={() => goToStep(i)}
                  disabled={i > step}
                  title={i > step ? `Complete earlier steps to reach "${s.label}"` : `Go to ${s.label}`}
                >
                  <span className="wizard-step-num">
                    {isDone ? '✓' : isActive ? <span className="wizard-step-icon">{s.icon}</span> : i + 1}
                  </span>
                  <span className="wizard-step-body">
                    <span className="wizard-step-label">{s.label}</span>
                    {isActive && <span className="wizard-step-desc">{s.desc}</span>}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </aside>

      {/* Right panel — form */}
      <main className="wizard-main">
        <div className="wizard-form-wrapper" key={step}>
          <div className={`wizard-form-slide wizard-slide-${slideDir}`}>
            {step === 0 && (
              <div className="wizard-form-card">
                <div className="wizard-form-icon">👋</div>
                <h2>Let's start with the basics</h2>
                <p className="portal-dim">What subjects do you teach? What are your qualifications?</p>

                <label className="portal-label">Subjects you teach (comma separated)</label>
                <input className="portal-input wizard-input-lg" value={subjects} onChange={e => setSubjects(e.target.value)} placeholder="e.g. Calculus, Data Structures, Physics" />

                <div className="portal-row-2" style={{ marginTop: 16 }}>
                  <div>
                    <label className="portal-label">Qualifications</label>
                    <input className="portal-input" value={qualifications} onChange={e => setQualifications(e.target.value)} placeholder="e.g. B.Tech CSE" />
                  </div>
                  <div>
                    <label className="portal-label">Experience level</label>
                    <select className="portal-input" value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)}>
                      {EXPERIENCE_LEVELS.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                    </select>
                  </div>
                </div>

                {isStudying && (
                  <div style={{ marginTop: 16 }}>
                    <label className="portal-label">Which year are you in? (must be at least 3rd year)</label>
                    <select className="portal-input" value={yearOfStudy} onChange={e => setYearOfStudy(e.target.value)}>
                      {YEARS_OF_STUDY_FOR_STUDYING.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}

            {step === 1 && (
              <div className="wizard-form-card">
                <div className="wizard-form-icon">🎓</div>
                <h2>Tell us about your background</h2>
                <p className="portal-dim">Where do you study or teach? Give students a quick intro.</p>

                <label className="portal-label">{college_.label}</label>
                <input className="portal-input wizard-input-lg" value={college} onChange={e => setCollege(e.target.value)} placeholder="e.g. IIT Delhi" />

                <label className="portal-label" style={{ marginTop: 16 }}>Short bio</label>
                <textarea className="portal-input" rows={4} value={bio} onChange={e => setBio(e.target.value)} placeholder="What do you teach, and how? What makes your sessions effective?" />
              </div>
            )}

            {step === 2 && (
              <div className="wizard-form-card">
                <div className="wizard-form-icon">🔒</div>
                <h2>Identity verification</h2>
                <p className="portal-dim">This info is used solely by the admin to confirm you're a real person. None of it is shown to students.</p>

                <div className="portal-verify-note">
                  🔒 Uploaded documents are encrypted and only accessible to the GradeWallah admin team.
                </div>

                <div className="portal-row-2" style={{ marginTop: 16 }}>
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

                <div className="wizard-docs-grid" style={{ marginTop: 20 }}>
                  <FileField label="Photo of Aadhar card" file={aadharFile} onChange={setAadharFile} />
                  <FileField label="Photo of PAN card" file={panFile} onChange={setPanFile} />
                  <FileField label={college_.proofLabel} file={collegeProofFile} onChange={setCollegeProofFile} />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="wizard-form-card">
                <div className="wizard-form-icon">💰</div>
                <h2>Set your hourly rate</h2>
                <p className="portal-dim">How much would you like to charge per hour? You can change this later.</p>

                <div className="wizard-rate-box">
                  <span className="wizard-rate-currency">₹</span>
                  <input
                    className="wizard-rate-input"
                    type="number" min="1" value={hourlyRate}
                    onChange={e => setHourlyRate(e.target.value)}
                    placeholder="300"
                  />
                  <span className="wizard-rate-suffix">/ hour</span>
                </div>

                <div className="wizard-summary">
                  <h4>📋 Application Summary</h4>
                  <div className="wizard-summary-row"><span>Subjects</span><span>{subjects || '—'}</span></div>
                  <div className="wizard-summary-row"><span>Qualifications</span><span>{qualifications || '—'}</span></div>
                  <div className="wizard-summary-row"><span>Experience</span><span>{experienceLevel}</span></div>
                  <div className="wizard-summary-row"><span>{college_.label}</span><span>{college || '—'}</span></div>
                  <div className="wizard-summary-row"><span>Rate</span><span>{hourlyRate ? `₹${hourlyRate}/hr` : '—'}</span></div>
                  <div className="wizard-summary-row"><span>Documents</span><span>{[aadharFile && 'Aadhar', panFile && 'PAN', collegeProofFile && 'College proof'].filter(Boolean).join(', ') || '—'}</span></div>
                </div>
              </div>
            )}
          </div>

          {/* Error & progress */}
          {progress && <div className="portal-dim" style={{ marginTop: 12, textAlign: 'center' }}>{progress}</div>}
          {error && <div className="portal-error" style={{ marginTop: 8, textAlign: 'center' }}>{error}</div>}

          {/* Navigation */}
          <div className="wizard-nav">
            {step > 0 && (
              <button className="wizard-btn-back" onClick={goBack} type="button">← Back</button>
            )}
            <div style={{ flex: 1 }} />
            {!isLast ? (
              <button className="portal-btn-primary wizard-btn-next" onClick={goNext} type="button">
                Continue →
              </button>
            ) : (
              <button className="portal-btn-primary wizard-btn-submit" onClick={submit} disabled={submitting} type="button">
                {submitting ? 'Submitting…' : '🚀 Submit Application'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
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
