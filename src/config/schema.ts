export const schema = {
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV',
  },
  port: {
    doc: 'Server listen port',
    format: Number,
    default: 6007,
    env: 'API_PORT',
  },
  logLevel: {
    doc: 'Logger verbosity level',
    format: String,
    default: 'debug',
    env: 'LOG_LEVEL',
  },
  dbURI: {
    doc: 'Database connection string',
    format: String,
    default: 'postgresql://dbuser:secretpassword@database.server.com:3211/mydb',
    env: 'DB_URI',
  },
  mollie: {
    apiKey: {
      doc: 'Mollie API key',
      format: String,
      default: 'your-api-key-here',
      env: 'MOLLIE_API_KEY',
    },
    paymentRedirectUrl: {
      doc: 'Mollie payment redirect URL',
      format: String,
      default: 'http://localhost:3001/',
      env: 'PAYMENT_REDIRECT_URL',
    },
    webhookUrl: {
      doc: 'Mollie payment webhook URL',
      format: String,
      default: 'http://localhost:6001/payments/webhook',
      env: 'PAYMENTS_WEBHOOK_URL',
    },
  },
  apisuite: {
    api: {
      doc: 'APISuite API url',
      format: String,
      default: 'http://localhost:6001',
      env: 'APISUITE_API_URL',
    },
    introspectEndpoint: {
      doc: 'APISuite introspect endpoint',
      format: String,
      default: '/auth/introspect',
      env: 'INTROSPECT_ENDPOINT',
    },
  },
  msgBroker: {
    url: {
      doc: 'APISuite Message Broker URL',
      format: String,
      default: 'amqp://mquser:mqpwd@localhost:5672',
      env: 'MSG_BROKER_URL',
    },
    eventsExchange: {
      doc: 'APISuite Message Broker Events Exchange name',
      format: String,
      default: 'apisuite_events',
      env: 'RABBITMQ_EVENTS_EXCHANGE',
    },
    queue: {
      doc: 'APISuite Message Broker Events Queue',
      format: String,
      default: 'activity-log',
      env: 'RABBITMQ_QUEUE',
    },
  },
}
