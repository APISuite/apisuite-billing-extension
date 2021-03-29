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

## Development

- Commits should follow [conventional commits](https://www.conventionalcommits.org) spec
- `package.json` contains the necessary scripts and dependencies to run the components of this project
- Typescript is configured to produce source maps, which makes debugger usage possible

### Environment variables

All variables used in code are documented in `src/config/schema.js`.