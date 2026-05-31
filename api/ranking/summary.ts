import type { VercelRequest, VercelResponse } from '@vercel/node'
import { db } from '../_db'
import { employees, sectors, weeklyEntries, quizEntries, candidateReferrals, clientReferrals, coinConfig } from '../schema'
import { requireAuth } from '../_auth'
import { eq, sql } from 'drizzle-orm'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  const user = await requireAuth(req, res)
  if (!user) return

  const [empCount]  = await db.select({ count: sql<number>`COUNT(*)` }).from(employees).where(eq(employees.active, true))
  const [secCount]  = await db.select({ count: sql<number>`COUNT(*)` }).from(sectors)
  const [weSumRow]  = await db.select({ sum: sql<string>`COALESCE(SUM(coins::numeric),0)` }).from(weeklyEntries)
  const [qzSumRow]  = await db.select({ sum: sql<string>`COALESCE(SUM(coins::numeric),0)` }).from(quizEntries)
  const [crSumRow]  = await db.select({ sum: sql<string>`COALESCE(SUM(coins::numeric),0)` }).from(candidateReferrals)
  const [clSumRow]  = await db.select({ sum: sql<string>`COALESCE(SUM(coins::numeric),0)` }).from(clientReferrals)
  const [cfg]       = await db.select().from(coinConfig).limit(1)

  const totalCoins  = Number(weSumRow.sum) + Number(qzSumRow.sum) + Number(crSumRow.sum) + Number(clSumRow.sum)
  const totalValue  = Math.round(totalCoins * Number(cfg?.coinValueBrl ?? 1.25) * 100) / 100

  const now   = new Date()
  const wkDay = now.getDay() || 7
  const mon   = new Date(now); mon.setDate(now.getDate() - wkDay + 1)
  const sun   = new Date(mon); sun.setDate(mon.getDate() + 6)
  const fmt   = (d: Date) => d.toISOString().split('T')[0]

  return res.status(200).json({
    totalEmployees:        Number(empCount.count),
    totalSectors:          Number(secCount.count),
    totalCoinsDistributed: Math.round(totalCoins * 100) / 100,
    totalValueBrl:         totalValue,
    currentWeek:           { start: fmt(mon), end: fmt(sun) },
  })
}
