# Events Scraper - Serverless Mode

This package contains the serverless implementation of the LI.FI FeeCollector Events Scraper.

## Installation

```sh
# Install dependencies
pnpm install
```

Ensure that all required local package dependencies are built & up-to-date, having executed this command from the root directory of the monorepo:

```sh
pnpm build
```

## Configuration

The configuration for the Events Scraper service is managed through environment variables. 

You can set these in the `serverless.yaml` file or directly in your AWS Lambda environment.

## Usage

### Local Run

```sh
# Run Events Scraper in Serverless offline/local mode
pnpm start
```

### Deploy to AWS Lambda

This command will build, package, and deploy the Events Scraper to AWS Lambda, using your locally setup AWS SDK:

```sh
# Deploy the Events Scraper to AWS
pnpm aws:deploy
```

Or you can use the Serverless dev framework for deploying:

```sh
# Deploy the Events Scraper to AWS using serverless framework
pnpm serverless:deploy
```
