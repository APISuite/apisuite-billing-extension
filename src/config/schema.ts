export const schema = {
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV',
  },
  port: {
    doc: 'Port the webs server will listen on',
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
  cors: {
    origin: {
      doc: 'Sets the Access-Control-Allow-Origin header value. This should usually be the portal URL.',
      format: Array,
      default: ['http://localhost:6001'],
      env: 'CORS_ALLOW_ORIGIN',
    },
    credentials: {
      doc: 'Sets the Access-Control-Allow-Credentials header value',
      format: Boolean,
      default: true,
      env: 'CORS_ALLOW_CREDENTIALS',
    },
    methods: {
      doc: 'Sets the Access-Control-Allow-Methods header value',
      format: String,
      default: 'GET,POST,PUT,DELETE,OPTIONS,PATCH',
      env: 'CORS_ALLOW_METHODS',
    },
  },
  dbURI: {
    live: {
      doc: 'Database connection string',
      format: String,
      default: 'postgresql://dbuser:secretpassword@database.server.com:3211/mydb',
      env: 'DB_URI',
    },
    test: {
      doc: 'Test database connection string',
      format: String,
      default: 'postgresql://dbuser:secretpassword@database.server.com:3211/testdb',
      env: 'TEST_DB_URI',
    },
  },
  knexDebug: {
    doc: 'Knex.js debug flag (https://knexjs.org/#Builder-debug)',
    format: Boolean,
    default: false,
    env: 'KNEX_DEBUG',
  },
  mollie: {
    apiKey: {
      doc: 'Mollie API key',
      format: String,
      default: 'your-api-key-here',
      env: 'MOLLIE_API_KEY',
    },
    paymentRedirectUrl: {
      doc: 'Mollie payment redirect URL (where the user is redirected after payment on Mollie checkout page',
      format: String,
      default: 'http://localhost:3001/',
      env: 'PAYMENT_REDIRECT_URL',
    },
    topUpWebhookUrl: {
      doc: `Webhook URL for top up purchase.
        Called by Mollie on payment updates.
        Used only on Top up payments.`,
      format: String,
      default: 'http://localhost:6007/webhooks/topup',
      env: 'WEBHOOKS_TOPUP',
    },
    subscriptionFirstPaymentWebhookUrl: {
      doc: `Webhook URL for subscription first payment (consent). 
        Called by Mollie on payment updates.
        Used only on subscription first payments.`,
      format: String,
      default: 'http://localhost:6007/webhooks/subscription_first',
      env: 'WEBHOOKS_SUBSCRIPTION_FIRST',
    },
    subscriptionPaymentWebhookUrl: {
      doc: `Webhook URL for subscription payment. 
        Called by Mollie on payment updates.
        Used only on subscription recurring payments.`,
      format: String,
      default: 'http://localhost:6007/webhooks/subscription',
      env: 'WEBHOOKS_SUBSCRIPTION',
    },
    subscriptionPaymentUpdateWebhookUrl: {
      doc: `Webhook URL for subscription payment. 
        Called by Mollie on payment updates.
        Used only on subscription recurring payments.`,
      format: String,
      default: 'http://localhost:6007/webhooks/update_payment_method',
      env: 'WEBHOOKS_SUBSCRIPTION_UPDATE_PAYMENT',
    },

  },
  apisuite: {
    api: {
      doc: 'APISuite core API url',
      format: String,
      default: 'http://localhost:6001',
      env: 'APISUITE_API_URL',
    },
    portal: {
      doc: 'APISuite portal URL',
      format: String,
      default: 'http://localhost:3000',
      env: 'APISUITE_PORTAL_URL',
    },
    introspectEndpoint: {
      doc: 'APISuite introspect endpoint',
      format: String,
      default: '/auth/introspect',
      env: 'INTROSPECT_ENDPOINT',
    },
    portalSettingsEndpoint: {
      doc: 'APISuite portal settings endpoint',
      format: String,
      default: '/settings/portal',
      env: 'PORTAL_SETTINGS_ENDPOINT',
    },
    paymentRedirectPath: {
      doc: `Default portal redirect path after payment.
        This is to be used when in the core there is no 'onBillingPayment' navigation event.`,
      format: String,
      default: '/billing/payments',
      env: 'PAYMENT_REDIRECT_PATH',
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
  vatRate: {
    doc: 'VAT Rate in %',
    format: Number,
    default: 0,
    env: 'VAT_RATE',
  },
}
