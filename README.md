# LiFi FeeCollector Events Reporter

## Overview

### Purpose

Scrap and report the collection of onchain fees supported by the LI.FI protocol and its FeeCollector EVM contracts.

This is a mono-repository for developing and running 2 main backend services, on top of the [LI.FI protocol](https://li.fi):

1. A scraper of on-chain events: `FeesCollected` events emitted by the LI.FI `FeeCollector` contracts deployed on many blockchains. A scraping session can be triggered manually from the command line or via a dedicated REST API endpoint as part of the backend API.

2. A backend REST API to report the fees collected by integrators of the LI.FI protocol: Endpoints enable to query the fees collection event for a given integrator, as well as the total fees collected by an integrator.

A database stores and indexes the collected onchain events, as well as the supported chains' configuration for their scanning. The scraper feeds the DB while the reporter consumes those events data.

### Technical Stack

The `FeesCollected` events and chain scraping configurations are stored in a [MongoDB](https://mongodb.com/) database. [Typegoose](https://typegoose.github.io/typegoose/) is used, on top of the [Mongoose](https://mongoosejs.com/) ODM.

The [Node.js](https://nodejs.org/) development and execution framework is used as the main foundation for developing the backend modules using TypeScript.

The [Hono](https://hono.dev/) app server development framework is used for building and exposing REST API endpoints by the collected fees reporting backend.

[Docker](https://docker.com) container  is used for packaging and easily managing the composition of servers to run locally.

[ethers](https://docs.ethers.io/v5/) is used for connecting to EVM blockchains and for decoding the `FeeCollector.FeesCollected` events. `viem` is considered to replace the ethers v5 integration, however the technique based on lifi-contract-typings [typechain](https://github.com/TypeChain/TypeChain) for integrating the LI.FI smart contracts is still in use.

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

The Docker engine and the [Docker Compose](https://docs.docker.com/compose/) tool must be installed on your OS. Please refer to the [Docker installation guide](https://docs.docker.com/get-docker/) for your OS.

### Installation

To bootstrap the dev workspace, i.e. install all the necessary packages and tooling dependencies, from the repo root directory, run this all-in-one command:

```bash
# All-in-one init of the mono-repo workspace
pnpm init:workspace
```

You can refer to the [`package.json`](./package.json) scripts for the individual commands that are run by the above command.

## Running the Apps Locally

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

To stop running the services, you can use:

```bash
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

#### Endpoints

OpenAPI v3 specifications of the exposed REST API endpoints is available in a JSON format at [/openapi](http://localhost:3000/openapi)

Initiate a new onchain events scraping session:

- REST API: [POST /fee-collection/scrap/*:chain*](http://localhost:3000/fee-collection/scrap/:chain)
- Sample Polygon chain: POST /fee-collection/scrap/pol

Report the total fees collected by an integrator:

- Endpoint: [GET /fee-collection/report/*:integrator*](http://localhost:3000/fee-collection/report/:integrator)
- Integrator sample: GET /fee-collection/report/0x60bFaC7318e576A535cE8EA3Bfe0a45A803Bfa0B

Report all fee collection events related to an integrator, most recent first:

- Endpoint: [GET /fee-collection/events/*:integrator[?limit=&offset=]*](http://localhost:3000/fee-collection/events/:integrator?limit=20&offset=0)
- Sample: <http://localhost:3000/fee-collection/events/0x60bFaC7318e576A535cE8EA3Bfe0a45A803Bfa0B?limit=25&offset=0>

OpenAPI specs:

- Endpoint: [GET /open-api](http://localhost:3000/open-api)
- Locally running: <http://localhost:3000/openapi> (JSON format)

Server health check:

- Endpoint: [GET /health](http://localhost:3000/health)
- Sample: <http://localhost:3000/health>

### Start an Events Scraping session

#### Environment variables

If not already done via `pnpm init:repo`, create a `.env` file in the root of the project, by copying the content of the `.env.sample` file. Then, set the environment variables according to your needs. This is an optional step since default values are set, none of the environment variables require to be explicitly set.

Actual values in `.env.sample` enable customizing the local run of the scraper and reporter service, against a locally running MongoDB instance started from previous Docker Compose based launch, but also are used by the services when ran individually, e.g. via a node CLI command.

#### As a Nodejs-based CLI command

The blocks of the specified target blockchain are scanned and the found `FeeCollector.FeeCollected` events are imported into MongoDB.

```bash
cd ./events-scraper && pnpm start
```

The default target blockchain is then 'Polygon mainnet' (key: `pol`), and the target LiFi FeeCollector contract is [`0xbD6C7B0d2f68c2b7805d88388319cfB6EcB50eA9`](https://polygonscan.com/address/0xbD6C7B0d2f68c2b7805d88388319cfB6EcB50eA9#events).

Refer to [events-scraper main](./events-scraper/src/main.ts) and the chains' configuration in [fee-collector.config](./common/src/config/fee-collector.config.ts) to change the default config.

## Test

The project is tested using [vitest](https://vitest.dev/).

```bash
# unit tests
$ pnpm test

# e2e tests
$ pnpm test:e2e
```

## License

This project is licensed under the [GNU AGPL-v3](LICENSE).
