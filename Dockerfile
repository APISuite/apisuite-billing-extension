FROM node:14-alpine AS build_phase
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --no-audit
COPY . .
RUN npm run build

FROM node:14-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --only=production --no-audit && npm install ts-node
COPY --from=build_phase /usr/src/app/dist ./dist
COPY --from=build_phase /usr/src/app/migrations ./migrations
COPY src/email/templates/* /usr/src/app/templates/

ENTRYPOINT ["npm", "run"]