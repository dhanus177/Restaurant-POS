# Veztra Print Agent - Development Guide

## Getting Started

### Prerequisites
- Node.js 18+ ([https://nodejs.org/](https://nodejs.org/))
- npm or yarn
- Git
- A code editor (VS Code recommended)

### Quick Setup

```bash
# Clone or download the project
cd veztra-print-agent

# Install dependencies
npm install

# Compile TypeScript
npm run build

# Run in development mode
npm run dev

# In another terminal, test the API
curl http://localhost:5050/api/v1/health
```

## Project Structure

```
src/
├── core/                    # Core services (singletons)
│   ├── ConfigService.ts    # Configuration management
│   ├── Database.ts         # SQLite abstraction
│   └── Logger.ts           # Winston logging
│
├── drivers/                 # Printer implementations
│   ├── IPrinterDriver.ts   # Abstract base class
│   └── EscPosDriver.ts     # ESC/POS driver (USB + Network)
│
├── services/                # Business logic
│   ├── PrinterManager.ts   # Printer lifecycle
│   ├── PrintQueue.ts       # Queue + retry logic
│   └── PlatformService.ts  # Windows/Linux abstractions
│
├── routes/                  # API endpoints
│   └── api.ts              # All 11 endpoints
│
├── types/                   # TypeScript definitions
│   └── index.ts            # All interfaces & enums
│
└── index.ts                # Express server & bootstrap
```

## Common Development Tasks

### Adding a New Printer Type

1. **Create new driver** in `src/drivers/YourPrinterDriver.ts`:

```typescript
import { PrinterDriver } from './IPrinterDriver';
import { PrinterConfig } from '../types/index';

export class YourPrinterDriver extends PrinterDriver {
  async connect(): Promise<void> {
    // Your connection logic
  }

  async disconnect(): Promise<void> {
    // Your disconnection logic
  }

  async print(data: string): Promise<void> {
    // Your print logic
  }
}
```

2. **Update PrinterManager** in `src/services/PrinterManager.ts`:

```typescript
private createDriver(config: PrinterConfig): IPrinterDriver {
  if (config.brand === 'yourprinter') {
    return new YourPrinterDriver(config);
  }
  // Existing drivers...
}
```

3. **Add brand enum** in `src/types/index.ts`:

```typescript
export enum PrinterBrand {
  // ... existing
  YOUR_PRINTER = 'yourprinter',
}
```

### Adding a New API Endpoint

1. **Add route** in `src/routes/api.ts`:

```typescript
// In the createApiRoutes function
router.get('/your-endpoint', async (req: Request, res: Response) => {
  try {
    // Your logic
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error in your-endpoint', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
```

### Debugging

**Enable Debug Logging:**
```bash
LOG_LEVEL=debug npm run dev
```

**Check Database Content:**
```bash
# Windows PowerShell
$env:LOG_LEVEL = "debug"
npm run dev

# Linux
LOG_LEVEL=debug npm run dev
```

**View Recent Logs:**
```bash
curl http://localhost:5050/api/v1/logs?lines=50
```

**Monitor Queue:**
```bash
# Watch queue stats
while true; do 
  curl -s http://localhost:5050/api/v1/queue/stats | jq .
  sleep 2
done
```

## Testing

### Manual Testing

```bash
# 1. Add a printer
curl -X POST http://localhost:5050/api/v1/printers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Printer",
    "type": "receipt",
    "brand": "generic",
    "connectionType": "network",
    "host": "192.168.1.100",
    "port": 9100
  }'

# 2. Test connection
curl -X POST http://localhost:5050/api/v1/printers/{printer-id}/test

# 3. Submit print job
curl -X POST http://localhost:5050/api/v1/print \
  -H "Content-Type: application/json" \
  -d '{
    "printerId": "{printer-id}",
    "data": "Test print\n[CUT]"
  }'

# 4. Check job status
curl http://localhost:5050/api/v1/print/{job-id}

# 5. View queue
curl http://localhost:5050/api/v1/queue/stats
```

### Integration Testing Ideas

```typescript
// Test retry logic
// - Submit job
// - Disconnect printer
// - Verify retries occur
// - Reconnect printer
// - Verify job completes

// Test queue persistence
// - Submit job
// - Kill service process
// - Restart service
// - Verify job still in queue and processes

// Test concurrent jobs
// - Submit 10 jobs simultaneously
// - Verify all process correctly
```

## Performance Profiling

```bash
# Using Node.js built-in profiler
node --prof dist/index.js
# ... make requests ...
# Ctrl+C to stop

# Process the profile
node --prof-process isolate-*.log > profile.txt

# View with v8-profiler or similar tools
```

## Code Style

### Naming Conventions
- **Classes**: PascalCase (PrinterManager)
- **Functions**: camelCase (getPrinter)
- **Constants**: UPPER_SNAKE_CASE (DEFAULT_RETRIES)
- **Interfaces**: I prefix or no prefix (IPrinterDriver or PrinterDriver)
- **Enums**: PascalCase (PrinterType)

### TypeScript Strictness
- All types explicitly declared
- No `any` without justification
- Null/undefined handled explicitly
- Interface over implementation

### Error Handling
```typescript
// ✓ Good
try {
  await operation();
} catch (error) {
  logger.error('Operation failed', error);
  throw new Error(`Failed to X: ${error.message}`);
}

// ✗ Avoid
try {
  await operation();
} catch (e) {
  console.log(e); // Use logger instead
  throw e; // Re-throw without context
}
```

## Common Issues & Solutions

### Issue: TypeScript compilation errors
**Solution:**
```bash
npm run build
# Fix errors shown
npx tsc --noEmit  # Check for more errors
```

### Issue: Database locked error
**Solution:**
- Ensure only one service instance is running
- Close database connections properly on shutdown
- Check file permissions on database file

### Issue: Port 5050 already in use
**Solution:**
```bash
# Windows
netstat -ano | findstr 5050

# Linux
lsof -i :5050

# Use different port
PORT=5051 npm run dev
```

### Issue: USB printer not detected
**Solution:**
```bash
# List USB devices
curl http://localhost:5050/api/v1/printers/detect/usb

# Check logs for specific errors
curl http://localhost:5050/api/v1/logs?lines=100 | grep -i usb
```

## Release Process

### Version Bumping
```json
// package.json
{
  "version": "1.0.0"  // Update this
}
```

### Building Distribution
```bash
# Build
npm run build

# Test the build
npm run start

# Package for distribution
tar -czf veztra-print-agent-1.0.0.tar.gz dist/ platforms/ package*.json

# Or Windows
Compress-Archive -Path dist, platforms, package*.json -DestinationPath veztra-print-agent-1.0.0.zip
```

## Continuous Integration

### GitHub Actions Example
```yaml
name: Build

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: 18
      - run: npm install
      - run: npm run build
      - run: npm test
```

## Docker Support (Future)

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY dist ./dist

EXPOSE 5050

CMD ["node", "dist/index.js"]
```

```bash
docker build -t veztra-print-agent:1.0.0 .
docker run -p 5050:5050 veztra-print-agent:1.0.0
```

## Troubleshooting Development Issues

### Hot Reload Not Working
```bash
# Use ts-node with watch mode
npm run watch
```

### Database File Locked
```bash
# Close any open connections
# Usually happens if service didn't shut down cleanly
rm -f veztra.db-shm veztra.db-wal

# Restart
npm run dev
```

### Memory Leak Suspected
```bash
# Monitor memory usage
node --inspect dist/index.js
# Visit chrome://inspect
```

## Contributing Guidelines

1. **Branch naming**: feature/name, fix/name, docs/name
2. **Commit messages**: Clear, present tense ("Add feature" not "Added")
3. **Pull requests**: Describe what and why
4. **Tests**: Update as needed
5. **Documentation**: Keep README and API docs current

## Resources

- **ESC/POS Reference**: [Thermal Printer Command Set](https://en.wikipedia.org/wiki/ESC/P)
- **Express.js Docs**: [https://expressjs.com/](https://expressjs.com/)
- **TypeScript Docs**: [https://www.typescriptlang.org/](https://www.typescriptlang.org/)
- **SQLite**: [https://www.sqlite.org/](https://www.sqlite.org/)
- **Winston Logger**: [https://github.com/winstonjs/winston](https://github.com/winstonjs/winston)
- **escpos npm**: [https://www.npmjs.com/package/escpos](https://www.npmjs.com/package/escpos)

## Contact & Support

For development questions or issues, refer to documentation or create an issue.
