import type { VercelRequest, VercelResponse } from '@vercel/node'
import { db } from '../_db'
import { clientReferrals } from '../schema'
import { requireSupervisorOrAdmin } from '../_auth'
import { eq } from 'drizzle-orm'
import { audit } from '../_audit'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireSupervisorOrAdmin(req, res)
  if (!user) return
  const id = Number(req.query.id)

  if (req.method === 'PUT') {
    const { status } = req.body || {}
    const [updated] = await db.update(clientReferrals).set({ status, updatedAt: new Date() }).where(eq(clientReferrals.id, id)).returning()
    return res.status(200).json(updated)
  }

  if (req.method === 'DELETE') {
    await db.delete(clientReferrals).where(eq(clientReferrals.id, id))
    return res.status(200).json({ ok: true })
  }

  return res.status(405).end()
}
