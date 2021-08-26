import amqplib from 'amqplib'
import log from '../log'
import { routingKeys } from './types'
import {
  handleUserDelete,
  handleUserCreate,
} from './handlers'

export const onMessage = (data: amqplib.ConsumeMessage | null): void => {
  if (!data || !data.fields || !data.fields.routingKey) {
    log.error('invalid msg', '[msg broker onMessage]')
    return
  }

  try {
    const msg = JSON.parse(data.content.toString())

    switch (data.fields.routingKey) {
      case routingKeys.USER_CREATED: {
        if (!msg || !msg.user_id) {
          log.warn('could not create user', msg)
          break
        }
        handleUserCreate(msg.user_id).catch()
        break
      }
      case routingKeys.USER_DELETED: {
        if (!msg || !msg.user_id) {
          log.warn('could not delete user', msg)
          break
        }
        handleUserDelete(msg.user_id).catch()
        break
      }
    }
  } catch(err) {
    log.error(err, '[msg broker onMessage]')
  }
}
