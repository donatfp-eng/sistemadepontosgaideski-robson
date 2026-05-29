import type { VercelRequest, VercelResponse } from '@vercel/node'
import { db } from '../_db'
import { clientReferrals, coinConfig } from '../schema'
import { requireAuth, requireSupervisorOrAdmin } from '../_auth'
import { audit } from '../_audit'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const user = await requireAuth(req, res)
    if (!user) return
    return res.status(200).json(await db.select().from(clientReferrals).orderBy(clientReferrals.referralDate))
  }

  if (req.method === 'POST') {
    const user = await requireSupervisorOrAdmin(req, res)
    if (!user) return
    const { employeeId, clientName, referralDate, status } = req.body || {}
    if (!employeeId || !clientName || !referralDate) return res.status(400).json({ error: 'Campos obrigatórios faltando' })
    const [cfg] = await db.select().from(coinConfig).limit(1)
    const coins = Number(cfg?.clientReferralCoins ?? 20)
    const [created] = await db.insert(clientReferrals).values({
      employeeId, supervisorId: user.userId, clientName, referralDate,
      status: status || 'pendente', coins: String(coins),
    }).returning()
    await audit(user, 'create_client_referral', 'client_referral', created.id, null, created)
    return res.status(201).json(created)
  }

  return res.status(405).end()
}
