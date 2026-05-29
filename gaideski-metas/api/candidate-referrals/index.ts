import type { VercelRequest, VercelResponse } from '@vercel/node'
import { db } from '../_db'
import { candidateReferrals, coinConfig } from '../schema'
import { requireAuth, requireSupervisorOrAdmin } from '../_auth'
import { eq } from 'drizzle-orm'
import { audit } from '../_audit'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const user = await requireAuth(req, res)
    if (!user) return
    const list = await db.select().from(candidateReferrals).orderBy(candidateReferrals.referralDate)
    return res.status(200).json(list)
  }

  if (req.method === 'POST') {
    const user = await requireSupervisorOrAdmin(req, res)
    if (!user) return
    const { employeeId, candidateName, referralDate, position, status } = req.body || {}
    if (!employeeId || !candidateName || !referralDate || !position) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' })
    }
    const [cfg] = await db.select().from(coinConfig).limit(1)
    const coins = Number(cfg?.candidateReferralCoins ?? 5)
    const [created] = await db.insert(candidateReferrals).values({
      employeeId, supervisorId: user.userId, candidateName, referralDate,
      position, status: status || 'pendente', coins: String(coins),
    }).returning()
    await audit(user, 'create_candidate_referral', 'candidate_referral', created.id, null, created)
    return res.status(201).json(created)
  }

  return res.status(405).end()
}
