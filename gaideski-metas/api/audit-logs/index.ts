import type { VercelRequest, VercelResponse } from '@vercel/node'
import { db } from '../_db'
import { auditLogs } from '../schema'
import { requireAdmin } from '../_auth'
import { eq, and, desc } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  const admin = await requireAdmin(req, res)
  if (!admin) return

  const page   = Math.max(1, Number(req.query.page  || 1))
  const limit  = Math.min(100, Number(req.query.limit || 50))
  const offset = (page - 1) * limit
  const { action, userId } = req.query

  const conditions = []
  if (action) conditions.push(eq(auditLogs.action, action as string))
  if (userId) conditions.push(eq(auditLogs.userId, Number(userId)))

  let query = db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset)
  if (conditions.length) query = query.where(and(...conditions)) as typeof query

  const [{ count }] = await db.select({ count: sql<number>`COUNT(*)` }).from(auditLogs)
  const logs = await query

  return res.status(200).json({ logs, total: Number(count), page, limit })
}
