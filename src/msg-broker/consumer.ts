import amqplib from 'amqplib'
import log from '../log'
import { routingKeys } from './types'
import { handleOrganizationCreate, handleOrganizationDelete } from './handlers'

export const onMessage = (data: amqplib.ConsumeMessage | null): void => {
  if (!data || !data.fields || !data.fields.routingKey) {
    log.error('invalid msg', '[msg broker onMessage]')
    return
  }

  try {
    const msg = JSON.parse(data.content.toString())

    switch (data.fields.routingKey) {
      case routingKeys.ORG_CREATED: {
        if (!msg || !msg.organization_id) {
          log.warn('could not create organization', msg)
          break
        }
        handleOrganizationCreate(msg.organization_id).catch()
        break
      }
      case routingKeys.ORG_DELETED: {
        if (!msg || !msg.organization_id) {
          log.warn('could not delete organization', msg)
          break
        }
        handleOrganizationDelete(msg.organization_id).catch()
        break
      }
    }
  } catch(err) {
    log.error(err, '[msg broker onMessage]')
  }
}
