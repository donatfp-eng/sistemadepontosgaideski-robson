import type { VercelRequest, VercelResponse } from '@vercel/node'
import { db } from '../_db'
import { employees, sectors, supervisorAssignments, users } from '../schema'
import { requireAuth, requireAdmin } from '../_auth'
import { eq, and, isNull } from 'drizzle-orm'
import { audit } from '../_audit'
import * as bcrypt from 'bcryptjs'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const user = await requireAuth(req, res)
    if (!user) return

    const list = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        role: employees.role,
        sectorId: employees.sectorId,
        sectorName: sectors.name,
        active: employees.active,
        createdAt: employees.createdAt,
      })
      .from(employees)
      .leftJoin(sectors, eq(employees.sectorId, sectors.id))
      .where(eq(employees.active, true))
      .orderBy(employees.name)

    // Attach current supervisor to each employee
    const withSupervisor = await Promise.all(
      list.map(async (emp) => {
        const [assignment] = await db
          .select({ supervisorId: supervisorAssignments.supervisorId, supervisorName: users.name })
          .from(supervisorAssignments)
          .leftJoin(users, eq(supervisorAssignments.supervisorId, users.id))
          .where(
            and(
              eq(supervisorAssignments.employeeId, emp.id),
              isNull(supervisorAssignments.removedAt)
            )
          )
          .limit(1)
        return { ...emp, supervisorId: assignment?.supervisorId ?? null, supervisorName: assignment?.supervisorName ?? null }
      })
    )

    return res.status(200).json(withSupervisor)
  }

  if (req.method === 'POST') {
    const user = await requireAdmin(req, res)
    if (!user) return
    const { name, email, role, sectorId, supervisorId } = req.body || {}
    if (!name || !email || !role) return res.status(400).json({ error: 'Campos obrigatórios faltando' })

    const [emp] = await db.insert(employees).values({ name, email: email.toLowerCase(), role, sectorId: sectorId || null }).returning()

    if (supervisorId) {
      await db.insert(supervisorAssignments).values({ employeeId: emp.id, supervisorId })
    }

    await audit(user, 'create_employee', 'employee', emp.id, null, emp)
    return res.status(201).json(emp)
  }

  return res.status(405).end()
}
