# LFCR Fees Reporter

A reporting service for LI.FI onchain fee collection events. This package generates comprehensive reports about fees collected by integrators on various blockchains. Part of the onchain-fee-collection-reporting monorepo.

## Overview

The `@jabba01/lfcr-fees-reporter` package analyzes fee collection events previously scraped from blockchains and stored in a database. It processes this data to create detailed reports about fees collected by specific integrators, including LI.FI's protocol share.

This service can be used:

1. As a library integrated into other services (like the `fees-reporter-api` package)
2. For generating reports programmatically in custom applications

## Installation

This project uses pnpm as the package manager. To install dependencies:

```bash
pnpm install
```

## Usage

### Available Scripts

- **Build the project**:

  ```bash
  pnpm build            # Build the TypeScript project
  ```

- **Development & Testing**:

  ```bash
  pnpm lint             # Run ESLint and fix issues
  pnpm format           # Format code with Prettier
  pnpm test             # Run tests with Vitest
  pnpm test:watch       # Run tests in watch mode
  pnpm test:cov         # Run tests with coverage
  pnpm test:debug       # Debug tests
  ```

- **Cleanup**:

  ```bash
  pnpm clean            # Remove build artifacts
  pnpm reset            # Remove all generated files and dependencies
  ```

## Integration

To use this package in another application:

```typescript
import { DatabaseConnector } from '@jabba01/lfcr-database'
import { reportFeesCollectedByIntegrator } from '@jabba01/lfcr-fees-reporter'

// Initialize database connection
await DatabaseConnector.init()

// Generate a report for a specific integrator
const integratorAddress = '0x1234567890123456789012345678901234567890'
const report = await reportFeesCollectedByIntegrator(integratorAddress)

// Process the report data
console.log(`Report for integrator ${report.integrator}:`)
console.log(`Total fees collected: ${JSON.stringify(report.integratorFeesCollected)}`)
console.log(`LiFi share: ${JSON.stringify(report.lifiFeesCollected)}`)

// Close database connection when done
DatabaseConnector.close()
```

## Report Structure

The report provides detailed information about fees collected by an integrator:

- Integrator address
- Total fees collected by the integrator, grouped by:
  - Blockchain
  - Token
  - Amount
- LI.FI's share of the collected fees, also grouped by blockchain and token

## Related Packages

This package is part of a monorepo that includes:

- `@jabba01/lfcr-common` - Shared utilities and data structures
- `@jabba01/lfcr-database` - Database access layer
- `@jabba01/lfcr-events-scraper` - Service that scrapes onchain events
- `@jabba01/lfcr-fees-reporter-api` - REST API for fee reporting

## License

AGPL-3.0
