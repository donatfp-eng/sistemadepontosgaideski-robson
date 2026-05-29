import type { VercelRequest, VercelResponse } from '@vercel/node'
import { db } from '../_db'
import { employees, sectors, users, weeklyEntries, quizEntries, candidateReferrals, clientReferrals, supervisorAssignments, coinConfig } from '../schema'
import { requireAuth } from '../_auth'
import { eq, and, gte, lte, isNull, sql } from 'drizzle-orm'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  const user = await requireAuth(req, res)
  if (!user) return

  const { sectorId, supervisorId, month, year, weekStart, weekEnd } = req.query

  // Get all active employees with sector + supervisor info
  const empList = await db
    .select({
      id: employees.id,
      name: employees.name,
      sectorId: employees.sectorId,
      sectorName: sectors.name,
    })
    .from(employees)
    .leftJoin(sectors, eq(employees.sectorId, sectors.id))
    .where(eq(employees.active, true))
    .orderBy(employees.name)

  // Get supervisor for each employee
  const assignments = await db
    .select({
      employeeId: supervisorAssignments.employeeId,
      supervisorId: supervisorAssignments.supervisorId,
      supervisorName: users.name,
    })
    .from(supervisorAssignments)
    .leftJoin(users, eq(supervisorAssignments.supervisorId, users.id))
    .where(isNull(supervisorAssignments.removedAt))

  const assignMap = new Map(assignments.map(a => [a.employeeId, a]))

  // Filter by role
  let filteredEmps = empList
  if (user.role === 'supervisor') {
    filteredEmps = empList.filter(e => assignMap.get(e.id)?.supervisorId === user.userId)
  } else {
    if (supervisorId) {
      filteredEmps = empList.filter(e => assignMap.get(e.id)?.supervisorId === Number(supervisorId))
    }
  }
  if (sectorId) filteredEmps = filteredEmps.filter(e => e.sectorId === Number(sectorId))

  const [cfg] = await db.select().from(coinConfig).limit(1)

  const results = await Promise.all(
    filteredEmps.map(async (emp) => {
      const assignment = assignMap.get(emp.id)

      // Weekly entries filter
      const weConditions: ReturnType<typeof eq>[] = [eq(weeklyEntries.employeeId, emp.id)]
      if (weekStart) weConditions.push(gte(weeklyEntries.weekStart, weekStart as string))
      if (weekEnd)   weConditions.push(lte(weeklyEntries.weekEnd,   weekEnd   as string))
      if (month && year) {
        const y = Number(year), m = Number(month)
        const start = `${y}-${String(m).padStart(2,'0')}-01`
        const end   = `${y}-${String(m).padStart(2,'0')}-${new Date(y, m, 0).getDate()}`
        weConditions.push(gte(weeklyEntries.weekStart, start))
        weConditions.push(lte(weeklyEntries.weekEnd,   end))
      }

      const we = await db.select().from(weeklyEntries).where(and(...weConditions))

      // Quiz
      const qzConditions: ReturnType<typeof eq>[] = [eq(quizEntries.employeeId, emp.id)]
      if (month) qzConditions.push(eq(quizEntries.month, Number(month)))
      if (year)  qzConditions.push(eq(quizEntries.year,  Number(year)))
      const qz = await db.select().from(quizEntries).where(and(...qzConditions))

      // Referrals
      const crConditions = [eq(candidateReferrals.employeeId, emp.id)]
      const clConditions = [eq(clientReferrals.employeeId, emp.id)]
      const cr = await db.select().from(candidateReferrals).where(and(...crConditions))
      const cl = await db.select().from(clientReferrals).where(and(...clConditions))

      // Breakdown
      const punctuality    = we.reduce((s, e) => s + (e.punctual ? Number(cfg.punctualityCoinsPerWeek) : 0), 0)
      const attendance     = we.reduce((s, e) => s + (e.attended ? Number(cfg.attendanceCoinsPerWeek)  : 0), 0)
      const sport          = we.reduce((s, e) => s + (e.sport    ? Number(cfg.sportCoinsPerEntry)      : 0), 0)
      const workMonitor    = we.reduce((s, e) => s + (e.workMonitorPct != null ? (Number(e.workMonitorPct) / Number(cfg.workMonitorMaxScore)) * Number(cfg.workMonitorMaxCoins) : 0), 0)
      const taskProcess    = we.reduce((s, e) => s + (e.taskProcessPct != null ? (Number(e.taskProcessPct) / Number(cfg.taskProcessMaxScore)) * Number(cfg.taskProcessMaxCoins) : 0), 0)
      const quiz           = qz.reduce((s, e) => s + Number(e.coins), 0)
      const candidateRef   = cr.reduce((s, e) => s + Number(e.coins), 0)
      const clientRef      = cl.reduce((s, e) => s + Number(e.coins), 0)

      const totalCoins = Math.round((punctuality + attendance + sport + workMonitor + taskProcess + quiz + candidateRef + clientRef) * 100) / 100

      // Accumulated (all time)
      const [weAll] = await db.select({ sum: sql<string>`COALESCE(SUM(coins::numeric), 0)` }).from(weeklyEntries).where(eq(weeklyEntries.employeeId, emp.id))
      const [qzAll] = await db.select({ sum: sql<string>`COALESCE(SUM(coins::numeric), 0)` }).from(quizEntries).where(eq(quizEntries.employeeId, emp.id))
      const [crAll] = await db.select({ sum: sql<string>`COALESCE(SUM(coins::numeric), 0)` }).from(candidateReferrals).where(eq(candidateReferrals.employeeId, emp.id))
      const [clAll] = await db.select({ sum: sql<string>`COALESCE(SUM(coins::numeric), 0)` }).from(clientReferrals).where(eq(clientReferrals.employeeId, emp.id))
      const accumulatedCoins = Number(weAll.sum) + Number(qzAll.sum) + Number(crAll.sum) + Number(clAll.sum)

      const workMonitorScore = we.length ? we.reduce((s, e) => s + (e.workMonitorPct ? Number(e.workMonitorPct) : 0), 0) / we.filter(e => e.workMonitorPct != null).length || 0 : 0
      const taskProcessScore = we.length ? we.reduce((s, e) => s + (e.taskProcessPct ? Number(e.taskProcessPct) : 0), 0) / we.filter(e => e.taskProcessPct != null).length || 0 : 0

      return {
        employeeId:      emp.id,
        employeeName:    emp.name,
        sectorId:        emp.sectorId,
        sectorName:      emp.sectorName,
        supervisorId:    assignment?.supervisorId ?? null,
        supervisorName:  assignment?.supervisorName ?? null,
        totalCoins,
        accumulatedCoins: Math.round(accumulatedCoins * 100) / 100,
        taskProcessScore: Math.round(taskProcessScore * 100) / 100,
        workMonitorScore: Math.round(workMonitorScore * 100) / 100,
        coinValueBrl:    Number(cfg.coinValueBrl),
        breakdown: { punctuality, attendance, sport, quiz, taskProcess, candidateReferrals: candidateRef, clientReferrals: clientRef, workMonitor },
      }
    })
  )

  // Sort and rank
  const sorted = results
    .sort((a, b) => b.totalCoins - a.totalCoins || b.taskProcessScore - a.taskProcessScore)
    .map((r, i) => ({ rank: i + 1, ...r }))

  return res.status(200).json(sorted)
}
