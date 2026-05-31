import type { VercelRequest, VercelResponse } from '@vercel/node'
import { db } from '../_db'
import { weeklyEntries, coinConfig, supervisorAssignments } from '../schema'
import { requireSupervisorOrAdmin, requireAuth } from '../_auth'
import { eq, and, gte, lte, isNull } from 'drizzle-orm'
import { calcWeeklyCoins } from '../_coins'
import { audit } from '../_audit'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const user = await requireAuth(req, res)
    if (!user) return
    const { employeeId, weekStart, weekEnd } = req.query
    let query = db.select().from(weeklyEntries)
    const conditions = []
    if (employeeId) conditions.push(eq(weeklyEntries.employeeId, Number(employeeId)))
    if (weekStart)  conditions.push(gte(weeklyEntries.weekStart, weekStart as string))
    if (weekEnd)    conditions.push(lte(weeklyEntries.weekEnd,   weekEnd   as string))
    if (conditions.length) query = query.where(and(...conditions)) as typeof query
    const result = await query
    return res.status(200).json(result)
  }

  if (req.method === 'POST') {
    const user = await requireSupervisorOrAdmin(req, res)
    if (!user) return

    const { weekStart, weekEnd, entries } = req.body || {}
    if (!weekStart || !weekEnd || !Array.isArray(entries)) {
      return res.status(400).json({ error: 'Dados inválidos' })
    }

    // Get coin config
    const [cfg] = await db.select().from(coinConfig).limit(1)
    if (!cfg) return res.status(500).json({ error: 'Configuração de moedas não encontrada' })

    // Get supervisor's team if not admin
    let allowedIds: Set<number> | null = null
    if (user.role === 'supervisor') {
      const assignments = await db
        .select({ employeeId: supervisorAssignments.employeeId })
        .from(supervisorAssignments)
        .where(and(eq(supervisorAssignments.supervisorId, user.userId), isNull(supervisorAssignments.removedAt)))
      allowedIds = new Set(assignments.map(a => a.employeeId))
    }

    const saved = []
    for (const entry of entries) {
      const { employeeId, punctual, attended, sport, workMonitorPct, taskProcessPct } = entry

      if (allowedIds && !allowedIds.has(employeeId)) continue

      const coins = calcWeeklyCoins(cfg, punctual, attended, sport, workMonitorPct ?? null, taskProcessPct ?? null)

      // Check existing for upsert
      const [existing] = await db.select().from(weeklyEntries)
        .where(and(eq(weeklyEntries.employeeId, employeeId), eq(weeklyEntries.weekStart, weekStart)))
        .limit(1)

      if (existing) {
        const [updated] = await db.update(weeklyEntries).set({
          punctual, attended, sport, workMonitorPct, taskProcessPct,
          coins: String(coins), supervisorId: user.userId, updatedAt: new Date(),
        }).where(eq(weeklyEntries.id, existing.id)).returning()
        saved.push(updated)
      } else {
        const [created] = await db.insert(weeklyEntries).values({
          employeeId, supervisorId: user.userId,
          weekStart, weekEnd, punctual, attended, sport,
          workMonitorPct, taskProcessPct, coins: String(coins),
        }).returning()
        saved.push(created)
      }
    }

    await audit(user, 'create_weekly_entries', 'weekly_entry', undefined, null, { weekStart, weekEnd, count: saved.length })
    return res.status(200).json(saved)
  }

  return res.status(405).end()
}
