# LI.FI Fees Collection Reporting

## Overview

### Purpose

Scrap and report the collection of onchain fees supported by the LI.FI protocol and its FeeCollector EVM contracts.

This is a mono-repository for developing and running 2 main backend services, on top of the [LI.FI protocol](https://li.fi):

1. A scraper of onchain event logs: `FeesCollected` emitted by LI.FI `FeeCollector` contracts, deployed on many blockchains. A scraping session can be triggered manually from the command line or via a dedicated REST API endpoint.

2. A backend REST API to report the fees collected by integrators of the LI.FI protocol: Endpoints enable to query the fees collection event for a given integrator, as well as the total fees collected by an integrator.

A database stores and indexes the collected onchain events, as well as the supported chains' configuration for their scanning.

The events scraper feeds the DB while the fees collection reporter consumes, reads and relays those events data.

### Technical Stack

The `FeesCollected` events and chain scraping configurations are stored in a [MongoDB](https://mongodb.com/) database. [Typegoose](https://typegoose.github.io/typegoose/) is used, on top of the [Mongoose](https://mongoosejs.com/) ODM.

The [Node.js](https://nodejs.org/) development and execution framework is used as the main foundation for developing the backend modules using TypeScript.

The [Hono](https://hono.dev/) app server development framework is used for building and exposing REST API endpoints by the collected fees reporting backend.

[Docker](https://docker.com) container  is used for packaging and easily managing the composition of servers to run locally.

[viem](https://viem.sh/) is used for connecting to EVM blockchains and for decoding the `FeeCollector.FeesCollected` events.

[vitest](https://vitest.dev/) is used for testing the modules.

[Turborepo](https://turborepo.org/) is used for managing the mono-repository workspaces and for building the sub-projects.

## Setup

### Prerequisites

[Node.js](https://nodejs.org/) must be installed on your OS. Lower versions than `20.x` have not been tested. The usage of [nvm](https://github.com/nvm-sh/nvm) is recommended to install and manage distinct Node.js environments.

[pnpm](https://pnpm.io/) is used as the package manager for this project, as well as for managing this mono-repository workspaces. Please refer to its [installation](https://pnpm.io/installation) instructions.

```bash
# Install pnpm globally
npm install -g pnpm
```

The Docker engine and [Docker Compose](https://docs.docker.com/compose/) shall be installed on your OS. You can refer to the [Docker installation guide](https://docs.docker.com/get-docker/) for your OS.

### Installation

To bootstrap the dev workspace, i.e. install all the necessary packages and tooling dependencies, from the repo root directory, run this all-in-one command:

```bash
# All-in-one init of the mono-repo workspace
pnpm init:workspace
```

You can refer to the [`package.json`](./package.json) scripts to review each individual command.

### Environment variables

If not already done via `pnpm init:workspace`, you can create a `.env` file in the root dir of the project, by copying the content of the `.env.sample` file. Then, set the environment variables according to your needs.

This is an optional step since default values are set, i.e. none of the environment variables require to be explicitly set.

Notice that the variable values in `.env` enable customizing the run configuration of the scraper and the fees reporter service: against a running MongoDB instance started from previous Docker Compose based launch, but also those are used by the services when ran individually, e.g. via a node CLI command like `pnpm start` ran in sub dirs `packages/*`.

## Running the Apps Locally

### All-in-one

Quick ways to run the apps locally is to use the provided npm scripts, refer to [package.json](./package.json).

Refer to the 2 main entry points to choose from, i.e. a CLI command to run from the repository root dir:

- `pnpm docker:up` - Start the Collected Fees Reporting server API and a MongoDB server via Docker Compose.
- `pnpm docker:db:start && pnpm start` - Start the DB server in Docker, an Events Scraping session and the Collected Fees Reporting server API locally as Node.js applications, running in parallel.

### Start MongoDB via Docker Compose

You can run locally only the Mongo database:

```bash
# Start the MongoDB instance
pnpm docker:db:start
```

The above starts the MongoDB instance on port `27017`. The database will get initialized with the necessary collections and indexes.

Run locally both the Collected Fees Reporting server API and a MongoDB server:

```bash
# Spin up both the backend server and the database
pnpm docker:up
```

The above will automatically trigger the Docker image build and instantiate the Collected Fees Reporting server, if not already done. 

The command `docker:up:rebuild` is another shortcut for running the `docker-compose up` command by forcing the rebuild of containers. 

These commands will start the services defined in the [`docker-compose.yml`](./docker-compose.yml) file.

Values set in the `.env` file are integrated in the Docker runtime environment.

To stop running the docker services, you can use:

```sh
# Stop the running containers
pnpm docker:stop

# OR, stop and scrap the containers
pnpm docker:down
```

Notice that the Onchain Events Scraping service remains to be manually started or initiated via a REST API call. Else your DB will remain empty.

### Start the Collected Fees Reporting server

For locally running the service, run:

```bash
# Local nodejs launch of the Collected Fees Reporting server
cd ./packages/fees-reporter-api && pnpm start
```

Using Docker only, i.e. without compose and the above `docker:up` script, you can build & run locally a container:

```sh
# Build and run locally the server's Docker container
pnpm docker:build && pnpm docker:run
```

The default port of this server API is `3000`, but it can be customized via the .env variable `API_PORT`.

### Endpoints

OpenAPI v3 specifications of the exposed REST API endpoints is available in a JSON format at [/openapi](http://localhost:3000/openapi)

#### Start Scraping Events

To initiate a new scraping session for onchain events, you can use the following REST API endpoint. This might consist in a long polling operation, depending on the target blockchain and the number of blocks to scan.

Initiate a new onchain events scraping session:

- API Endpoint: [POST /fee-collection/scrap/*:chain*](http://localhost:3000/fee-collection/scrap/:chain)
- Sample Polygon chain: POST /fee-collection/scrap/pol

#### Report Total Fees Collected by an Integrator

Report the total fees collected by an integrator:

- API Endpoint: [GET /fee-collection/report/*:integrator*](http://localhost:3000/fee-collection/report/:integrator)
- Integrator sample: GET /fee-collection/report/0x60bFaC7318e576A535cE8EA3Bfe0a45A803Bfa0B

#### Report Fees Collection Events by Integrator

Report all fee collection events related to an integrator, most recent first:

- API Endpoint: [GET /fee-collection/events/*:integrator[?limit=&offset=]*](http://localhost:3000/fee-collection/events/:integrator?limit=20&offset=0)
- Sample: <http://localhost:3000/fee-collection/events/0x60bFaC7318e576A535cE8EA3Bfe0a45A803Bfa0B?limit=25&offset=0>

#### Functional API Endpoints

Get the OpenAPI specs, which describe the available API endpoints in JSON format:

- API Endpoint: [GET /open-api](http://localhost:3000/open-api)
- Locally running: <http://localhost:3000/openapi> (JSON format)

Server health check:

- API Endpoint: [GET /health](http://localhost:3000/health)
- Sample: <http://localhost:3000/health>

### Initiating an Events Scraping session

The blocks of the specified target blockchain are scanned and the found `FeeCollector.FeesCollected` events are extracted, transformed and loaded into the Mongo database.

#### Start the nodejs app

To run the events scraper as a Node.js application, you can use the following command:

```sh
# Start the events scraper as a Node.js app
cd ./packages/events-scraper && pnpm start
```

The default target blockchain is then 'Polygon mainnet' (key: `pol`), and the target LI.FI FeeCollector contract is [`0xbD6C7B0d2f68c2b7805d88388319cfB6EcB50eA9`](https://polygonscan.com/address/0xbD6C7B0d2f68c2b7805d88388319cfB6EcB50eA9#events).

Refer to [events-scraper main](./packages/events-scraper/src/main.ts) and the chains' configuration in [fee-collector.config](./packages/common/src/config/fee-collector.config.ts) to change the default config.

#### Trigger a scraping session via the backend API

To trigger a scraping session via the REST API, you can use the endpoint
`POST /fee-collection/scrap/:chain`

The target chain is specified in the URL path, e.g. `pol` for Polygon mainnet. The chain must be registered in the [fee-collector.config](./packages/common/src/config/fee-collector.config.ts) file.

You can run a tool like curl to initiate the POST request. Make sure the server is running, then run this command:

```sh
# Trigger a scraping session for the Polygon chain
curl -X POST http://localhost:3000/fee-collection/scrap/pol
```

#### Configuration options

You can configure the target chain and the LI.FI FeeCollector contract address in the [fee-collector.config.ts](./packages/common/src/config/fee-collector.config.ts) file. The configuration is used by both the events scraper and the fees reporter.

You can also customize the following environment variables in the [`.env`](./.env.sample) file:

- `CHAIN_SCAN_BLOCKS_BATCH_SIZE`: The number of blocks to scan in each batch during the scraping session. Default is `10000`.
- `CHAIN_POLYGON_RPC_URL`: The RPC URL for the Polygon mainnet. Default is `https://polygon-rpc.com`.
- `CHAIN_POLYGON_FEE_COLLECTOR_CONTRACT`: The address of the LI.FI FeeCollector contract on the Polygon mainnet. Default is `0xbD6C7B0d2f68c2b7805d88388319cfB6EcB50eA9`.
- `CHAIN_POLYGON_FEE_COLLECTOR_BLOCK_START`: The block number to start scanning for events. Default is `70000000`.

## Test

The project is tested using [vitest](https://vitest.dev/).

You can run the tests using the following commands, either from the root of the mono-repo or from the individual packages:

```sh
# unit tests
pnpm test

# e2e tests
pnpm test:e2e
```

## License

This project is licensed under the [GNU AGPL-v3](LICENSE).
