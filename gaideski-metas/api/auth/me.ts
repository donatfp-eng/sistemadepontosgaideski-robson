import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../_auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  const user = await requireAuth(req, res)
  if (!user) return
  return res.status(200).json({
    id: user.userId,
    name: user.userName,
    email: user.userEmail,
    role: user.role,
  })
}
