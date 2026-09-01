import { useState } from 'react'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react'
import { useAuthUser } from './lib/useAuthUser'
import TutorPortalPage from './pages/TutorPortalPage'

export default function App() {
  const [isLight, setIsLight] = useState(false)

  return (
    <div className={`portal-root ${isLight ? 'light' : ''}`}>
      <header className="portal-header">
        <div className="portal-brand">
          <img src="/gw-logo.png" alt="GradeWallah" className="portal-brand-logo" />
          GradeWallah <span>Tutor Portal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="portal-theme-toggle"
            onClick={() => setIsLight(v => !v)}
            aria-label="Toggle light/dark mode"
            title="Toggle light/dark mode"
          >
            {isLight ? '🌙' : '☀️'}
          </button>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </header>

      <SignedOut>
        <LandingHero />
      </SignedOut>

      <SignedIn>
        <TutorPortalGate />
      </SignedIn>
    </div>
  )
}

// Small wrapper so TutorPortalPage only mounts (and only calls useAuthUser)
// once Clerk has actually confirmed a session — avoids a flash of loading
// state inside the page itself.
function TutorPortalGate() {
  const { user, status } = useAuthUser()
  if (status !== 'authenticated' || !user) return <div className="portal-loading">Loading…</div>
  return <TutorPortalPage user={user} />
}

const LANDING_BENEFITS = [
  { icon: '💰', title: 'Set your own hourly rate', desc: 'You decide what your time is worth — change it any time.' },
  { icon: '🎥', title: 'Teach over video call', desc: 'One-on-one tuition sessions hosted right inside GradeWallah.' },
  { icon: '📈', title: 'Grow your schedule', desc: 'Open time slots when you\'re free and fill them with booked students.' },
]

const LANDING_STEPS = [
  'Sign in with your GradeWallah account',
  'Fill in your application',
  'Get approved by our team',
  'Open slots & start teaching',
]

// Full-viewport landing hero shown to signed-out users. Two columns: value
// prop + CTA on the left, an interactive mock-dashboard preview on the right.
function LandingHero() {
  return (
    <section className="landing-hero">
      <div className="landing-blob landing-blob-1" />
      <div className="landing-blob landing-blob-2" />
      <div className="landing-blob landing-blob-3" />

      <div className="landing-copy">
        <p className="landing-eyebrow">GradeWallah <strong>Tutor Portal</strong></p>
        <h1 className="landing-title">
          Teach on <span>GradeWallah</span> your way
        </h1>
        <p className="landing-sub">
          Apply in minutes, set your own rate, open the time slots that suit you,
          and take paid video-call tuition sessions on your schedule.
        </p>

        <ul className="landing-checklist">
          {LANDING_BENEFITS.map(b => (
            <li key={b.title} className="landing-benefit">
              <span className="landing-benefit-icon">{b.icon}</span>
              <div>
                <strong>{b.title}</strong>
                <span>{b.desc}</span>
              </div>
            </li>
          ))}
        </ul>

        <div className="landing-cta">
          <SignInButton mode="modal">
            <button className="portal-btn-primary landing-btn">Get started — sign in</button>
          </SignInButton>
          <span className="landing-cta-note">Same account you already use on GradeWallah</span>
        </div>

        <ol className="landing-steps">
          {LANDING_STEPS.map((s, i) => (
            <li key={s}>
              <span>{i + 1}</span>{s}
            </li>
          ))}
        </ol>
      </div>

      <div className="landing-preview-wrap">
        <LandingPreview />
      </div>
    </section>
  )
}

// A stylized mock of the tutor dashboard so a brand-new visitor gets a visual
// sense of what they're signing up for instead of an empty page.
function LandingPreview() {
  return (
    <div className="landing-preview">
      <div className="preview-card preview-card-hero">
        <div className="preview-card-top">
          <div className="preview-avatar">PS</div>
          <div>
            <div className="preview-name">Priya Sharma</div>
            <div className="preview-role">Mathematics · ₹450/hr</div>
          </div>
          <span className="preview-badge">✓ Approved</span>
        </div>
        <div className="preview-card-body">
          <div className="preview-stat">
            <span className="preview-stat-num">12</span>
            <span className="preview-stat-label">sessions</span>
          </div>
          <div className="preview-stat">
            <span className="preview-stat-num">₹18k</span>
            <span className="preview-stat-label">earned</span>
          </div>
          <div className="preview-stat">
            <span className="preview-stat-num">5★</span>
            <span className="preview-stat-label">rating</span>
          </div>
        </div>
      </div>

      <div className="preview-card preview-card-slot">
        <div className="preview-card-head">Next open slot</div>
        <div className="preview-slot-row">
          <span className="preview-slot-dot" />Fri, 6:00 PM · Calculus
        </div>
        <div className="preview-slot-row">
          <span className="preview-slot-dot preview-slot-dot-ok" />Sat, 11:00 AM · Physics
        </div>
      </div>

      <div className="preview-card preview-card-booking">
        <div className="preview-card-head">New booking</div>
        <div className="preview-booking">🎉 Aarav booked <strong>Triangles &amp; Trigonometry</strong> for Mon, 7:00 PM</div>
      </div>
    </div>
  )
}
