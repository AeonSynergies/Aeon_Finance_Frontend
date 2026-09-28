# Aeon Finance (React Router)

React Router v8 SPA. **Auth and Timecard validation talk to the NestJS backend**
(`../backend`); every other module still uses mock data from `app/mocks/`.

```bash
# 1. backend (../backend): needs DATABASE_URL + JWT_SECRET in its .env
npm run start:dev            # http://localhost:3000, Swagger at /docs
# 2. frontend
cp .env.example .env         # BACKEND_URL=http://localhost:3000
npm install
npm run dev                  # http://localhost:5173 — /api/* is proxied to BACKEND_URL
npm test                     # unit tests
TIMECARD_E2E_URL=http://localhost:3000 npx vitest run app/tests/timecard.e2e.test.ts  # live API (creates data)
TEAM_E2E_URL=http://localhost:3000 npx vitest run app/tests/team.e2e.test.ts          # live API (creates data)
npm run typecheck
npm run build                # static SPA in build/client
```

Sign in with the backend's dev seed users (`npx ts-node prisma/seed.ts` in
`../backend`), all with password `password123`:
- Default Organization: `admin@aeon.dev`, `executive@aeon.dev`, `manager@aeon.dev`
- Acme Logistics (a second org, to check isolation): `admin@acme.dev`

## Backend integration

- **Proxy.** The API has no CORS and no `/api` prefix, so in dev Vite proxies
  `/api/*` → `BACKEND_URL` and strips `/api`. For a production build set
  `VITE_API_URL` to the API origin; the backend must then enable CORS for the app.
- **Auth.** `POST /auth/login` returns only `{ accessToken }`. The user id, role
  and expiry come from the JWT claims (`app/lib/jwt.ts`). An expired token is
  never sent: the guard and the axios interceptor sign the user out and redirect
  to `/login?expired=1&next=…`. Any 401 does the same.
- **Errors.** The API sends `{ error: { code, message, fields?, …extra } }`.
  `apiError()` turns that into a message (including field errors) and
  `apiErrorBody()` exposes extras such as `blockingRows` on a blocked submit.
- **Permissions.** Login and `GET /auth/me` return the user's org, role and
  permission map: Read / Write / Edit for each module (Jobs, Source files,
  Validation, Approvals, Audit, Settings, Team). `usePermissions().can(module, action)`
  gates the UI, and the API enforces the same rules. The protected layout re-reads
  `/auth/me` on focus and every 5 minutes, so role changes apply without signing in again.
- **Team & Permissions** (`/team`):
  - **Roles tab:** Default roles (Admin, Manager, Executive) and custom roles on the left.
    Click one to see its Read / Write / Edit permissions per module, the members
    who have it, and Edit / Delete / "Invite with this role".
  - **Create role:** name, optional description and a per-module Read / Write / Edit
    checklist (optionally copied from an existing role). Then you're offered to invite
    someone with it.
  - **Members tab:** change a member's role, deactivate or reactivate them, invite
    members, and manage pending invitations (new link / revoke).
  - **Invites:** creating one returns a one-time link (`/invite/:token`, valid 7
    days) to send to the person. On that page they set their name and password and
    are signed in. Links are shown once; there's no email sending yet.
  - The UI mirrors the backend's safety rules:
    - you can only grant or assign permissions you hold;
    - you can't change your own role's permissions, your own role, or your active status;
    - the Admin role is read-only, and an org always keeps one active Admin;
    - roles with members or pending invites can't be deleted.
  Code: `services/team.service.ts`, `hooks/useTeam.ts`, `components/team/*`.
- **Timecard workflow** (`/validation/timecard`): create job → upload the payroll
  export and an Amazon itinerary for each day (break reports optional) → run
  validation → override unresolved rows with a reason → submit each date →
  the manager approves or rejects each date → the manager locks the job.
  - Code: `services/timecard.service.ts`, `hooks/useTimecard.ts`,
    `components/timecard/*` and `lib/timecard.ts` (labels, rules, date helpers).

## Stack

React Router (routing, `clientLoader` auth guard) · TanStack Query (server state)
· axios (HTTP) · zustand (auth/session + shared UI state) · react-hook-form + zod
(forms) · Tailwind 3 + shadcn/ui · recharts · xlsx.

## Structure

```
app/
  root.tsx            providers (QueryClient, Toaster), document shell, error boundary
  routes.ts           route table
  routes/             one module per page; _protected.tsx guards everything but /login
  services/           client.ts (axios + USE_MOCKS switch) and one <feature>.service.ts per domain
  hooks/              one use<Feature>.ts per domain holding its TanStack queries AND mutations
                      (queryKeys.ts holds all query keys), plus shared React hooks
  stores/             zustand stores (auth.ts: token + user, persisted)
  schemas/            zod schemas for forms and request bodies
  components/         ui/ (shadcn), layout/, shared/ (empty/error/skeleton states), timecard/,
                      validation/, upload/, analytics/
  lib/                small helpers: jwt, timecard labels/rules/dates, formatters, query client
  types/              shared TS types and API DTOs
  mocks/
    data/*.json       static mock data (users, jobs, rows, analytics, reports…)
    store.ts          in-memory copies the services read and mutate (reset on reload)
  tests/              vitest suites
```

## Mock data (all modules except auth + timecard)

The mock-backed services keep both paths side by side:

```ts
list: (params) =>
  USE_MOCKS ? mock(db.jobs.filter(...)) : unwrap(api.get('/jobs', { params })),
```

When a module gets a real endpoint, replace its mock branch the way
`timecard.service.ts` does. Once all modules are wired, delete `app/mocks/` and
`USE_MOCKS`.

Mock edits (create job, row edits, approvals) live in memory only; a page
reload resets to the JSON data. Uploads parse the chosen sheet for the preview
but don't validate or persist rows.
