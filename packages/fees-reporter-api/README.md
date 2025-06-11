# LFCR Fees Reporter API

A REST API service for reporting LI.FI onchain fee collection events. This package exposes the functionalities of the fees-reporter and events-scraper services through a well-documented HTTP API.

## Overview

The `@jabba01/lfcr-fees-reporter-api` package is a Hono-based API server that provides endpoints for:

1. Generating reports of fees collected by specific integrators
2. Retrieving raw fee collection events for specific integrators
3. Triggering blockchain scanning sessions to collect new fee events

The API uses Zod for input/output validation and includes OpenAPI specification for easy documentation and client generation.

## Features

- **REST API**: Modern, standards-compliant HTTP API
- **Zod Validation**: Type-safe validation of request inputs and response outputs
- **OpenAPI Specification**: Auto-generated API documentation
- **Comprehensive Reporting**: Access to all fee collection data
- **Event Scraping**: Ability to trigger a blockchain's events scanning on demand

## Installation

This project uses pnpm as the package manager. To install dependencies:

```bash
pnpm install
```

## Usage

### Available Scripts

- **Development**:

  ```bash
  pnpm dev            # Start the server in development mode with hot reloading
  ```

- **Production**:

  ```bash
  pnpm build          # Build the TypeScript project
  pnpm start          # Start the server in production mode
  ```

- **Code Quality**:

  ```bash
  pnpm lint           # Run ESLint and fix issues
  pnpm format         # Format code with Prettier
  ```

- **Cleanup**:

  ```bash
  pnpm clean          # Remove build artifacts
  pnpm reset          # Remove all generated files and dependencies
  ```

## API Endpoints

### Fee Collection Reporting

- **GET `/fee-collection/report/:integrator`**

  - Returns a comprehensive report of fees collected by a specific integrator, including LI.FI's share
  - URL parameter: `integrator` - Ethereum address of the integrator

- **GET `/fee-collection/events/:integrator`**

  - Returns the raw fee collection events for a specific integrator
  - URL parameter: `integrator` - Ethereum address of the integrator

- **POST `/fee-collection/scrap/:chain`**
  - Triggers a blockchain scanning session to collect new fee events
  - URL parameter: `chain` - Chain key (e.g., 'ETH', 'POL', 'ARB')

### API Documentation

- **GET `/openapi`**

  - Returns the OpenAPI specification for the API

- **GET `/health`**
  - Health check endpoint

## Quick Start

1. Start the server:

   ```bash
   pnpm dev
   ```

2. Access the API at http://localhost:3000

3. View the API OpenAPI specifications at http://localhost:3000/openapi

## Environment Variables

The application reads its configuration from a `.env` file at the root of the monorepo. Required variables:

- `API_PORT`: Port number for the HTTP server (default: 3000)
- Database connection parameters (see documentation in the database package)
- Blockchain provider URLs (for event scraping)

## Related Packages

This package depends on and exposes functionality from:

- `@jabba01/lfcr-common` - Shared utilities and data structures
- `@jabba01/lfcr-database` - Database access layer
- `@jabba01/lfcr-events-scraper` - Service that scrapes onchain events
- `@jabba01/lfcr-fees-reporter` - Reporting service for fee collection events

## License

AGPL-3.0
