import type { VercelRequest, VercelResponse } from '@vercel/node'
import { db } from '../_db'
import { quizEntries, coinConfig } from '../schema'
import { requireSupervisorOrAdmin, requireAuth } from '../_auth'
import { eq, and } from 'drizzle-orm'
import { calcQuizCoins } from '../_coins'
import { audit } from '../_audit'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const user = await requireAuth(req, res)
    if (!user) return
    const { employeeId, month, year } = req.query
    const conditions = []
    if (employeeId) conditions.push(eq(quizEntries.employeeId, Number(employeeId)))
    if (month)      conditions.push(eq(quizEntries.month, Number(month)))
    if (year)       conditions.push(eq(quizEntries.year,  Number(year)))
    let query = db.select().from(quizEntries)
    if (conditions.length) query = query.where(and(...conditions)) as typeof query
    return res.status(200).json(await query)
  }

  if (req.method === 'POST') {
    const user = await requireSupervisorOrAdmin(req, res)
    if (!user) return
    const { employeeId, month, year, score, notes } = req.body || {}
    if (!employeeId || !month || !year || score === undefined) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' })
    }
    const [cfg] = await db.select().from(coinConfig).limit(1)
    const { passed, coins } = calcQuizCoins(cfg, Number(score))
    const [existing] = await db.select().from(quizEntries)
      .where(and(eq(quizEntries.employeeId, employeeId), eq(quizEntries.month, month), eq(quizEntries.year, year)))
    if (existing) {
      const [updated] = await db.update(quizEntries).set({
        score: String(score), passed, coins: String(coins), notes, supervisorId: user.userId, updatedAt: new Date(),
      }).where(eq(quizEntries.id, existing.id)).returning()
      return res.status(200).json(updated)
    }
    const [created] = await db.insert(quizEntries).values({
      employeeId, supervisorId: user.userId, month, year,
      score: String(score), passed, coins: String(coins), notes,
    }).returning()
    await audit(user, 'create_quiz_entry', 'quiz_entry', created.id, null, created)
    return res.status(201).json(created)
  }

  return res.status(405).end()
}
