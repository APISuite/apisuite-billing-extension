import amqp from 'amqp-connection-manager'
import amqplib from 'amqplib'
import config from '../config'
import log from '../log'
import { onMessage } from './consumer'

(() => {
  const connection = amqp.connect([config.get('msgBroker.url')])
  connection.on('connect', () => log.info('Connected to Message Broker'))
  connection.on('disconnect', (err) => log.error(err, '[msg broker]'))

  connection.createChannel({
    setup: (channel: amqplib.ConfirmChannel) => (
      Promise.all([
        channel.assertQueue(config.get('msgBroker.queue'), { exclusive: true, autoDelete: true }),
        channel.assertExchange(config.get('msgBroker.eventsExchange'), 'topic'),
        channel.bindQueue(config.get('msgBroker.queue'), config.get('msgBroker.eventsExchange'), '#'),
        channel.consume(config.get('msgBroker.queue'), onMessage),
      ])
    ),
  })
})()