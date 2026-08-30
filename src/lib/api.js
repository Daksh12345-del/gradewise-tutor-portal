const PYTHON_BACKEND_URL = (import.meta.env.VITE_PYTHON_BACKEND_URL || '').replace(/\/$/, '')

async function postJson(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`)
  return json
}

async function getJson(url) {
  const res = await fetch(url)
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`)
  return json
}

function requireBackendUrl() {
  if (!PYTHON_BACKEND_URL) throw new Error('VITE_PYTHON_BACKEND_URL is not set')
}

/** POST /api/tuition/apply — apply to become a tutor (starts pending until an admin approves) */
export async function applyAsTutor(payload) {
  requireBackendUrl()
  return postJson(`${PYTHON_BACKEND_URL}/api/tuition/apply`, payload)
}

/** GET /api/tuition/teacher/dashboard?user_id= — this tutor's profile + slots + bookings */
export async function fetchTutorDashboard(userId) {
  requireBackendUrl()
  return getJson(`${PYTHON_BACKEND_URL}/api/tuition/teacher/dashboard?user_id=${encodeURIComponent(userId)}`)
}

/** POST /api/tuition/tutors/{id}/slots — open up one bookable time slot */
export async function addTutorSlot(teacherId, payload) {
  requireBackendUrl()
  return postJson(`${PYTHON_BACKEND_URL}/api/tuition/tutors/${teacherId}/slots`, payload)
}

/** GET /api/tuition/bookings/{id}/join?user_id= — mints a fresh, time-boxed
 * join link right when the tutor clicks Join (not fetched/stored earlier). */
export async function fetchTuitionJoinLink(bookingId, userId) {
  requireBackendUrl()
  return getJson(`${PYTHON_BACKEND_URL}/api/tuition/bookings/${bookingId}/join?user_id=${encodeURIComponent(userId)}`)
}
