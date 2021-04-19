# API Suite - Billing Extension

This repository contains an extension to APISuite Core that provides a backend for the billing feature.

## Installing

Docker images are available in our [DockerHub](https://hub.docker.com/r/cloudokihub/apisuite-billing-extension).

Every new image is tagged with:
- commit hash
- latest (dev-latest and stg-latest from develop and staging respectively)
- semantic version from `package.json` (only in main branch)

Depending on your goals, you could use a fixed version like `1.0.0` or
`latest` to simply get the most recent version every time you pull the image.

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

### Environment variables

All variables used in code are documented in `src/config/schema.js`.

For tests, the following environment variables should be set:
```
NODE_ENV=test
LOG_LEVEL=silent
```

## Database migrations

Knex.js CLI is used for migration management: http://knexjs.org/#Migrations

### How to use

Generate a migration: `npx knex migrate:make --migrations-directory ./migrations create-table`