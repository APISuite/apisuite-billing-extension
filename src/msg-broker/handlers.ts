import log from '../log'
import { db } from '../db'
import { user as usersRepo } from '../models'
import { cancelSubscription } from '../payment-processing'

export const handleUserDelete = async (userId: number): Promise<void> => {
  const trx = await db.transaction()
  try {
    const user = await usersRepo.findById(trx, userId)
    if (!user || !user.ppSubscriptionId || !user.ppCustomerId) return

    await cancelSubscription(user.ppSubscriptionId, user.ppCustomerId)
    await usersRepo.deleteUser(trx, userId)
    await trx.commit()
  } catch(err) {
    log.error(err, '[handleUserDelete]')
    await trx.rollback()
  }
}
