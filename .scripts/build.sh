#!/usr/bin/env bash

cmp -s .orig_version .new_version
CMP=$?

if [ $CMP -eq 0 ]; then
  exit 0
fi

echo ${DOCKER_PASS} | docker login --username ${DOCKER_USER} --password-stdin

VERSION=$(cat package.json | grep version | head -1 | awk -F ": " '{ print $2 }' | sed 's/[",]//g')

docker build \
  -t cloudokihub/apisuite-billing-extension:$VERSION \
  -t cloudokihub/apisuite-billing-extension:latest .

docker push cloudokihub/apisuite-billing-extension:$VERSION
docker push cloudokihub/apisuite-billing-extension:latest
