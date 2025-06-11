# LFCR Common

A shared library of utilities, data models, and configurations used across all packages in the LI.FI onchain fee collection reporting system.

## Overview

The `@jabba01/lfcr-common` package provides a consistent foundation for all other packages in the monorepo, including:

- Common data structures and entities
- Shared configuration settings
- Logging utilities
- Type definitions

This package ensures consistency and reduces code duplication across the entire system.

## Features

- **Data Entities**: Shared data models for fee collection events and related entities
- **Configuration**: Centralized configuration for microservices and fee collectors
- **Logging**: Structured logging system based on Winston
- **Type Safety**: TypeScript definitions for all shared components

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
  pnpm build:bundle     # Bundle the package with esbuild
  pnpm watch            # Watch for changes and rebuild
  ```

- **Development & Testing**:

  ```bash
  pnpm lint             # Run ESLint and fix issues
  pnpm format           # Format code with Prettier
  pnpm test             # Run tests with Vitest
  pnpm test:watch       # Run tests in watch mode
  pnpm test:cov         # Run tests with coverage
  ```

- **Cleanup**:
  ```bash
  pnpm clean            # Remove build artifacts and coverage
  pnpm reset            # Remove all generated files and dependencies
  ```

## Integration

To use this package in another application:

```typescript
// Import configuration
import { MS_CONFIG } from '@jabba01/lfcr-common'

// Import logger
import { logger } from '@jabba01/lfcr-common'

// Import data entities
import { FeeCollectedEventParsed } from '@jabba01/lfcr-common'

// Use the logger
logger.info('This is a log message', { context: 'MyService' })

// Use configuration
console.log(`API Port: ${MS_CONFIG.API_PORT}`)
```

## Key Components

### Logger

The logger is built on Winston and provides structured logging with consistent formatting across all services.

### Data Entities

Common data structures for working with fee collection events and other shared entities.

### Configuration

Centralized configuration settings for various aspects of the system, including:

- Service configuration (ports, versions)
- Fee collector configuration (contracts, chains)

## License

AGPL-3.0
