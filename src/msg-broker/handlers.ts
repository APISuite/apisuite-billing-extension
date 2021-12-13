import log from '../log'
import { db } from '../db'
import {
  organization as orgsRepo,
} from '../models'
import { cancelSubscription } from '../payment-processing'

export const handleOrganizationDelete = async (orgId: number): Promise<void> => {
  const trx = await db.transaction()
  try {
    const org = await orgsRepo.findById(trx, orgId)
    if (!org) return
    if (org.ppSubscriptionId && org.ppCustomerId) {
      await cancelSubscription(org.ppSubscriptionId, org.ppCustomerId)
    }
    await orgsRepo.del(trx, orgId)
    await trx.commit()
  } catch(err) {
    log.error(err, '[handleOrganizationDelete]')
    await trx.rollback()
  }
}
