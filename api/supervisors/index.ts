import type { VercelRequest, VercelResponse } from '@vercel/node'
import { db } from '../_db'
import { users, supervisorAssignments, employees } from '../schema'
import { requireAuth, requireAdmin } from '../_auth'
import { eq, and, isNull, or } from 'drizzle-orm'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const user = await requireAuth(req, res)
    if (!user) return
    const list = await db.select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(and(eq(users.active, true), or(eq(users.role, 'supervisor'), eq(users.role, 'admin'))))
      .orderBy(users.name)
    return res.status(200).json(list)
  }

  return res.status(405).end()
}
