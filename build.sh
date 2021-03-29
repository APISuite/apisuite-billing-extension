#!/usr/bin/env bash

echo ${DOCKER_PASS} | docker login --username ${DOCKER_USER} --password-stdin

HASH=$(git rev-parse --short HEAD)

docker build \
  -t cloudokihub/apisuite-billing-extension:$HASH \
  -t cloudokihub/apisuite-billing-extension:latest .

docker push cloudokihub/apisuite-billing-extension:$HASH
docker push cloudokihub/apisuite-billing-extension:latest


if [ "$CIRCLE_BRANCH" = "main" ]; then
  VERSION=$(cat package.json | grep version | head -1 | awk -F ": " '{ print $2 }' | sed 's/[",]//g')

  docker build -t cloudokihub/apisuite-billing-extension:$VERSION .
  docker push cloudokihub/apisuite-billing-extension:$VERSION
fi
