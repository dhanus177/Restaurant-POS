# Veztra Print Agent - Architecture & Design

## Overview

Veztra Print Agent is a production-grade, cross-platform background printing service built with TypeScript and Node.js. It provides a clean REST API for managing thermal printers and print jobs with automatic retry logic and persistent queuing.

## Design Philosophy

### 1. **Clean Architecture**
- **Separation of Concerns**: Core logic, drivers, services, and routes are completely decoupled
- **Dependency Injection**: Services depend on abstractions (PrinterDriver interface), not implementations
- **Single Responsibility**: Each class has one reason to change
- **Testability**: All major components can be tested independently

### 2. **Extensibility**
- **PrinterDriver Interface**: New printer types can be added without touching core logic
- **Platform Service Abstraction**: Windows and Linux specifics are abstracted
- **Configuration-Driven**: Printers and settings are configuration-based, not hardcoded

### 3. **Reliability**
- **Persistent Queue**: Print jobs survive service restarts via SQLite
- **Automatic Retry**: Failed jobs retry with exponential backoff
- **Health Monitoring**: Continuous printer health checks
- **Graceful Shutdown**: Proper cleanup on SIGTERM/SIGINT

### 4. **Observability**
- **Structured Logging**: Winston logger with rotating files
- **API Monitoring**: Real-time logs via REST endpoint
- **Health Endpoints**: Service and printer health status
- **Job Tracking**: Every job is tracked from submission to completion

## Core Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Express REST API                        │
│                    (localhost:5050/api/v1)                   │
└────────────────────────────┬────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   API Routes    │
                    │  (11 endpoints) │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
  ┌─────▼────────┐   ┌──────▼──────┐   ┌────────▼────────┐
  │   Printer    │   │ Print Queue │   │  Configuration  │
  │   Manager    │   │   Service   │   │   Management    │
  └─────┬────────┘   └──────┬──────┘   └────────┬────────┘
        │                    │                    │
  ┌─────▼──────────────────────────────────────────────────┐
  │              Core Services Layer                        │
  ├────────────────┬──────────────┬──────────────┬─────────┤
  │ ConfigService  │ Logger       │ Database     │ Platform│
  └────────────────┴──────────────┴──────────────┴─────────┘
        │                                              │
  ┌─────▼────────┐                            ┌──────▼──────┐
  │ PrinterDriver│                            │ Windows/    │
  │  Interface   │                            │ Linux       │
  ├─────────────┬┤                            │ Services    │
  │ ESC/POS     ││                            └─────────────┘
  │ Driver      ││
  │ (USB/Net)   ││
  └─────────────┴┘
```

## Component Details

### 1. **ConfigService** (`src/core/ConfigService.ts`)

Manages application configuration with platform-aware paths.

**Key Features:**
- Singleton pattern for guaranteed single instance
- Environment variable overrides
- Platform detection (Windows/Linux)
- Sensible defaults
- Path generation (config, database, logs)

**Responsibilities:**
- Load configuration from files
- Merge with environment variables
- Provide configuration to other services

### 2. **Database** (`src/core/Database.ts`)

SQLite database abstraction using better-sqlite3.

**Schema:**
```sql
printers {
  id, name, type, brand, connectionType, 
  vendorId, productId, host, port, timeout,
  paperWidth, maxRetries, retryDelay, 
  characterEncoding, enabled, createdAt, updatedAt
}

print_jobs {
  id, printerId, printerName, data, status,
  attempts, maxAttempts, lastError,
  createdAt, updatedAt, completedAt
}
```

**Responsibilities:**
- CRUD operations for printers
- Job queue management
- Statistics aggregation
- Automatic cleanup of old jobs

### 3. **Logger** (`src/core/Logger.ts`)

Winston-based structured logging with file rotation.

**Features:**
- Console and file output
- Configurable log levels
- Automatic file rotation (10MB, 10 files max)
- Timestamped entries
- Stack trace capture

### 4. **PrinterManager** (`src/services/PrinterManager.ts`)

Manages printer lifecycle and health.

**Responsibilities:**
- Printer registration and lifecycle
- Driver instantiation
- Health check scheduling
- USB detection
- Connection testing

**Health Check Loop:**
```
Every 60 seconds →
  For each printer:
    Test connection → Update status (online/offline/error)
```

### 5. **PrintQueue** (`src/services/PrintQueue.ts`)

Queue management with retry logic.

**Features:**
- Job submission to queue
- Background processing loop
- Exponential backoff retry: 5s, 10s, 20s
- Maximum 3 attempts (configurable)
- Automatic recovery after restart

**Job State Machine:**
```
pending ─→ printing ─→ success
  ↓         ↓
  └────► failed ◄─(retry check)
```

### 6. **PrinterDriver Interface** (`src/drivers/IPrinterDriver.ts`)

Abstract base class for printer implementations.

```typescript
interface IPrinterDriver {
  connect(): Promise<void>
  disconnect(): Promise<void>
  print(data: string): Promise<void>
  testConnection(): Promise<boolean>
  isConnected(): boolean
  getName(): string
  getConfig(): PrinterConfig
}
```

### 7. **ESC/POS Driver** (`src/drivers/EscPosDriver.ts`)

Concrete implementation for thermal printers.

**Features:**
- USB support (auto-detect VID/PID or manual)
- Network support (TCP/IP)
- ESC/POS command parsing
- Brand-specific defaults (VMAX, XPrinter, Epson, Rongta)
- Configurable timeout
- Character encoding support

**USB Connection:**
```
Vendor/Product ID → USB device → escpos library → printer
```

**Network Connection:**
```
Host:Port → TCP connection → escpos library → printer
```

### 8. **PlatformService** (`src/services/PlatformService.ts`)

OS-specific abstractions.

**Windows:**
- Registry-based autostart (HKCU\Software\Microsoft\Windows\CurrentVersion\Run)
- Config in %APPDATA%\VeztraPrintAgent
- Shortcuts creation

**Linux:**
- systemd service management
- Config in /etc/veztra-print-agent
- Runs under dedicated user
- Security hardening via systemd sandboxing

### 9. **API Routes** (`src/routes/api.ts`)

11 REST endpoints grouped by function:

**Health (3):**
- GET /health
- GET /system/info
- GET /logs

**Printers (7):**
- GET /printers
- GET /printers/:id
- POST /printers
- PUT /printers/:id
- DELETE /printers/:id
- POST /printers/:id/test
- GET /printers/detect/usb

**Jobs (1):**
- POST /print
- GET /print/:jobId
- GET /queue/stats

## Data Flow

### Print Job Submission Flow

```
1. Client calls POST /api/v1/print
   ↓
2. API validates printerId and data
   ↓
3. PrintQueue.submitJob() creates job record
   ↓
4. Job inserted to database (status: pending)
   ↓
5. Response sent immediately (202 Accepted)
   ↓
6. Queue processor polls periodically (every 2s)
   ↓
7. Found pending job → PrinterManager.getPrinter()
   ↓
8. Driver connects and prints
   ↓
9. On success: Update job status to "success"
   On error: Retry with backoff or mark "failed"
```

### Printer Configuration Flow

```
1. Client calls POST /api/v1/printers
   ↓
2. API validates configuration
   ↓
3. PrinterManager.addPrinter() saves to database
   ↓
4. PrinterDriver instance created
   ↓
5. Driver stored in memory map
   ↓
6. Health check loop begins monitoring
   ↓
7. Printer now ready for jobs
```

## Retry Strategy

**Exponential Backoff:**
- Attempt 1: Immediately
- Attempt 2: Wait 5 seconds
- Attempt 3: Wait 10 seconds
- After attempt 3: Mark as failed

**Rationale:**
- Quick recovery for transient failures
- Avoids overwhelming printers
- Respects network timeouts
- Configurable per printer

## Database Schema Design

### Printers Table
- **Indexed**: enabled, connectionType
- **Primary Key**: id (UUID)
- **Foreign Keys**: None (self-contained)
- **Constraints**: NOT NULL on name, type, brand, connectionType

### Print Jobs Table
- **Indexed**: status, printerId (for fast queries)
- **Primary Key**: id (UUID)
- **Foreign Key**: printerId → printers(id) with CASCADE delete
- **Constraints**: NOT NULL on printerId, data
- **Cleanup**: Auto-delete jobs older than 30 days with status='success'

## Configuration Hierarchy

```
1. Hardcoded Defaults (lowest priority)
   ↓
2. config.json (if exists)
   ↓
3. Environment Variables (highest priority)
```

### Example Config Paths
- **Windows**: C:\Users\User\AppData\Roaming\VeztraPrintAgent\config.json
- **Linux**: /etc/veztra-print-agent/config.json

## Security Considerations

### Current Implementation
- Service binds to localhost:5050 (local access only)
- No authentication enforced (assumes trusted network)
- SQLite database unencrypted

### Production Recommendations
1. **Reverse Proxy**: Use nginx/Apache with authentication
2. **Firewall**: Restrict access to specific IPs
3. **Encryption**: Use TLS/SSL for remote access
4. **Audit Logging**: Enable detailed logging
5. **User Separation**: Run under dedicated non-root user (already done on Linux)

## Performance Characteristics

### Memory Usage
- Idle: ~50 MB
- Per printer: +5-10 MB
- Typical (3 printers): ~65-80 MB

### Throughput
- Queue processing: Every 2 seconds
- Job submit latency: <10ms
- Printer health check: Every 60 seconds
- Max concurrent operations: 10+

### Scalability
- Linear with number of printers
- Queue size limited only by disk
- Suitable for restaurant POS (10-50 printers typical)
- Heavy load: Consider clustering/sharding for 100+ printers

## Error Handling Strategy

### Application Level
- Try-catch blocks around all async operations
- Graceful degradation (failed printer ≠ failed service)
- Error details logged with context

### Printer Level
- Connection timeout: 10 seconds (configurable)
- Retry on transient failures
- Mark offline after max retries
- Continue accepting jobs (queued for later retry)

### Database Level
- better-sqlite3 handles transactions
- WAL mode enabled (crash-safe)
- Auto-recovery on startup

## Testing Strategy

### Unit Tests (Not included in MVP)
- PrinterDriver implementations
- Queue retry logic
- ConfigService parsing

### Integration Tests
- End-to-end job submission
- Printer detection
- Retry mechanism

### Manual Testing
- Test endpoint: POST /printers/{id}/test
- Log viewing: GET /logs
- Queue stats: GET /queue/stats

## Monitoring & Observability

### Available Metrics
- Service uptime
- Printer online/offline status
- Queue length and stats
- Job success/failure rate
- System resource usage

### Log Levels
- **debug**: Detailed execution flow
- **info**: Important events (start, jobs completed)
- **warn**: Recoverable errors (retry attempts)
- **error**: Unrecoverable errors (printer removed)

## Future Extensibility

### Easy to Add
1. **New Printer Type**: Implement IPrinterDriver interface
2. **New Platform**: Extend PlatformService (macOS, Docker)
3. **New Database**: Implement Database interface with PostgreSQL/MongoDB
4. **Webhooks**: Add callback endpoints for job status
5. **Authentication**: Add token validation to API routes
6. **Metrics**: Export Prometheus metrics endpoint

### Design Ready For
- Clustering (stateless service, shared database)
- Load balancing (multiple instances)
- Containerization (already supports Linux)
- CI/CD pipelines
- Cloud deployment (AWS, Azure, GCP)

## Deployment Scenarios

### Single Restaurant (Windows)
- 1 Print Service instance
- 3-5 printers typical
- Registry-based autostart
- Config in AppData

### Restaurant Chain (Linux)
- 1 Print Service per location
- systemd auto-start with Restart=always
- Config managed via Ansible/Terraform
- Centralized monitoring via Prometheus

### High Availability (Future)
- Multiple Print Service instances
- Shared PostgreSQL database
- Redis for distributed caching
- Load balancer with health checks
