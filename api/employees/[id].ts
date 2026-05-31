import type { VercelRequest, VercelResponse } from '@vercel/node'
import { db } from '../_db'
import { employees, supervisorAssignments } from '../schema'
import { requireAdmin } from '../_auth'
import { eq, and, isNull } from 'drizzle-orm'
import { audit } from '../_audit'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireAdmin(req, res)
  if (!user) return
  const id = Number(req.query.id)

  if (req.method === 'PUT') {
    const { name, email, role, sectorId, supervisorId } = req.body || {}
    const [before] = await db.select().from(employees).where(eq(employees.id, id))
    const [updated] = await db.update(employees).set({
      name, email: email?.toLowerCase(), role,
      sectorId: sectorId || null,
      updatedAt: new Date(),
    }).where(eq(employees.id, id)).returning()

    // Update supervisor assignment
    if (supervisorId !== undefined) {
      // Close current active assignment
      await db.update(supervisorAssignments)
        .set({ removedAt: new Date() })
        .where(and(eq(supervisorAssignments.employeeId, id), isNull(supervisorAssignments.removedAt)))
      // Create new one if provided
      if (supervisorId) {
        await db.insert(supervisorAssignments).values({ employeeId: id, supervisorId })
      }
    }

    await audit(user, 'update_employee', 'employee', id, before, updated)
    return res.status(200).json(updated)
  }

  if (req.method === 'DELETE') {
    const [before] = await db.select().from(employees).where(eq(employees.id, id))
    const [updated] = await db.update(employees)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(employees.id, id)).returning()
    await audit(user, 'deactivate_employee', 'employee', id, before, updated)
    return res.status(200).json({ ok: true })
  }

  return res.status(405).end()
}
