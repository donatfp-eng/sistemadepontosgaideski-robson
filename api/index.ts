import type { VercelRequest, VercelResponse } from '@vercel/node'
import { eq, and, gte, lte, isNull, desc, sql } from 'drizzle-orm'
import { db } from './_db'
import {
  users, sectors, employees, supervisorAssignments,
  weeklyEntries, quizEntries, candidateReferrals, clientReferrals,
  coinConfig, auditLogs,
} from './schema'
import {
  signToken, setTokenCookie, clearTokenCookie,
  requireAuth, requireAdmin, requireSupervisorOrAdmin,
} from './_auth'
import { audit } from './_audit'
import { calcWeeklyCoins, calcQuizCoins } from './_coins'
import * as bcrypt from 'bcryptjs'

// ─── tiny router ────────────────────────────────────────────────────────────
type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void>

interface Route {
  method: string
  pattern: RegExp
  paramNames: string[]
  handler: Handler
}

const routes: Route[] = []

function route(method: string, path: string, handler: Handler) {
  const paramNames: string[] = []
  const pattern = new RegExp(
    '^' + path.replace(/:([^/]+)/g, (_: string, name: string) => { paramNames.push(name); return '([^/]+)' }) + '$'
  )
  routes.push({ method: method.toUpperCase(), pattern, paramNames, handler })
}

function addParams(req: VercelRequest, paramNames: string[], match: RegExpMatchArray) {
  paramNames.forEach((name, i) => {
    (req.query as Record<string, string>)[name] = match[i + 1]
  })
}

// ─── AUTH ────────────────────────────────────────────────────────────────────
route('POST', '/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return void res.status(400).json({ error: 'Email e senha obrigatórios' })
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()))
  if (!user || !user.active) return void res.status(401).json({ error: 'Credenciais inválidas' })
  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return void res.status(401).json({ error: 'Credenciais inválidas' })
  const payload = { userId: user.id, userName: user.name, userEmail: user.email, role: user.role as 'admin' | 'supervisor' }
  const token = await signToken(payload)
  setTokenCookie(res, token)
  await audit(payload, 'login')
  res.status(200).json({ id: user.id, name: user.name, email: user.email, role: user.role })
})

route('POST', '/api/auth/logout', async (req, res) => {
  clearTokenCookie(res)
  res.status(200).json({ ok: true })
})

route('GET', '/api/auth/me', async (req, res) => {
  const user = await requireAuth(req, res)
  if (!user) return
  res.status(200).json({ id: user.userId, name: user.userName, email: user.userEmail, role: user.role })
})

// ─── SECTORS ─────────────────────────────────────────────────────────────────
route('GET', '/api/sectors', async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return
  res.status(200).json(await db.select().from(sectors).orderBy(sectors.name))
})
route('POST', '/api/sectors', async (req, res) => {
  const user = await requireAdmin(req, res); if (!user) return
  const { name } = req.body || {}
  if (!name) return void res.status(400).json({ error: 'Nome obrigatório' })
  const [created] = await db.insert(sectors).values({ name }).returning()
  await audit(user, 'create_sector', 'sector', created.id, null, created)
  res.status(201).json(created)
})
route('DELETE', '/api/sectors/:id', async (req, res) => {
  const user = await requireAdmin(req, res); if (!user) return
  const id = Number(req.query.id)
  const [deleted] = await db.delete(sectors).where(eq(sectors.id, id)).returning()
  await audit(user, 'delete_sector', 'sector', id, deleted, null)
  res.status(200).json({ ok: true })
})

// ─── EMPLOYEES ───────────────────────────────────────────────────────────────
route('GET', '/api/employees', async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return
  const list = await db
    .select({ id: employees.id, name: employees.name, email: employees.email, role: employees.role,
      sectorId: employees.sectorId, sectorName: sectors.name, active: employees.active, createdAt: employees.createdAt })
    .from(employees).leftJoin(sectors, eq(employees.sectorId, sectors.id))
    .where(eq(employees.active, true)).orderBy(employees.name)
  const withSupervisor = await Promise.all(list.map(async (emp) => {
    const [assignment] = await db
      .select({ supervisorId: supervisorAssignments.supervisorId, supervisorName: users.name })
      .from(supervisorAssignments).leftJoin(users, eq(supervisorAssignments.supervisorId, users.id))
      .where(and(eq(supervisorAssignments.employeeId, emp.id), isNull(supervisorAssignments.removedAt))).limit(1)
    return { ...emp, supervisorId: assignment?.supervisorId ?? null, supervisorName: assignment?.supervisorName ?? null }
  }))
  res.status(200).json(withSupervisor)
})
route('POST', '/api/employees', async (req, res) => {
  const user = await requireAdmin(req, res); if (!user) return
  const { name, email, role, sectorId, supervisorId } = req.body || {}
  if (!name || !email || !role) return void res.status(400).json({ error: 'Campos obrigatórios faltando' })
  const [emp] = await db.insert(employees).values({ name, email: email.toLowerCase(), role, sectorId: sectorId || null }).returning()
  if (supervisorId) await db.insert(supervisorAssignments).values({ employeeId: emp.id, supervisorId })
  await audit(user, 'create_employee', 'employee', emp.id, null, emp)
  res.status(201).json(emp)
})
route('PUT', '/api/employees/:id', async (req, res) => {
  const user = await requireAdmin(req, res); if (!user) return
  const id = Number(req.query.id)
  const { name, email, role, sectorId, supervisorId } = req.body || {}
  const [before] = await db.select().from(employees).where(eq(employees.id, id))
  const [updated] = await db.update(employees).set({ name, email: email?.toLowerCase(), role, sectorId: sectorId || null, updatedAt: new Date() }).where(eq(employees.id, id)).returning()
  if (supervisorId !== undefined) {
    await db.update(supervisorAssignments).set({ removedAt: new Date() }).where(and(eq(supervisorAssignments.employeeId, id), isNull(supervisorAssignments.removedAt)))
    if (supervisorId) await db.insert(supervisorAssignments).values({ employeeId: id, supervisorId })
  }
  await audit(user, 'update_employee', 'employee', id, before, updated)
  res.status(200).json(updated)
})
route('DELETE', '/api/employees/:id', async (req, res) => {
  const user = await requireAdmin(req, res); if (!user) return
  const id = Number(req.query.id)
  const [before] = await db.select().from(employees).where(eq(employees.id, id))
  const [updated] = await db.update(employees).set({ active: false, updatedAt: new Date() }).where(eq(employees.id, id)).returning()
  await audit(user, 'deactivate_employee', 'employee', id, before, updated)
  res.status(200).json({ ok: true })
})

// ─── USERS ───────────────────────────────────────────────────────────────────
route('GET', '/api/users', async (req, res) => {
  const user = await requireAdmin(req, res); if (!user) return
  res.status(200).json(await db.select({ id: users.id, name: users.name, email: users.email, role: users.role, active: users.active, createdAt: users.createdAt }).from(users).orderBy(users.name))
})
route('POST', '/api/users', async (req, res) => {
  const admin = await requireAdmin(req, res); if (!admin) return
  const { name, email, password, role } = req.body || {}
  if (!name || !email || !password || !role) return void res.status(400).json({ error: 'Campos obrigatórios faltando' })
  const passwordHash = await bcrypt.hash(password, 10)
  const [created] = await db.insert(users).values({ name, email: email.toLowerCase(), passwordHash, role }).returning()
  const { passwordHash: _, ...safe } = created
  await audit(admin, 'create_user', 'user', created.id, null, safe)
  res.status(201).json(safe)
})
route('PUT', '/api/users/:id', async (req, res) => {
  const admin = await requireAdmin(req, res); if (!admin) return
  const id = Number(req.query.id)
  const { name, email, password, role, active } = req.body || {}
  const [before] = await db.select().from(users).where(eq(users.id, id))
  const updates: Partial<typeof users.$inferInsert> = { name, email: email?.toLowerCase(), role, active: active !== undefined ? active : before.active, updatedAt: new Date() }
  if (password) updates.passwordHash = await bcrypt.hash(password, 10)
  const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning()
  const { passwordHash: _, ...safe } = updated
  await audit(admin, 'update_user', 'user', id, null, safe)
  res.status(200).json(safe)
})
route('DELETE', '/api/users/:id', async (req, res) => {
  const admin = await requireAdmin(req, res); if (!admin) return
  const id = Number(req.query.id)
  await db.update(users).set({ active: false, updatedAt: new Date() }).where(eq(users.id, id))
  await audit(admin, 'deactivate_user', 'user', id, null, null)
  res.status(200).json({ ok: true })
})

// ─── SUPERVISORS ─────────────────────────────────────────────────────────────
route('GET', '/api/supervisors', async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return
  const { or } = await import('drizzle-orm')
  res.status(200).json(await db.select({ id: users.id, name: users.name, email: users.email })
    .from(users).where(and(eq(users.active, true), or(eq(users.role, 'supervisor'), eq(users.role, 'admin')))).orderBy(users.name))
})
route('GET', '/api/supervisors/my-team', async (req, res) => {
  const user = await requireSupervisorOrAdmin(req, res); if (!user) return
  const assignments = await db.select({ employeeId: supervisorAssignments.employeeId }).from(supervisorAssignments)
    .where(and(eq(supervisorAssignments.supervisorId, user.userId), isNull(supervisorAssignments.removedAt)))
  if (!assignments.length) return void res.status(200).json([])
  const ids = assignments.map(a => a.employeeId)
  const team = await db.select({ id: employees.id, name: employees.name, email: employees.email, role: employees.role, sectorId: employees.sectorId, sectorName: sectors.name })
    .from(employees).leftJoin(sectors, eq(employees.sectorId, sectors.id)).where(eq(employees.active, true)).orderBy(employees.name)
  res.status(200).json(team.filter(e => ids.includes(e.id)))
})

// ─── WEEKLY ENTRIES ───────────────────────────────────────────────────────────
route('GET', '/api/weekly-entries', async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return
  const { employeeId, weekStart, weekEnd } = req.query
  const conditions: ReturnType<typeof eq>[] = []
  if (employeeId) conditions.push(eq(weeklyEntries.employeeId, Number(employeeId)))
  if (weekStart)  conditions.push(gte(weeklyEntries.weekStart, weekStart as string))
  if (weekEnd)    conditions.push(lte(weeklyEntries.weekEnd, weekEnd as string))
  let query = db.select().from(weeklyEntries)
  if (conditions.length) query = query.where(and(...conditions)) as typeof query
  res.status(200).json(await query)
})
route('POST', '/api/weekly-entries', async (req, res) => {
  const user = await requireSupervisorOrAdmin(req, res); if (!user) return
  const { weekStart, weekEnd, entries } = req.body || {}
  if (!weekStart || !weekEnd || !Array.isArray(entries)) return void res.status(400).json({ error: 'Dados inválidos' })
  const [cfg] = await db.select().from(coinConfig).limit(1)
  if (!cfg) return void res.status(500).json({ error: 'Configuração de moedas não encontrada' })
  let allowedIds: Set<number> | null = null
  if (user.role === 'supervisor') {
    const a = await db.select({ employeeId: supervisorAssignments.employeeId }).from(supervisorAssignments)
      .where(and(eq(supervisorAssignments.supervisorId, user.userId), isNull(supervisorAssignments.removedAt)))
    allowedIds = new Set(a.map(x => x.employeeId))
  }
  const saved = []
  for (const entry of entries) {
    const { employeeId, punctual, attended, sport, workMonitorPct, taskProcessPct } = entry
    if (allowedIds && !allowedIds.has(employeeId)) continue
    const coins = calcWeeklyCoins(cfg, punctual, attended, sport, workMonitorPct ?? null, taskProcessPct ?? null)
    const [existing] = await db.select().from(weeklyEntries).where(and(eq(weeklyEntries.employeeId, employeeId), eq(weeklyEntries.weekStart, weekStart))).limit(1)
    if (existing) {
      const [u] = await db.update(weeklyEntries).set({ punctual, attended, sport, workMonitorPct, taskProcessPct, coins: String(coins), supervisorId: user.userId, updatedAt: new Date() }).where(eq(weeklyEntries.id, existing.id)).returning()
      saved.push(u)
    } else {
      const [c] = await db.insert(weeklyEntries).values({ employeeId, supervisorId: user.userId, weekStart, weekEnd, punctual, attended, sport, workMonitorPct, taskProcessPct, coins: String(coins) }).returning()
      saved.push(c)
    }
  }
  await audit(user, 'create_weekly_entries', 'weekly_entry', undefined, null, { weekStart, weekEnd, count: saved.length })
  res.status(200).json(saved)
})

// ─── QUIZ ENTRIES ─────────────────────────────────────────────────────────────
route('GET', '/api/quiz-entries', async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return
  const { employeeId, month, year } = req.query
  const conditions: ReturnType<typeof eq>[] = []
  if (employeeId) conditions.push(eq(quizEntries.employeeId, Number(employeeId)))
  if (month)      conditions.push(eq(quizEntries.month, Number(month)))
  if (year)       conditions.push(eq(quizEntries.year, Number(year)))
  let query = db.select().from(quizEntries)
  if (conditions.length) query = query.where(and(...conditions)) as typeof query
  res.status(200).json(await query)
})
route('POST', '/api/quiz-entries', async (req, res) => {
  const user = await requireSupervisorOrAdmin(req, res); if (!user) return
  const { employeeId, month, year, score, notes } = req.body || {}
  if (!employeeId || !month || !year || score === undefined) return void res.status(400).json({ error: 'Campos obrigatórios faltando' })
  const [cfg] = await db.select().from(coinConfig).limit(1)
  const { passed, coins } = calcQuizCoins(cfg, Number(score))
  const [existing] = await db.select().from(quizEntries).where(and(eq(quizEntries.employeeId, employeeId), eq(quizEntries.month, month), eq(quizEntries.year, year)))
  if (existing) {
    const [u] = await db.update(quizEntries).set({ score: String(score), passed, coins: String(coins), notes, supervisorId: user.userId, updatedAt: new Date() }).where(eq(quizEntries.id, existing.id)).returning()
    return void res.status(200).json(u)
  }
  const [created] = await db.insert(quizEntries).values({ employeeId, supervisorId: user.userId, month, year, score: String(score), passed, coins: String(coins), notes }).returning()
  res.status(201).json(created)
})

// ─── CANDIDATE REFERRALS ──────────────────────────────────────────────────────
route('GET', '/api/candidate-referrals', async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return
  res.status(200).json(await db.select().from(candidateReferrals).orderBy(candidateReferrals.referralDate))
})
route('POST', '/api/candidate-referrals', async (req, res) => {
  const user = await requireSupervisorOrAdmin(req, res); if (!user) return
  const { employeeId, candidateName, referralDate, position, status } = req.body || {}
  if (!employeeId || !candidateName || !referralDate || !position) return void res.status(400).json({ error: 'Campos obrigatórios faltando' })
  const [cfg] = await db.select().from(coinConfig).limit(1)
  const coins = Number(cfg?.candidateReferralCoins ?? 5)
  const [created] = await db.insert(candidateReferrals).values({ employeeId, supervisorId: user.userId, candidateName, referralDate, position, status: status || 'pendente', coins: String(coins) }).returning()
  await audit(user, 'create_candidate_referral', 'candidate_referral', created.id, null, created)
  res.status(201).json(created)
})
route('PUT', '/api/candidate-referrals/:id', async (req, res) => {
  const user = await requireSupervisorOrAdmin(req, res); if (!user) return
  const id = Number(req.query.id)
  const { status } = req.body || {}
  const [updated] = await db.update(candidateReferrals).set({ status, updatedAt: new Date() }).where(eq(candidateReferrals.id, id)).returning()
  await audit(user, 'update_candidate_referral', 'candidate_referral', id, null, updated)
  res.status(200).json(updated)
})
route('DELETE', '/api/candidate-referrals/:id', async (req, res) => {
  const user = await requireSupervisorOrAdmin(req, res); if (!user) return
  const id = Number(req.query.id)
  await db.delete(candidateReferrals).where(eq(candidateReferrals.id, id))
  res.status(200).json({ ok: true })
})

// ─── CLIENT REFERRALS ─────────────────────────────────────────────────────────
route('GET', '/api/client-referrals', async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return
  res.status(200).json(await db.select().from(clientReferrals).orderBy(clientReferrals.referralDate))
})
route('POST', '/api/client-referrals', async (req, res) => {
  const user = await requireSupervisorOrAdmin(req, res); if (!user) return
  const { employeeId, clientName, referralDate, status } = req.body || {}
  if (!employeeId || !clientName || !referralDate) return void res.status(400).json({ error: 'Campos obrigatórios faltando' })
  const [cfg] = await db.select().from(coinConfig).limit(1)
  const coins = Number(cfg?.clientReferralCoins ?? 20)
  const [created] = await db.insert(clientReferrals).values({ employeeId, supervisorId: user.userId, clientName, referralDate, status: status || 'pendente', coins: String(coins) }).returning()
  await audit(user, 'create_client_referral', 'client_referral', created.id, null, created)
  res.status(201).json(created)
})
route('PUT', '/api/client-referrals/:id', async (req, res) => {
  const user = await requireSupervisorOrAdmin(req, res); if (!user) return
  const id = Number(req.query.id)
  const { status } = req.body || {}
  const [updated] = await db.update(clientReferrals).set({ status, updatedAt: new Date() }).where(eq(clientReferrals.id, id)).returning()
  res.status(200).json(updated)
})
route('DELETE', '/api/client-referrals/:id', async (req, res) => {
  const user = await requireSupervisorOrAdmin(req, res); if (!user) return
  const id = Number(req.query.id)
  await db.delete(clientReferrals).where(eq(clientReferrals.id, id))
  res.status(200).json({ ok: true })
})

// ─── COIN CONFIG ──────────────────────────────────────────────────────────────
route('GET', '/api/coin-config', async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return
  const [cfg] = await db.select().from(coinConfig).limit(1)
  res.status(200).json(cfg)
})
route('PUT', '/api/coin-config', async (req, res) => {
  const admin = await requireAdmin(req, res); if (!admin) return
  const [before] = await db.select().from(coinConfig).limit(1)
  const [updated] = await db.update(coinConfig).set({ ...req.body, updatedAt: new Date() }).returning()
  await audit(admin, 'update_coin_config', 'coin_config', updated.id, before, updated)
  res.status(200).json(updated)
})

// ─── RANKING ──────────────────────────────────────────────────────────────────
route('GET', '/api/ranking/summary', async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return
  const [empCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(employees).where(eq(employees.active, true))
  const [secCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(sectors)
  const [weSumRow] = await db.select({ sum: sql<string>`COALESCE(SUM(coins::numeric),0)` }).from(weeklyEntries)
  const [qzSumRow] = await db.select({ sum: sql<string>`COALESCE(SUM(coins::numeric),0)` }).from(quizEntries)
  const [crSumRow] = await db.select({ sum: sql<string>`COALESCE(SUM(coins::numeric),0)` }).from(candidateReferrals)
  const [clSumRow] = await db.select({ sum: sql<string>`COALESCE(SUM(coins::numeric),0)` }).from(clientReferrals)
  const [cfg]      = await db.select().from(coinConfig).limit(1)
  const totalCoins = Number(weSumRow.sum) + Number(qzSumRow.sum) + Number(crSumRow.sum) + Number(clSumRow.sum)
  const totalValue = Math.round(totalCoins * Number(cfg?.coinValueBrl ?? 1.25) * 100) / 100
  const now = new Date(); const wkDay = now.getDay() || 7
  const mon = new Date(now); mon.setDate(now.getDate() - wkDay + 1)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  res.status(200).json({ totalEmployees: Number(empCount.count), totalSectors: Number(secCount.count), totalCoinsDistributed: Math.round(totalCoins * 100) / 100, totalValueBrl: totalValue, currentWeek: { start: fmt(mon), end: fmt(sun) } })
})

route('GET', '/api/ranking/tv', async (req, res) => {
  const tvToken = process.env.TV_ACCESS_TOKEN
  if (tvToken && req.query.token !== tvToken) return void res.status(401).json({ error: 'Token inválido' })
  const empList = await db.select({ id: employees.id, name: employees.name, sectorId: employees.sectorId, sectorName: sectors.name }).from(employees).leftJoin(sectors, eq(employees.sectorId, sectors.id)).where(eq(employees.active, true)).orderBy(employees.name)
  const [cfg] = await db.select().from(coinConfig).limit(1)
  const now = new Date(); const year = now.getFullYear(); const month = now.getMonth() + 1
  const start = `${year}-${String(month).padStart(2,'0')}-01`
  const end = `${year}-${String(month).padStart(2,'0')}-${new Date(year, month, 0).getDate()}`
  const results = await Promise.all(empList.map(async (emp) => {
    const [weRow] = await db.select({ sum: sql<string>`COALESCE(SUM(coins::numeric),0)` }).from(weeklyEntries).where(and(eq(weeklyEntries.employeeId, emp.id), sql`week_start >= ${start}`, sql`week_end <= ${end}`))
    const [qzRow] = await db.select({ sum: sql<string>`COALESCE(SUM(coins::numeric),0)` }).from(quizEntries).where(and(eq(quizEntries.employeeId, emp.id), eq(quizEntries.month, month), eq(quizEntries.year, year)))
    const coins = Math.round((Number(weRow.sum) + Number(qzRow.sum)) * 100) / 100
    return { employeeId: emp.id, employeeName: emp.name, sectorId: emp.sectorId, sectorName: emp.sectorName, monthCoins: coins }
  }))
  const sorted = results.sort((a, b) => b.monthCoins - a.monthCoins).map((r, i) => ({ rank: i + 1, ...r }))
  res.status(200).json({ month, year, employees: sorted, coinValueBrl: Number(cfg?.coinValueBrl ?? 1.25) })
})

route('GET', '/api/ranking', async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return
  const { sectorId, supervisorId, month, year, weekStart, weekEnd } = req.query
  const empList = await db.select({ id: employees.id, name: employees.name, sectorId: employees.sectorId, sectorName: sectors.name }).from(employees).leftJoin(sectors, eq(employees.sectorId, sectors.id)).where(eq(employees.active, true)).orderBy(employees.name)
  const assignments = await db.select({ employeeId: supervisorAssignments.employeeId, supervisorId: supervisorAssignments.supervisorId, supervisorName: users.name }).from(supervisorAssignments).leftJoin(users, eq(supervisorAssignments.supervisorId, users.id)).where(isNull(supervisorAssignments.removedAt))
  const assignMap = new Map(assignments.map(a => [a.employeeId, a]))
  let filteredEmps = empList
  if (user.role === 'supervisor') filteredEmps = empList.filter(e => assignMap.get(e.id)?.supervisorId === user.userId)
  else if (supervisorId) filteredEmps = empList.filter(e => assignMap.get(e.id)?.supervisorId === Number(supervisorId))
  if (sectorId) filteredEmps = filteredEmps.filter(e => e.sectorId === Number(sectorId))
  const [cfg] = await db.select().from(coinConfig).limit(1)
  const results = await Promise.all(filteredEmps.map(async (emp) => {
    const assignment = assignMap.get(emp.id)
    const weConditions: ReturnType<typeof eq>[] = [eq(weeklyEntries.employeeId, emp.id)]
    if (weekStart) weConditions.push(gte(weeklyEntries.weekStart, weekStart as string))
    if (weekEnd)   weConditions.push(lte(weeklyEntries.weekEnd, weekEnd as string))
    if (month && year) {
      const y = Number(year), m = Number(month)
      weConditions.push(gte(weeklyEntries.weekStart, `${y}-${String(m).padStart(2,'0')}-01`))
      weConditions.push(lte(weeklyEntries.weekEnd, `${y}-${String(m).padStart(2,'0')}-${new Date(y, m, 0).getDate()}`))
    }
    const we = await db.select().from(weeklyEntries).where(and(...weConditions))
    const qzConditions: ReturnType<typeof eq>[] = [eq(quizEntries.employeeId, emp.id)]
    if (month) qzConditions.push(eq(quizEntries.month, Number(month)))
    if (year)  qzConditions.push(eq(quizEntries.year, Number(year)))
    const qz = await db.select().from(quizEntries).where(and(...qzConditions))
    const cr = await db.select().from(candidateReferrals).where(eq(candidateReferrals.employeeId, emp.id))
    const cl = await db.select().from(clientReferrals).where(eq(clientReferrals.employeeId, emp.id))
    const punctuality  = we.reduce((s, e) => s + (e.punctual ? Number(cfg.punctualityCoinsPerWeek) : 0), 0)
    const attendance   = we.reduce((s, e) => s + (e.attended ? Number(cfg.attendanceCoinsPerWeek) : 0), 0)
    const sport        = we.reduce((s, e) => s + (e.sport ? Number(cfg.sportCoinsPerEntry) : 0), 0)
    const workMonitor  = we.reduce((s, e) => s + (e.workMonitorPct != null ? (Number(e.workMonitorPct) / Number(cfg.workMonitorMaxScore)) * Number(cfg.workMonitorMaxCoins) : 0), 0)
    const taskProcess  = we.reduce((s, e) => s + (e.taskProcessPct != null ? (Number(e.taskProcessPct) / Number(cfg.taskProcessMaxScore)) * Number(cfg.taskProcessMaxCoins) : 0), 0)
    const quiz         = qz.reduce((s, e) => s + Number(e.coins), 0)
    const candidateRef = cr.reduce((s, e) => s + Number(e.coins), 0)
    const clientRef    = cl.reduce((s, e) => s + Number(e.coins), 0)
    const totalCoins = Math.round((punctuality + attendance + sport + workMonitor + taskProcess + quiz + candidateRef + clientRef) * 100) / 100
    const [weAll] = await db.select({ sum: sql<string>`COALESCE(SUM(coins::numeric), 0)` }).from(weeklyEntries).where(eq(weeklyEntries.employeeId, emp.id))
    const [qzAll] = await db.select({ sum: sql<string>`COALESCE(SUM(coins::numeric), 0)` }).from(quizEntries).where(eq(quizEntries.employeeId, emp.id))
    const [crAll] = await db.select({ sum: sql<string>`COALESCE(SUM(coins::numeric), 0)` }).from(candidateReferrals).where(eq(candidateReferrals.employeeId, emp.id))
    const [clAll] = await db.select({ sum: sql<string>`COALESCE(SUM(coins::numeric), 0)` }).from(clientReferrals).where(eq(clientReferrals.employeeId, emp.id))
    const accumulatedCoins = Number(weAll.sum) + Number(qzAll.sum) + Number(crAll.sum) + Number(clAll.sum)
    const wkWithMonitor = we.filter(e => e.workMonitorPct != null)
    const wkWithTask = we.filter(e => e.taskProcessPct != null)
    const workMonitorScore = wkWithMonitor.length ? wkWithMonitor.reduce((s, e) => s + Number(e.workMonitorPct), 0) / wkWithMonitor.length : 0
    const taskProcessScore = wkWithTask.length ? wkWithTask.reduce((s, e) => s + Number(e.taskProcessPct), 0) / wkWithTask.length : 0
    return { employeeId: emp.id, employeeName: emp.name, sectorId: emp.sectorId, sectorName: emp.sectorName, supervisorId: assignment?.supervisorId ?? null, supervisorName: assignment?.supervisorName ?? null, totalCoins, accumulatedCoins: Math.round(accumulatedCoins * 100) / 100, taskProcessScore: Math.round(taskProcessScore * 100) / 100, workMonitorScore: Math.round(workMonitorScore * 100) / 100, coinValueBrl: Number(cfg.coinValueBrl), breakdown: { punctuality, attendance, sport, quiz, taskProcess, candidateReferrals: candidateRef, clientReferrals: clientRef, workMonitor } }
  }))
  res.status(200).json(results.sort((a, b) => b.totalCoins - a.totalCoins || b.taskProcessScore - a.taskProcessScore).map((r, i) => ({ rank: i + 1, ...r })))
})

// ─── AUDIT LOGS ───────────────────────────────────────────────────────────────
route('GET', '/api/audit-logs', async (req, res) => {
  const admin = await requireAdmin(req, res); if (!admin) return
  const page = Math.max(1, Number(req.query.page || 1))
  const limit = Math.min(100, Number(req.query.limit || 50))
  const offset = (page - 1) * limit
  const { action, userId } = req.query
  const conditions: ReturnType<typeof eq>[] = []
  if (action) conditions.push(eq(auditLogs.action, action as string))
  if (userId) conditions.push(eq(auditLogs.userId, Number(userId)))
  let query = db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset)
  if (conditions.length) query = query.where(and(...conditions)) as typeof query
  const [{ count }] = await db.select({ count: sql<number>`COUNT(*)` }).from(auditLogs)
  const logs = await query
  res.status(200).json({ logs, total: Number(count), page, limit })
})

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return void res.status(200).end()

  const url = req.url?.split('?')[0] || ''

  for (const r of routes) {
    if (r.method !== req.method) continue
    const match = url.match(r.pattern)
    if (match) {
      addParams(req, r.paramNames, match)
      try {
        await r.handler(req, res)
      } catch (err) {
        console.error(err)
        if (!res.headersSent) res.status(500).json({ error: 'Erro interno do servidor' })
      }
      return
    }
  }

  res.status(404).json({ error: 'Rota não encontrada' })
}
