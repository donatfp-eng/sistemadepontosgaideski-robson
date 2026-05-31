import type { VercelRequest, VercelResponse } from '@vercel/node'
import { db } from '../_db'
import { employees, sectors, weeklyEntries, quizEntries, candidateReferrals, clientReferrals, supervisorAssignments, users, coinConfig } from '../schema'
import { eq, and, isNull, sql } from 'drizzle-orm'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const tvToken = process.env.TV_ACCESS_TOKEN
  if (tvToken && req.query.token !== tvToken) {
    return res.status(401).json({ error: 'Token inválido' })
  }

  const empList = await db
    .select({ id: employees.id, name: employees.name, sectorId: employees.sectorId, sectorName: sectors.name })
    .from(employees)
    .leftJoin(sectors, eq(employees.sectorId, sectors.id))
    .where(eq(employees.active, true))
    .orderBy(employees.name)

  const [cfg] = await db.select().from(coinConfig).limit(1)

  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth() + 1
  const start = `${year}-${String(month).padStart(2,'0')}-01`
  const end   = `${year}-${String(month).padStart(2,'0')}-${new Date(year, month, 0).getDate()}`

  const results = await Promise.all(empList.map(async (emp) => {
    const [weRow] = await db.select({ sum: sql<string>`COALESCE(SUM(coins::numeric),0)` })
      .from(weeklyEntries)
      .where(and(eq(weeklyEntries.employeeId, emp.id), sql`week_start >= ${start}`, sql`week_end <= ${end}`))
    const [qzRow] = await db.select({ sum: sql<string>`COALESCE(SUM(coins::numeric),0)` })
      .from(quizEntries)
      .where(and(eq(quizEntries.employeeId, emp.id), eq(quizEntries.month, month), eq(quizEntries.year, year)))
    const coins = Math.round((Number(weRow.sum) + Number(qzRow.sum)) * 100) / 100
    return { employeeId: emp.id, employeeName: emp.name, sectorId: emp.sectorId, sectorName: emp.sectorName, monthCoins: coins }
  }))

  const sorted = results
    .sort((a, b) => b.monthCoins - a.monthCoins)
    .map((r, i) => ({ rank: i + 1, ...r }))

  return res.status(200).json({ month, year, employees: sorted, coinValueBrl: Number(cfg?.coinValueBrl ?? 1.25) })
}
