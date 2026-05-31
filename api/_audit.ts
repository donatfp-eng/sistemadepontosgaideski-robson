import { db } from './_db'
import { auditLogs } from './schema'
import type { JWTPayload } from './_auth'

export async function audit(
  user: JWTPayload | null,
  action: string,
  entity?: string,
  entityId?: number,
  before?: unknown,
  after?: unknown
) {
  try {
    await db.insert(auditLogs).values({
      userId:   user?.userId,
      userName: user?.userName,
      action,
      entity,
      entityId,
      before:   before  ? (before  as object) : undefined,
      after:    after   ? (after   as object) : undefined,
    })
  } catch (e) {
    console.error('Audit log error:', e)
  }
}
