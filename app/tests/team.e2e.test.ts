// @vitest-environment node
// End-to-end check of the team & permissions services against a running NestJS backend.
// Opt-in: TEAM_E2E_URL=http://localhost:3000 npx vitest run app/tests/team.e2e.test.ts
// Needs the backend dev seed (admin@aeon.dev, admin@acme.dev; password123). Creates data.
import { describe, it, expect, beforeAll } from 'vitest'
import { api, apiError, apiErrorBody, apiStatus } from '@/services/client'
import { authService } from '@/services/auth.service'
import { teamService as team } from '@/services/team.service'
import { timecardService as tc } from '@/services/timecard.service'
import { useAuthStore } from '@/stores/auth'

const URL = process.env.TEAM_E2E_URL
const tag = Date.now().toString(36)

async function signIn(email: string, password = 'password123') {
  const { token, user } = await authService.login({ email, password })
  useAuthStore.getState().login(token, user)
  return user
}

describe.skipIf(!URL)('team & permissions API (live backend)', () => {
  let roleId = ''
  let memberId = ''
  const memberEmail = `e2e-${tag}@aeon.test`

  beforeAll(() => {
    api.defaults.baseURL = URL
    api.defaults.adapter = 'http'
  })

  it('login returns org, role and permissions', async () => {
    const admin = await signIn('admin@aeon.dev')
    expect(admin).toMatchObject({ role: 'Admin', isSystemRole: true, org: { slug: 'default' } })
    expect(admin.permissions.TEAM).toEqual({ read: true, write: true, edit: true })
  })

  it('admin creates a role; duplicate name → 409; bad module → 400 with fields', async () => {
    const role = await team.createRole({ name: `Viewer ${tag}`, permissions: [{ module: 'JOBS', read: true }] })
    roleId = role.id
    expect(role.permissions.JOBS).toEqual({ read: true, write: false, edit: false })
    expect(apiStatus(await team.createRole({ name: `Viewer ${tag}` }).catch((e) => e))).toBe(409)
    const bad = await team.createRole({ name: 'x', permissions: [{ module: 'NOPE' as never }] }).catch((e) => e)
    expect(apiStatus(bad)).toBe(400)
    expect(apiErrorBody(bad)?.fields?.length).toBeGreaterThan(0)
  })

  it('admin invites a member with that role; they accept via the link and can only read jobs', async () => {
    const inv = await team.createInvitation({ email: memberEmail, name: 'E2E Viewer', roleId })
    expect(inv.token).toBeTruthy()
    expect((await team.listInvitations()).some((i) => i.id === inv.id && i.status === 'PENDING')).toBe(true)
    expect(apiStatus(await team.deleteRole(roleId).catch((e) => e))).toBe(409) // pending invite blocks deletion

    // Public (no session) preview + accept.
    useAuthStore.getState().logout()
    await expect(team.previewInvitation(inv.token)).resolves.toMatchObject({ email: memberEmail, role: { name: `Viewer ${tag}` } })
    const session = await team.acceptInvitation(inv.token, { name: 'E2E Viewer', password: 'password123' })
    memberId = session.user.id
    expect(apiStatus(await team.acceptInvitation(inv.token, { name: 'Second Try', password: 'password123' }).catch((e) => e))).toBe(404)
    expect(apiStatus(await team.previewInvitation('not-a-real-token').catch((e) => e))).toBe(404)

    const viewer = await signIn(memberEmail)
    expect(viewer.permissions.JOBS.read).toBe(true)
    expect(Array.isArray(await tc.listJobs())).toBe(true)
    const denied = await tc.createJob({ frequency: 'DAILY', periodStart: '2061-01-01', periodEnd: '2061-01-01', processDate: '2061-01-01' }).catch((e) => e)
    expect(apiStatus(denied)).toBe(403)
    expect(apiError(denied)).toMatch(/write access to Jobs/)
    expect(apiStatus(await team.listRoles().catch((e) => e))).toBe(403)
  })

  it('permission changes apply immediately (no re-login)', async () => {
    await signIn('admin@aeon.dev')
    await team.updateRole(roleId, { permissions: [{ module: 'JOBS', write: true }] })
    // Viewer's existing token now has the new access.
    const viewer = await signIn(memberEmail)
    const token = useAuthStore.getState().token
    await signIn('admin@aeon.dev')
    await team.updateRole(roleId, { permissions: [{ module: 'TEAM', read: true }] })
    useAuthStore.getState().login(token!, viewer)
    const me = await authService.me()
    expect(me.permissions.JOBS.write).toBe(true)
    expect(me.permissions.TEAM.read).toBe(true)
  })

  it('deactivated members are signed out and cannot log in', async () => {
    const viewer = await signIn(memberEmail)
    const token = useAuthStore.getState().token
    await signIn('admin@aeon.dev')
    await team.updateMember(memberId, { isActive: false })
    useAuthStore.getState().login(token!, viewer)
    expect(apiStatus(await authService.me().catch((e) => e))).toBe(401)
    expect(apiStatus(await authService.login({ email: memberEmail, password: 'password123' }).catch((e) => e))).toBe(401)
  })

  it('guards: system role, self-lockout, role in use, other orgs', async () => {
    const admin = await signIn('admin@aeon.dev')
    const roles = await team.listRoles()
    const adminRole = roles.find((r) => r.isSystem)!
    expect(apiStatus(await team.updateRole(adminRole.id, { name: 'Boss' }).catch((e) => e))).toBe(403)
    expect(apiStatus(await team.updateMember(admin.id, { isActive: false }).catch((e) => e))).toBe(403)
    expect(apiStatus(await team.deleteRole(roleId).catch((e) => e))).toBe(409) // still has the (inactive) member

    await signIn('admin@acme.dev')
    expect((await team.listRoles()).some((r) => r.id === roleId)).toBe(false)
    expect(apiStatus(await team.updateRole(roleId, { name: 'hijack' }).catch((e) => e))).toBe(404)
    expect(apiStatus(await team.updateMember(memberId, { isActive: true }).catch((e) => e))).toBe(404)
  })
})
