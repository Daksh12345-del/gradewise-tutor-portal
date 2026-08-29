# GradeWise Tutor Portal

A standalone site — separate from the main GradeWise student site — where
teachers apply to tutor, manage their available time slots, and see their
bookings. Same Clerk account, same backend, but its own deployed app on its
own domain, so teacher tools never show up inside the student-facing site.

## How it fits together

```
Student site (GRADEWISE_PROJECT)  ─┐
                                    ├─→  gradewise-backend  →  Supabase
Teacher Portal (this project)     ─┘
```

Both frontends call the exact same backend routes
(`/api/tuition/apply`, `/api/tuition/tutors/{id}/slots`,
`/api/tuition/teacher/dashboard`) — nothing changed on the backend for this
split. The backend's CORS is already open (`allow_origins=["*"]`), so no
config there either.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in:
   - `VITE_CLERK_PUBLISHABLE_KEY` — **the exact same key** as
     `GRADEWISE_PROJECT/.env`'s `VITE_CLERK_PUBLISHABLE_KEY`. This is what
     makes "sign in with your GradeWise account" work here.
   - `VITE_PYTHON_BACKEND_URL` — same backend URL as the main site.
3. `npm run dev` to try it locally, `npm run build` to build for deploy.

## Deploying

Deploy this as its own site (Vercel/Netlify/Render static site — whatever
you used for the main site works the same way here) on its own
subdomain, e.g. `tutors.yourdomain.com` or `gradewise-tutors.vercel.app`.

Once deployed, set `VITE_TUTOR_PORTAL_URL` in the **main** GradeWise site's
`.env` to this portal's URL — that's what turns on the "Apply to teach on
GradeWise →" link on the student-facing Tuition page.

## What a teacher sees here

- **Not applied yet** → an apply form (subjects, bio, qualifications,
  experience, hourly rate). Submits with `approval_status: pending`.
- **Pending** → a message that their application is under review.
- **Approved** → slot management (add a date/start/end time) and a list of
  bookings students have made, with a "Join Meet" link once a booking is
  confirmed and paid for.
- **Rejected** → a message saying so.

Admin approval still happens the same way as before — the
`x-admin-key`-protected `/api/tuition/admin/teachers/{id}/approve` /
`/reject` routes on the backend (see the main project's README for the
curl command). No admin UI in this portal yet.
