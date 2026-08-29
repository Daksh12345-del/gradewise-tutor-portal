import { useMemo, useCallback } from 'react'
import { useUser, useClerk } from '@clerk/clerk-react'

// Same shape as the main GradeWise site's useAuthUser (see
// GRADEWISE_PROJECT/src/lib/useAuthUser.js), trimmed down since this
// standalone portal doesn't need the marks-cache clearing on sign-out —
// it never touches that data.
export function useAuthUser() {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser()

  const user = useMemo(() => {
    if (!isSignedIn || !clerkUser) return null
    const meta = clerkUser.unsafeMetadata || {}
    return {
      id: clerkUser.id,
      name: meta.name || clerkUser.fullName || clerkUser.firstName || 'Tutor',
      email: clerkUser.primaryEmailAddress?.emailAddress || '',
    }
  }, [isSignedIn, clerkUser])

  const status = !isLoaded ? 'checking' : (isSignedIn ? 'authenticated' : 'unauthenticated')
  return { user, status }
}

export function useLogout() {
  const { signOut } = useClerk()
  return useCallback(() => signOut(), [signOut])
}
