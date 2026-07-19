# Veztra Print Agent

Production-ready cross-platform background printing service for Restaurant POS systems. Built with TypeScript, Node.js, and Express, supporting ESC/POS thermal printers on Windows and Linux.

## Features

✅ **Cross-Platform Support**
- Windows (registry-based auto-startup, no admin required)
- Ubuntu/Debian Linux (systemd service with Restart=always)
- Shared TypeScript core (90% code reuse)

✅ **Printer Support**
- ESC/POS thermal printers (USB and Network)
- Brands: VMAX, XPrinter, Epson, Rongta, generic ESC/POS
- USB auto-detection
- Network TCP/IP support with configurable timeout

✅ **Print Queue Management**
- SQLite-based persistent queue
- Automatic retry with exponential backoff
- Up to 3 retry attempts (configurable)
- Queue statistics and monitoring

✅ **REST API**
- 11 endpoints for full printer and queue management
- Health checks and system monitoring
- Real-time logs retrieval
- Printer detection and testing

✅ **Extensible Architecture**
- PrinterDriver interface for adding new printer types
- Platform service abstraction for OS-specific features
- Clean separation of concerns
- Production-ready error handling

✅ **Configuration**
- JSON-based configuration
- Environment variable overrides
- Platform-specific paths (Windows: %APPDATA%, Linux: /etc, /var)
- Sensible defaults included

## Quick Start

### Windows (5 minutes)

```powershell
# Run as Administrator
cd C:\Your\Path
powershell -ExecutionPolicy Bypass -File platforms\windows\install.ps1

# Service starts automatically
curl http://localhost:5050/api/v1/health
```

### Linux (5 minutes)

```bash
cd /tmp
tar -xzf veztra-print-agent-1.0.0.tar.gz
sudo bash platforms/linux/install.sh
sudo systemctl start veztra-print-agent

# Verify
curl http://localhost:5050/api/v1/health
```

## Architecture

### Core Components

```
src/
├── core/
│   ├── ConfigService       # Configuration management
│   ├── Database.ts         # SQLite integration with better-sqlite3
│   └── Logger.ts           # Structured logging with Winston
├── drivers/
│   ├── IPrinterDriver.ts   # Abstract driver interface
│   └── EscPosDriver.ts     # ESC/POS implementation (USB + Network)
├── services/
│   ├── PrinterManager.ts   # Printer lifecycle and health checks
│   ├── PrintQueue.ts       # Queue processing with retry logic
│   └── PlatformService.ts  # Windows/Linux abstractions
├── routes/
│   └── api.ts              # 11 REST endpoints
└── index.ts                # Express server & bootstrap
```

### Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: SQLite with better-sqlite3
- **Logging**: Winston
- **Printer Control**: escpos npm package
- **IPC**: REST API over HTTP

## API Reference

### Health & Monitoring

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/health` | Service status and uptime |
| GET | `/api/v1/system/info` | System information |
| GET | `/api/v1/logs` | Recent application logs |

### Printer Management

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/printers` | List all printers |
| GET | `/api/v1/printers/:id` | Get printer details |
| POST | `/api/v1/printers` | Add new printer |
| PUT | `/api/v1/printers/:id` | Update printer config |
| DELETE | `/api/v1/printers/:id` | Remove printer |
| POST | `/api/v1/printers/:id/test` | Test printer connection |
| GET | `/api/v1/printers/detect/usb` | Detect connected USB printers |

### Print Jobs

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/print` | Submit print job |
| GET | `/api/v1/print/:jobId` | Get job status |
| GET | `/api/v1/queue/stats` | Queue statistics |

## Configuration

### Default Settings

```
Port: 5050
Host: localhost
Database: SQLite (local)
Max Retries: 3
Retry Delay: 5 seconds
Health Check: 60 seconds
```

### Config Paths

- **Windows**: `%APPDATA%\VeztraPrintAgent\config.json`
- **Linux**: `/etc/veztra-print-agent/config.json`

### Environment Variables

```bash
PORT=5050              # API port
HOST=localhost         # Bind host
LOG_LEVEL=info        # debug|info|warn|error
NODE_ENV=production   # Environment
```

## Usage Examples

### Add USB Printer

```bash
curl -X POST http://localhost:5050/api/v1/printers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Receipt Printer",
    "type": "receipt",
    "brand": "xprinter",
    "connectionType": "usb",
    "vendorId": "0x0b3a",
    "productId": "0x0010"
  }'
```

### Add Network Printer

```bash
curl -X POST http://localhost:5050/api/v1/printers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Kitchen Printer",
    "type": "kitchen",
    "brand": "epson",
    "connectionType": "network",
    "host": "192.168.1.100",
    "port": 9100,
    "timeout": 10000
  }'
```

### Submit Print Job

```bash
curl -X POST http://localhost:5050/api/v1/print \
  -H "Content-Type: application/json" \
  -d '{
    "printerId": "printer-123",
    "data": "Thank you for your order!\n[CUT]"
  }'

# Returns:
# {
#   "success": true,
#   "data": {
#     "id": "job-uuid",
#     "status": "pending",
#     "attempts": 0
#   }
# }
```

### Check Job Status

```bash
curl http://localhost:5050/api/v1/print/job-uuid
```

## Integration with POS

### JavaScript/Node.js

```javascript
const printReceipt = async (printerName, receiptData) => {
  const response = await fetch('http://localhost:5050/api/v1/print', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      printerId: printerName,
      data: receiptData
    })
  });
  return response.json();
};

// Usage
await printReceipt('receipt-1', 'Order #123\nTotal: $29.99\n[CUT]');
```

### Python

```python
import requests

def print_receipt(printer_name, receipt_data):
    response = requests.post(
        'http://localhost:5050/api/v1/print',
        json={
            'printerId': printer_name,
            'data': receipt_data
        }
    )
    return response.json()

# Usage
print_receipt('receipt-1', 'Order #123\nTotal: $29.99\n[CUT]')
```

### cURL

```bash
curl -X POST http://localhost:5050/api/v1/print \
  -H "Content-Type: application/json" \
  -d '{"printerId":"receipt-1","data":"Order content..."}'
```

## Development

### Build from Source

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode
npm run dev

# Run production build
npm run start

# Watch mode
npm run watch
```

### Project Structure

```
veztra-print-agent/
├── src/                           # TypeScript source
├── dist/                          # Compiled JavaScript
├── platforms/
│   ├── windows/
│   │   └── install.ps1           # Windows installer
│   └── linux/
│       ├── install.sh            # Linux installer
│       └── veztra-print-agent.service  # systemd unit
├── config/                        # Config templates
├── docs/                          # Documentation
├── package.json
├── tsconfig.json
├── SETUP.md                       # Installation guide
├── README.md                      # This file
└── API.md                         # API documentation
```

## Platform-Specific Notes

### Windows

- Auto-starts via registry Run key (no admin needed)
- Shortcuts created on Desktop and Start Menu
- Config stored in %APPDATA%\VeztraPrintAgent
- Service runs as current user

### Linux

- Installed as systemd service at `/etc/systemd/system/`
- Runs under dedicated `veztra` user
- Config in `/etc/veztra-print-agent`
- Data in `/var/lib/veztra-print-agent`
- Logs in `/var/log/veztra-print-agent`
- Auto-starts on boot with Restart=always

## Performance

- **Startup Time**: < 2 seconds
- **Memory Usage**: 50-100 MB typical
- **Print Queue Processing**: 200+ jobs/hour per printer
- **Concurrent Printers**: 10+ supported

## Troubleshooting

### Service Won't Start

**Windows:**
```powershell
# Check logs
Get-Content "$env:APPDATA\VeztraPrintAgent\logs\service.log" -Tail 50

# Verify Node.js
node --version
```

**Linux:**
```bash
# Check service status
sudo systemctl status veztra-print-agent

# View logs
sudo journalctl -u veztra-print-agent -n 100
```

### Printer Connection Issues

1. Test printer detection
   ```bash
   curl http://localhost:5050/api/v1/printers/detect/usb
   ```

2. Test printer directly
   ```bash
   curl -X POST http://localhost:5050/api/v1/printers/{id}/test
   ```

3. Check logs for specific error
   ```bash
   curl http://localhost:5050/api/v1/logs?lines=50
   ```

## License

Commercial - Veztra Restaurant Systems

## Support

For issues, documentation, or feature requests, contact support.
