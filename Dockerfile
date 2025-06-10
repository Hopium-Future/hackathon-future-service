###################
# BUILD FOR LOCAL DEVELOPMENT
###################

FROM node:20-alpine AS development

# RUN apk add --no-cache python3 make g++

WORKDIR /usr/src/app

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci --force; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i; \
  else yarn install; \
  fi

COPY --chown=node:node . .

USER node

###################
# PRODUCTION
###################

FROM node:20-alpine AS production

WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./
COPY --chown=node:node --from=development /usr/src/app/yarn.lock ./yarn.lock
COPY --chown=node:node --from=development /usr/src/app/node_modules ./node_modules

COPY --chown=node:node . .
RUN ls -la
RUN npm install -g pm2
RUN yarn install # Fix issue with AdonisJS not being able to find the @adonisjs/auth package > https://err.sh/adonisjs/errors/E_CANNOT_EXTEND_BINDING

USER node

CMD ["pm2-runtime", "start", "ecosystem.config.js"]