import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App.jsx'
import './styles/portal.css'

// Deliberately the SAME Clerk publishable key as the main GradeWise site
// (GRADEWISE_PROJECT/.env → VITE_CLERK_PUBLISHABLE_KEY) — that's what makes
// "log in with your GradeWise account" work here too, even though this is
// a completely separate deployed app on its own domain. Clerk sessions are
// scoped to the Clerk application (this key), not to a particular frontend
// origin, so the same account signs in on both.
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY — add it to your .env file (see .env.example). Use the SAME key as the main GradeWise site.')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <App />
    </ClerkProvider>
  </StrictMode>,
)
