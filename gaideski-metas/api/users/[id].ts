import type { VercelRequest, VercelResponse } from '@vercel/node'
import { db } from '../_db'
import { users } from '../schema'
import { requireAdmin } from '../_auth'
import { eq } from 'drizzle-orm'
import { audit } from '../_audit'
import * as bcrypt from 'bcryptjs'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireAdmin(req, res)
  if (!admin) return
  const id = Number(req.query.id)

  if (req.method === 'PUT') {
    const { name, email, password, role, active } = req.body || {}
    const [before] = await db.select().from(users).where(eq(users.id, id))
    const updates: Partial<typeof users.$inferInsert> = {
      name, email: email?.toLowerCase(), role,
      active: active !== undefined ? active : before.active,
      updatedAt: new Date(),
    }
    if (password) updates.passwordHash = await bcrypt.hash(password, 10)
    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning()
    const { passwordHash: _, ...safe } = updated
    await audit(admin, 'update_user', 'user', id, null, safe)
    return res.status(200).json(safe)
  }

  if (req.method === 'DELETE') {
    const [updated] = await db.update(users)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(users.id, id)).returning()
    await audit(admin, 'deactivate_user', 'user', id, null, null)
    return res.status(200).json({ ok: true })
  }

  return res.status(405).end()
}
