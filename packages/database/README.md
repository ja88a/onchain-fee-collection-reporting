# LFCR Database

MongoDB database connector for the LI.FI FeeCollection Reporter offchain services. This package provides database access, models, and persistence services for the onchain fee collection reporting system.

## Overview

The `@jabba01/lfcr-database` package manages the database layer for the entire LI.FI fee collection reporting system. It provides:

1. Database connection management with MongoDB
2. Data models for fee collection events and scraping configuration
3. Persistence services for storing and retrieving data
4. Utility functions for managing database IDs and error handling

## Features

- **MongoDB Connectivity**: Robust connection handling with retry logic and error management
- **Mongoose Models**: TypeScript-based models with Typegoose integration
- **Persistence Services**: Specialized services for fee events and configuration
- **Type Safety**: Full TypeScript support with well-defined interfaces

## Installation

This project uses pnpm as the package manager. To install dependencies:

```bash
pnpm install
```

## Usage

### Available Scripts

- **Build**:

```bash
pnpm build            # Build the TypeScript project
pnpm build:bundle     # Bundle the app with esbuild
pnpm watch            # Watch for changes and rebuild
```

- **Development & Testing**:

```bash
pnpm lint            # Run ESLint and fix issues
pnpm format          # Format code with Prettier
pnpm test            # Run tests with Vitest
pnpm test:watch      # Run tests in watch mode
pnpm test:cov        # Run tests with coverage
```

- **Cleanup**:

```bash
pnpm clean           # Remove build artifacts and coverage
pnpm reset           # Remove all generated files and dependencies
```

## Integration

To use this package in another application:

```typescript
import { DatabaseConnector, FeeCollectedEventStore } from '@jabba01/lfcr-database'

// Initialize the database connection
await DatabaseConnector.init()

// Use the event store to retrieve fee collected events
const eventStore = new FeeCollectedEventStore()
const events = await eventStore.retrieveFeeCollectedEventsByIntegrator('0x1234...')

// Close the database connection when done
await DatabaseConnector.close()
```

## Environment Variables

The database connector uses these environment variables:

- `MONGODB_HOST`: MongoDB server hostname (default: 'localhost')
- `MONGODB_PORT`: MongoDB server port (default: '27017')
- `MONGODB_DATABASE`: Database name (default: 'fee-collection-reporting')
- `MONGODB_USERNAME`: Optional username for authentication
- `MONGODB_PASSWORD`: Optional password for authentication

## Data Models

The package provides these main data models:

- **FeeCollectionEventDoc**: Represents fee collection events from the blockchain
- **FeeCollectionScrapingConfigDoc**: Stores configuration for blockchain scanning

## Services

- **FeeCollectedEventStore**: For managing fee collection events
- **FeeCollectionConfigStore**: For managing blockchain scanning configuration

## License

AGPL-3.0
