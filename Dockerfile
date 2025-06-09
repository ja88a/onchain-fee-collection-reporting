
#########################################
##
## Base image
##
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN apt-get update && apt-get install -y openssl curl dumb-init 
RUN apt-get upgrade -y && apt-get autoremove -y 
RUN apt-get clean

# Corepack w/ pnpm
RUN echo "npm version: $(npm --version)"
RUN echo "node version: $(node --version)"

RUN npm install -g corepack@latest
RUN echo "corepack version: $(corepack --version)"
RUN corepack enable
#RUN corepack prepare pnpm@10.11.1 --activate
RUN echo "pnpm version: $(pnpm --version)"

RUN pnpm config set store-dir /pnpm/store


#########################################
##
## Builder base image
##
FROM base AS base-build

# Install turbo
RUN npm install turbo --global
RUN turbo telemetry disable
RUN echo "turbo version: $(turbo --version)"


#########################################
##
## Prune projects
##
FROM base-build AS pruner

WORKDIR /usr/src/app
ARG PROJECT_PACKAGE

COPY . .
RUN turbo prune --scope=${PROJECT_PACKAGE} --docker


#########################################
##
## Production package dependencies
##
FROM base-build AS deps-def

WORKDIR /usr/src/app

# Copy lockfile and package.json's of isolated subworkspace
COPY --from=pruner /usr/src/app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /usr/src/app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=pruner /usr/src/app/out/json/ .

# Install all dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile


#########################################
##
## Build the project
##
FROM deps-def AS build-assets

WORKDIR /usr/src/app
ARG PROJECT_PACKAGE

# Set the NODE_ENV environment variable
ENV NODE_ENV=production

# Copy source code of isolated subworkspace
COPY --from=pruner /usr/src/app/out/full/ .

# WORKAROUND SPECIFIC to the @lifinance/lifi-contract-typings yarn workspace
WORKDIR /usr/src/app/lib/lifi-contract-types 
RUN npm pkg delete scripts.build
WORKDIR /usr/src/app

# Build
RUN turbo build --filter=${PROJECT_PACKAGE}

# Clean up for prod
RUN rm -rf ./**/*/src ./**/*/test ./**/*/.turbo .turbo turbo.json ./**/*/eslint* ./**/*/jest* ./**/*/tsconfig*
RUN rm -rf ./**/*/.env*
RUN rm -rf ./lib/lifi-contract-types/**/*

#RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm prune --prod --no-optional
RUN find . -name "node_modules" -type d -prune -exec rm -rf {} \;
RUN pnpm install --prod --frozen-lockfile


#########################################
##
## Production image
##
FROM base AS lfcr-server-prod

WORKDIR /app

ARG PROJECT_PACKAGE
ARG PROJECT_PATH
ARG API_PORT=3000
ARG NODE_ENV=production

RUN adduser --group nodejs && adduser --ingroup nodejs --disabled-login --disabled-password --gecos "First Last,RoomNumber,WorkPhone,HomePhone" nodejs
USER nodejs

COPY --from=build-assets --chown=nodejs:nodejs /usr/src/app .

WORKDIR /app/${PROJECT_PATH}

ENV API_PORT=${API_PORT}
ENV NODE_ENV=${NODE_ENV}

LABEL Name=${PROJECT_PACKAGE}
EXPOSE ${API_PORT}

CMD [ "dumb-init", "node", "dist/serve" ]
