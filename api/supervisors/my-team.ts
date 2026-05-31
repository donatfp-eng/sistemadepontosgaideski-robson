import type { VercelRequest, VercelResponse } from '@vercel/node'
import { db } from '../_db'
import { employees, supervisorAssignments, sectors } from '../schema'
import { requireSupervisorOrAdmin } from '../_auth'
import { eq, and, isNull } from 'drizzle-orm'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  const user = await requireSupervisorOrAdmin(req, res)
  if (!user) return

  const assignments = await db
    .select({ employeeId: supervisorAssignments.employeeId })
    .from(supervisorAssignments)
    .where(and(
      eq(supervisorAssignments.supervisorId, user.userId),
      isNull(supervisorAssignments.removedAt)
    ))

  if (!assignments.length) return res.status(200).json([])

  const ids = assignments.map(a => a.employeeId)
  const team = await db
    .select({
      id: employees.id,
      name: employees.name,
      email: employees.email,
      role: employees.role,
      sectorId: employees.sectorId,
      sectorName: sectors.name,
    })
    .from(employees)
    .leftJoin(sectors, eq(employees.sectorId, sectors.id))
    .where(eq(employees.active, true))
    .orderBy(employees.name)

  const filtered = team.filter(e => ids.includes(e.id))
  return res.status(200).json(filtered)
}
