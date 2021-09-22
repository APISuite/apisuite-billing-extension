# API Suite - Billing Extension

[![circleci](https://circleci.com/gh/APISuite/apisuite-billing-extension.svg?style=shield)](https://app.circleci.com/pipelines/github/APISuite/apisuite-billing-extension)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=APISuite_apisuite-billing-extension&metric=alert_status)](https://sonarcloud.io/dashboard?id=APISuite_apisuite-billing-extension)


This repository contains an extension to APISuite Core that provides a backend for the billing feature.

## Installing

Docker images are available in our [DockerHub](https://hub.docker.com/r/cloudokihub/apisuite-billing-extension).

Every new image is tagged with:
- latest (meaning this tag always points to the most recent released version) 
- semantic version from `package.json`

Depending on your goals, you could use a fixed version like `1.0.0` or
`latest` to simply get the most recent version every time you pull the image.

## Configuration

Configuration is done through environment variables.
All variables are declared and documented in `src/config/schema.js`.

### Sample Configuration

Usually, at a minimum, these are the variables that need to be configured.

This ensures connectivity to the core's API and RabbitMQ instance, as well as proper CORS configuration to accept requests from the desired origin.

```
APISUITE_API_URL=http://apisuite-core-api:6001
APISUITE_PORTAL_URL=https://my.dev.portal.com
CORS_ALLOW_ORIGIN=https://my.dev.portal.com
DB_URI=postgres://db_user:p4ssw0rd@dbserver:5432/marketplace_db 

MOLLIE_API_KEY=secretapikey
WEBHOOKS_TOPUP=https://billing.api.acme.io/webhooks/topup
WEBHOOKS_FIRST=https://billing.api.acme.io/webhooks/first
WEBHOOKS_SUBSCRIPTION=https://billing.api.acme.io/webhooks/subscription
WEBHOOKS_SUBSCRIPTION_FIRST=https://billing.api.acme.io/webhooks/subscription_first
PAYMENT_REDIRECT_URL=https://my.dev.portal.com/billing/payments

MSG_BROKER_URL=amqp://apisuite:RW8zBFj2b3KAAwWr2xgu@apisuite-msg-broker:5672
RABBITMQ_EVENTS_EXCHANGE=apisuite_events_dev
RABBITMQ_QUEUE=billing-queue
```

## Monitoring

This API server provides two monitoring endpoints:
- `GET /health` for general health checking (of the server and major dependencies such as database connection)
- `GET /metrics` provides Prometheus ready metrics concerning requests time and status codes

## Development

- Commits should follow [conventional commits](https://www.conventionalcommits.org) spec
- `package.json` contains the necessary scripts and dependencies to run the components of this project
- Typescript is configured to produce source maps, which makes debugger usage possible
- API first development is preferred, so that we can keep the API solid and consistent
- Database migrations should be planed/created in a gradual way to avoid breaking changes
  (example: renaming a column can be done in 2 steps: create new column; change code to start using new column; delete old column when code no longer references it)

### Integration tests

Beside good old unit tests, this projects also has integration tests on the data access layer.

To run integration tests, a database is required. Use `TEST_DB_URI` to configure the connection URl, similarly to the application one.

Database integration tests live in `src/models` and have `src/models/index.test.ts` as a starting point. 
This is necessary because of the necessity to run migrations and seed data before the test suite is executed.

Integration tests can also be executed with docker-compose: `docker-compose -f docker-compose.test.yaml up --exit-code-from billing`

## Database migrations

Knex.js CLI is used for migration management: http://knexjs.org/#Migrations

### How to use

Generate a migration: `npx knex migrate:make --migrations-directory ./migrations create-table`
