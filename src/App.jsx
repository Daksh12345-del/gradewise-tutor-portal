import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react'
import { useAuthUser } from './lib/useAuthUser'
import TutorPortalPage from './pages/TutorPortalPage'

export default function App() {
  return (
    <div className="portal-root">
      <header className="portal-header">
        <div className="portal-brand">🎓 GradeWise <span>Tutor Portal</span></div>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </header>

      <SignedOut>
        <div className="portal-signed-out">
          <h1>Teach on GradeWise</h1>
          <p>Sign in with the same account you use on GradeWise to apply as a tutor, open your available time slots, and manage your bookings.</p>
          <SignInButton mode="modal">
            <button className="portal-btn-primary">Sign in to continue</button>
          </SignInButton>
        </div>
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
